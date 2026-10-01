import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { pairEconomics } from '../lib/fundingMath.ts';
import type { ExchangeFundingEntry, FundingDifferential } from '../lib/api.ts';

const entry = (exchange: ExchangeFundingEntry['exchange'], markPrice: number | null, annualizedPct: number): ExchangeFundingEntry => ({
  exchange,
  symbol: 'BTCUSDT',
  fundingRatePct: annualizedPct / (3 * 365),
  intervalHours: 8,
  nextFundingTime: 0,
  annualizedPct,
  markPrice,
  openInterestUsd: null,
  volume24hUsd: null,
});

describe('pairEconomics', () => {
  test('no differential → null', () => {
    assert.equal(pairEconomics([entry('BINANCE', 100, 1)], undefined), null);
  });

  test('unfavorable gap: short venue is cheaper → needs days of funding to recoup', () => {
    // 숏 쪽 마크 99.985, 롱 쪽 마크 100 → 괴리 -0.015%, 펀딩 차이 연 3.65% → 하루 0.01% → 1.5일
    const entries = [entry('HYPERLIQUID', 99.985, 5), entry('OKX', 100, 1.35)];
    const diff: FundingDifferential = { shortExchange: 'HYPERLIQUID', longExchange: 'OKX', annualizedPct: 3.65 };
    const r = pairEconomics(entries, diff)!;
    assert.ok(Math.abs(r.markGapPct! - -0.015) < 1e-9);
    assert.ok(Math.abs(r.dailyDifferentialPct - 0.01) < 1e-12);
    assert.ok(Math.abs(r.breakEvenDays! - 1.5) < 1e-9);
  });

  test('favorable gap: short venue is pricier → break-even is immediate (0 days)', () => {
    const entries = [entry('HYPERLIQUID', 100.02, 5), entry('OKX', 100, 1)];
    const r = pairEconomics(entries, { shortExchange: 'HYPERLIQUID', longExchange: 'OKX', annualizedPct: 4 })!;
    assert.ok(r.markGapPct! > 0);
    assert.equal(r.breakEvenDays, 0);
  });

  test('missing mark price on either leg → gap and break-even are unknown (null), never guessed', () => {
    const diff: FundingDifferential = { shortExchange: 'HYPERLIQUID', longExchange: 'OKX', annualizedPct: 4 };
    for (const entries of [[entry('HYPERLIQUID', null, 5), entry('OKX', 100, 1)], [entry('HYPERLIQUID', 100, 5), entry('OKX', null, 1)]]) {
      const r = pairEconomics(entries, diff)!;
      assert.equal(r.markGapPct, null);
      assert.equal(r.breakEvenDays, null);
      assert.ok(r.dailyDifferentialPct > 0);
    }
  });

  test('zero differential with an unfavorable gap can never be recouped → null', () => {
    const entries = [entry('HYPERLIQUID', 99, 1), entry('OKX', 100, 1)];
    const r = pairEconomics(entries, { shortExchange: 'HYPERLIQUID', longExchange: 'OKX', annualizedPct: 0 })!;
    assert.ok(r.markGapPct! < 0);
    assert.equal(r.breakEvenDays, null);
  });

  test('legs are looked up by exchange name, not by array order', () => {
    const entries = [entry('OKX', 100, 1), entry('BYBIT', 50, 2), entry('HYPERLIQUID', 101, 5)];
    const r = pairEconomics(entries, { shortExchange: 'HYPERLIQUID', longExchange: 'OKX', annualizedPct: 4 })!;
    assert.ok(Math.abs(r.markGapPct! - 1) < 1e-9);
  });
});
