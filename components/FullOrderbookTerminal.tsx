'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchFundingRates, type FundingRateRow } from '../lib/api';
import { useBitunixOrderbook, useOkxOrderbook, useUpbitOrderbook } from '../lib/useExchangeOrderbooks';
import { applyBybitMessage, createOkxBookState, okxBookToLevels } from '../lib/exchangeOrderbookParsers';
import { ArrowLeftRight, TrendingUp, ShieldCheck, Zap, RefreshCw, Calculator, DollarSign, Activity, Layers, ExternalLink, Flame, CheckCircle, ArrowRight } from 'lucide-react';

interface L2Item {
  price: number;
  qty: number;
  total: number;
}

interface TradeItem {
  id: number;
  time: string;
  price: number;
  qty: number;
  isBuyerMaker: boolean;
}

interface LatencyStats {
  currentMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  jitter: number;
  msgPerSec: number;
  totalPackets: number;
}

export type ExchangeId = 'BINANCE' | 'BYBIT' | 'OKX' | 'UPBIT' | 'BITUNIX';

export function ExchangeLogo({ exchange, size = 16 }: { exchange: ExchangeId; size?: number }) {
  const logoSrcMap: Record<ExchangeId, string> = {
    BINANCE: '/exchanges/binance.jpg',
    BYBIT: '/exchanges/bybit.png',
    OKX: '/exchanges/okx.png',
    UPBIT: '/exchanges/upbit.png',
    BITUNIX: '/exchanges/bitunix.png',
  };

  return (
    <img
      src={logoSrcMap[exchange]}
      alt={`${exchange} official logo`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '3px',
        objectFit: 'contain',
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        background: '#ffffff'
      }}
    />
  );
}

export interface ExchangeInfo {
  id: ExchangeId;
  name: string;
  tag: string;
  color: string;
  badgeBg: string;
  marketType: string;
  /** 실제 호가 WebSocket이 연결된 거래소인지. false 면 회색(미구현)으로 표시하고 값을 만들어 내지 않는다. */
  live: boolean;
  /** 호가가 현물인지 무기한 선물인지. 서로 다른 종류를 비교한 스프레드에는 베이시스가 섞인다. */
  kind: 'SPOT' | 'PERP';
}

export const EXCHANGES: Record<ExchangeId, ExchangeInfo> = {
  BINANCE: {
    id: 'BINANCE',
    name: 'Binance',
    tag: 'BINANCE SPOT DIRECT',
    color: '#f59e0b',
    badgeBg: '#fef3c7',
    marketType: 'Global Spot L2',
    live: true,
    kind: 'SPOT'
  },
  BYBIT: {
    id: 'BYBIT',
    name: 'Bybit',
    tag: 'BYBIT V5 DIRECT',
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    marketType: 'Global Derivatives/Spot',
    live: true,
    kind: 'SPOT'
  },
  OKX: {
    id: 'OKX',
    name: 'OKX',
    tag: 'OKX V5 FAST-STREAM',
    color: '#10b981',
    badgeBg: '#d1fae5',
    marketType: 'Institutional Web3/Spot',
    live: true,
    kind: 'SPOT'
  },
  UPBIT: {
    id: 'UPBIT',
    name: 'Upbit (KRW)',
    tag: 'UPBIT SPOT (김프 연동)',
    color: '#004fff',
    badgeBg: '#e0e7ff',
    marketType: 'KRW Orderbook (USDT 환산)',
    live: true,
    kind: 'SPOT'
  },
  BITUNIX: {
    id: 'BITUNIX',
    name: 'Bitunix',
    tag: 'BITUNIX PERP FEED',
    color: '#8b5cf6',
    badgeBg: '#ede9fe',
    marketType: 'USDT-M Perpetual',
    live: true,
    kind: 'PERP'
  }
};

// 펀딩 매트릭스에 쓰는 종목 표시 이름. 이름은 라벨일 뿐이고, 펀딩비·미결제약정·거래량·정산 시각은
// 전부 백엔드(/api/market/funding-rates → Binance USDⓈ-M Futures 공개 API)에서 받아온 실제 값이다.
const FUNDING_ASSET_NAMES: Record<string, string> = {
  SUIUSDT: 'Sui Network',
  DOGEUSDT: 'Dogecoin',
  SOLUSDT: 'Solana',
  BNBUSDT: 'Binance Coin',
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  ADAUSDT: 'Cardano',
  XRPUSDT: 'Ripple',
};

