import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  alignBars,
  olsFit,
  rollingZScores,
  meanReversionStats,
  cointegrationVerdict,
  backtestPairs,
  tradePnl,
  barWorstPnl,
  summarize,
  leverageRow,
  safeLeverage,
  costSensitivity,
} from '../lib/pairMath.ts';
import type { Bar, Trade, BacktestParams } from '../lib/pairMath.ts';

// 테스트용 결정론적 난수 (LCG) + 표준정규(Box-Muller)
function rng(seed: number) {
  let s = seed >>> 0;
  const u = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s + 1) / 4294967297;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

const bar = (t: number, c: number, spread = 0.001): Bar => ({ t, o: c, h: c * (1 + spread), l: c * (1 - spread), c });

/** lnB 는 랜덤워크, lnA = lnB + OU 스프레드 → 공적분 페어. phi 가 1에 가까울수록 회귀가 느리다. */
function makePair(n: number, phi: number, seed: number, noise = 0.004) {
  const g = rng(seed);
  let lnB = Math.log(2000);
  let e = 0;
  const a: Bar[] = [];
  const b: Bar[] = [];
  for (let i = 0; i < n; i++) {
    lnB += 0.004 * g();
    e = phi * e + noise * g();
    const t = 1_700_000_000_000 + i * 3_600_000;
    b.push(bar(t, Math.exp(lnB)));
    a.push(bar(t, Math.exp(lnB + 1.5 + e)));
  }
  return alignBars(a, b);
}

const PRM: BacktestParams = { window: 240, zEntry: 2, zExit: 0.5, zStop: 4, maxHold: 168, feeBps: 4.5, slipBps: 1 };

describe('alignBars', () => {
  test('keeps only common timestamps, sorted, drops invalid prices', () => {
    const a = [bar(3, 10), bar(1, 10), bar(2, 10), { t: 4, o: NaN, h: 1, l: 1, c: 1 }];
    const b = [bar(1, 5), bar(3, 5), bar(4, 5), bar(9, 5)];
    const r = alignBars(a, b);
    assert.deepEqual(r.t, [1, 3]);
  });
});

describe('olsFit / rollingZScores', () => {
  test('exact line recovers alpha, beta and zero residual error', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = x.map((v) => 2 * v + 1);
    const r = olsFit(x, y);
    assert.ok(Math.abs(r.beta - 2) < 1e-12);
    assert.ok(Math.abs(r.alpha - 1) < 1e-12);
    assert.ok(r.sigma < 1e-9);
  });

  test('prefix-sum rolling fit matches a direct OLS on the same window', () => {
    const p = makePair(600, 0.9, 7);
    const ca = p.a.map((x) => x.c);
    const cb = p.b.map((x) => x.c);
    const W = 120;
    const { beta, z } = rollingZScores(ca, cb, W);
    for (const i of [W - 1, 300, 599]) {
      const lo = i - W + 1;
      const x = cb.slice(lo, i + 1).map(Math.log);
      const y = ca.slice(lo, i + 1).map(Math.log);
      const fit = olsFit(x, y);
      const resid = y[y.length - 1] - fit.alpha - fit.beta * x[x.length - 1];
      assert.ok(Math.abs(beta[i] - fit.beta) < 1e-6, `beta @${i}`);
      assert.ok(Math.abs(z[i] - resid / fit.sigma) < 1e-6, `z @${i}`);
    }
  });

  test('no look-ahead: changing bars after index k leaves beta[k], z[k] unchanged', () => {
    const p = makePair(500, 0.9, 11);
    const ca = p.a.map((x) => x.c);
    const cb = p.b.map((x) => x.c);
    const base = rollingZScores(ca, cb, 100);
    const k = 300;
    const ca2 = ca.slice();
    const cb2 = cb.slice();
    for (let i = k + 1; i < ca2.length; i++) {
      ca2[i] *= 1.37;
      cb2[i] *= 0.61;
    }
    const alt = rollingZScores(ca2, cb2, 100);
    for (let i = 99; i <= k; i++) {
      assert.equal(alt.beta[i], base.beta[i]);
      assert.equal(alt.z[i], base.z[i]);
    }
  });

  test('warm-up bars are NaN and too-short input returns all NaN', () => {
    const p = makePair(200, 0.9, 3);
    const { z } = rollingZScores(p.a.map((x) => x.c), p.b.map((x) => x.c), 100);
    assert.ok(Number.isNaN(z[98]));
    assert.ok(Number.isFinite(z[99]));
    const short = rollingZScores([1, 2, 3], [1, 2, 3], 100);
    assert.ok(short.z.every(Number.isNaN));
  });
});

