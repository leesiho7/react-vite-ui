// 거래소 호가 파서 테스트 (node:test — `npm test`).
// fixture 는 거래소 공개 WebSocket 에서 실제로 받은 메시지(2026-10-01 캡처)를 그대로 저장한 것이다. 네트워크를 쓰지 않는다.
// 실제 서버를 상대로 한 점검은 `npm run verify:live` 를 쓴다.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  applyBybitMessage,
  applyOkxMessage,
  createOkxBookState,
  isBybitInvalidSymbol,
  latencyStats,
  okxBookToLevels,
  parseBinanceStream,
  parseBitunixDepth,
  parseUpbitOrderbook,
  toBitunixSymbol,
  toOkxInstId,
  toUpbitCode,
  upbitToUsdtLevels,
  upbitUsdtKrwMid,
  type L2Level,
} from '../lib/exchangeOrderbookParsers.ts';

const fx = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

function assertWellFormedBook(bids: L2Level[], asks: L2Level[], label: string) {
  assert.ok(bids.length > 0 && asks.length > 0, `${label}: both sides present`);
  assert.ok(bids[0].price < asks[0].price, `${label}: not crossed (${bids[0].price} < ${asks[0].price})`);
  for (let i = 1; i < bids.length; i++) assert.ok(bids[i].price < bids[i - 1].price, `${label}: bids strictly descending`);
  for (let i = 1; i < asks.length; i++) assert.ok(asks[i].price > asks[i - 1].price, `${label}: asks strictly ascending`);
  for (const side of [bids, asks]) {
    side.forEach((lv, i) => {
      assert.ok(Number.isFinite(lv.price) && Number.isFinite(lv.qty) && lv.qty > 0, `${label}: finite positive values`);
      if (i > 0) assert.ok(lv.total > side[i - 1].total, `${label}: cumulative total increases`);
    });
  }
}

describe('symbol mapping', () => {
  test('OKX instId', () => {
    assert.equal(toOkxInstId('BTCUSDT'), 'BTC-USDT');
    assert.equal(toOkxInstId('btc/usdt'), 'BTC-USDT');
    assert.equal(toOkxInstId('BTCUSD'), null);
    assert.equal(toOkxInstId('USDT'), null);
  });
  test('Upbit market code', () => {
    assert.equal(toUpbitCode('SUIUSDT'), 'KRW-SUI');
    assert.equal(toUpbitCode('ETHBTC'), null);
  });
  test('Bitunix symbol', () => {
    assert.equal(toBitunixSymbol('btc/usdt'), 'BTCUSDT');
    assert.equal(toBitunixSymbol('BTCUSD'), null);
  });
});

describe('OKX books (snapshot + incremental)', () => {
  test('real snapshot then real updates produce a well-formed book', () => {
    const [snapshot, ...updates] = fx('okx_books_sequence.json');
    const state = createOkxBookState();
    assert.equal(applyOkxMessage(state, snapshot).kind, 'book');
    for (const u of updates) assert.equal(applyOkxMessage(state, u).kind, 'book');
    const { bids, asks } = okxBookToLevels(state, 20);
    assert.equal(bids.length, 20);
    assert.equal(asks.length, 20);
    assertWellFormedBook(bids, asks, 'okx');
  });

  test('quantity "0" deletes a level and a later update replaces quantity', () => {
    const s = createOkxBookState();
    applyOkxMessage(s, { arg: { channel: 'books' }, action: 'snapshot', data: [{ bids: [['100', '1'], ['99', '2']], asks: [['101', '1']] }] });
    applyOkxMessage(s, { arg: { channel: 'books' }, action: 'update', data: [{ bids: [['100', '0'], ['98', '3']], asks: [['101', '5']] }] });
    const { bids, asks } = okxBookToLevels(s);
    assert.deepEqual(bids.map((b) => b.price), [99, 98]);
    assert.equal(asks[0].qty, 5);
  });

  test('a new snapshot replaces the whole book (reconnect case)', () => {
    const s = createOkxBookState();
    applyOkxMessage(s, { arg: { channel: 'books' }, action: 'snapshot', data: [{ bids: [['100', '1']], asks: [['101', '1']] }] });
    applyOkxMessage(s, { arg: { channel: 'books' }, action: 'snapshot', data: [{ bids: [['50', '1']], asks: [['51', '1']] }] });
    const { bids, asks } = okxBookToLevels(s);
    assert.deepEqual(bids.map((b) => b.price), [50]);
    assert.deepEqual(asks.map((a) => a.price), [51]);
  });

  test('error event (code 60018 unlisted instId) is surfaced, subscribe ack ignored', () => {
    const s = createOkxBookState();
    const err = applyOkxMessage(s, { event: 'error', code: '60018', msg: "Subscribe failed ... instId:NOTREAL-USDT doesn't exist" });
    assert.equal(err.kind, 'error');
    assert.match(err.message ?? '', /exist/);
    assert.equal(applyOkxMessage(s, { event: 'subscribe', arg: { channel: 'books', instId: 'BTC-USDT' } }).kind, 'ignored');
  });
});

