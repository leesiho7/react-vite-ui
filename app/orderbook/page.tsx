'use client'

import Link from 'next/link'
import { FullOrderbookTerminal } from '../../components/FullOrderbookTerminal'

export default function OrderbookPage() {
  return (
    <main className="terminal-shell" style={{ padding: '24px 56px 60px' }}>
      <header className="topbar" style={{ marginBottom: '24px' }}>
        <div className="brand-lockup">
          <Link href="/" className="auth-back" style={{ color: '#18334a', textDecoration: 'none', fontWeight: 600 }}>
            ← AETHER TERMINAL
          </Link>
        </div>
        <div className="top-meta">
          <span>CROSS-EXCHANGE ARBITRAGE MATRIX</span>
          <span className="top-divider" />
          <span>DELTA-NEUTRAL HEDGE ENGINE</span>
        </div>
        <div className="account-toggle">
          <Link href="/profile" className="member-icon" aria-label="Open member profile">♙</Link>
          <Link href="/login">SIGN IN / ACCESS</Link>
        </div>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#18334a', font: '400 clamp(32px, 4vw, 48px)/1.1 Georgia, serif', margin: '0 0 8px' }}>
          Cross-Exchange <em>Arbitrage & L2 Depth</em>
        </h1>
        <p style={{ color: '#74808c', fontSize: '12px', margin: 0 }}>
          바이낸스 vs 바이비트 실시간 호가 스프레드(%) 차익거래 스캐너 및 8시간 무위험 델타 뉴트럴 펀딩비(Funding APY) 수익 매트릭스
        </p>
      </div>

      <FullOrderbookTerminal defaultSymbol="BTCUSDT" />
    </main>
  )
}