describe('meanReversionStats', () => {
  test('mean-reverting spread: half-life near theory and strongly negative t-stat', () => {
    const phi = 0.9; // 이론 반감기 = -ln2/ln(0.9) ≈ 6.58봉
    const p = makePair(4000, phi, 21);
    const s = meanReversionStats(p.a.map((x) => x.c), p.b.map((x) => x.c));
    assert.ok(s);
    assert.ok(s.halfLifeBars !== null && s.halfLifeBars > 4.5 && s.halfLifeBars < 9.5, `hl=${s.halfLifeBars}`);
    assert.ok(s.tStat < -8, `t=${s.tStat}`);
    assert.equal(cointegrationVerdict(s.tStat), 'STRONG');
  });

  test('independent random walks look far less mean-reverting than a cointegrated pair', () => {
    const coint = makePair(4000, 0.9, 21);
    const g1 = rng(101);
    const g2 = rng(202);
    let x = Math.log(60000);
    let y = Math.log(2000);
    const a: Bar[] = [];
    const b: Bar[] = [];
    for (let i = 0; i < 4000; i++) {
      x += 0.004 * g1();
      y += 0.004 * g2();
      const t = i * 3_600_000;
      a.push(bar(t, Math.exp(x)));
      b.push(bar(t, Math.exp(y)));
    }
    const rw = alignBars(a, b);
    const sc = meanReversionStats(coint.a.map((v) => v.c), coint.b.map((v) => v.c))!;
    const sr = meanReversionStats(rw.a.map((v) => v.c), rw.b.map((v) => v.c))!;
    assert.ok(sr.tStat > sc.tStat + 5, `rw t=${sr.tStat} vs coint t=${sc.tStat}`);
  });

  test('verdict thresholds', () => {
    assert.equal(cointegrationVerdict(-4), 'STRONG');
    assert.equal(cointegrationVerdict(-3.5), 'LIKELY');
    assert.equal(cointegrationVerdict(-3.1), 'WEAK');
    assert.equal(cointegrationVerdict(-1), 'NONE');
  });
});

describe('trade math', () => {
  test('tradePnl: spread long profits when A outperforms B; short is the mirror', () => {
    // beta=1, A +2%, B +1% → 스프레드 롱 +1% (한 다리 명목 기준)
    assert.ok(Math.abs(tradePnl(1, 1, 100, 100, 102, 101) - 0.01) < 1e-12);
    assert.ok(Math.abs(tradePnl(-1, 1, 100, 100, 102, 101) + 0.01) < 1e-12);
  });

  test('barWorstPnl: long spread is hurt by A low and B high at the same time', () => {
    // 롱: A 저가 -3%, B 고가 +2% → (-0.03 - 1*0.02) / 2 = -2.5%
    const w = barWorstPnl(1, 1, 100, 100, 101, 97, 102, 99);
    assert.ok(Math.abs(w + 0.025) < 1e-12);
    // 숏: A 고가 +1%, B 저가 -1% → (-0.01 + 1*(-0.01)) / 2 = -1%
    const w2 = barWorstPnl(-1, 1, 100, 100, 101, 97, 102, 99);
    assert.ok(Math.abs(w2 + 0.01) < 1e-12);
  });
});

