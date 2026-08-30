'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { FullOrderbookTerminal } from '../../components/FullOrderbookTerminal'

export default function OrderbookPage() {
  return (
    <main className="arb-page">
      {/* ── Top Bar ── */}
      <header className="arb-topbar">
        <div className="arb-brand">
          <Link href="/">AETHER</Link>
          <span>MARKET INTELLIGENCE</span>
        </div>
        <nav>
          <Link href="/">OVERVIEW</Link>
          <Link className="active" href="/orderbook">MARKETS</Link>
          <Link href="/media">MEDIA</Link>
          <Link href="/#trading-console">ENGINES</Link>
        </nav>
        <div className="arb-top-status">
          <span className="arb-dot" /> FEEDS <b>5/5</b>
          <span className="arb-divider" /> <ShieldCheck size={13} /> PAPER-SAFE
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="arb-hero" style={{ padding: '36px 0 30px' }}>
        <div>
          <div className="arb-kicker">CROSS-EXCHANGE EXECUTION MONITOR</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(30px, 4vw, 48px)' }}>
            Crypto <em>Arbitrage</em><br />& Orderbook Intelligence
          </h1>
          <p>
            바이낸스, 바이비트, OKX, 업비트 등 글로벌 5대 거래소 간 실시간 L2 호가 스프레드(%) 차익거래 스캐너 및 8시간 무위험 델타 뉴트럴 펀딩비(Funding APY) 수익 매트릭스
          </p>
        </div>
        <div className="arb-hero-readout">
          <span>NETWORK STATUS</span>
          <strong><i className="arb-dot" /> NOMINAL</strong>
          <small>Dual WebSocket Stream · L2 Depth 20<br />Median latency ~14ms</small>
        </div>
      </section>

      {/* ── High-Density Real-time Institutional Arbitrage Terminal ── */}
      <div style={{ marginTop: '24px' }}>
        <FullOrderbookTerminal defaultSymbol="BTCUSDT" />
      </div>

      {/* ── Footer ── */}
      <footer className="arb-footer" style={{ marginTop: '30px' }}>
        <span>DATA IS FOR RESEARCH ONLY · DUAL WEBSOCKET STREAMING ACTIVE</span>
        <span>INSTITUTIONAL L2 DEPTH · <Link href="/login">SIGN IN FOR PRIVATE ENGINES</Link></span>
      </footer>
    </main>
  )
}

