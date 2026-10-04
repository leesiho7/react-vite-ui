import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  HOUR_MS,
  hourlyRates,
  alignWindows,
  diffStats,
  breakEvenDays,
  holdingDistribution,
  rollingMean,
  fixedDirectionSim,
  followRuleSim,
  pairSummaries,
  roundTripCost,
  annualPct,
} from '../lib/arbMath.ts';
import type { FundingSeries } from '../lib/arbMath.ts';

const H = HOUR_MS;
// 8시간 경계에 맞춘 기준 시각
const BASE = Math.floor(1_790_000_000_000 / (8 * H)) * (8 * H);

function eightHour(exchange: string, count: number, rate: number | ((i: number) => number)): FundingSeries {
  const times: number[] = [];
  const rates: number[] = [];
  for (let i = 1; i <= count; i++) {
    times.push(BASE + i * 8 * H);
    rates.push(typeof rate === 'function' ? rate(i) : rate);
  }
  return { exchange, intervalHours: 8, times, rates, error: null };
}

function hourly(exchange: string, fromHourEnd: number, toHourEnd: number, rate: number, skip: number[] = []): FundingSeries {
  const times: number[] = [];
  const rates: number[] = [];
  for (let t = fromHourEnd; t <= toHourEnd; t += H) {
    if (skip.includes(t)) continue;
    times.push(t);
    rates.push(rate);
  }
  return { exchange, intervalHours: 1, times, rates, error: null };
}

describe('hourlyRates / alignWindows', () => {
  test('8h funding is spread evenly over its 8 hours and sums back to the original', () => {
    const s = eightHour('BINANCE', 1, 0.0008);
    const h = hourlyRates(s);
    assert.equal(h.size, 8);
    let sum = 0;
    for (const v of h.values()) sum += v;
    assert.ok(Math.abs(sum - 0.0008) < 1e-15);
    assert.ok(h.has(BASE + 8 * H) && h.has(BASE + 1 * H));
  });

  test('1h venue vs 8h venue: window diff equals 8*hourly - 8h rate', () => {
    const bn = eightHour('BINANCE', 10, 0.0008);
    const hl = hourly('HYPERLIQUID', BASE + 1 * H, BASE + 10 * 8 * H, 0.00012);
    const w = alignWindows(hl, bn, 8);
    assert.ok(w.t.length >= 9);
    for (let i = 0; i < w.t.length; i++) {
      assert.equal(w.t[i] % (8 * H), 0);
      assert.ok(Math.abs(w.a[i] - 0.00096) < 1e-12);
      assert.ok(Math.abs(w.diff[i] - (0.00096 - 0.0008)) < 1e-12);
    }
  });

  test('a window with any missing hour on either side is dropped, never filled', () => {
    const bn = eightHour('BINANCE', 10, 0.0008);
    const missing = BASE + 3 * 8 * H - 2 * H; // 3번째 창 안의 한 시간
    const hl = hourly('HYPERLIQUID', BASE + 1 * H, BASE + 10 * 8 * H, 0.0001, [missing]);
    const w = alignWindows(hl, bn, 8);
    assert.ok(!w.t.includes(BASE + 3 * 8 * H));
    assert.ok(w.t.includes(BASE + 2 * 8 * H));
    assert.ok(w.t.includes(BASE + 4 * 8 * H));
  });

  test('no overlap → empty result', () => {
    const a = eightHour('A', 3, 0.0001);
    const b: FundingSeries = { exchange: 'B', intervalHours: 8, times: [BASE + 500 * 8 * H], rates: [0.0001], error: null };
    assert.equal(alignWindows(a, b, 8).t.length, 0);
  });
});