describe('backtestPairs', () => {
  const pair = makePair(3000, 0.9, 5);

  test('produces trades with sane fields on a cointegrated pair', () => {
    const r = backtestPairs(pair, PRM);
    assert.ok(r.trades.length > 20, `trades=${r.trades.length}`);
    for (const t of r.trades) {
      assert.ok(t.exitIdx > t.entryIdx);
      assert.ok(t.hold >= 1 && t.hold <= PRM.maxHold + 1);
      assert.ok(t.mae >= 0);
      assert.ok(t.beta > 0);
    }
    // 포지션은 한 번에 하나: 거래 구간이 겹치지 않는다
    for (let i = 1; i < r.trades.length; i++) {
      assert.ok(r.trades[i].entryIdx >= r.trades[i - 1].exitIdx);
    }
  });

  test('cost is exactly 2*(fee+slip) per gross notional and does not change the trade list', () => {
    const free = backtestPairs(pair, { ...PRM, feeBps: 0, slipBps: 0 });
    const paid = backtestPairs(pair, PRM);
    assert.equal(free.trades.length, paid.trades.length);
    const cost = (2 * (PRM.feeBps + PRM.slipBps)) / 1e4;
    for (let i = 0; i < free.trades.length; i++) {
      assert.ok(Math.abs(free.trades[i].net - paid.trades[i].net - cost) < 1e-12);
      assert.equal(free.trades[i].entryIdx, paid.trades[i].entryIdx);
    }
  });

  test('costSensitivity: expectancy falls monotonically as costs rise', () => {
    const rows = costSensitivity(pair, PRM, [0, 5, 10, 20]);
    const v = rows.map((r) => r.avgNetBps as number);
    assert.ok(v.every((x) => Number.isFinite(x)));
    for (let i = 1; i < v.length; i++) assert.ok(v[i] < v[i - 1]);
  });

  test('too-short series yields no trades instead of throwing', () => {
    const tiny = alignBars([bar(1, 10), bar(2, 10)], [bar(1, 5), bar(2, 5)]);
    assert.equal(backtestPairs(tiny, PRM).trades.length, 0);
  });
});

describe('leverage', () => {
  const mk = (net: number, mae: number): Trade => ({
    entryIdx: 0, exitIdx: 1, dir: 1, beta: 1, gross: net, net, mae, hold: 1, reason: 'REVERT',
  });

  test('compounding at 2x: +1% then -2% → (1.02)(0.96) - 1', () => {
    const r = leverageRow([mk(0.01, 0.005), mk(-0.02, 0.03)], 2);
    assert.ok(Math.abs(r.totalReturn - (1.02 * 0.96 - 1)) < 1e-12);
    assert.equal(r.liquidations, 0);
  });

  test('a trade whose adverse excursion hits the threshold liquidates and costs the threshold', () => {
    const r = leverageRow([mk(0.01, 0.5)], 2); // 2 * 0.5 = 1.0 >= 0.9
    assert.equal(r.liquidations, 1);
    assert.ok(Math.abs(r.totalReturn + 0.9) < 1e-12);
  });

  test('safeLeverage = threshold / worst adverse excursion; recommended is half', () => {
    const s = safeLeverage([mk(0.01, 0.02), mk(0.0, 0.05)]);
    assert.ok(s);
    assert.ok(Math.abs(s.sampleMax - 18) < 1e-9);
    assert.ok(Math.abs(s.recommended - 9) < 1e-9);
    assert.equal(safeLeverage([]), null);
  });

  test('summarize: win rate, streak, profit factor', () => {
    const s = summarize([mk(0.02, 0), mk(-0.01, 0), mk(-0.01, 0), mk(0.01, 0)]);
    assert.equal(s.n, 4);
    assert.equal(s.winRate, 0.5);
    assert.equal(s.maxLosingStreak, 2);
    assert.ok(Math.abs(s.profitFactor - 1.5) < 1e-12);
  });
});
