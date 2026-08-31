'use client'

import React from 'react'
import Link from 'next/link'
import { UserRound } from 'lucide-react'

interface FinanceNavProps {
  active?: 'overview' | 'trade' | 'markets' | 'media' | 'analytics' | 'engines';
}

export function FinanceNav({ active = 'trade' }: FinanceNavProps) {
  return (
    <header className="finance-nav" style={{ height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid #e1e5eb', background: '#ffffff', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
          <div style={{ width: '26px', height: '26px', border: '1.5px solid #38bdf8', background: '#090e17', color: '#38bdf8', fontWeight: 800, fontSize: '15px', display: 'grid', placeItems: 'center', borderRadius: '3px', boxShadow: '0 0 10px rgba(56,189,248,0.3)' }}>
            A
          </div>
          <strong style={{ color: '#0f1420', fontSize: '13px', letterSpacing: '0.14em', fontWeight: 700 }}>AETHER</strong>
        </Link>
        <span style={{ height: '14px', borderLeft: '1px solid #dfe3eb', margin: '0 4px' }} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link href="/" style={{ padding: '6px 10px', fontSize: '11px', fontWeight: active === 'overview' ? 700 : 500, color: active === 'overview' ? '#f47a20' : '#687184', textDecoration: 'none', borderRadius: '4px' }}>
            OVERVIEW
          </Link>
          <Link href="/trade" style={{ padding: '6px 10px', fontSize: '11px', fontWeight: active === 'trade' ? 700 : 500, color: active === 'trade' ? '#f47a20' : '#687184', background: active === 'trade' ? '#fff4ec' : 'transparent', textDecoration: 'none', borderRadius: '4px' }}>
            TRADE
          </Link>
          <Link href="/orderbook" style={{ padding: '6px 10px', fontSize: '11px', fontWeight: active === 'markets' ? 700 : 500, color: active === 'markets' ? '#f47a20' : '#687184', textDecoration: 'none', borderRadius: '4px' }}>
            ORDERBOOK
          </Link>
          <Link href="/media" style={{ padding: '6px 10px', fontSize: '11px', fontWeight: active === 'media' ? 700 : 500, color: active === 'media' ? '#f47a20' : '#687184', textDecoration: 'none', borderRadius: '4px' }}>
            MEDIA
          </Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#687184' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#09a58e', display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em' }}>ENGINE LIVE</span>
        </div>
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#303747', textDecoration: 'none', padding: '6px 10px', border: '1px solid #dfe3eb', borderRadius: '4px', fontSize: '10.5px' }}>
          <UserRound size={13} />
          <span>ACCOUNT</span>
        </Link>
      </div>
    </header>
  )
}
