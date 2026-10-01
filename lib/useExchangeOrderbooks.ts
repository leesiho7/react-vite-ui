'use client';

// OKX / Upbit 실시간 호가 훅 (브라우저에서 거래소 공개 WebSocket 에 직접 연결).
// 파싱 규칙은 lib/exchangeOrderbookParsers.ts 에 있고, 실제 서버 응답으로 검증했다.
//
// 원칙
//  - 값을 만들지 않는다: 연결 전·끊김·정체(15초 무수신) 상태에서는 호가를 비운다 (오래된 값을 현재 값처럼 남기지 않는다).
//  - 끊기면 지수 백오프(1s→15s)로 재연결한다.
//  - 거래소에 없는 마켓은 'NO_MARKET' 으로 구분한다 (연결 실패와 다르다).

import { useEffect, useRef, useState } from 'react';
import {
  type L2Level,
  applyOkxMessage,
  createOkxBookState,
  okxBookToLevels,
  parseUpbitOrderbook,
  toOkxInstId,
  toUpbitCode,
  upbitToUsdtLevels,
  upbitUsdtKrwMid,
  type UpbitOrderbookMessage,
} from './exchangeOrderbookParsers';

export type FeedStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'NO_MARKET';

export interface OrderbookFeed {
  bids: L2Level[];
  asks: L2Level[];
  status: FeedStatus;
}

const EMPTY: OrderbookFeed = { bids: [], asks: [], status: 'CONNECTING' };

const FLUSH_MS = 100; // 화면 갱신 주기 (다른 거래소 피드와 동일)
const STALE_MS = 15_000; // 이 시간 동안 메시지가 없으면 끊긴 것으로 본다
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 15_000;

/** 공통: 재연결·정체 감시·정리를 담당하는 소켓 러너. connect 가 만든 소켓의 수명을 관리한다. */
function runReconnectingSocket(opts: {
  open: () => WebSocket;
  onOpen: (ws: WebSocket) => void;
  onMessage: (data: unknown) => void;
  onDown: () => void; // 끊김/정체 시 호가 비우기
  setStatus: (s: FeedStatus) => void;
}): () => void {
  let disposed = false;
  let ws: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdog: ReturnType<typeof setInterval> | null = null;
  let backoff = BACKOFF_MIN_MS;
  let lastMsgAt = Date.now();
  const decoder = new TextDecoder();

  const scheduleRetry = () => {
    if (disposed) return;
    opts.onDown();
    opts.setStatus('DISCONNECTED');
    retryTimer = setTimeout(connect, backoff);
    backoff = Math.min(BACKOFF_MAX_MS, backoff * 2);
  };

  function connect() {
    if (disposed) return;
    opts.setStatus('CONNECTING');
    try {
      ws = opts.open();
    } catch (e) {
      console.warn('[orderbook ws] open failed:', e);
      scheduleRetry();
      return;
    }
    ws.binaryType = 'arraybuffer'; // Upbit 은 JSON 을 바이너리 프레임으로 보낸다
    const mine = ws;

    mine.onopen = () => {
      if (disposed || ws !== mine) return;
      lastMsgAt = Date.now();
      opts.onOpen(mine);
    };
    mine.onmessage = (ev) => {
      if (disposed || ws !== mine) return;
      lastMsgAt = Date.now();
      try {
        const text = typeof ev.data === 'string' ? ev.data : decoder.decode(ev.data as ArrayBuffer);
        opts.onMessage(JSON.parse(text));
        backoff = BACKOFF_MIN_MS; // 정상 수신 확인 후에만 백오프 초기화
      } catch {
        // 파싱 불가 메시지(예: 'pong')는 무시
      }
    };
    mine.onerror = () => {
      /* onclose 에서 처리 */
    };
    mine.onclose = () => {
      if (disposed || ws !== mine) return;
      scheduleRetry();
    };
  }

  watchdog = setInterval(() => {
    if (disposed || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (Date.now() - lastMsgAt > STALE_MS) {
      console.warn('[orderbook ws] stale — reconnecting');
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }, 5_000);

  connect();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (watchdog) clearInterval(watchdog);
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  };
}

/** OKX 현물 호가 (books 채널: 스냅샷 + 증분, 상위 20단계). USDT 마켓이 아니거나 OKX 에 없으면 NO_MARKET. */
export function useOkxOrderbook(symbol: string): OrderbookFeed {
  const [feed, setFeed] = useState<OrderbookFeed>(EMPTY);
  const pending = useRef<{ bids: L2Level[]; asks: L2Level[] } | null>(null);

  useEffect(() => {
    const instId = toOkxInstId(symbol);
    if (!instId) {
      setFeed({ bids: [], asks: [], status: 'NO_MARKET' });
      return;
    }

    setFeed({ bids: [], asks: [], status: 'CONNECTING' });
    pending.current = null;
    const state = createOkxBookState();
    let noMarket = false;
    let status: FeedStatus = 'CONNECTING';

    const publish = (s: FeedStatus) => {
      status = s;
      setFeed((prev) => (prev.status === s ? prev : { ...prev, status: s }));
    };

    const flush = setInterval(() => {
      if (pending.current) {
        const p = pending.current;
        pending.current = null;
        setFeed({ bids: p.bids, asks: p.asks, status });
      }
    }, FLUSH_MS);

    const stop = runReconnectingSocket({
      open: () => new WebSocket('wss://ws.okx.com:8443/ws/v5/public'),
      onOpen: (ws) => {
        state.bids.clear();
        state.asks.clear();
        ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId }] }));
      },
      onMessage: (data) => {
        const r = applyOkxMessage(state, data);
        if (r.kind === 'error') {
          // 존재하지 않는 instId 등 — 재연결해도 소용없으므로 NO_MARKET 으로 고정한다
          noMarket = true;
          pending.current = null;
          setFeed({ bids: [], asks: [], status: 'NO_MARKET' });
          return;
        }
        if (r.kind === 'book' && !noMarket) {
          pending.current = okxBookToLevels(state, 20);
          if (status !== 'CONNECTED') publish('CONNECTED');
        }
      },
      onDown: () => {
        state.bids.clear();
        state.asks.clear();
        pending.current = null;
        if (!noMarket) setFeed({ bids: [], asks: [], status: 'DISCONNECTED' });
      },
      setStatus: (s) => {
        if (noMarket) return;
        publish(s);
      },
    });

    return () => {
      clearInterval(flush);
      stop();
    };
  }, [symbol]);

  return feed;
}