describe('Bybit orderbook (snapshot + delta)', () => {
  test('real snapshot then real deltas produce a well-formed book', () => {
    const [snapshot, ...deltas] = fx('bybit_orderbook_sequence.json');
    assert.equal(snapshot.type, 'snapshot');
    const s = createOkxBookState();
    assert.ok(applyBybitMessage(s, snapshot));
    for (const d of deltas) assert.ok(applyBybitMessage(s, d));
    const { bids, asks } = okxBookToLevels(s, 20);
    assertWellFormedBook(bids, asks, 'bybit');
  });

  test('REGRESSION: a delta deleting the best ask must remove it — the old code treated a delta as the whole book', () => {
    const [snapshot] = fx('bybit_orderbook_sequence.json');
    const s = createOkxBookState();
    applyBybitMessage(s, snapshot);
    const before = okxBookToLevels(s, 20);
    const bestAsk = before.asks[0].price;
    const secondAsk = before.asks[1].price;

    applyBybitMessage(s, { topic: 'orderbook.50.BTCUSDT', type: 'delta', data: { s: 'BTCUSDT', b: [], a: [[String(bestAsk), '0']] } });
    const after = okxBookToLevels(s, 20);
    assert.equal(after.asks[0].price, secondAsk, 'best ask moves to the next level');
    assert.ok(after.asks.every((a) => a.price !== bestAsk));
    assert.equal(after.bids.length, before.bids.length, 'bids untouched by an asks-only delta');
  });

  test('ignores non-orderbook messages and detects an invalid symbol subscription', () => {
    assert.equal(applyBybitMessage(createOkxBookState(), { op: 'subscribe', success: true }), false);
    assert.equal(applyBybitMessage(createOkxBookState(), null), false);
    assert.equal(isBybitInvalidSymbol({ success: false, ret_msg: 'Invalid symbol :[orderbook.50.NOTREALUSDT]', op: 'subscribe' }), true);
    assert.equal(isBybitInvalidSymbol({ success: true, ret_msg: 'subscribe', op: 'subscribe' }), false);
  });
});

describe('Upbit orderbook (KRW → USDT)', () => {
  const [btc, usdt] = fx('upbit_orderbook_btc_usdt.json');

  test('parses both books', () => {
    const b = parseUpbitOrderbook(btc);
    const u = parseUpbitOrderbook(usdt);
    assert.equal(b?.code, 'KRW-BTC');
    assert.equal(u?.code, 'KRW-USDT');
    assert.ok(b!.bids.length > 0 && b!.asks.length > 0);
  });

  test('USDT/KRW mid is the midpoint of the KRW-USDT best bid/ask', () => {
    const u = parseUpbitOrderbook(usdt)!;
    const mid = upbitUsdtKrwMid(u);
    assert.equal(mid, (u.bids[0].price + u.asks[0].price) / 2);
  });

  test('conversion divides KRW prices by the rate, keeps quantities, caps depth at 20', () => {
    const b = parseUpbitOrderbook(btc)!;
    const rate = upbitUsdtKrwMid(parseUpbitOrderbook(usdt))!;
    const { bids, asks } = upbitToUsdtLevels(b, rate);
    assert.equal(bids.length, 20);
    assert.equal(asks.length, 20);
    assert.equal(bids[0].price, b.bids[0].price / rate);
    assert.equal(bids[0].qty, b.bids[0].qty);
    assertWellFormedBook(bids, asks, 'upbit');
  });

  test('without a rate the book is empty — an exchange rate is never made up', () => {
    const b = parseUpbitOrderbook(btc);
    assert.deepEqual(upbitToUsdtLevels(b, null), { bids: [], asks: [] });
    assert.deepEqual(upbitToUsdtLevels(b, 0), { bids: [], asks: [] });
    assert.equal(upbitUsdtKrwMid(null), null);
  });

  test('garbage input is rejected', () => {
    assert.equal(parseUpbitOrderbook(null), null);
    assert.equal(parseUpbitOrderbook({ type: 'ticker' }), null);
    assert.equal(parseUpbitOrderbook({ type: 'orderbook', code: 'X', orderbook_units: [] }), null);
  });
});

