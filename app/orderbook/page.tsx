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
          <span className="live-dot" /> L2 DEPTH 100ms
          <span className="top-divider" />
          <span>NETWORK INFRASTRUCTURE BENCHMARK</span>
        </div>
        <div className="account-toggle">
          <Link href="/profile" className="member-icon" aria-label="Open member profile">♙</Link>
          <Link href="/login">SIGN IN / ACCESS</Link>
        </div>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#18334a', font: '400 clamp(32px, 4vw, 48px)/1.1 Georgia, serif', margin: '0 0 8px' }}>
          Realtime Level-2 <em>Orderbook & Latency</em>
        </h1>
        <p style={{ color: '#74808c', fontSize: '12px', margin: 0 }}>
          거래소 다이렉트 100ms 호가창 스트림과 밀리초(ms) 단위 패킷 RTT/지터(Jitter) 네트워크 품질 측정기
        </p>
      </div>

      <FullOrderbookTerminal defaultSymbol="BTCUSDT" />
    </main>
  )
}