export interface UpbitFeed extends OrderbookFeed {
  /** 환산에 쓴 Upbit KRW-USDT 중간가 (KRW per USDT). 아직 못 받았으면 null — 이때 호가는 비어 있다. */
  krwPerUsdt: number | null;
}

const UPBIT_MARKETS_URL = 'https://api.upbit.com/v1/market/all?isDetails=false';

/**
 * Upbit 현물 호가 (KRW 마켓). KRW 호가를 Upbit 자체 KRW-USDT 호가의 중간가로 USDT 환산해서 돌려준다.
 * 상장 여부는 REST 로 먼저 확인한다 — 없는 마켓을 구독하면 서버가 오류 없이 연결을 끊어 버리기 때문이다.
 */
export function useUpbitOrderbook(symbol: string): UpbitFeed {
  const [feed, setFeed] = useState<UpbitFeed>({ ...EMPTY, krwPerUsdt: null });
  const pending = useRef<UpbitFeed | null>(null);

  useEffect(() => {
    const code = toUpbitCode(symbol);
    if (!code) {
      setFeed({ bids: [], asks: [], status: 'NO_MARKET', krwPerUsdt: null });
      return;
    }

    let cancelled = false;
    let stop: (() => void) | null = null;
    let status: FeedStatus = 'CONNECTING';
    let coinMsg: UpbitOrderbookMessage | null = null;
    let usdtMsg: UpbitOrderbookMessage | null = null;
    pending.current = null;
    setFeed({ bids: [], asks: [], status: 'CONNECTING', krwPerUsdt: null });

    const publish = (s: FeedStatus) => {
      status = s;
      setFeed((prev) => (prev.status === s ? prev : { ...prev, status: s }));
    };

    const flush = setInterval(() => {
      if (pending.current) {
        const p = pending.current;
        pending.current = null;
        setFeed({ ...p, status });
      }
    }, FLUSH_MS);

    const start = async () => {
      // 1) 상장 마켓 확인
      try {
        const res = await fetch(UPBIT_MARKETS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const markets: Array<{ market: string }> = await res.json();
        if (cancelled) return;
        if (!markets.some((m) => m.market === code)) {
          setFeed({ bids: [], asks: [], status: 'NO_MARKET', krwPerUsdt: null });
          return;
        }
      } catch (e) {
        // 목록을 못 받았다고 해서 "없는 마켓"이라고 단정하지 않는다 — 연결 실패로 표시하고 계속 시도한다
        console.warn('[Upbit] market list fetch failed:', e);
        if (cancelled) return;
      }

      // 2) 호가 + KRW-USDT 환율 구독
      stop = runReconnectingSocket({
        open: () => new WebSocket('wss://api.upbit.com/websocket/v1'),
        onOpen: (ws) => {
          coinMsg = null;
          usdtMsg = null;
          ws.send(
            JSON.stringify([
              { ticket: `aether-${Math.random().toString(36).slice(2, 10)}` },
              { type: 'orderbook', codes: [code, 'KRW-USDT'] },
              { format: 'DEFAULT' },
            ])
          );
        },
        onMessage: (data) => {
          const m = parseUpbitOrderbook(data);
          if (!m) return;
          if (m.code === 'KRW-USDT') usdtMsg = m;
          if (m.code === code) coinMsg = m;
          const rate = upbitUsdtKrwMid(usdtMsg);
          const lv = upbitToUsdtLevels(coinMsg, rate);
          pending.current = { ...lv, status, krwPerUsdt: rate };
          // 호가와 환율이 모두 갖춰진 뒤에만 CONNECTED
          if (status !== 'CONNECTED' && lv.bids.length > 0 && lv.asks.length > 0) publish('CONNECTED');
        },
        onDown: () => {
          coinMsg = null;
          usdtMsg = null;
          pending.current = null;
          setFeed({ bids: [], asks: [], status: 'DISCONNECTED', krwPerUsdt: null });
        },
        setStatus: publish,
      });
    };

    start();

    return () => {
      cancelled = true;
      clearInterval(flush);
      if (stop) stop();
    };
  }, [symbol]);

  return feed;
}
