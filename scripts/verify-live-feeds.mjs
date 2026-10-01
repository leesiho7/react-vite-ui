// 실제 거래소 공개 WebSocket/REST 를 상대로 한 점검 (`npm run verify:live`).
// 단위 테스트(`npm test`)는 고정된 fixture 로 파서 규칙을 검증하고, 이 스크립트는 "지금 거래소가 보내는 메시지를
// 파서가 여전히 올바르게 읽는지"(거래소 쪽 형식 변경 감지)를 확인한다. 네트워크가 필요하다.
//
// 브라우저가 보내는 Origin 헤더를 붙여 접속이 거부되지 않는지도 함께 본다.

import {
  applyBybitMessage, applyOkxMessage, createOkxBookState, okxBookToLevels,
  parseBinanceStream, parseBitunixDepth, parseUpbitOrderbook, upbitToUsdtLevels, upbitUsdtKrwMid,
} from '../lib/exchangeOrderbookParsers.ts';

const ORIGIN = process.env.VERIFY_ORIGIN || 'https://aetherquantstudio.com';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) failures++;
};

function listen(url, onOpen, onMessage, ms) {
  return new Promise((resolve) => {
    const s = new WebSocket(url, { headers: { Origin: ORIGIN } });
    s.binaryType = 'arraybuffer';
    const t = setTimeout(() => { try { s.close(); } catch {} }, ms);
    s.onopen = () => onOpen && onOpen(s);
    s.onmessage = (ev) => {
      try { onMessage(JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data))); } catch {}
    };
    s.onerror = () => {};
    s.onclose = () => { clearTimeout(t); resolve(); };
  });
}

const wellFormed = (bids, asks) =>
  bids.length > 0 && asks.length > 0 && bids[0].price < asks[0].price &&
  bids.every((x, i) => i === 0 || x.price < bids[i - 1].price) &&
  asks.every((x, i) => i === 0 || x.price > asks[i - 1].price);
const close = (a, b, tol) => Math.abs(a - b) / b < tol;
const json = async (url) => (await fetch(url)).json();

// ── OKX
{
  const st = createOkxBookState();
  let err = 0;
  await listen('wss://ws.okx.com:8443/ws/v5/public',
    (s) => s.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId: 'BTC-USDT' }] })),
    (m) => { if (applyOkxMessage(st, m).kind === 'error') err++; }, 5000);
  const { bids, asks } = okxBookToLevels(st, 20);
  const rest = (await json('https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=1')).data[0];
  check('OKX: well-formed 20-level book, no errors', wellFormed(bids, asks) && bids.length === 20 && err === 0);
  check('OKX: top of book matches REST (±0.1%)', close(bids[0].price, parseFloat(rest.bids[0][0]), 0.001) && close(asks[0].price, parseFloat(rest.asks[0][0]), 0.001));
}

// ── Bybit (snapshot + delta)
{
  const st = createOkxBookState();
  let deltas = 0;
  await listen('wss://stream.bybit.com/v5/public/spot',
    (s) => s.send(JSON.stringify({ op: 'subscribe', args: ['orderbook.50.BTCUSDT'] })),
    (m) => { if (m.type === 'delta') deltas++; applyBybitMessage(st, m); }, 5000);
  const { bids, asks } = okxBookToLevels(st, 20);
  const rest = (await json('https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=1')).result;
  check('Bybit: received deltas and book is well-formed', deltas > 5 && wellFormed(bids, asks), `deltas=${deltas}`);
  check('Bybit: top of book matches REST (±0.05%)', close(bids[0].price, parseFloat(rest.b[0][0]), 0.0005) && close(asks[0].price, parseFloat(rest.a[0][0]), 0.0005));
}

// ── Binance spot (depth20 + trade)
{
  let depth = null, trades = 0;
  await listen('wss://stream.binance.com:9443/stream?streams=btcusdt@depth20@100ms/btcusdt@trade', null, (m) => {
    const r = parseBinanceStream(m);
    if (r.kind === 'depth') depth = r; else if (r.kind === 'trade') trades++;
  }, 4000);
  check('Binance: 20-level well-formed book and trades flowing', !!depth && depth.bids.length === 20 && wellFormed(depth.bids, depth.asks) && trades > 0, `trades=${trades}`);
  const bt = await json('https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT');
  check('Binance: top of book matches REST (±0.05%)', close(depth.bids[0].price, parseFloat(bt.bidPrice), 0.0005));
}

// ── Upbit (KRW → USDT)
{
  let btc = null, usdt = null;
  await listen('wss://api.upbit.com/websocket/v1',
    (s) => s.send(JSON.stringify([{ ticket: 'aether-verify' }, { type: 'orderbook', codes: ['KRW-BTC', 'KRW-USDT'] }, { format: 'DEFAULT' }])),
    (m) => { const p = parseUpbitOrderbook(m); if (p?.code === 'KRW-BTC') btc = p; if (p?.code === 'KRW-USDT') usdt = p; }, 4000);
  const rate = upbitUsdtKrwMid(usdt);
  const { bids, asks } = upbitToUsdtLevels(btc, rate);
  const bn = await json('https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT');
  const bnMid = (parseFloat(bn.bidPrice) + parseFloat(bn.askPrice)) / 2;
  const premium = ((bids[0].price + asks[0].price) / 2 - bnMid) / bnMid * 100;
  check('Upbit: KRW/USDT rate plausible and converted book well-formed', rate > 1000 && rate < 2500 && wellFormed(bids, asks), `rate=${rate}`);
  check('Upbit: converted BTC within ±3% of Binance (kimchi premium range)', Math.abs(premium) < 3, `premium=${premium.toFixed(3)}%`);
}

// ── Bitunix perpetual
{
  let last = null, noMarket = 0;
  await listen('wss://fapi.bitunix.com/public/',
    (s) => s.send(JSON.stringify({ op: 'subscribe', args: [{ symbol: 'BTCUSDT', ch: 'depth_book15' }] })),
    (m) => { const r = parseBitunixDepth(m); if (r.kind === 'book') last = r; if (r.kind === 'no_market') noMarket++; }, 4000);
  const rest = (await json('https://fapi.bitunix.com/api/v1/futures/market/depth?symbol=BTCUSDT&limit=5')).data;
  check('Bitunix: 15-level well-formed book', !!last && last.bids.length === 15 && wellFormed(last.bids, last.asks) && noMarket === 0);
  check('Bitunix: top of book matches REST (±0.05%)', close(last.bids[0].price, parseFloat(rest.bids[0][0]), 0.0005));
  let unlisted = 0, book = 0;
  await listen('wss://fapi.bitunix.com/public/',
    (s) => s.send(JSON.stringify({ op: 'subscribe', args: [{ symbol: 'NOTREALUSDT', ch: 'depth_book15' }] })),
    (m) => { const r = parseBitunixDepth(m); if (r.kind === 'no_market') unlisted++; if (r.kind === 'book') book++; }, 3000);
  check('Bitunix: unlisted symbol → no_market, never a book', unlisted >= 1 && book === 0);
}

console.log(failures === 0 ? '\nALL LIVE CHECKS PASSED' : `\n${failures} LIVE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