describe('diffStats / breakEven / holding distribution', () => {
  test('constant diff: annualised mean, zero std, 100% positive', () => {
    const d = new Array(300).fill(0.0001);
    const s = diffStats(d, 8);
    assert.ok(Math.abs(s.meanAnnual - 0.0001 * 3 * 365 * 100) < 1e-9); // 10.95%
    assert.ok(s.stdAnnual < 1e-9, `std=${s.stdAnnual}`); // 부동소수점 누적 오차(≈1e-14) 허용
    assert.equal(s.fracPositive, 1);
    assert.equal(s.lag1, 0);
    assert.equal(s.days, 100);
  });

  test('lag-1 autocorrelation: alternating ≈ -1, long same-sign runs > 0.5', () => {
    const alt = Array.from({ length: 200 }, (_, i) => (i % 2 ? 0.0001 : -0.0001));
    const runs = Array.from({ length: 200 }, (_, i) => (Math.floor(i / 20) % 2 ? 0.0001 : -0.0001));
    assert.ok(diffStats(alt).lag1 < -0.9);
    assert.ok(diffStats(runs).lag1 > 0.8);
  });

  test('breakEvenDays: cost / daily carry; non-positive carry never recoups', () => {
    const cost = roundTripCost(4.5, 1); // 0.0022
    assert.ok(Math.abs(cost - 0.0022) < 1e-12);
    assert.ok(Math.abs(breakEvenDays(0.0003, cost) - 0.0022 / 0.0003) < 1e-12);
    assert.equal(breakEvenDays(0, cost), Infinity);
    assert.equal(breakEvenDays(-0.001, cost), Infinity);
  });

  test('holding distribution on a constant diff: sums scale with days and P(>cost) flips from 0 to 1', () => {
    const d = new Array(400).fill(0.0001);
    const rows = holdingDistribution(d, 8, [1, 30], 0.002);
    assert.ok(Math.abs(rows[0].median - 0.0003) < 1e-12);
    assert.equal(rows[0].pAboveCost, 0);
    assert.ok(Math.abs(rows[1].median - 0.009) < 1e-12);
    assert.equal(rows[1].pAboveCost, 1);
    assert.equal(rows[0].n, 400 - 3 + 1);
  });

  test('reverse direction negates the carry', () => {
    const d = new Array(100).fill(0.0001);
    const r = holdingDistribution(d, 8, [3], 0.002, -1)[0];
    assert.ok(r.median < 0);
  });

  test('rollingMean matches a hand computation and is NaN during warm-up', () => {
    const r = rollingMean([1, 2, 3, 4, 5], 3);
    assert.ok(Number.isNaN(r[0]) && Number.isNaN(r[1]));
    assert.deepEqual(r.slice(2), [2, 3, 4]);
  });

  test('annualPct helper', () => {
    assert.ok(Math.abs(annualPct(0.0001, 8) - 10.95) < 1e-9);
  });
});

describe('simulations', () => {
  test('fixed direction: net = gross - full round-trip cost, no flips', () => {
    const d = new Array(90).fill(0.0001);
    const s = fixedDirectionSim(d, 1, 0.0022);
    assert.ok(Math.abs(s.gross - 0.009) < 1e-12);
    assert.ok(Math.abs(s.net - (0.009 - 0.0022)) < 1e-12);
    assert.equal(s.flips, 0);
    assert.equal(s.curve.length, 90);
    const rev = fixedDirectionSim(d, -1, 0.0022);
    assert.ok(rev.net < 0);
  });

  test('follow rule counts flips and charges entry cost/2, each flip cost, final exit cost/2', () => {
    // 신호 구간 2: 처음 2개 창은 대기. 이후 +,+,+,+ 후 -,-,-,- 구간
    const d = [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, -0.0001, -0.0001, -0.0001, -0.0001, -0.0001, -0.0001];
    const cost = 0.002;
    const s = followRuleSim(d, 2, cost);
    assert.ok(s.flips >= 1);
    // 총 비용 = cost/2(최초) + flips*cost + cost/2(마지막 청산)
    const expectedCost = cost / 2 + s.flips * cost + cost / 2;
    assert.ok(Math.abs(s.gross - s.net - expectedCost) < 1e-12, `gross=${s.gross} net=${s.net} cost=${expectedCost}`);
  });

  test('follow rule uses no future data: truncating the series leaves earlier curve points unchanged', () => {
    const rnd = (i: number) => Math.sin(i * 12.9898) * 0.0002; // 결정론적 의사난수
    const full = Array.from({ length: 120 }, (_, i) => rnd(i));
    const cut = full.slice(0, 70);
    const a = followRuleSim(full, 21, 0.002);
    const b = followRuleSim(cut, 21, 0.002);
    for (let i = 0; i < cut.length; i++) assert.equal(a.curve[i], b.curve[i]);
  });
});

describe('pairSummaries', () => {
  test('normalises direction to the favourable side and ranks by carry', () => {
    const hi = eightHour('BYBIT', 60, 0.0003);
    const mid = eightHour('BINANCE', 60, 0.0001);
    const lo = eightHour('OKX', 60, 0.00005);
    const rows = pairSummaries([mid, hi, lo], 8, 0.0022);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].shortVenue, 'BYBIT');
    assert.equal(rows[0].longVenue, 'OKX');
    assert.ok(rows[0].meanAnnualFavorable >= rows[1].meanAnnualFavorable);
    for (const r of rows) {
      assert.ok(r.meanAnnualFavorable >= 0);
      assert.equal(r.fracFavorable, 1);
      assert.ok(Number.isFinite(r.breakEvenDays));
    }
  });

  test('a series with no points is ignored instead of crashing', () => {
    const ok = eightHour('BINANCE', 30, 0.0001);
    const empty: FundingSeries = { exchange: 'OKX', intervalHours: 8, times: [], rates: [], error: 'x' };
    assert.equal(pairSummaries([ok, empty], 8, 0.002).length, 0);
  });
});
