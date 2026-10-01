// OKX / Upbit 호가 WebSocket 메시지 파서 (순수 함수 — React/브라우저 API 의존 없음).
//
// 실제 서버 응답(2026-10 실측)을 기준으로 작성했다:
//  - OKX `books` 채널: 첫 메시지는 action:"snapshot"(최대 400단계), 이후 action:"update" 증분.
//    각 단계는 [가격, 수량, 청산주문수(deprecated), 주문수] 문자열 배열이며 수량 "0" 은 해당 호가 삭제.
//  - Upbit `orderbook`: orderbook_units 15단계(매도 오름차순·매수 내림차순, 최우선 호가가 첫 원소), KRW 가격.
//
// 값을 만들어 내지 않는다 — 입력에서 읽은 값만 변환하고, 읽지 못하면 비운다.

export interface L2Level {
  price: number;
  qty: number;
  /** 최우선 호가부터의 누적 수량 */
  total: number;
}

/** OKX 로컬 호가창: 가격(문자열 그대로) → 수량. 문자열 키를 써서 부동소수점 비교 오차를 피한다. */
export interface OkxBookState {
  bids: Map<string, number>;
  asks: Map<string, number>;
}

export function createOkxBookState(): OkxBookState {
  return { bids: new Map(), asks: new Map() };
}

/** 'BTCUSDT' -> 'BTC-USDT'. USDT 마켓이 아니면 null. */
export function toOkxInstId(symbol: string): string | null {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s.endsWith('USDT') || s.length <= 4) return null;
  return `${s.slice(0, -4)}-USDT`;
}

/** 'BTCUSDT' -> 'KRW-BTC'. USDT 마켓이 아니면 null. */
export function toUpbitCode(symbol: string): string | null {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s.endsWith('USDT') || s.length <= 4) return null;
  return `KRW-${s.slice(0, -4)}`;
}

function applyLevels(side: Map<string, number>, levels: unknown): void {
  if (!Array.isArray(levels)) return;
  for (const lv of levels) {
    if (!Array.isArray(lv) || lv.length < 2) continue;
    const price = String(lv[0]);
    const qty = parseFloat(String(lv[1]));
    if (Number.isNaN(qty)) continue;
    if (qty === 0) side.delete(price);
    else side.set(price, qty);
  }
}

export type OkxMessageKind = 'book' | 'error' | 'ignored';

/**
 * OKX 메시지 하나를 로컬 호가창에 반영한다.
 * - 'book'   : 호가창이 바뀌었다
 * - 'error'  : 구독 실패(예: 존재하지 않는 instId, 코드 60018) — message 에 사유
 * - 'ignored': 구독 확인·ping 등 호가와 무관한 메시지
 */
export function applyOkxMessage(
  state: OkxBookState,
  raw: unknown
): { kind: OkxMessageKind; message?: string } {
  if (typeof raw !== 'object' || raw === null) return { kind: 'ignored' };
  const msg = raw as Record<string, any>;

  if (msg.event === 'error') {
    return { kind: 'error', message: String(msg.msg ?? msg.code ?? 'unknown error') };
  }
  if (msg.arg?.channel !== 'books' || !Array.isArray(msg.data) || msg.data.length === 0) {
    return { kind: 'ignored' };
  }

  if (msg.action === 'snapshot') {
    state.bids.clear();
    state.asks.clear();
  }
  for (const d of msg.data) {
    applyLevels(state.bids, d?.bids);
    applyLevels(state.asks, d?.asks);
  }
  return { kind: 'book' };
}

/**
 * Bybit v5 `orderbook.N.SYMBOL` 메시지를 로컬 호가창에 반영한다 (OKX 와 같은 BookState 를 쓴다).
 * 첫 메시지는 type:"snapshot", 이후는 type:"delta" — delta 는 바뀐 단계만 담고 수량 "0" 은 삭제다.
 * (예전 코드는 delta 를 호가창 전체로 덮어써서, 삭제된 호가가 최우선 호가로 보이는 오류가 있었다.)
 */
export function applyBybitMessage(state: OkxBookState, raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const msg = raw as Record<string, any>;
  if (typeof msg.topic !== 'string' || !msg.topic.startsWith('orderbook') || typeof msg.data !== 'object' || msg.data === null) {
    return false;
  }
  if (msg.type === 'snapshot') {
    state.bids.clear();
    state.asks.clear();
  } else if (msg.type !== 'delta') {
    return false;
  }
  applyLevels(state.bids, msg.data.b);
  applyLevels(state.asks, msg.data.a);
  return true;
}

function accumulate(rows: Array<{ price: number; qty: number }>): L2Level[] {
  let total = 0;
  return rows.map(({ price, qty }) => {
    total += qty;
    return { price, qty, total };
  });
}

