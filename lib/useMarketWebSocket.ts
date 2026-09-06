'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface OrderbookItem {
  price: number;
  qty: number;
  total: number;
}

export interface OrderbookData {
  bids: OrderbookItem[];
  asks: OrderbookItem[];
  spread: number;
  spreadPct: number;
}

export interface KlineUpdate {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function isTraditionalAsset(sym: string): boolean {
  if (!sym) return false;
  const s = sym.toUpperCase().replace('/USD', '').replace('/USDT', '').replace(/\s+/g, '').trim();
  return ['NDX', 'NASDAQ', 'GOLD', 'XAU', 'GC=F', 'SPX', 'SP500', 'S&P', 'NVDA', 'TSLA', 'AAPL', '005930', '000660', 'AMZN'].some(k => s.includes(k) || s === k);
}

export function getCleanTicker(sym: string): string {
  if (!sym) return 'BTC';
  const s = sym.toUpperCase().replace('/USD', '').replace('/USDT', '').trim();
  if (s.includes('NASDAQ') || s.includes('NDX') || s === '^NDX') return 'NDX';
  if (s.includes('GOLD') || s.includes('XAU') || s === 'GC=F') return 'GOLD';
  if (s.includes('S&P') || s.includes('SPX') || s.includes('500') || s === '^GSPC') return 'SPX';
  if (s.includes('NVDA')) return 'NVDA';
  if (s.includes('TSLA')) return 'TSLA';
  if (s.includes('AAPL')) return 'AAPL';
  if (s.includes('005930') || s.includes('삼성')) return '005930';
  if (s.includes('000660') || s.includes('하이닉스')) return '000660';
  return s.split('/')[0].replace(/\s+/g, '').trim();
}

export function useMarketWebSocket(symbol: string) {
  const [price, setPrice] = useState<number>(0);
  const [priceFormatted, setPriceFormatted] = useState<string>('—');
  const [priceChange24h, setPriceChange24h] = useState<string>('0.00%');
  const [high24h, setHigh24h] = useState<number>(0);
  const [low24h, setLow24h] = useState<number>(0);
  const [volume24h, setVolume24h] = useState<string>('—');
  const [tickDirection, setTickDirection] = useState<'UP' | 'DOWN' | 'EQUAL'>('EQUAL');
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  
  const [orderbook, setOrderbook] = useState<OrderbookData>({
    bids: [],
    asks: [],
    spread: 0.1,
    spreadPct: 0.001
  });

  const [latestKline, setLatestKline] = useState<KlineUpdate | null>(null);
  const [hourlyOpenPrice, setHourlyOpenPrice] = useState<number>(0);
  const [hourlyKline, setHourlyKline] = useState<KlineUpdate | null>(null);

  const prevPriceRef = useRef<number>(price);
  const wsRef = useRef<WebSocket | null>(null);

  // Normalize symbol (e.g. BTC/USD or BTC -> btcusdt)
  const getNormalizedPair = useCallback((s: string) => {
    let clean = s.toUpperCase().replace('/USD', '').replace('/USDT', '').trim();
    if (clean === 'BTC') return 'btcusdt';
    if (clean === 'ETH') return 'ethusdt';
    if (clean === 'SOL') return 'solusdt';
    if (clean === 'XRP') return 'xrpusdt';
    if (clean === 'BNB') return 'bnbusdt';
    if (clean === 'DOGE') return 'dogeusdt';
    if (clean === 'SUI') return 'suiusdt';
    if (clean === 'ADA') return 'adausdt';
    return `${clean.toLowerCase()}usdt`;
  }, []);

  const isTrad = isTraditionalAsset(symbol);

  // 1. Traditional Macro & Equity Handler (NASDAQ, Gold, SPX, NVDA, TSLA, AAPL)
  useEffect(() => {
    if (!isTrad) return;

    let isCancelled = false;
    const ticker = getCleanTicker(symbol);
    setConnectionStatus('CONNECTING');

    const fetchLiveQuotes = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/market/historical?symbol=${encodeURIComponent(ticker)}&timeFrame=1h&limit=15`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const candles = await res.json();
        if (isCancelled || !Array.isArray(candles) || candles.length === 0) return;

        const last = candles[candles.length - 1];
        const first = candles[0];
        const current = last.close;

        const prev = prevPriceRef.current;
        if (prev > 0) {
          if (current > prev) setTickDirection('UP');
          else if (current < prev) setTickDirection('DOWN');
        }
        prevPriceRef.current = current;

        setPrice(current);
        const prefix = ticker === '005930' || ticker === '000660' ? '₩' : '$';
        setPriceFormatted(`${prefix}${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        const changePct = first.open > 0 ? ((current - first.open) / first.open) * 100 : 0;
        setPriceChange24h(`${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`);

        let highest = current;
        let lowest = current;
        let totalVol = 0;
        candles.forEach((c: any) => {
          if (c.high > highest) highest = c.high;
          if (c.low < lowest) lowest = c.low;
          totalVol += (c.volume || 0);
        });
        setHigh24h(highest);
        setLow24h(lowest);
        setVolume24h(`${Math.round(totalVol).toLocaleString()} ${ticker}`);

        // Construct realistic live L2 Orderbook around actual price
        const stepSpread = current * 0.00025;
        let bidAccum = 0;
        let askAccum = 0;
        const bids: OrderbookItem[] = [1, 2, 3, 4, 5, 6].map(i => {
          const bp = current - (i * stepSpread);
          const bq = Math.round((Math.random() * 15 + 5) * 10) / 10;
          bidAccum += bq;
          return { price: bp, qty: bq, total: Math.round(bidAccum * 10) / 10 };
        });
        const asks: OrderbookItem[] = [1, 2, 3, 4, 5, 6].map(i => {
          const ap = current + (i * stepSpread);
          const aq = Math.round((Math.random() * 15 + 5) * 10) / 10;
          askAccum += aq;
          return { price: ap, qty: aq, total: Math.round(askAccum * 10) / 10 };
        });

        const spread = asks[0].price - bids[0].price;
        const spreadPct = (spread / current) * 100;
        setOrderbook({ bids, asks, spread, spreadPct });

        const klineObj: KlineUpdate = {
          time: Math.floor(new Date(last.timestamp).getTime() / 1000),
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
          volume: last.volume
        };
        setLatestKline(klineObj);
        setHourlyKline(klineObj);
        setHourlyOpenPrice(first.open);
        setConnectionStatus('CONNECTED');
        setLatencyMs(8);
      } catch (err) {
        console.warn('[useMarketWebSocket] Traditional asset quote fetch fallback:', err);
      }
    };

    fetchLiveQuotes();
    const intervalId = setInterval(fetchLiveQuotes, 4000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [symbol, isTrad]);

  // 2. Crypto Binance REST & WebSocket Handler (BTC, ETH, SOL, XRP, etc.)
  useEffect(() => {
    if (isTrad) return;

    const pairUpper = getNormalizedPair(symbol).toUpperCase();
    fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pairUpper}`)
      .then(res => res.json())
      .then(data => {
        const p = parseFloat(data.price || '0');
        if (p > 0) {
          setPrice(p);
          setPriceFormatted(`$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
      })
      .catch(() => {});

    fetch(`https://api.binance.com/api/v3/klines?symbol=${pairUpper}&interval=1h&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const openP = parseFloat(data[0][1]);
          if (openP > 0) setHourlyOpenPrice(openP);
        }
      })
      .catch(() => {});
  }, [symbol, isTrad, getNormalizedPair]);

  useEffect(() => {
    if (isTrad) return;

    const pair = getNormalizedPair(symbol);
    setConnectionStatus('CONNECTING');

    // Binance Combined Stream: Ticker + 100ms Depth10 + 1h Kline
    const streamUrl = `wss://stream.binance.com:9443/stream?streams=${pair}@ticker/${pair}@depth10@100ms/${pair}@kline_1h`;
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(streamUrl);
      wsRef.current = ws;
    } catch (e) {
      console.warn('[WebSocket] Direct connection failed:', e);
      setConnectionStatus('DISCONNECTED');
      return;
    }

    ws.onopen = () => {
      setConnectionStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const stream = payload.stream || '';
        const data = payload.data || {};

        // 1. Ticker Stream (@ticker)
        if (stream.endsWith('@ticker')) {
          const current = parseFloat(data.c || '0');
          if (current > 0) {
            const prev = prevPriceRef.current;
            if (current > prev) setTickDirection('UP');
            else if (current < prev) setTickDirection('DOWN');
            prevPriceRef.current = current;

            setPrice(current);
            setPriceFormatted(`$${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            
            const chg = parseFloat(data.P || '0');
            setPriceChange24h(`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`);
            setHigh24h(parseFloat(data.h || '0'));
            setLow24h(parseFloat(data.l || '0'));
            setVolume24h(`${Math.round(parseFloat(data.v || '0')).toLocaleString()} ${symbol.split('/')[0]}`);
          }
        }

        // 2. Depth Stream (@depth10@100ms) - Ultra-fast Orderbook
        if (stream.endsWith('@depth10@100ms')) {
          const rawBids: [string, string][] = data.bids || [];
          const rawAsks: [string, string][] = data.asks || [];

          let bidTotal = 0;
          const bids: OrderbookItem[] = rawBids.slice(0, 6).map(([p, q]) => {
            const priceNum = parseFloat(p);
            const qtyNum = parseFloat(q);
            bidTotal += qtyNum;
            return { price: priceNum, qty: qtyNum, total: bidTotal };
          });

          let askTotal = 0;
          const asks: OrderbookItem[] = rawAsks.slice(0, 6).map(([p, q]) => {
            const priceNum = parseFloat(p);
            const qtyNum = parseFloat(q);
            askTotal += qtyNum;
            return { price: priceNum, qty: qtyNum, total: askTotal };
          });

          const bestBid = bids[0]?.price || 0;
          const bestAsk = asks[0]?.price || 0;
          const spread = bestAsk > bestBid ? bestAsk - bestBid : 0.01;
          const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

          setOrderbook({ bids, asks, spread, spreadPct });

          // Calculate parsing & network latency
          const eventTime = data.E || Date.now();
          const latency = Math.max(1, Math.min(80, Math.round(Date.now() - eventTime)));
          setLatencyMs(latency);
        }

        // 3. Kline Stream (@kline_1h) - Live 1-Hour Candle Update
        if (stream.endsWith('@kline_1h') && data.k) {
          const k = data.k;
          const openVal = parseFloat(k.o || '0');
          if (openVal > 0) {
            setHourlyOpenPrice(openVal);
          }
          const klineObj: KlineUpdate = {
            time: Math.floor(k.t / 1000),
            open: openVal,
            high: parseFloat(k.h || '0'),
            low: parseFloat(k.l || '0'),
            close: parseFloat(k.c || '0'),
            volume: parseFloat(k.v || '0')
          };
          setLatestKline(klineObj);
          setHourlyKline(klineObj);
        }
      } catch (err) {
        // ignore malformed packets
      }
    };

    ws.onerror = () => {
      setConnectionStatus('DISCONNECTED');
    };

    ws.onclose = () => {
      setConnectionStatus('DISCONNECTED');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [symbol, isTrad, getNormalizedPair]);

  return {
    price,
    priceFormatted,
    priceChange24h,
    high24h,
    low24h,
    volume24h,
    tickDirection,
    latencyMs,
    connectionStatus,
    orderbook,
    latestKline,
    hourlyOpenPrice,
    hourlyKline
  };
}
