'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CandleData } from '../lib/types';
import { KlineUpdate } from '../lib/useMarketWebSocket';

interface RealtimeChartProps {
  initialCandles?: CandleData[];
  latestKline?: KlineUpdate | null;
  currentPrice: number;
  symbol: string;
  period: string;
}

export function RealtimeChart({ initialCandles = [], latestKline, currentPrice, symbol, period }: RealtimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Initialize or update candles from props
  useEffect(() => {
    if (initialCandles.length > 0) {
      setCandles([...initialCandles]);
    } else {
      // Generate default 40 candles
      const now = Math.floor(Date.now() / 1000);
      let p = currentPrice || 67842.10;
      const list: CandleData[] = [];
      for (let i = 40; i >= 0; i--) {
        const delta = (Math.random() - 0.49) * 450;
        const open = p;
        const close = p + delta;
        const high = Math.max(open, close) + Math.random() * 200;
        const low = Math.min(open, close) - Math.random() * 200;
        list.push({ timestamp: now - i * 3600, open, high, low, close, volume: 100 });
        p = close;
      }
      setCandles(list);
    }
  }, [initialCandles]);

  // Live WebSocket Tick / Kline Update
  useEffect(() => {
    if (!latestKline || candles.length === 0) return;

    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updated = [...prev];

      // Update current live candle
      updated[updated.length - 1] = {
        ...last,
        high: Math.max(last.high, latestKline.close),
        low: Math.min(last.low, latestKline.close),
        close: latestKline.close,
        volume: last.volume + 1
      };
      return updated;
    });
  }, [latestKline]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#edf0f2';
    ctx.lineWidth = 1;
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const prices = candles.flatMap((c) => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const candleWidth = Math.max(4, Math.floor((width - 60) / candles.length) - 3);
    const getY = (val: number) => height - 30 - ((val - minPrice) / priceRange) * (height - 60);

    // Draw SMA 20 Line
    ctx.beginPath();
    ctx.strokeStyle = '#367ca4';
    ctx.lineWidth = 1.5;
    let started = false;
    for (let i = 0; i < candles.length; i++) {
      if (i >= 5) {
        const slice = candles.slice(Math.max(0, i - 10), i + 1);
        const sma = slice.reduce((sum, c) => sum + c.close, 0) / slice.length;
        const x = i * (candleWidth + 3) + 15;
        const y = getY(sma);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Draw Candlesticks
    candles.forEach((c, idx) => {
      const x = idx * (candleWidth + 3) + 15;
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#2b866d' : '#ac5d59';

      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // Wick
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x, topY, candleWidth, bodyH);
    });

    // Right Price Scale
    ctx.fillStyle = '#74808c';
    ctx.font = '9px monospace';
    ctx.fillText(maxPrice.toFixed(0), width - 50, 20);
    ctx.fillText(((maxPrice + minPrice) / 2).toFixed(0), width - 50, height / 2);
    ctx.fillText(minPrice.toFixed(0), width - 50, height - 15);
  }, [candles]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '220px', background: '#ffffff' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div style={{ position: 'absolute', left: '12px', top: '10px', display: 'flex', gap: '12px', fontSize: '9px', color: '#74808c', pointerEvents: 'none' }}>
        <span>SMA(20): <b style={{ color: '#367ca4' }}>●</b></span>
        <span>VOL: <b style={{ color: '#18334a' }}>REALTIME</b></span>
        <span>PERIOD: <b style={{ color: '#18334a' }}>{period}</b></span>
      </div>
    </div>
  );
}