/** OKX 로컬 호가창 → 상위 depth 단계 (매수 내림차순, 매도 오름차순). */
export function okxBookToLevels(state: OkxBookState, depth = 20): { bids: L2Level[]; asks: L2Level[] } {
  const toRows = (m: Map<string, number>) =>
    Array.from(m, ([p, q]) => ({ price: parseFloat(p), qty: q })).filter((r) => !Number.isNaN(r.price));
  const bids = toRows(state.bids).sort((a, b) => b.price - a.price).slice(0, depth);
  const asks = toRows(state.asks).sort((a, b) => a.price - b.price).slice(0, depth);
  return { bids: accumulate(bids), asks: accumulate(asks) };
}

/** 'BTCUSDT' -> 'BTCUSDT'. USDT 선물 심볼이 아니면 null. */
export function toBitunixSymbol(symbol: string): string | null {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.endsWith('USDT') && s.length > 4 ? s : null;
}

export type BitunixDepthResult =
  | { kind: 'book'; bids: L2Level[]; asks: L2Level[] }
  | { kind: 'no_market' }
  | { kind: 'ignored' };

/**
 * Bitunix 선물 `depth_book15` 메시지 파싱. 매 메시지가 15단계 전체 스냅샷이다(증분 아님).
 * 형식: {"ch":"depth_book15","symbol":"BTCUSDT","ts":…,"data":{"b":[["가격","수량"],…],"a":[…]}}
 * 존재하지 않는 심볼은 오류 대신 빈 문자열 단계([["",""],…])로 응답한다 — 가격 0 으로 읽지 않고 no_market 으로 구분한다.
 * 연결 확인({"op":"connect"})·pong 은 ignored.
 */
export function parseBitunixDepth(raw: unknown): BitunixDepthResult {
  if (typeof raw !== 'object' || raw === null) return { kind: 'ignored' };
  const msg = raw as Record<string, any>;
  if (typeof msg.ch !== 'string' || !msg.ch.startsWith('depth_book') || typeof msg.data !== 'object' || msg.data === null) {
    return { kind: 'ignored' };
  }
  const read = (levels: unknown) => {
    const rows: Array<{ price: number; qty: number }> = [];
    let sawEmpty = false;
    if (!Array.isArray(levels)) return { rows, sawEmpty: false };
    for (const lv of levels) {
      if (!Array.isArray(lv) || lv.length < 2) continue;
      if (lv[0] === '' || lv[1] === '') {
        sawEmpty = true;
        continue;
      }
      const price = parseFloat(String(lv[0]));
      const qty = parseFloat(String(lv[1]));
      if (Number.isFinite(price) && Number.isFinite(qty) && price > 0 && qty > 0) rows.push({ price, qty });
    }
    return { rows, sawEmpty };
  };
  const b = read(msg.data.b);
  const a = read(msg.data.a);
  if (b.rows.length === 0 && a.rows.length === 0) {
    return b.sawEmpty || a.sawEmpty ? { kind: 'no_market' } : { kind: 'ignored' };
  }
  return { kind: 'book', bids: accumulate(b.rows), asks: accumulate(a.rows) };
}

export interface UpbitOrderbookMessage {
  code: string;
  bids: Array<{ price: number; qty: number }>; // KRW, 최우선 호가부터
  asks: Array<{ price: number; qty: number }>;
}

/** Upbit orderbook 메시지 파싱. 형식이 맞지 않으면 null. */
export function parseUpbitOrderbook(raw: unknown): UpbitOrderbookMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const msg = raw as Record<string, any>;
  if (msg.type !== 'orderbook' || typeof msg.code !== 'string' || !Array.isArray(msg.orderbook_units)) {
    return null;
  }
  const bids: Array<{ price: number; qty: number }> = [];
  const asks: Array<{ price: number; qty: number }> = [];
  for (const u of msg.orderbook_units) {
    const bp = Number(u?.bid_price);
    const bs = Number(u?.bid_size);
    const ap = Number(u?.ask_price);
    const as = Number(u?.ask_size);
    if (Number.isFinite(bp) && Number.isFinite(bs)) bids.push({ price: bp, qty: bs });
    if (Number.isFinite(ap) && Number.isFinite(as)) asks.push({ price: ap, qty: as });
  }
  if (bids.length === 0 && asks.length === 0) return null;
  return { code: msg.code, bids, asks };
}

/** KRW-USDT 호가의 중간가(KRW per USDT). 양쪽 최우선 호가가 없으면 null — 환율을 지어내지 않는다. */
export function upbitUsdtKrwMid(msg: UpbitOrderbookMessage | null): number | null {
  if (!msg || msg.bids.length === 0 || msg.asks.length === 0) return null;
  const mid = (msg.bids[0].price + msg.asks[0].price) / 2;
  return Number.isFinite(mid) && mid > 0 ? mid : null;
}

