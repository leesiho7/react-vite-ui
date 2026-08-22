'use client';

import React from 'react';
import { OrderbookData } from '../lib/useMarketWebSocket';

interface OrderbookProps {
  orderbook: OrderbookData;
  latencyMs: number;
  connectionStatus: string;
  symbol: string;
}

export function Orderbook({ orderbook, latencyMs, connectionStatus, symbol }: OrderbookProps) {
  const maxAskTotal = orderbook.asks[orderbook.asks.length - 1]?.total || 1;
  const maxBidTotal = orderbook.bids[orderbook.bids.length - 1]?.total || 1;
  const maxOverall = Math.max(maxAskTotal, maxBidTotal, 1);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #d8dee4', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf0f2', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#18334a', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 600 }}>◆ LIVE ORDERBOOK (100ms)</span>
          <span style={{ fontSize: '8px', padding: '2px 5px', border: '1px solid #b8d8cc', color: connectionStatus === 'CONNECTED' ? '#2b866d' : '#ac5d59' }}>
            {connectionStatus === 'CONNECTED' ? '● STREAMING' : 'CONNECTING...'}
          </span>
        </div>
        <div style={{ fontSize: '9px', color: '#74808c', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>⚡ RTT:</span>
          <strong style={{ color: latencyMs < 30 ? '#2b866d' : '#b9812c', fontFamily: 'monospace' }}>{latencyMs}ms</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '8px', color: '#74808c', borderBottom: '1px solid #edf0f2', paddingBottom: '4px' }}>
        <span>PRICE (USDT)</span>
        <span style={{ textAlign: 'right' }}>SIZE</span>
        <span style={{ textAlign: 'right' }}>TOTAL</span>
      </div>

      {/* Asks (Sells) - Reversed to show lowest ask closest to spread */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px' }}>
        {orderbook.asks.map((item, idx) => {
          const depthPct = Math.min(100, Math.round((item.total / maxOverall) * 100));
          return (
            <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '9px', padding: '2px 0' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(172, 93, 89, 0.12)', zIndex: 0 }} />
              <span style={{ color: '#ac5d59', fontWeight: 600, zIndex: 1, fontFamily: 'monospace' }}>
                {item.price.toFixed(2)}
              </span>
              <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1, fontFamily: 'monospace' }}>
                {item.qty.toFixed(3)}
              </span>
              <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1, fontFamily: 'monospace' }}>
                {item.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafb', border: '1px solid #edf0f2', fontSize: '8px' }}>
        <span style={{ color: '#74808c' }}>SPREAD</span>
        <span style={{ color: '#18334a', fontWeight: 600, fontFamily: 'monospace' }}>
          ${orderbook.spread.toFixed(2)} ({orderbook.spreadPct.toFixed(3)}%)
        </span>
        <span style={{ color: '#367ca4' }}>{symbol}</span>
      </div>

      {/* Bids (Buys) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {orderbook.bids.map((item, idx) => {
          const depthPct = Math.min(100, Math.round((item.total / maxOverall) * 100));
          return (
            <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '9px', padding: '2px 0' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(43, 134, 109, 0.12)', zIndex: 0 }} />
              <span style={{ color: '#2b866d', fontWeight: 600, zIndex: 1, fontFamily: 'monospace' }}>
                {item.price.toFixed(2)}
              </span>
              <span style={{ textAlign: 'right', color: '#18334a', zIndex: 1, fontFamily: 'monospace' }}>
                {item.qty.toFixed(3)}
              </span>
              <span style={{ textAlign: 'right', color: '#74808c', zIndex: 1, fontFamily: 'monospace' }}>
                {item.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
