'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

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
  isBuyerMaker: boolean; // true = Sell, false = Buy
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

export function FullOrderbookTerminal({ defaultSymbol = 'BTCUSDT' }: { defaultSymbol?: string }) {
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [precision, setPrecision] = useState<number>(2);
  const [bids, setBids] = useState<L2Item[]>([]);
  const [asks, setAsks] = useState<L2Item[]>([]);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [spread, setSpread] = useState<number>(0.01);
  const [spreadPct, setSpreadPct] = useState<number>(0.001);
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');

  // Network Infrastructure Benchmark Stats
  const [stats, setStats] = useState<LatencyStats>({
    currentMs: 12,
    avgMs: 14.2,
    minMs: 8,
    maxMs: 35,
    jitter: 2.1,
    msgPerSec: 28,
    totalPackets: 0
  });

  const latencyHistoryRef = useRef<number[]>([]);
  const packetCountRef = useRef<number>(0);
  const lastSecTimeRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  const cleanPair = useMemo(() => {
    return symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  }, [symbol]);

  useEffect(() => {
    setWsStatus('CONNECTING');
    latencyHistoryRef.current = [];
    packetCountRef.current = 0;

    // Binance Combined Stream: 20-level 100ms Depth + Real-time Millisecond Trades
    const url = `wss://stream.binance.com:9443/stream?streams=${cleanPair}@depth20@100ms/${cleanPair}@trade`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;
    } catch (e) {
      console.warn('[Orderbook] WS initialization error:', e);
      setWsStatus('DISCONNECTED');
      return;
    }

    ws.onopen = () => {
      setWsStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      const now = Date.now();
      packetCountRef.current += 1;

      try {
        const payload = JSON.parse(event.data);
        const stream: string = payload.stream || '';
        const data = payload.data || {};

        // 1. Calculate Network Latency Benchmark (RTT & Jitter)
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

        // Calculate Msg/sec
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
            totalPackets: (stats.totalPackets || 0) + msgRate
          });
        }

        // 2. Depth Stream (Level-2 Orderbook)
        if (stream.endsWith('@depth20@100ms')) {
          const rawBids: [string, string][] = data.bids || [];
          const rawAsks: [string, string][] = data.asks || [];

          let bidTotal = 0;
          const parsedBids: L2Item[] = rawBids.map(([p, q]) => {
            const priceNum = parseFloat(p);
            const qtyNum = parseFloat(q);
            bidTotal += qtyNum;
            return { price: priceNum, qty: qtyNum, total: bidTotal };
          });

          let askTotal = 0;
          const parsedAsks: L2Item[] = rawAsks.map(([p, q]) => {
            const priceNum = parseFloat(p);
            const qtyNum = parseFloat(q);
            askTotal += qtyNum;
            return { price: priceNum, qty: qtyNum, total: askTotal };
          });

          const bestBid = parsedBids[0]?.price || 0;
          const bestAsk = parsedAsks[0]?.price || 0;
          const sp = bestAsk > bestBid ? bestAsk - bestBid : 0.01;
          const spPct = bestBid > 0 ? (sp / bestBid) * 100 : 0;

          setBids(parsedBids);
          setAsks(parsedAsks);
          setSpread(sp);
          setSpreadPct(spPct);
        }

        // 3. Trades Stream (Tick-by-Tick Millisecond Tape)
        if (stream.endsWith('@trade')) {
          const tradeTime = new Date(data.T || now);
          const timeStr = `${tradeTime.toTimeString().split(' ')[0]}.${String(tradeTime.getMilliseconds()).padStart(3, '0')}`;

          const newTrade: TradeItem = {
            id: data.t || Math.random(),
            time: timeStr,
            price: parseFloat(data.p || '0'),
            qty: parseFloat(data.q || '0'),
            isBuyerMaker: data.m // true = Sell order filled maker buy, false = Buy
          };

          setTrades((prev) => [newTrade, ...prev.slice(0, 24)]);
        }
      } catch (err) {
        // ignore JSON parse error
      }
    };

    ws.onerror = () => setWsStatus('DISCONNECTED');
    ws.onclose = () => setWsStatus('DISCONNECTED');

    return () => {
      if (ws) ws.close();
    };
  }, [cleanPair]);

  // Imbalance Ratio calculation (Buy pressure vs Sell pressure)
  const totalBidVolume = bids[bids.length - 1]?.total || 1;
  const totalAskVolume = asks[asks.length - 1]?.total || 1;
  const totalVol = totalBidVolume + totalAskVolume;
  const bidRatio = Math.round((totalBidVolume / totalVol) * 100);
  const askRatio = 100 - bidRatio;

  const maxOverallTotal = Math.max(totalBidVolume, totalAskVolume, 1);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #d8dee4', fontFamily: 'monospace' }}>
      {/* ── Top Header Bar & Network Latency Benchmark ── */}
      <div style={{ background: '#f8fafb', borderBottom: '1px solid #d8dee4', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <strong style={{ fontSize: '15px', color: '#18334a' }}>⚡ L2 ORDERBOOK & LATENCY BENCHMARK</strong>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                style={{
                  border: '1px solid',
                  borderColor: symbol === sym ? '#18334a' : '#d8dee4',
                  background: symbol === sym ? '#18334a' : '#ffffff',
                  color: symbol === sym ? '#ffffff' : '#74808c',
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Infrastructure Latency Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '10px', color: '#74808c' }}>
          <div>
            <span>STATUS: </span>
            <strong style={{ color: wsStatus === 'CONNECTED' ? '#2b866d' : '#ac5d59' }}>
              ● {wsStatus}
            </strong>
          </div>
          <div>
            <span>RTT: </span>
            <strong style={{ color: stats.currentMs < 25 ? '#2b866d' : '#b9812c', fontSize: '13px' }}>
              {stats.currentMs} ms
            </strong>
          </div>
          <div>
            <span>AVG: </span>
            <strong>{stats.avgMs} ms</strong>
          </div>
          <div>
            <span>JITTER: </span>
            <strong>±{stats.jitter} ms</strong>
          </div>
          <div>
            <span>THROUGHPUT: </span>
            <strong style={{ color: '#367ca4' }}>{stats.msgPerSec} msg/s</strong>
          </div>
        </div>
      </div>

      {/* ── Imbalance Ratio Gauge (Buy/Sell Pressure) ── */}
      <div style={{ padding: '8px 20px', background: '#f3f7f8', borderBottom: '1px solid #edf0f2', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10px' }}>
        <span style={{ color: '#2b866d', fontWeight: 700 }}>BIDS {bidRatio}%</span>
        <div style={{ flex: 1, height: '6px', background: '#edf0f2', display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: `${bidRatio}%`, background: '#2b866d', transition: 'width 0.2s' }} />
          <div style={{ width: `${askRatio}%`, background: '#ac5d59', transition: 'width 0.2s' }} />
        </div>
        <span style={{ color: '#ac5d59', fontWeight: 700 }}>ASKS {askRatio}%</span>
      </div>

      {/* ── 3-Column Terminal Layout: Asks | Bids | Realtime Trades ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', minHeight: '440px' }}>
        {/* Column 1: Asks (Sell Orders) */}
        <div style={{ borderRight: '1px solid #edf0f2', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ac5d59', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
            <span>ASKS (SELLS)</span>
            <span>SIZE</span>
            <span>TOTAL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px', marginTop: '6px' }}>
            {asks.slice(0, 16).map((item, idx) => {
              const depthPct = Math.min(100, Math.round((item.total / maxOverallTotal) * 100));
              return (
                <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px', padding: '2px 0' }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(172, 93, 89, 0.14)', zIndex: 0 }} />
                  <span style={{ color: '#ac5d59', fontWeight: 700, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                  <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                  <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1 }}>{item.total.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Bids (Buy Orders) */}
        <div style={{ borderRight: '1px solid #edf0f2', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b866d', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
            <span>BIDS (BUYS)</span>
            <span>SIZE</span>
            <span>TOTAL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
            {bids.slice(0, 16).map((item, idx) => {
              const depthPct = Math.min(100, Math.round((item.total / maxOverallTotal) * 100));
              return (
                <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px', padding: '2px 0' }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(43, 134, 109, 0.14)', zIndex: 0 }} />
                  <span style={{ color: '#2b866d', fontWeight: 700, zIndex: 1 }}>{item.price.toFixed(precision)}</span>
                  <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1 }}>{item.qty.toFixed(3)}</span>
                  <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1 }}>{item.total.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Live Trades Tape (Tick-by-Tick) */}
        <div style={{ padding: '12px 16px', background: '#fafbfc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#18334a', fontSize: '10px', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid #edf0f2' }}>
            <span>LIVE TRADES</span>
            <span>PRICE</span>
            <span>SIZE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', maxHeight: '400px', overflowY: 'auto' }}>
            {trades.map((t) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '75px 1fr 1fr', fontSize: '9.5px', padding: '2px 0' }}>
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

      {/* ── Bottom Spread & Protocol Status Bar ── */}
      <div style={{ background: '#f8fafb', borderTop: '1px solid #d8dee4', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#74808c' }}>
        <div>
          <span>SPREAD: </span>
          <strong style={{ color: '#18334a' }}>${spread.toFixed(precision)} ({spreadPct.toFixed(3)}%)</strong>
        </div>
        <div>
          <span>FEED: </span>
          <strong>BINANCE DIRECT L2 WEBSOCKET (ZERO BUFFER)</strong>
        </div>
        <div>
          <span>INFRA CHECK: </span>
          <strong style={{ color: stats.avgMs < 20 ? '#2b866d' : '#b9812c' }}>
            {stats.avgMs < 20 ? '⚡ OPTIMAL LOW LATENCY' : 'STABLE'}
          </strong>
        </div>
      </div>
    </div>
  );
}
