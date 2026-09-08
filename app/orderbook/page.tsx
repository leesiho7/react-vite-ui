'use client'

import React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ShieldCheck } from 'lucide-react'

// WebSocket 및 L2 호가 터미널의 SSR 하이드레이션 에러 완전 방어
const FullOrderbookTerminal = dynamic(
  () => import('../../components/FullOrderbookTerminal').then((mod) => mod.FullOrderbookTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="arb-loading-skeleton" style={{ padding: '60px', textAlign: 'center', background: '#0b0f17', borderRadius: '8px', border: '1px solid #1e293b', color: '#94a3b8' }}>
        <span>⚡ Connecting Dual WebSocket L2 Engine (Binance, Bybit, OKX, Upbit)...</span>
      </div>
    )
  }
)

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
            Crypto <span style={{ color: "#0f766e", fontWeight: 800 }}>Arbitrage</span><br />& Orderbook Intelligence
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
      <footer className="arb-footer" style={{ width: '100%', display: 'block', borderTop: '1px solid #1e293b', paddingTop: '16px', marginTop: '24px', textAlign: 'center' }}>
        <p style={{ width: '100%', fontSize: '11px', color: '#64748b', margin: 0, textAlign: 'center' }}>
          ⚠️ DISCLAIMER: AETHER 터미널이 제공하는 차익거래 및 펀딩비 데이터는 정보 제공 목적으로만 사용되며, 금융 투자 조언이 아닙니다. 모든 트레이딩의 최종 책임은 본인에게 있습니다.
        </p>
      </footer>
    </main>
  )
}