const FUNDING_REFRESH_MS = 30_000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** 큰 USD 금액을 $342.1M / $8.20B 형태로. 값이 없으면 '—' (지어내지 않는다). */
function formatUsdCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatSignedPct(value: number, digits: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function FullOrderbookTerminal({ defaultSymbol = 'BTCUSDT', language = 'ko' }: { defaultSymbol?: string; language?: 'en' | 'cn' | 'ko' }) {
  // 영문 모드만 영문으로, 그 외(ko/cn)는 기존 한국어 유지
  const isEn = language === 'en';
  const tr = (ko: string, en: string) => (isEn ? en : ko);
  const localizeExchangeText = (s: string) =>
    isEn ? s.replace('김프 연동', 'Kimchi Premium').replace('USDT 환산', 'USDT converted') : s;
  const [activeTab, setActiveTab] = useState<'HEATMAP_ARBITRAGE' | 'DUAL_L2' | 'SINGLE_L2' | 'FUNDING_RATES'>('HEATMAP_ARBITRAGE');
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [precision, setPrecision] = useState<number>(2);

  // Selected Exchange Pairing for Dual View
  const [exchangeA, setExchangeA] = useState<ExchangeId>('BINANCE');
  const [exchangeB, setExchangeB] = useState<ExchangeId>('BYBIT');

  // Real-time Orderbook Data Streams — 거래소 WebSocket 에서 첫 메시지를 받기 전에는 비어 있다.
  // (예전에는 하드코딩한 스냅샷으로 시작해, 연결 전·연결 실패 시에도 그럴듯한 호가가 보였다.)
  const [binanceBids, setBinanceBids] = useState<L2Item[]>([]);
  const [binanceAsks, setBinanceAsks] = useState<L2Item[]>([]);
  const [binanceWsStatus, setBinanceWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');

  const [bybitBids, setBybitBids] = useState<L2Item[]>([]);
  const [bybitAsks, setBybitAsks] = useState<L2Item[]>([]);
  const [bybitWsStatus, setBybitWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');

  const [trades, setTrades] = useState<TradeItem[]>([]);

  // Calculator State for Delta Neutral Funding Yield
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [selectedFundingAsset, setSelectedFundingAsset] = useState<FundingRateRow | null>(null);
  const [calcCapital, setCalcCapital] = useState<number>(10000);

  // 펀딩비 실데이터 — 펀딩 탭이 열려 있는 동안만 30초마다 갱신한다.
  const [fundingRows, setFundingRows] = useState<FundingRateRow[]>([]);
  const [fundingStatus, setFundingStatus] = useState<'loading' | 'ok' | 'unavailable'>('loading');
  const [fundingFetchedAt, setFundingFetchedAt] = useState<number | null>(null);
  // 서버 렌더와 시각이 어긋나지 않도록 마운트 후에만 시계를 켠다.
  const [fundingNowMs, setFundingNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab !== 'FUNDING_RATES') return;
    let cancelled = false;
    const load = async () => {
      const res = await fetchFundingRates();
      if (cancelled) return;
      if (res && res.available && res.items && res.items.length > 0) {
        setFundingRows(res.items);
        setFundingFetchedAt(res.fetchedAt ?? Date.now());
        setFundingStatus('ok');
      } else {
        // 장애 시 이전 값을 "현재 값"처럼 남겨 두지 않는다 — 비우고 데이터 없음으로 표시한다.
        setFundingRows([]);
        setFundingStatus('unavailable');
      }
    };
    setFundingStatus((s) => (s === 'ok' ? s : 'loading'));
    load();
    const id = setInterval(load, FUNDING_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'FUNDING_RATES') return;
    setFundingNowMs(Date.now());
    const id = setInterval(() => setFundingNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeTab]);

  // 시뮬레이터: 표에서 연 경우 그 행을 쓰고, 오더북 바에서 연 경우 해당 심볼의 실제 값을 따로 조회한다.
  // 거래소에 없는 심볼(예: 업비트 전용)이면 지어내지 않고 "데이터 없음"을 보여준다.
  const [simStatus, setSimStatus] = useState<'ok' | 'loading' | 'unavailable'>('ok');
  const openSimulator = async (sym: string, row?: FundingRateRow) => {
    setCalcModalOpen(true);
    if (row) {
      setSelectedFundingAsset(row);
      setSimStatus('ok');
      return;
    }
    setSelectedFundingAsset(null);
    setSimStatus('loading');
    const res = await fetchFundingRates([sym]);
    const found = res && res.available ? res.items?.find((i) => i.symbol === sym) : undefined;
    if (found) {
      setSelectedFundingAsset(found);
      setSimStatus('ok');
    } else {
      setSimStatus('unavailable');
    }
  };

  // 헤더 카운트다운: 표에 있는 심볼 중 가장 먼저 도래하는 실제 정산 시각
  const soonestFundingMs = fundingRows.length > 0
    ? Math.min(...fundingRows.map((r) => r.nextFundingTime))
    : null;

  // 피드 지연 측정값 — 실제 메시지를 받아 계산하기 전에는 null (예전엔 12ms/36msg·s 초기값이 박혀 있었다).
  // 측정 방식: 수신 시각 − 거래소 이벤트 시각. 브라우저/거래소 시계 차이가 섞이므로 왕복 지연(RTT)이 아니다.
  const [stats, setStats] = useState<LatencyStats | null>(null);

  const latencyHistoryRef = useRef<number[]>([]);
  const packetCountRef = useRef<number>(0);
  const lastSecTimeRef = useRef<number>(Date.now());
  const wsBinanceRef = useRef<WebSocket | null>(null);
  const wsBybitRef = useRef<WebSocket | null>(null);
  const bybitPingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanPairBinance = useMemo(() => {
    return symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  }, [symbol]);

  const cleanPairBybit = useMemo(() => {
    return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }, [symbol]);

    // Throttled buffer references for buttery smooth 60fps UI
    const pendingBidsRef = useRef<L2Item[] | null>(null);
    const pendingAsksRef = useRef<L2Item[] | null>(null);
    const pendingTradesRef = useRef<TradeItem[]>([]);

    useEffect(() => {
      const flushTimer = setInterval(() => {
        if (pendingBidsRef.current) {
          setBinanceBids(pendingBidsRef.current);
          pendingBidsRef.current = null;
        }
        if (pendingAsksRef.current) {
          setBinanceAsks(pendingAsksRef.current);
          pendingAsksRef.current = null;
        }
        if (pendingTradesRef.current.length > 0) {
          setTrades((prev) => [...pendingTradesRef.current, ...prev].slice(0, 20));
          pendingTradesRef.current = [];
        }
      }, 100);

      return () => clearInterval(flushTimer);
    }, []);

    // 1. Binance WebSocket Connection
    useEffect(() => {
      setBinanceWsStatus('CONNECTING');
      latencyHistoryRef.current = [];
      packetCountRef.current = 0;

      const url = `wss://stream.binance.com:9443/stream?streams=${cleanPairBinance}@depth20@100ms/${cleanPairBinance}@trade`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
        wsBinanceRef.current = ws;
      } catch (e) {
        console.warn('[Binance WS] Initialization error:', e);
        setBinanceWsStatus('DISCONNECTED');
        return;
      }

      ws.onopen = () => {
        setBinanceWsStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        packetCountRef.current += 1;

        try {
          const payload = JSON.parse(event.data);
          const stream: string = payload.stream || '';
          const data = payload.data || {};

          const eventTime: number = data.E || data.T || now;
          const latency = Math.max(1, Math.min(120, now - eventTime));

          const hist = latencyHistoryRef.current;
          hist.push(latency);
          if (hist.length > 50) hist.shift();

          const sum = hist.reduce((a, b) => a + b, 0);
          const avg = sum / hist.length;
          const min = Math.min(...hist);
          const max = Math.max(...hist);
          const jitter = Math.abs(latency - avg);

          if (now - lastSecTimeRef.current >= 1000) {
            const msgRate = packetCountRef.current;
            packetCountRef.current = 0;
            lastSecTimeRef.current = now;

            setStats({
              currentMs: latency,
              avgMs: parseFloat(avg.toFixed(1)),
              minMs: min,
              maxMs: max,
              jitter: parseFloat(jitter.toFixed(1)),
              msgPerSec: msgRate,
              totalPackets: (stats?.totalPackets || 0) + msgRate
            });
          }

          if (stream.endsWith('@depth20@100ms')) {
            const rawBids: [string, string][] = data.bids || [];
            const rawAsks: [string, string][] = data.asks || [];

            let bidTotalA = 0;
            const parsedBidsA: L2Item[] = rawBids.map(([p, q]) => {
              const priceNum = parseFloat(p);
              const qtyNum = parseFloat(q);
              bidTotalA += qtyNum;
              return { price: priceNum, qty: qtyNum, total: bidTotalA };
            });

            let askTotalA = 0;
            const parsedAsksA: L2Item[] = rawAsks.map(([p, q]) => {
              const priceNum = parseFloat(p);
              const qtyNum = parseFloat(q);
              askTotalA += qtyNum;
              return { price: priceNum, qty: qtyNum, total: askTotalA };
            });

            pendingBidsRef.current = parsedBidsA;
            pendingAsksRef.current = parsedAsksA;
          }

          if (stream.endsWith('@trade')) {
            const tradeTime = new Date(data.T || now);
            const timeStr = `${tradeTime.toTimeString().split(' ')[0]}.${String(tradeTime.getMilliseconds()).padStart(3, '0')}`;

            const newTrade: TradeItem = {
              id: data.t || Math.random(),
              time: timeStr,
              price: parseFloat(data.p || '0'),
              qty: parseFloat(data.q || '0'),
              isBuyerMaker: data.m
            };

            pendingTradesRef.current.unshift(newTrade);
            if (pendingTradesRef.current.length > 20) {
              pendingTradesRef.current = pendingTradesRef.current.slice(0, 20);
            }
          }
        } catch (err) {
          // ignore parse error
        }
      };

      // 끊기면 오래된 호가를 남겨 두지 않고 비운다 (히트맵이 낡은 값으로 계산되지 않도록).
      const clearBinance = () => {
        pendingBidsRef.current = null;
        pendingAsksRef.current = null;
        setBinanceBids([]);
        setBinanceAsks([]);
        setBinanceWsStatus('DISCONNECTED');
      };
      ws.onerror = clearBinance;
      ws.onclose = clearBinance;

      return () => {
        if (ws) {
          // 이전 소켓의 늦은 onclose 가 새 연결의 상태/호가를 덮어쓰지 않도록 핸들러를 먼저 뗀다
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          ws.close();
        }
      };
    }, [cleanPairBinance]);

    // 2. Bybit Real-time V5 WebSocket Connection with Throttled Buffer
    const pendingBybitBidsRef = useRef<L2Item[] | null>(null);
    const pendingBybitAsksRef = useRef<L2Item[] | null>(null);

    useEffect(() => {
      const bybitFlushTimer = setInterval(() => {
        if (pendingBybitBidsRef.current) {
          setBybitBids(pendingBybitBidsRef.current);
          pendingBybitBidsRef.current = null;
        }
        if (pendingBybitAsksRef.current) {
          setBybitAsks(pendingBybitAsksRef.current);
          pendingBybitAsksRef.current = null;
        }
      }, 100);

      return () => clearInterval(bybitFlushTimer);
    }, []);

    const bybitBookRef = useRef(createOkxBookState());

    useEffect(() => {
      setBybitWsStatus('CONNECTING');
      // 심볼이 바뀌었을 때 이전 심볼의 호가가 남지 않게 비운다
      pendingBybitBidsRef.current = null;
      pendingBybitAsksRef.current = null;
      setBybitBids([]);
      setBybitAsks([]);

      const bybitUrl = 'wss://stream.bybit.com/v5/public/spot';
      let wsBybit: WebSocket;

      try {
        wsBybit = new WebSocket(bybitUrl);
        wsBybitRef.current = wsBybit;
      } catch (e) {
        console.warn('[Bybit WS] Initialization error:', e);
        setBybitWsStatus('DISCONNECTED');
        return;
      }

      wsBybit.onopen = () => {
        setBybitWsStatus('CONNECTED');
        const subPayload = {
          op: 'subscribe',
          args: [`orderbook.50.${cleanPairBybit}`]
        };
        wsBybit.send(JSON.stringify(subPayload));

        if (bybitPingTimerRef.current) clearInterval(bybitPingTimerRef.current);
        bybitPingTimerRef.current = setInterval(() => {
          if (wsBybit.readyState === WebSocket.OPEN) {
            wsBybit.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
      };

      // Bybit 은 첫 메시지만 전체 스냅샷이고 이후는 변경분(delta)이다 — 로컬 호가창에 반영해 상위 20단계를 만든다.
      // (예전 코드는 delta 를 호가창 전체로 덮어써서 삭제된 호가가 최우선 호가로 보였다.)
      bybitBookRef.current = createOkxBookState();
      wsBybit.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (applyBybitMessage(bybitBookRef.current, msg)) {
            const lv = okxBookToLevels(bybitBookRef.current, 20);
            if (lv.bids.length > 0) pendingBybitBidsRef.current = lv.bids;
            if (lv.asks.length > 0) pendingBybitAsksRef.current = lv.asks;
          }
        } catch (err) {
          // ignore parse error
        }
      };

      // 끊기면 오래된 호가를 남겨 두지 않고 비운다 (히트맵이 낡은 값으로 계산되지 않도록).
      const clearBybit = () => {
        bybitBookRef.current = createOkxBookState();
        pendingBybitBidsRef.current = null;
        pendingBybitAsksRef.current = null;
        setBybitBids([]);
        setBybitAsks([]);
        setBybitWsStatus('DISCONNECTED');
      };
      wsBybit.onerror = clearBybit;
      wsBybit.onclose = clearBybit;

      return () => {
        if (bybitPingTimerRef.current) clearInterval(bybitPingTimerRef.current);
        if (wsBybit) {
          // 이전 소켓의 늦은 onclose 가 새 연결의 상태/호가를 덮어쓰지 않도록 핸들러를 먼저 뗀다
          wsBybit.onmessage = null;
          wsBybit.onerror = null;
          wsBybit.onclose = null;
          wsBybit.close();
        }
      };
    }, [cleanPairBybit]);

  // 거래소별 호가. 전부 거래소 공개 WebSocket 의 실제 호가다: Binance·Bybit·OKX 현물, Upbit KRW 현물(USDT 환산),
  // Bitunix USDT 무기한 선물. (예전에는 OKX/Upbit/Bitunix 호가를 Binance 호가에 고정 비율을 곱해 만들어 냈고
  // 상태도 항상 CONNECTED 였다.) 연결이 없는 거래소가 생기면 NOT_CONNECTED(미구현)로 비워 둔다.
  const okxFeed = useOkxOrderbook(symbol);
  const upbitFeed = useUpbitOrderbook(symbol);
  const bitunixFeed = useBitunixOrderbook(symbol);

  type BookStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'NOT_CONNECTED' | 'NO_MARKET';
  const exchangeBooks = useMemo<Record<ExchangeId, { bids: L2Item[]; asks: L2Item[]; status: BookStatus }>>(() => ({
    BINANCE: { bids: binanceBids, asks: binanceAsks, status: binanceWsStatus },
    BYBIT: { bids: bybitBids, asks: bybitAsks, status: bybitWsStatus },
    OKX: { bids: okxFeed.bids, asks: okxFeed.asks, status: okxFeed.status },
    UPBIT: { bids: upbitFeed.bids, asks: upbitFeed.asks, status: upbitFeed.status },
    BITUNIX: { bids: bitunixFeed.bids, asks: bitunixFeed.asks, status: bitunixFeed.status }
  }), [binanceBids, binanceAsks, bybitBids, bybitAsks, binanceWsStatus, bybitWsStatus, okxFeed, upbitFeed, bitunixFeed]);
  // Selected Orderbooks for Exchange A & Exchange B
  const bookA = exchangeBooks[exchangeA];
  const bookB = exchangeBooks[exchangeB];

  // 호가가 없으면 null — 임의의 기준가(예전엔 67800)로 대신 채우지 않는다.
  const bestBidA: number | null = bookA.bids[0]?.price ?? null;
  const bestAskA: number | null = bookA.asks[0]?.price ?? null;
  const bestBidB: number | null = bookB.bids[0]?.price ?? null;
  const bestAskB: number | null = bookB.asks[0]?.price ?? null;

  // Cross Arbitrage Matrix — 양쪽 모두 실제 호가가 있는 쌍만 계산하고, 나머지는 null(표본 없음)로 둔다.
  const exchangeList: ExchangeId[] = ['BINANCE', 'BYBIT', 'OKX', 'UPBIT', 'BITUNIX'];

  const heatmapMatrix = useMemo(() => {
    type Route = { buyEx: ExchangeId; sellEx: ExchangeId; spreadPct: number; buyPrice: number; sellPrice: number };
    const best: { route: Route | null } = { route: null };

    const matrix = {} as Record<ExchangeId, Record<ExchangeId, number | null>>;
    exchangeList.forEach((a) => {
      matrix[a] = {} as Record<ExchangeId, number | null>;
    });

    exchangeList.forEach((buyEx) => {
      exchangeList.forEach((sellEx) => {
        if (buyEx === sellEx) {
          matrix[buyEx][sellEx] = null;
          return;
        }

        const buyAsk = exchangeBooks[buyEx].asks[0]?.price;
        const sellBid = exchangeBooks[sellEx].bids[0]?.price;
        if (!EXCHANGES[buyEx].live || !EXCHANGES[sellEx].live || !buyAsk || !sellBid) {
          matrix[buyEx][sellEx] = null;
          return;
        }

        const spPct = ((sellBid - buyAsk) / buyAsk) * 100;
        matrix[buyEx][sellEx] = spPct;

        if (best.route === null || spPct > best.route.spreadPct) {
          best.route = { buyEx, sellEx, spreadPct: spPct, buyPrice: buyAsk, sellPrice: sellBid };
        }
      });
    });

    return { matrix, bestRoute: best.route };
  }, [exchangeBooks]);
  // Quick swap handler
  const handleSwapExchanges = () => {
    const temp = exchangeA;
    setExchangeA(exchangeB);
    setExchangeB(temp);
  };

  const handleSelectHeatmapCell = (buy: ExchangeId, sell: ExchangeId) => {
    if (buy === sell) return;
    if (!EXCHANGES[buy].live || !EXCHANGES[sell].live) return; // 미구현 거래소는 선택할 수 없다
    setExchangeA(buy);
    setExchangeB(sell);
    setActiveTab('HEATMAP_ARBITRAGE');
  };

  const maxTotalA = Math.max(bookA.bids[bookA.bids.length - 1]?.total || 1, bookA.asks[bookA.asks.length - 1]?.total || 1);
  const maxTotalB = Math.max(bookB.bids[bookB.bids.length - 1]?.total || 1, bookB.asks[bookB.asks.length - 1]?.total || 1);

  // 양쪽 호가가 모두 있을 때만 계산한다. 없으면 null(표시: —).
  const currentPairSpreadPct: number | null =
    bestAskA !== null && bestBidB !== null && bestAskA > 0 ? ((bestBidB - bestAskA) / bestAskA) * 100 : null;
  const isCurrentProfitable = currentPairSpreadPct !== null && currentPairSpreadPct > 0.015;

  // 연결 상태 요약 (상단 바)
  const liveExchangeIds = exchangeList.filter((e) => EXCHANGES[e].live);
  // 이 심볼이 상장되지 않은 거래소(NO_MARKET)는 연결 실패가 아니므로 분모에서 뺀다.
  const noMarketIds = liveExchangeIds.filter((e) => exchangeBooks[e].status === 'NO_MARKET');
  const expectedLiveIds = liveExchangeIds.filter((e) => exchangeBooks[e].status !== 'NO_MARKET');
  const connectedLiveCount = expectedLiveIds.filter((e) => exchangeBooks[e].status === 'CONNECTED').length;
  const notConnectedCount = exchangeList.length - liveExchangeIds.length;

  const statusLabel = (s: BookStatus) =>
    s === 'CONNECTED' ? 'CONNECTED' : s === 'CONNECTING' ? 'CONNECTING' : s === 'DISCONNECTED' ? 'DISCONNECTED' : s === 'NO_MARKET' ? tr('미상장', 'NOT LISTED') : tr('미구현', 'NOT IMPLEMENTED');
  const statusColor = (s: BookStatus) =>
    s === 'CONNECTED' ? '#10b981' : s === 'CONNECTING' ? '#f59e0b' : s === 'DISCONNECTED' ? '#ef4444' : '#94a3b8';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', fontFamily: "var(--font-sans)", letterSpacing: "-0.015em" }}>
      {/* ── Top Bar with Tab Switchers & Latency Readout ── */}
      <div style={{ background: '#0b131e', borderBottom: '1px solid #1e293b', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px', background: '#1e293b', padding: '3px', borderRadius: '4px' }}>
            <button
              onClick={() => setActiveTab('HEATMAP_ARBITRAGE')}
              style={{
                background: activeTab === 'HEATMAP_ARBITRAGE' ? '#0f766e' : 'transparent',
                color: activeTab === 'HEATMAP_ARBITRAGE' ? '#ffffff' : '#94a3b8',
                border: 0,
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Activity size={12} />
              {tr('거래소 크로스 히트맵 매트릭스', 'Cross-Exchange Heatmap Matrix')}
            </button>
            <button
              onClick={() => setActiveTab('SINGLE_L2')}
              style={{
                background: activeTab === 'SINGLE_L2' ? '#0f766e' : 'transparent',
                color: activeTab === 'SINGLE_L2' ? '#ffffff' : '#94a3b8',
                border: 0,
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Layers size={12} />
              {tr('단일 호가 뎁스 (100ms)', 'Single Orderbook Depth (100ms)')}
            </button>
            <button
              onClick={() => setActiveTab('FUNDING_RATES')}
              style={{
                background: activeTab === 'FUNDING_RATES' ? '#0f766e' : 'transparent',
                color: activeTab === 'FUNDING_RATES' ? '#ffffff' : '#94a3b8',
                border: 0,
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <TrendingUp size={12} />
              {tr('펀딩비 APY 매트릭스', 'Funding APY Matrix')}
            </button>
          </div>

          {/* Asset Switcher Chips */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT', 'DOGEUSDT', 'BNBUSDT'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                style={{
                  border: symbol === sym ? '1px solid #38bdf8' : '1px solid #334155',
                  background: symbol === sym ? '#0369a1' : '#1e293b',
                  color: symbol === sym ? '#ffffff' : '#94a3b8',
                  padding: '4px 8px',
                  fontSize: '9.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '2px'
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Realtime Dual Link Status & Latency Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '9.5px', color: '#94a3b8' }}>
          <div>
            <span>LIVE LINKS: </span>
            <strong style={{ color: connectedLiveCount === expectedLiveIds.length ? '#10b981' : connectedLiveCount > 0 ? '#f59e0b' : '#ef4444' }}>
              ● {connectedLiveCount}/{expectedLiveIds.length} CONNECTED
            </strong>
            {noMarketIds.length > 0 && (
              <span style={{ color: '#64748b' }}> · {tr(`${noMarketIds.map((e) => EXCHANGES[e].name).join(', ')} 미상장`, `not listed on ${noMarketIds.map((e) => EXCHANGES[e].name).join(', ')}`)}</span>
            )}
            {notConnectedCount > 0 && (
              <span style={{ color: '#64748b' }}> · {tr(`${notConnectedCount}개 미구현`, `${notConnectedCount} not implemented`)}</span>
            )}
          </div>
          <div title={tr('수신 시각 − 거래소 이벤트 시각. 브라우저·거래소 시계 차이가 포함되어 왕복 지연(RTT)이 아닙니다.', 'Receive time − exchange event time. Includes browser/exchange clock skew; not a round-trip time.')}>
            <span>FEED LAG: </span>
            <strong style={{ color: stats === null ? '#64748b' : stats.currentMs < 25 ? '#10b981' : '#f59e0b', fontSize: '11px' }}>
              {stats === null ? '—' : `${stats.currentMs} ms`}
            </strong>
          </div>
          <div>
            <span>THROUGHPUT: </span>
            <strong style={{ color: stats === null ? '#64748b' : '#38bdf8' }}>{stats === null ? '—' : `${stats.msgPerSec} msg/s`}</strong>
          </div>
        </div>
      </div>

      {/* ── 5-EXCHANGE CROSS-ARBITRAGE HEATMAP MATRIX VIEW ── */}
      {activeTab === 'HEATMAP_ARBITRAGE' && (
        <div>
          {/* 👑 Global Best Execution Route Ribbon */}
          <div style={{
            background: '#022c22',
            borderBottom: '1px solid #059669',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                GLOBAL BEST ARBITRAGE ROUTE
              </div>
              {heatmapMatrix.bestRoute ? (
              <div style={{ color: '#f8fafc', fontSize: '12.5px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ color: '#cbd5e1' }}>{tr('최적 매수: ', 'Best Buy: ')}</span>
                <strong style={{ color: EXCHANGES[heatmapMatrix.bestRoute.buyEx].color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ExchangeLogo exchange={heatmapMatrix.bestRoute.buyEx} size={14} />
                  {EXCHANGES[heatmapMatrix.bestRoute.buyEx].name} (${heatmapMatrix.bestRoute.buyPrice.toFixed(precision)})
                </strong>
                <ArrowRight size={13} style={{ display: 'inline', margin: '0 6px', color: '#94a3b8' }} />
                <span style={{ color: '#cbd5e1' }}>{tr('최적 매도: ', 'Best Sell: ')}</span>
                <strong style={{ color: EXCHANGES[heatmapMatrix.bestRoute.sellEx].color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ExchangeLogo exchange={heatmapMatrix.bestRoute.sellEx} size={14} />
                  {EXCHANGES[heatmapMatrix.bestRoute.sellEx].name} (${heatmapMatrix.bestRoute.sellPrice.toFixed(precision)})
                </strong>
              </div>
              ) : (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                {tr('데이터 대기 중 — 실시간 호가가 연결된 거래소(Binance, Bybit)의 첫 호가를 기다리고 있습니다.', 'Waiting for data — the first live orderbook from the connected exchanges (Binance, Bybit).')}
              </div>
              )}
            </div>

            {heatmapMatrix.bestRoute && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#cbd5e1' }}>
              <div title={tr('수수료·슬리피지·이체 비용 반영 전 호가 차이입니다.', 'Raw quote difference before fees, slippage and transfer costs.')}>
                <span>GROSS SPREAD: </span>
                <strong style={{ color: heatmapMatrix.bestRoute.spreadPct > 0 ? '#34d399' : '#94a3b8', fontSize: '14px' }}>
                  {formatSignedPct(heatmapMatrix.bestRoute.spreadPct, 4)}
                </strong>
              </div>
              <div title={tr('수수료·슬리피지 반영 전, 호가창 최우선 호가 기준 단순 계산입니다.', 'Before fees and slippage; simple calculation at the top of the book.')}>
                <span>GROSS ON $10K: </span>
                <strong style={{ color: heatmapMatrix.bestRoute.spreadPct > 0 ? '#10b981' : '#94a3b8', fontSize: '13px' }}>
                  {heatmapMatrix.bestRoute.spreadPct >= 0 ? '+' : '-'}${Math.abs(10000 * (heatmapMatrix.bestRoute.spreadPct / 100)).toFixed(2)} USD
                </strong>
              </div>
              <button
                onClick={() => heatmapMatrix.bestRoute && handleSelectHeatmapCell(heatmapMatrix.bestRoute.buyEx, heatmapMatrix.bestRoute.sellEx)}
                style={{
                  background: '#0f766e',
                  border: '1px solid #14b8a6',
                  color: '#ffffff',
                  padding: '5px 12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Zap size={12} />
                {tr('최적 경로 즉시 점검 ↗', 'Inspect Best Route ↗')}
              </button>
            </div>
            )}
          </div>

          {/* 5x5 Cross Arbitrage Heatmap Table */}
          <div style={{ padding: '18px 20px', background: '#0b131e', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '.06em', fontWeight: 600 }}>
                {tr('실시간 거래소 간 가격 교차 스프레드 매트릭스 (CELL 클릭 시 하단 오더북 전환)', 'Live cross-exchange spread matrix (click a cell to switch the orderbooks below)')}
              </span>
              <span style={{ fontSize: '9px', color: '#64748b' }}>
                {tr('🟢 +0.4% 이상 초록색 · 회색 = 미연결/미구현 · 수수료 반영 전', '🟢 Green at +0.4% or more · Gray = not connected / not implemented · before fees')}
                <span style={{ color: '#f59e0b' }}> · {tr('⚠ Bitunix(PERP)는 무기한 선물 호가라 현물과의 차이에 베이시스가 포함됩니다', '⚠ Bitunix (PERP) is perpetual futures — spreads vs spot include basis')}</span>
                {upbitFeed.krwPerUsdt !== null && (
                  <span> · 🇰🇷 {tr(`Upbit KRW→USDT 환산: ${upbitFeed.krwPerUsdt.toLocaleString(undefined, { maximumFractionDigits: 1 })} KRW/USDT (Upbit KRW-USDT 호가 중간가)`, `Upbit KRW→USDT at ${upbitFeed.krwPerUsdt.toLocaleString(undefined, { maximumFractionDigits: 1 })} KRW/USDT (mid of Upbit's KRW-USDT book)`)}</span>
                )}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#111c2a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontSize: '9px' }}>{tr('매수 (ASK) ➔ 매도 (BID)', 'Buy (ASK) ➔ Sell (BID)')}</th>
                    {exchangeList.map((ex) => (
                      <th key={ex} style={{ padding: '8px 10px', color: EXCHANGES[ex].live ? EXCHANGES[ex].color : '#475569', opacity: EXCHANGES[ex].live ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <ExchangeLogo exchange={ex} size={14} />
                          {EXCHANGES[ex].name}
                        </div>
                        {!EXCHANGES[ex].live && (
                          <div style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>{tr('(미구현)', '(not implemented)')}</div>
                        )}
                        {EXCHANGES[ex].kind === 'PERP' && (
                          <div title={tr('무기한 선물 호가 — 현물과의 차이에는 베이시스가 포함됩니다', 'Perpetual futures quotes — differences vs spot include basis')} style={{ fontSize: '8px', fontWeight: 700, color: '#f59e0b' }}>PERP</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exchangeList.map((buyEx) => (
                    <tr key={buyEx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: EXCHANGES[buyEx].live ? EXCHANGES[buyEx].color : '#475569', background: '#0d1724', opacity: EXCHANGES[buyEx].live ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ExchangeLogo exchange={buyEx} size={14} />
                          {EXCHANGES[buyEx].name} {tr('매수', 'Buy')}
                          {!EXCHANGES[buyEx].live && <span style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>{tr('(미구현)', '(not implemented)')}</span>}
                        </div>
                      </td>
                      {exchangeList.map((sellEx) => {
                        if (buyEx === sellEx) {
                          return (
                            <td key={sellEx} style={{ padding: '9px', color: '#475569', background: '#080d14' }}>
                              —
                            </td>
                          );
                        }

                        const spreadPct = heatmapMatrix.matrix[buyEx][sellEx];

                        // 표본 없음(미구현 거래소이거나 호가 대기 중): 0% 가 아니라 별도의 회색 칸으로 구분한다.
                        if (spreadPct === null) {
                          return (
                            <td
                              key={sellEx}
                              title={tr('데이터 없음 — 실시간 호가가 연결되지 않았습니다', 'No data — no live orderbook connected')}
                              style={{ padding: '9px', color: '#475569', background: '#0a0f17', border: '1px dashed #1e293b', cursor: 'not-allowed' }}
                            >
                              —
                            </td>
                          );
                        }

                        const isBest = heatmapMatrix.bestRoute?.buyEx === buyEx && heatmapMatrix.bestRoute?.sellEx === sellEx;
                        const isHigh = spreadPct > 0.4;
                        const isMed = spreadPct > 0.1;
                        const isPos = spreadPct > 0;

                        const isSelectedPair = exchangeA === buyEx && exchangeB === sellEx;

                        return (
                          <td
                            key={sellEx}
                            onClick={() => handleSelectHeatmapCell(buyEx, sellEx)}
                            style={{
                              padding: '9px',
                              cursor: 'pointer',
                              background: isSelectedPair
                                ? '#0369a1'
                                : isBest
                                ? '#064e3b'
                                : isHigh
                                ? '#065f46'
                                : isMed
                                ? '#042f2e'
                                : isPos
                                ? '#0f172a'
                                : '#111827',
                              border: isSelectedPair ? '1px solid #38bdf8' : isBest ? '1px solid #34d399' : '1px solid #1e293b',
                              color: isHigh ? '#34d399' : isMed ? '#6ee7b7' : isPos ? '#94a3b8' : '#64748b',
                              fontWeight: isHigh ? 700 : 500,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              {isHigh && <Flame size={10} color="#34d399" />}
                              <span>{spreadPct > 0 ? `+${spreadPct.toFixed(2)}%` : `${spreadPct.toFixed(2)}%`}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Exchange Pairing Selector Bar & Orderbook Controls ── */}
          <div style={{ background: '#f8fafb', borderBottom: '1px solid #d8dee4', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{tr('비교 거래소 A (매수):', 'Compare Exchange A (Buy):')}</span>
              <select
                value={exchangeA}
                onChange={(e) => setExchangeA(e.target.value as ExchangeId)}
                style={{ padding: '5px 8px', fontSize: '10px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '3px', background: '#ffffff', color: '#18334a' }}
              >
                {exchangeList.map(ex => (
                  <option key={ex} value={ex} disabled={!EXCHANGES[ex].live}>{EXCHANGES[ex].name} ({localizeExchangeText(EXCHANGES[ex].marketType)}){EXCHANGES[ex].live ? '' : tr(' — 미구현', ' — not implemented')}</option>
                ))}
              </select>

              <button
                onClick={handleSwapExchanges}
                style={{ background: '#1e293b', color: '#ffffff', border: 0, padding: '5px 8px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px' }}
              >
                <ArrowLeftRight size={11} />
                SWAP ⇄
              </button>

              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{tr('비교 거래소 B (매도):', 'Compare Exchange B (Sell):')}</span>
              <select
                value={exchangeB}
                onChange={(e) => setExchangeB(e.target.value as ExchangeId)}
                style={{ padding: '5px 8px', fontSize: '10px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '3px', background: '#ffffff', color: '#18334a' }}
              >
                {exchangeList.map(ex => (
                  <option key={ex} value={ex} disabled={!EXCHANGES[ex].live}>{EXCHANGES[ex].name} ({localizeExchangeText(EXCHANGES[ex].marketType)}){EXCHANGES[ex].live ? '' : tr(' — 미구현', ' — not implemented')}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10.5px' }}>
              <div>
                <span style={{ color: '#64748b' }}>{tr('선택 페어 스프레드: ', 'Selected Pair Spread: ')}</span>
                <strong style={{ color: isCurrentProfitable ? '#2b866d' : '#ac5d59', fontSize: '13px' }}>
                  {currentPairSpreadPct === null ? '—' : formatSignedPct(currentPairSpreadPct, 4)}
                </strong>
                <span style={{ color: '#74808c', fontSize: '9.5px', marginLeft: '5px' }}>
                  {bestBidB !== null && bestAskA !== null ? `($${Math.abs(bestBidB - bestAskA).toFixed(precision)} Gap)` : ''}
                </span>
              </div>
              <button
                onClick={() => openSimulator(symbol)}
                style={{ background: '#0f766e', border: '1px solid #14b8a6', color: '#ffffff', padding: '5px 10px', fontSize: '9.5px', fontWeight: 600, cursor: 'pointer', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Calculator size={11} />
                {tr('수익 시뮬레이터 ↗', 'Profit Simulator ↗')}
              </button>
            </div>
          </div>

          {/* Dual Orderbook Grid for Selected Exchange Pair */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', minHeight: '480px' }}>
            {/* Exchange A Orderbook */}
            <div style={{ borderRight: '1px solid #e2e8f0', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                <strong style={{ fontSize: '12px', color: '#18334a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExchangeLogo exchange={exchangeA} size={18} />
                  {localizeExchangeText(EXCHANGES[exchangeA].tag)}
                  <span style={{ fontSize: '8px', color: statusColor(bookA.status), padding: '1px 5px', background: '#f1f5f9', borderRadius: '2px', border: '1px solid #e2e8f0' }}>
                    ● {statusLabel(bookA.status)}
                  </span>
                </strong>
                <span style={{ fontSize: '9px', color: '#64748b' }}>SPREAD: {bestAskA !== null && bestBidA !== null ? `$${(bestAskA - bestBidA).toFixed(precision)}` : '—'}</span>
              </div>

              {bookA.bids.length === 0 && bookA.asks.length === 0 && (
                <div style={{ marginTop: '10px', padding: '10px', fontSize: '10px', color: '#94a3b8', background: '#f8fafb', border: '1px dashed #cbd5e1', borderRadius: '3px', textAlign: 'center' }}>
                  {bookA.status === 'NOT_CONNECTED'
                    ? tr('미구현 — 이 거래소의 실시간 호가는 아직 연결되지 않았습니다.', 'Not implemented — no live orderbook connection for this exchange yet.')
                    : bookA.status === 'NO_MARKET'
                    ? tr('이 거래소에는 해당 마켓이 상장되어 있지 않습니다.', 'This market is not listed on this exchange.')
                    : bookA.status === 'DISCONNECTED'
                    ? tr('연결이 끊겼습니다 — 재연결을 시도하고 있습니다.', 'Disconnected — retrying the connection.')
                    : tr('데이터 대기 중…', 'Waiting for data…')}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                {/* Bids */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b866d', fontSize: '9px', fontWeight: 700, paddingBottom: '4px', borderBottom: '1px solid #edf0f2' }}>
                    <span>BID (BUY)</span>
                    <span>SIZE</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {bookA.bids.slice(0, 14).map((item, idx) => {
                      const depthPct = Math.min(100, Math.round((item.total / maxTotalA) * 100));
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', padding: '2px 0' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(43, 134, 109, 0.12)', zIndex: 0 }} />
                          <span style={{ color: '#2b866d', fontWeight: 600, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                          <span style={{ color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Asks */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ac5d59', fontSize: '9px', fontWeight: 700, paddingBottom: '4px', borderBottom: '1px solid #edf0f2' }}>
                    <span>ASK (SELL)</span>
                    <span>SIZE</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {bookA.asks.slice(0, 14).map((item, idx) => {
                      const depthPct = Math.min(100, Math.round((item.total / maxTotalA) * 100));
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', padding: '2px 0' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(172, 93, 89, 0.12)', zIndex: 0 }} />
                          <span style={{ color: '#ac5d59', fontWeight: 600, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                          <span style={{ color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange B Orderbook */}
            <div style={{ borderRight: '1px solid #e2e8f0', padding: '14px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                <strong style={{ fontSize: '12px', color: '#18334a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExchangeLogo exchange={exchangeB} size={18} />
                  {localizeExchangeText(EXCHANGES[exchangeB].tag)}
                  <span style={{ fontSize: '8px', color: statusColor(bookB.status), padding: '1px 5px', background: '#f1f5f9', borderRadius: '2px', border: '1px solid #e2e8f0' }}>
                    ● {statusLabel(bookB.status)}
                  </span>
                </strong>
                <span style={{ fontSize: '9px', color: '#64748b' }}>SPREAD: {bestAskB !== null && bestBidB !== null ? `$${(bestAskB - bestBidB).toFixed(precision)}` : '—'}</span>
              </div>

              {bookB.bids.length === 0 && bookB.asks.length === 0 && (
                <div style={{ marginTop: '10px', padding: '10px', fontSize: '10px', color: '#94a3b8', background: '#f8fafb', border: '1px dashed #cbd5e1', borderRadius: '3px', textAlign: 'center' }}>
                  {bookB.status === 'NOT_CONNECTED'
                    ? tr('미구현 — 이 거래소의 실시간 호가는 아직 연결되지 않았습니다.', 'Not implemented — no live orderbook connection for this exchange yet.')
                    : bookB.status === 'NO_MARKET'
                    ? tr('이 거래소에는 해당 마켓이 상장되어 있지 않습니다.', 'This market is not listed on this exchange.')
                    : bookB.status === 'DISCONNECTED'
                    ? tr('연결이 끊겼습니다 — 재연결을 시도하고 있습니다.', 'Disconnected — retrying the connection.')
                    : tr('데이터 대기 중…', 'Waiting for data…')}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                {/* Bids */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b866d', fontSize: '9px', fontWeight: 700, paddingBottom: '4px', borderBottom: '1px solid #edf0f2' }}>
                    <span>BID (BUY)</span>
                    <span>SIZE</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {bookB.bids.slice(0, 14).map((item, idx) => {
                      const depthPct = Math.min(100, Math.round((item.total / maxTotalB) * 100));
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', padding: '2px 0' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(43, 134, 109, 0.12)', zIndex: 0 }} />
                          <span style={{ color: '#2b866d', fontWeight: 600, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                          <span style={{ color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Asks */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ac5d59', fontSize: '9px', fontWeight: 700, paddingBottom: '4px', borderBottom: '1px solid #edf0f2' }}>
                    <span>ASK (SELL)</span>
                    <span>SIZE</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {bookB.asks.slice(0, 14).map((item, idx) => {
                      const depthPct = Math.min(100, Math.round((item.total / maxTotalB) * 100));
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', padding: '2px 0' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(172, 93, 89, 0.12)', zIndex: 0 }} />
                          <span style={{ color: '#ac5d59', fontWeight: 600, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                          <span style={{ color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Cross-Tape & Execution Feed */}
            <div style={{ padding: '14px', background: '#f8fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#18334a', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
                <span>CROSS TICK TAPE</span>
                <span>PRICE</span>
                <span>QTY</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                {trades.slice(0, 18).map((t) => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', fontSize: '9px', padding: '2px 0' }}>
                    <span style={{ color: '#64748b' }}>{t.time.split('.')[1] ? `${t.time.split(':')[2]}` : t.time}</span>
                    <span style={{ color: t.isBuyerMaker ? '#ac5d59' : '#2b866d', fontWeight: 600 }}>
                      {t.price.toFixed(precision)}
                    </span>
                    <span style={{ textAlign: 'right', color: '#18334a' }}>
                      {t.qty.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE L2 DEPTH 100MS VIEW ── */}
      {activeTab === 'SINGLE_L2' && (
        <div>
          {binanceBids.length === 0 && binanceAsks.length === 0 && (
            <div style={{ margin: '14px 14px 0', padding: '10px', fontSize: '10px', color: '#94a3b8', background: '#f8fafb', border: '1px dashed #cbd5e1', borderRadius: '3px', textAlign: 'center' }}>
              {binanceWsStatus === 'DISCONNECTED'
                ? tr('연결이 끊겼습니다 — Binance 호가를 받지 못하고 있습니다.', 'Disconnected — not receiving Binance orderbook data.')
                : tr('데이터 대기 중…', 'Waiting for data…')}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', minHeight: '460px' }}>
            {/* Asks (Sell Orders) */}
            <div style={{ borderRight: '1px solid #edf0f2', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ac5d59', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
                <span>ASKS (SELLS)</span>
                <span>SIZE</span>
                <span>TOTAL</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px', marginTop: '6px' }}>
                {binanceAsks.slice(0, 16).map((item, idx) => {
                  const depthPct = Math.min(100, Math.round((item.total / maxTotalA) * 100));
                  return (
                    <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '9.5px', padding: '2px 0' }}>
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(172, 93, 89, 0.14)', zIndex: 0 }} />
                      <span style={{ color: '#ac5d59', fontWeight: 700, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                      <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                      <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1 }}>{item.total.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div style={{ borderRight: '1px solid #edf0f2', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b866d', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
                <span>BIDS (BUYS)</span>
                <span>SIZE</span>
                <span>TOTAL</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                {binanceBids.slice(0, 16).map((item, idx) => {
                  const depthPct = Math.min(100, Math.round((item.total / maxTotalA) * 100));
                  return (
                    <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '9.5px', padding: '2px 0' }}>
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(43, 134, 109, 0.14)', zIndex: 0 }} />
                      <span style={{ color: '#2b866d', fontWeight: 700, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                      <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                      <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1 }}>{item.total.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Trades Tape */}
            <div style={{ padding: '14px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#18334a', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
                <span>LIVE TRADES</span>
                <span>PRICE</span>
                <span>SIZE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', maxHeight: '420px', overflowY: 'auto' }}>
                {trades.map((t) => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', fontSize: '9.5px', padding: '2px 0' }}>
                    <span style={{ color: '#74808c' }}>{t.time.split('.')[1] ? `${t.time.split(':')[2]}` : t.time}</span>
                    <span style={{ color: t.isBuyerMaker ? '#ac5d59' : '#2b866d', fontWeight: 600 }}>
                      {t.price.toFixed(precision)}
                    </span>
                    <span style={{ textAlign: 'right', color: '#18334a' }}>
                      {t.qty.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FUNDING RATES DELTA-NEUTRAL ARBITRAGE TABLE ── */}
      {activeTab === 'FUNDING_RATES' && (
        <div style={{ padding: '20px' }}>
          <div style={{ background: '#f8fafb', border: '1px solid #d8dee4', padding: '14px 18px', borderRadius: '4px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '12px', color: '#18334a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#2b866d" />
                {tr('델타 뉴트럴(Delta-Neutral) 펀딩비 차익거래 매트릭스', 'Delta-Neutral Funding Rate Arbitrage Matrix')}
              </strong>
              <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>
                {tr('현물 1배 매수 + 무기한 선물 1배 숏으로 가격 변동 노출을 상쇄하고 펀딩비를 수취하는 전략입니다. 아래 수치는 Binance USDⓈ-M 선물의 실제 펀딩비이며 수익은 보장되지 않습니다 (펀딩비 변동·수수료·기준가 괴리 위험).', 'Offsets price exposure with a 1x spot long + 1x perpetual short and collects funding. Figures below are live Binance USDⓈ-M funding rates; returns are not guaranteed (funding changes, fees and basis risk apply).')}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', color: '#74808c' }}>NEXT SETTLEMENT COUNTDOWN</span>
              <strong style={{ display: 'block', fontSize: '16px', color: soonestFundingMs === null ? '#94a3b8' : '#0369a1' }}>
                {fundingNowMs === null || soonestFundingMs === null ? '--:--:--' : formatCountdown(soonestFundingMs - fundingNowMs)}
              </strong>
              <span style={{ fontSize: '8.5px', color: '#94a3b8' }}>
                {fundingStatus === 'ok' && fundingFetchedAt
                  ? tr(`Binance 실제 정산 시각 기준 · ${new Date(fundingFetchedAt).toLocaleTimeString()} 갱신`, `Based on Binance's actual settlement times · updated ${new Date(fundingFetchedAt).toLocaleTimeString()}`)
                  : fundingStatus === 'loading'
                  ? tr('불러오는 중…', 'Loading…')
                  : tr('데이터 없음 (거래소 응답 없음)', 'No data (exchange unavailable)')}
              </span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#0b131e', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '10px 12px' }}>RANK / ASSET</th>
                <th style={{ padding: '10px 12px' }}>VENUE</th>
                <th style={{ padding: '10px 12px' }}>FUNDING RATE</th>
                <th style={{ padding: '10px 12px' }}>ANNUALIZED (SIMPLE)</th>
                <th style={{ padding: '10px 12px' }}>OPEN INTEREST</th>
                <th style={{ padding: '10px 12px' }}>24H VOLUME</th>
                <th style={{ padding: '10px 12px' }}>NEXT SETTLEMENT</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {fundingRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '28px 12px', textAlign: 'center', color: '#74808c', background: '#f8fafb' }}>
                    {fundingStatus === 'loading'
                      ? tr('펀딩비 데이터를 불러오는 중…', 'Loading funding rates…')
                      : tr('데이터 없음 — 거래소에서 펀딩비를 받지 못했습니다. 추정값을 표시하지 않습니다.', 'No data — funding rates could not be fetched from the exchange. No estimated values are shown.')}
                  </td>
                </tr>
              )}
              {[...fundingRows].sort((a, b) => b.annualizedPct - a.annualizedPct).map((row, idx) => (
                <tr key={row.symbol} style={{ borderBottom: '1px solid #edf0f2', background: idx % 2 === 0 ? '#ffffff' : '#fcfdfe' }}>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: '#18334a' }}>#{idx + 1} {row.symbol}</strong>
                    <small style={{ color: '#74808c', display: 'block' }}>{FUNDING_ASSET_NAMES[row.symbol] ?? ''}</small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: '#0369a1', fontWeight: 600 }}>Binance USDⓈ-M Perp</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: row.fundingRatePct >= 0 ? '#2b866d' : '#ac5d59', fontSize: '11px' }}>
                      {formatSignedPct(row.fundingRatePct, 4)}
                    </strong>
                    <small style={{ color: '#74808c', display: 'block' }}>{tr(`${row.fundingIntervalHours}시간당`, `Per ${row.fundingIntervalHours} Hours`)}</small>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: row.annualizedPct >= 0 ? '#0f766e' : '#ac5d59', fontSize: '13px', fontWeight: 700 }}>
                      {formatSignedPct(row.annualizedPct, 2)}
                    </strong>
                  </td>
                  <td style={{ padding: '12px', color: '#18334a' }}>{formatUsdCompact(row.openInterestUsd)}</td>
                  <td style={{ padding: '12px', color: '#74808c' }}>{formatUsdCompact(row.volume24hUsd)}</td>
                  <td style={{ padding: '12px', color: '#18334a', fontFamily: 'var(--font-mono)' }}>
                    {fundingNowMs === null ? '--:--:--' : formatCountdown(row.nextFundingTime - fundingNowMs)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => openSimulator(row.symbol, row)}
                      style={{
                        background: '#0f766e',
                        border: '1px solid #14b8a6',
                        color: '#ffffff',
                        padding: '6px 12px',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '3px'
                      }}
                    >
                      {tr('시뮬레이션 ↗', 'Simulate ↗')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Position Yield Simulator Modal ── */}
      {calcModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '480px', background: '#ffffff', border: '1px solid #d8dee4', borderRadius: '4px', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', fontFamily: "var(--font-mono)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf0f2', paddingBottom: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '14px', color: '#18334a' }}>
                🧮 {selectedFundingAsset?.symbol ?? ''} {tr('델타 뉴트럴 차익거래 시뮬레이터', 'Delta-Neutral Arbitrage Simulator')}
              </strong>
              <button onClick={() => setCalcModalOpen(false)} style={{ border: 0, background: 'none', color: '#74808c', fontSize: '14px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                {tr('투입 원금 (USDT)', 'Capital (USDT)')}
              </label>
              <input
                type="number"
                value={calcCapital}
                onChange={(e) => setCalcCapital(Math.max(100, Number(e.target.value)))}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, color: '#18334a', outline: 'none' }}
              />
            </div>

            <div style={{ background: '#f8fafb', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '4px', marginBottom: '16px', fontSize: '10.5px', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{tr('현물 매수 포지션 (50%):', 'Spot Long Position (50%):')}</span>
                <strong style={{ color: '#2b866d' }}>${(calcCapital / 2).toLocaleString()} USD (Spot Long)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{tr('선물 숏 헤지 포지션 (50%):', 'Futures Short Hedge Position (50%):')}</span>
                <strong style={{ color: '#ac5d59' }}>${(calcCapital / 2).toLocaleString()} USD (1x Short)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                <span style={{ color: '#18334a', fontWeight: 600 }}>{tr('순 시장 노출도 (Net Delta):', 'Net Market Exposure (Net Delta):')}</span>
                <strong style={{ color: '#0369a1' }}>{tr('0.00% (명목 금액 기준 헤지)', '0.00% (hedged by notional)')}</strong>
              </div>
            </div>

            {selectedFundingAsset ? (() => {
              // 펀딩비는 선물 숏 포지션(원금의 50%) 명목 금액에 붙는다. 양수면 숏이 수취, 음수면 숏이 지급한다.
              const perpNotional = calcCapital / 2;
              const interval = selectedFundingAsset.fundingIntervalHours;
              const perPayout = perpNotional * (selectedFundingAsset.fundingRatePct / 100);
              const payouts30d = (30 * 24) / interval;
              const earning = perPayout >= 0;
              const money = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)} USD`;
              return (
                <div style={{ background: earning ? '#022c22' : '#3b1214', border: `1px solid ${earning ? '#059669' : '#b91c1c'}`, padding: '14px', borderRadius: '4px', color: '#f8fafc', marginBottom: '18px', fontSize: '11px', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{tr(`${interval}시간 주기 펀딩 (현재 요율 기준):`, `Funding per ${interval}h (at current rate):`)}</span>
                    <strong style={{ color: earning ? '#34d399' : '#f87171' }}>{money(perPayout)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{tr(`30일 누적 (${payouts30d}회 정산, 요율 고정 가정):`, `30-day total (${payouts30d} payouts, rate held constant):`)}</span>
                    <strong style={{ color: earning ? '#34d399' : '#f87171' }}>{money(perPayout * payouts30d)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${earning ? '#065f46' : '#7f1d1d'}`, paddingTop: '6px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600 }}>{tr('연환산 (단순, 요율 고정 가정):', 'Annualized (simple, rate held constant):')}</span>
                    <strong style={{ color: earning ? '#10b981' : '#f87171', fontSize: '15px' }}>{formatSignedPct(selectedFundingAsset.annualizedPct, 2)}</strong>
                  </div>
                  <small style={{ color: '#94a3b8', fontSize: '9px', lineHeight: 1.5 }}>
                    {tr('수수료·슬리피지·현물/선물 가격 괴리는 반영하지 않았고, 펀딩비는 정산마다 바뀝니다. 예측이 아닌 현재 요율 기준의 단순 계산입니다.', 'Excludes fees, slippage and spot/perp basis; funding changes every settlement. A simple calculation at the current rate, not a forecast.')}
                  </small>
                </div>
              );
            })() : (
              <div style={{ background: '#f8fafb', border: '1px dashed #cbd5e1', padding: '18px', borderRadius: '4px', marginBottom: '18px', fontSize: '11px', textAlign: 'center', color: '#64748b' }}>
                {simStatus === 'loading'
                  ? tr('펀딩비 데이터를 불러오는 중…', 'Loading funding data…')
                  : tr('데이터 없음 — 이 심볼의 펀딩비를 거래소에서 받지 못했습니다. (Binance USDⓈ-M 선물에 없는 심볼일 수 있습니다)', 'No data — could not fetch this symbol\'s funding rate. (It may not be listed on Binance USDⓈ-M futures.)')}
              </div>
            )}

            <button
              onClick={() => setCalcModalOpen(false)}
              style={{ width: '100%', background: '#18334a', color: '#ffffff', padding: '12px', fontSize: '11px', fontWeight: 600, border: 0, cursor: 'pointer', borderRadius: '3px' }}
            >
              {tr('확인 완료 (닫기)', 'Done (Close)')}
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Protocol Status Bar ── */}
      <div style={{ background: '#f8fafb', borderTop: '1px solid #d8dee4', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: '#74808c', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span>DATA SOURCES: </span>
          <strong style={{ color: '#18334a' }}>
            {tr(
              '호가: Binance 현물·Bybit 현물 WebSocket (브라우저 직접 연결) · 펀딩비: Binance USDⓈ-M REST (AETHER 서버 경유)',
              'Orderbooks: Binance Spot & Bybit Spot WebSocket (direct from browser) · Funding: Binance USDⓈ-M REST (via AETHER server)'
            )}
          </strong>
        </div>
        <div title={tr('최근 50개 메시지의 피드 지연 편차. 측정 전에는 표시하지 않습니다.', 'Deviation of feed lag over the last 50 messages. Not shown until measured.')}>
          <span>FEED JITTER: </span>
          <strong style={{ color: stats === null ? '#94a3b8' : stats.jitter < 4 ? '#2b866d' : '#b9812c' }}>
            {stats === null ? '—' : `±${stats.jitter} ms`}
          </strong>
        </div>
      </div>
    </div>
  );
}
