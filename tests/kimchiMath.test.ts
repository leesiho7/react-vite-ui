import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  premiumSeries,
  premiumStats,
  quantile,
  histogram,
  shareAbove,
  forwardByQuintile,
  dropHitProbability,
  byHourOfDay,
  rollingMean,
} from '../lib/kimchiMath.ts';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

describe('premiumSeries', () => {
  test('Upbit/(Binance×USDT환율)-1, %', () => {
    const p = premiumSeries({ upbitKrw: [103_000_000, 100_000_000], usdtKrw: [1_300, 1_300], binanceUsdt: [77_000, 77_000] });
    close(p[0], (103_000_000 / (77_000 * 1_300) - 1) * 100);
    assert.ok(p[0] > 2.8 && p[0] < 3.0);
    assert.ok(p[1] < 0);
  });
});

describe('premiumSeries basis', () => {
  const r = { upbitKrw: [104_000_000], usdtKrw: [1_340], binanceUsdt: [77_000] };
  test('공식 환율 기준은 테더 프리미엄을 포함', () => {
    const p = premiumSeries({ ...r, officialFx: [1_300] }, 'official');
    close(p[0], (104_000_000 / (77_000 * 1_300) - 1) * 100);
    const u = premiumSeries(r, 'usdt');
    assert.ok(p[0] > u[0]);
  });
  test('공식 환율이 없거나 짧으면 빈 배열 (채우지 않음)', () => {
    assert.deepEqual(premiumSeries(r, 'official'), []);
    assert.deepEqual(premiumSeries({ ...r, officialFx: [] }, 'official'), []);
  });
});

describe('quantile', () => {
  test('보간과 경계', () => {
    close(quantile([1, 2, 3, 4], 0), 1);
    close(quantile([1, 2, 3, 4], 1), 4);
    close(quantile([1, 2, 3, 4], 0.5), 2.5);
    assert.ok(Number.isNaN(quantile([], 0.5)));
  });
});

describe('premiumStats', () => {
  test('표본이 너무 짧으면 null', () => {
    assert.equal(premiumStats([1, 2, 3]), null);
  });

  test('AR(1) 합성: phi 와 반감기를 복원한다', () => {
    // 결정적 의사난수
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 2;
    const phi = 0.95;
    const p: number[] = [2];
    for (let i = 1; i < 6000; i++) p.push(2 * (1 - phi) + phi * p[i - 1] + 0.1 * rnd());
    const st = premiumStats(p)!;
    assert.ok(Math.abs(st.phi - phi) < 0.02, `phi=${st.phi}`);
    const hl = -Math.log(2) / Math.log(phi);
    assert.ok(Math.abs(st.halfLifeHours - hl) / hl < 0.35, `hl=${st.halfLifeHours} vs ${hl}`);
    assert.ok(st.tGamma < -3);
  });

  test('랜덤워크성(phi≈1)은 반감기 무한 또는 매우 김', () => {
    const p: number[] = [0];
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5);
    for (let i = 1; i < 3000; i++) p.push(p[i - 1] + rnd());
    const st = premiumStats(p)!;
    // 유한 표본에서는 phi 가 1 아래로 편향되므로 "매우 길다"만 확인한다 (AR(0.95) 반감기는 약 13.5시간)
    assert.ok(st.halfLifeHours > 60, `hl=${st.halfLifeHours}`);
    assert.ok(st.tGamma > -3.5, `t=${st.tGamma}`);
  });

  test('현재값 z 는 현재 봉을 제외한 직전 구간 기준, 백분위는 표본 내 순위', () => {
    const p: number[] = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 1 : 3)); // 평균 2, 교대
    p.push(10);
    const st = premiumStats(p, 100)!;
    assert.ok(st.zTrailing > 5);
    close(st.currentPercentile, 100);
    close(st.max, 10);
  });
});

describe('histogram / shareAbove', () => {
  test('개수 합이 전체이고 경계가 폭에 정렬', () => {
    const p = [0.1, 0.2, 0.3, 0.9, 1.1, -0.4];
    const h = histogram(p, 0.5);
    assert.equal(h.reduce((a, b) => a + b.count, 0), p.length);
    close(h[0].lo, -0.5);
    close(h.reduce((a, b) => a + b.frac, 0), 1);
  });

  test('임계 이상 비율', () => {
    const r = shareAbove([0, 1, 2, 3], [0, 2, 10]);
    assert.deepEqual(r.map((x) => x.frac), [1, 0.5, 0]);
  });
});

describe('forwardByQuintile', () => {
  test('평균회귀 사인파: 높은 구간은 이후 하락, 낮은 구간은 이후 상승', () => {
    const p = Array.from({ length: 2000 }, (_, i) => 3 * Math.sin(i / 20));
    const rows = forwardByQuintile(p, 6);
    assert.equal(rows.length, 5);
    assert.equal(rows.reduce((a, r) => a + r.n, 0), p.length - 6);
    assert.ok(rows[0].meanChange > 0);
    assert.ok(rows[4].meanChange < 0);
    assert.ok(rows[0].lo <= rows[0].hi && rows[0].hi <= rows[1].lo + 1e-9);
  });

  test('표본이 짧으면 빈 배열', () => {
    assert.deepEqual(forwardByQuintile([1, 2, 3], 6), []);
  });
});

describe('dropHitProbability', () => {
  test('정확한 개수', () => {
    const p = [0, 2, 1.5, 0.9, 3, 3, 1.5, 1.0];
    const r = dropHitProbability(p, 2, 2, 1);
    // 후보 t: p>=2 이고 t+2<8 → t=1,4,5
    // t=1: [1.5,0.9] 0.9<=1 hit; t=4: [3,1.5] target 2 → 1.5<=2 hit; t=5: [1.5,1.0] target 2 → hit
    assert.equal(r.n, 3);
    assert.equal(r.hits, 3);
    close(r.prob, 1);
    // 독립: t=1 선택 → nextFree=3 → t=4 선택 → nextFree=6 → t=5 건너뜀
    assert.equal(r.nIndependent, 2);
  });

  test('조건을 만족하는 시점이 없으면 NaN', () => {
    const r = dropHitProbability([0, 0.1, 0.2, 0.3], 5, 1, 1);
    assert.equal(r.n, 0);
    assert.ok(Number.isNaN(r.prob));
  });

  test('미래가 부족한 마지막 구간은 세지 않는다', () => {
    const r = dropHitProbability([3, 3, 3], 2, 2, 1);
    assert.equal(r.n, 1);
    assert.equal(r.hits, 0);
  });
});

describe('byHourOfDay / rollingMean', () => {
  test('UTC 시간대 평균', () => {
    const H = 3_600_000;
    const t0 = Date.UTC(2026, 0, 1, 0);
    const times = Array.from({ length: 48 }, (_, i) => t0 + i * H);
    const p = times.map((_, i) => (i % 24 === 5 ? 4 : 1));
    const r = byHourOfDay(times, p);
    assert.equal(r.length, 24);
    close(r[5].mean, 4);
    close(r[6].mean, 1);
    assert.equal(r[5].n, 2);
  });

  test('이동평균 앞부분은 NaN', () => {
    const r = rollingMean([1, 2, 3, 4], 2);
    assert.ok(Number.isNaN(r[0]));
    close(r[3], 3.5);
  });
});