describe('Bitunix perpetual depth_book15 (full snapshot each message)', () => {
  test('real message parses to 15 well-formed levels per side', () => {
    const r = parseBitunixDepth(fx('bitunix_depth15.json'));
    assert.equal(r.kind, 'book');
    if (r.kind !== 'book') return;
    assert.equal(r.bids.length, 15);
    assert.equal(r.asks.length, 15);
    assertWellFormedBook(r.bids, r.asks, 'bitunix');
  });

  test('an unlisted symbol returns empty-string levels — detected as no_market, never as price 0', () => {
    const msg = fx('bitunix_unlisted.json');
    assert.ok(msg.data.b.every((lv: string[]) => lv[0] === '' && lv[1] === ''), 'fixture is the real empty-string response');
    assert.equal(parseBitunixDepth(msg).kind, 'no_market');
  });

  test('connect ack and pong are ignored', () => {
    assert.equal(parseBitunixDepth({ op: 'connect', data: { result: true } }).kind, 'ignored');
    assert.equal(parseBitunixDepth({ op: 'ping', pong: 1, ping: 1 }).kind, 'ignored');
  });
});

describe('Binance spot stream', () => {
  test('depth20 real message parses to 20 well-formed levels per side', () => {
    const r = parseBinanceStream(fx('binance_depth20.json'));
    assert.equal(r.kind, 'depth');
    if (r.kind !== 'depth') return;
    assert.equal(r.bids.length, 20);
    assert.equal(r.asks.length, 20);
    assertWellFormedBook(r.bids, r.asks, 'binance');
  });

  test('FACT: depth messages carry no event time (E) — latency must come from trade messages only', () => {
    // 예전 코드는 depth 에서 E 가 없으면 now 로 대신해 지연을 항상 1ms 로 기록했다.
    const depth = fx('binance_depth20.json');
    assert.equal(depth.data.E, undefined);
    assert.equal(depth.data.T, undefined);
  });

  test('trade real message parses with event time', () => {
    const r = parseBinanceStream(fx('binance_trade.json'));
    assert.equal(r.kind, 'trade');
    if (r.kind !== 'trade') return;
    assert.ok(r.trade.price > 0 && r.trade.qty > 0);
    assert.ok(Number.isFinite(r.trade.eventTime) && Number.isFinite(r.trade.tradeTime));
    assert.equal(typeof r.trade.isBuyerMaker, 'boolean');
  });

  test('unrelated or malformed messages are ignored', () => {
    assert.equal(parseBinanceStream({ stream: 'btcusdt@ticker', data: {} }).kind, 'ignored');
    assert.equal(parseBinanceStream(null).kind, 'ignored');
    assert.equal(parseBinanceStream({ stream: 'btcusdt@trade', data: { p: 'x' } }).kind, 'ignored');
  });
});

describe('latencyStats', () => {
  test('no samples → null (no invented initial values)', () => {
    assert.equal(latencyStats([]), null);
  });
  test('computes current/avg/min/max/jitter from samples', () => {
    const s = latencyStats([10, 20, 30])!;
    assert.equal(s.current, 30);
    assert.equal(s.avg, 20);
    assert.equal(s.min, 10);
    assert.equal(s.max, 30);
    assert.equal(s.jitter, 10);
  });
});