/** KRW 호가를 USDT 환산 가격으로 변환한다. krwPerUsdt 가 없으면 빈 호가창(환산 불가). */
export function upbitToUsdtLevels(
  msg: UpbitOrderbookMessage | null,
  krwPerUsdt: number | null,
  depth = 20
): { bids: L2Level[]; asks: L2Level[] } {
  if (!msg || !krwPerUsdt || krwPerUsdt <= 0) return { bids: [], asks: [] };
  const conv = (rows: Array<{ price: number; qty: number }>) =>
    accumulate(rows.slice(0, depth).map((r) => ({ price: r.price / krwPerUsdt, qty: r.qty })));
  return { bids: conv(msg.bids), asks: conv(msg.asks) };
}

export interface BinanceTrade {
  id: number;
  price: number;
  qty: number;
  isBuyerMaker: boolean;
  /** 거래소 이벤트 시각(ms). 지연 측정은 이 값이 있는 메시지에서만 할 수 있다. */
  eventTime: number;
  /** 체결 시각(ms) */
  tradeTime: number;
}

export type BinanceStreamResult =
  | { kind: 'depth'; bids: L2Level[]; asks: L2Level[] }
  | { kind: 'trade'; trade: BinanceTrade }
  | { kind: 'ignored' };

/**
 * Binance 현물 combined stream 메시지 파싱 ({"stream":"btcusdt@depth20@100ms"|"btcusdt@trade","data":{…}}).
 * depth20 은 매 메시지가 상위 20단계 전체 스냅샷이다 (증분 아님).
 * 주의: depth 메시지에는 이벤트 시각(E)이 없다 — 지연은 E 가 있는 trade 메시지에서만 측정할 수 있다.
 * (예전 코드는 depth 에서도 E 가 없으면 now 로 대신해 지연을 항상 1ms 로 기록했다.)
 */
export function parseBinanceStream(raw: unknown): BinanceStreamResult {
  if (typeof raw !== 'object' || raw === null) return { kind: 'ignored' };
  const msg = raw as Record<string, any>;
  const stream: string = typeof msg.stream === 'string' ? msg.stream : '';
  const data = msg.data;
  if (typeof data !== 'object' || data === null) return { kind: 'ignored' };

  if (stream.endsWith('@depth20@100ms')) {
    const read = (levels: unknown) => {
      const rows: Array<{ price: number; qty: number }> = [];
      if (!Array.isArray(levels)) return rows;
      for (const lv of levels) {
        if (!Array.isArray(lv) || lv.length < 2) continue;
        const price = parseFloat(String(lv[0]));
        const qty = parseFloat(String(lv[1]));
        if (Number.isFinite(price) && Number.isFinite(qty) && price > 0 && qty > 0) rows.push({ price, qty });
      }
      return rows;
    };
    const bids = read(data.bids);
    const asks = read(data.asks);
    if (bids.length === 0 && asks.length === 0) return { kind: 'ignored' };
    return { kind: 'depth', bids: accumulate(bids), asks: accumulate(asks) };
  }

  if (stream.endsWith('@trade')) {
    const price = parseFloat(String(data.p));
    const qty = parseFloat(String(data.q));
    const eventTime = Number(data.E);
    const tradeTime = Number(data.T);
    if (!Number.isFinite(price) || !Number.isFinite(qty) || !Number.isFinite(eventTime) || !Number.isFinite(tradeTime)) {
      return { kind: 'ignored' };
    }
    return {
      kind: 'trade',
      trade: { id: Number(data.t), price, qty, isBuyerMaker: Boolean(data.m), eventTime, tradeTime },
    };
  }
  return { kind: 'ignored' };
}

/** Bybit 구독 응답이 "존재하지 않는 심볼" 오류인지: {"success":false,"ret_msg":"Invalid symbol :[orderbook.50.X]"} */
export function isBybitInvalidSymbol(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const msg = raw as Record<string, any>;
  return msg.op === 'subscribe' && msg.success === false && /invalid symbol/i.test(String(msg.ret_msg ?? ''));
}

/** 최근 N개 지연 표본으로 통계를 만든다. 표본이 없으면 null — 값을 지어내지 않는다. */
export function latencyStats(samples: number[]): { current: number; avg: number; min: number; max: number; jitter: number } | null {
  if (samples.length === 0) return null;
  const current = samples[samples.length - 1];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    current,
    avg: Math.round(avg * 10) / 10,
    min: Math.min(...samples),
    max: Math.max(...samples),
    jitter: Math.round(Math.abs(current - avg) * 10) / 10,
  };
}