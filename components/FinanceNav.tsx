'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  TrendingUp,
  Cpu,
  Award,
  Radio,
  RefreshCw,
  Sparkles,
  Menu,
  X,
  Bot
} from 'lucide-react'

export interface FinanceNavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const defaultItems: FinanceNavItem[] = [
  { key: 'overview', label: 'OVERVIEW', href: '/', icon: BarChart2 },
  { key: 'trade', label: 'TRADE', href: '/trade', icon: TrendingUp },
  { key: 'bot', label: '24H BOT', href: '/#trading-console', icon: Bot },
  { key: 'research', label: 'RESEARCH', href: '/#research-terminal', icon: Cpu },
  { key: 'league', label: 'LEAGUE', href: '/#ten-win-league', icon: Award },
  { key: 'arbitrage', label: 'ARBITRAGE', href: '/#arbitrage-terminal', icon: RefreshCw },
]

interface FinanceNavProps {
  active?: string;
  items?: FinanceNavItem[];
  onSelectTab?: (key: string) => void;
}

export function FinanceNav({ active = 'overview', items = defaultItems, onSelectTab }: FinanceNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="finance-nav">
        <Link className="finance-logo flex items-center gap-2.5 text-decoration-none" href="/">
          <img
            src="/brand-logo.png"
            alt="AETHER Brand Logo"
            className="w-[28px] h-[28px] object-contain rounded-[4px]"
          />
          <div className="flex flex-col">
            <strong className="text-[13px] tracking-[0.14em] font-bold text-[#0f1420] leading-tight">AETHER</strong>
            <span className="text-[8px] text-[#f47a20] font-mono font-semibold">FINANCE OS</span>
          </div>
        </Link>
        <nav aria-label="Finance workspace">
          <div className="finance-nav-links">
            {items.map(({ key, label, href, icon: Icon }) => (
              <a
                key={key}
                className={active === key ? 'active' : ''}
                href={href}
                onClick={(e) => {
                  if (onSelectTab) {
                    if (key !== 'trade') {
                      e.preventDefault()
                      onSelectTab(key)
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <Icon size={14} />
                {label}
              </a>
            ))}
          </div>
        </nav>
        <span className="finance-status">
          <i /> SYSTEM NOMINAL
        </span>
      </header>

      {/* ── 📱 4개 핵심 하단 네비게이션바 (OVERVIEW / TRADE / RESEARCH / MENU) ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile finance navigation">
        <Link className={active === 'overview' ? 'active' : ''} href="/">
          <BarChart2 size={19} />
          <span>OVERVIEW</span>
        </Link>

        <Link className={active === 'trade' ? 'active' : ''} href="/trade">
          <TrendingUp size={19} />
          <span>TRADE</span>
        </Link>

        <Link className={active === 'research' ? 'active' : ''} href="/#research-terminal">
          <Cpu size={19} />
          <span>RESEARCH</span>
        </Link>

        <button
          type="button"
          style={{ background: 'transparent', border: 'none', padding: 0 }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${mobileMenuOpen ? 'text-[#f47a20]' : 'text-[#8b929e] hover:text-[#f47a20]'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={19} />
          <span className="text-[8px] font-mono">MENU</span>
        </button>
      </nav>

      {/* ── 📱 모바일 바텀 시트 햄버거 메뉴 드로어 ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1350] md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[1400] bg-[#171a20] border-t border-[#2e3746] rounded-t-[22px] p-5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl md:hidden animate-slide-up"
            style={{ animation: 'copilot-slide-up 0.22s ease-out' }}
          >
            {/* 상단 둥근 드래그 핸들 바 */}
            <div className="w-10 h-1 bg-[#374151] rounded-full mx-auto mb-4" />

            {/* 드로어 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262c36] mb-4">
              <div className="flex items-center gap-2">
                <img
                  src="/brand-logo.png"
                  alt="AETHER Brand Logo"
                  className="w-5 h-5 object-contain rounded-[3px]"
                />
                <strong className="text-[12px] tracking-[0.14em] text-white font-mono">AETHER // ALL MENU</strong>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none' }}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#94a3b8] hover:text-white text-xl p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 전체 메뉴 바로가기 그리드 */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Link
                href="/#ten-win-league"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342', textDecoration: 'none' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Award size={16} className="text-[#10b981]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">10연승 리그</div>
                  <div className="text-[9px] text-[#94a3b8]">챔피언십 순위</div>
                </div>
              </Link>

              <Link
                href="/#live-newswire"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342', textDecoration: 'none' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Radio size={16} className="text-[#38bdf8]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">실시간 속보</div>
                  <div className="text-[9px] text-[#94a3b8]">AI 팩트체크</div>
                </div>
              </Link>

              <Link
                href="/#arbitrage-scanner"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342', textDecoration: 'none' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <RefreshCw size={16} className="text-[#f59e0b]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">김프/차익거래</div>
                  <div className="text-[9px] text-[#94a3b8]">실시간 스프레드</div>
                </div>
              </Link>

              <Link
                href="/#media-wire"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342', textDecoration: 'none' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles size={16} className="text-[#ec4899]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">미디어 데스크</div>
                  <div className="text-[9px] text-[#94a3b8]">실시간 브리핑</div>
                </div>
              </Link>
            </div>

            {/* 계정 관리 및 홈 복귀 */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#262c36]">
              <Link
                href="/profile"
                className="text-[10px] text-[#34d399] font-mono hover:underline flex items-center gap-1.5"
              >
                <span>● ACCOUNT</span>
              </Link>
              <Link
                href="/"
                className="upgrade-model-button text-[10px] px-3 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                HOME DESK
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FinanceNav
