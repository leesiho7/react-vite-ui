'use client'

import Link from 'next/link'
import { UserRound } from 'lucide-react'

interface NavbarProps {
  onSelectSymbol?: (symbol: string) => void;
  language?: 'ko' | 'en' | 'cn';
  onLanguageChange?: (lang: 'ko' | 'en' | 'cn') => void;
  currentUser?: any;
  onLogout?: () => void;
  onOpenDeposit?: () => void;
  eventOpen?: boolean;
  onToggleEvent?: () => void;
  communityOpen?: boolean;
  onToggleCommunity?: () => void;
  newsOpen?: boolean;
  onToggleNews?: () => void;
}

export default function Navbar({
  onSelectSymbol,
  language = 'ko',
  onLanguageChange,
  currentUser,
  onLogout,
  onOpenDeposit,
  eventOpen = false,
  onToggleEvent,
  communityOpen = false,
  onToggleCommunity,
  newsOpen = false,
  onToggleNews
}: NavbarProps) {
  const tickers = [
    { symbol: 'BTC', price: '$78,891.12', change: '+2.41%', isUp: true, target: 'BTC/USD' },
    { symbol: 'ETH', price: '$2,340.50', change: '+1.85%', isUp: true, target: 'ETH/USD' },
    { symbol: 'NVDA', price: '$138.50', change: '-1.45%', isUp: false, target: 'NVDA' },
    { symbol: 'SOL', price: '$178.50', change: '+4.20%', isUp: true, target: 'SOL/USD' },
    { symbol: 'TSLA', price: '$218.40', change: '-1.71%', isUp: false, target: 'TSLA' },
    { symbol: 'AAPL', price: '$224.20', change: '+1.63%', isUp: true, target: 'AAPL' },
    { symbol: '005930.KS', price: '₩56,200', change: '+0.89%', isUp: true, target: '005930.KS' },
    { symbol: '000660.KS', price: '₩186,500', change: '+2.14%', isUp: true, target: '000660.KS' }
  ];

  const languageLabels: Record<'ko' | 'en' | 'cn', string> = {
    ko: 'KR',
    en: 'EN',
    cn: 'CN'
  }

  return (
    <header className="w-full bg-[#121820] text-white border-b border-[#1e293b] select-none sticky top-0 z-50 shadow-md">
      {/* ── 1단 글로벌 네비게이션 ── */}
      <nav className="max-w-[1440px] mx-auto flex justify-between items-center h-[66px] px-8">
        {/* A 네모상자 + AETHER 브랜드 락업 */}
        <div className="flex items-center gap-9">
          <Link href="/" className="flex items-center gap-3 text-white no-underline group">
            <div className="w-[32px] h-[32px] border border-[#38bdf8] bg-[#0b131e] text-[#38bdf8] font-serif font-bold text-[20px] grid place-items-center rounded-[2px] shadow-[0_0_10px_rgba(56,189,248,0.25)] group-hover:border-white transition-colors">
              A
            </div>
            <div>
              <strong className="block text-[14.5px] tracking-[0.16em] text-white font-bold leading-tight">
                AETHER
              </strong>
              <span className="block text-[8px] text-[#94a3b8] tracking-[0.14em] font-mono mt-0.5">
                AI FACT-CHECK & QUANT
              </span>
            </div>
          </Link>

          {/* 중앙 네비게이션 링크들 */}
          <ul className="flex items-center gap-6 text-[12px] font-medium text-[#94a3b8] list-none p-0 m-0">
            <li>
              <button
                type="button"
                className={`flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-0 font-inherit text-[12px] ${eventOpen ? 'text-[#38bdf8] font-bold' : 'text-[#94a3b8] hover:text-white'}`}
                onClick={onToggleEvent}
              >
                <span>10-WIN LEAGUE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`transition-colors cursor-pointer bg-transparent border-0 font-inherit text-[12px] ${communityOpen ? 'text-[#38bdf8] font-bold' : 'text-[#94a3b8] hover:text-white'}`}
                onClick={onToggleCommunity}
              >
                STRATEGY COMMONS
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`transition-colors cursor-pointer bg-transparent border-0 font-inherit text-[12px] ${newsOpen ? 'text-[#38bdf8] font-bold' : 'text-[#94a3b8] hover:text-white'}`}
                onClick={onToggleNews}
              >
                LIVE NEWSWIRE
              </button>
            </li>
            <li>
              <a href="#trading-console" className="hover:text-white transition-colors no-underline text-[#94a3b8]">
                24H BOT
              </a>
            </li>
            <li>
              <a href="#research-terminal" className="hover:text-white transition-colors no-underline text-[#94a3b8]">
                AI RESEARCH
              </a>
            </li>
            <li>
              <a href="#media-wire" className="hover:text-white transition-colors no-underline text-[#94a3b8]">
                MEDIA DESK
              </a>
            </li>
            <li>
              <a href="/orderbook" className="hover:text-[#38bdf8] transition-colors no-underline text-[#94a3b8] font-mono text-[11px]">
                L2 ORDERBOOK ↗
              </a>
            </li>
          </ul>
        </div>

        {/* 우측 유틸리티 & 회원 프로필 */}
        <div className="flex items-center gap-3">
          {/* 언어 전환 버튼 그룹 */}
          <div className="flex items-center border border-[#334155] rounded-[3px] p-[2px] bg-[#0b131e]">
            {(['ko', 'en', 'cn'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`px-2 py-1 text-[9.5px] font-mono font-semibold rounded-[2px] cursor-pointer border-0 transition-colors ${language === item ? 'bg-[#38bdf8] text-[#0b131e] font-bold' : 'bg-transparent text-[#94a3b8] hover:text-white'}`}
                onClick={() => onLanguageChange && onLanguageChange(item)}
              >
                {languageLabels[item]}
              </button>
            ))}
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#334155]">
              <Link href="/profile" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34d399] no-underline hover:underline">
                <UserRound size={14} />
                <span>{currentUser.nickname || currentUser.username}</span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="px-2 py-1 text-[9px] font-mono text-[#94a3b8] hover:text-white border border-[#334155] rounded-[2px] bg-transparent cursor-pointer"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[#334155]">
              <Link
                href="/login"
                className="px-3 py-1.5 text-[11px] font-semibold text-[#cbd5e1] hover:text-white no-underline"
              >
                로그인
              </Link>
              <button
                type="button"
                onClick={onOpenDeposit}
                className="px-3.5 py-1.5 text-[11px] font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-[3px] border-0 cursor-pointer transition-colors shadow-[0_0_12px_rgba(2,132,199,0.35)]"
              >
                1-SEC SOCIAL ACCESS ↗
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── 2단 실시간 펄스 티커 바 ── */}
      <div className="bg-[#0b1018] text-white h-[36px] px-8 flex items-center gap-8 overflow-x-auto whitespace-nowrap text-[11px] font-medium border-t border-[#1e293b] scrollbar-none">
        <div className="flex items-center gap-2 pr-3 border-r border-[#1e293b] font-bold text-[#38bdf8] flex-shrink-0">
          <span className="text-[9.5px] text-[#64748b] font-mono tracking-wider">LIVE PULSE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
        </div>
        {tickers.map((item, index) => (
          <button
            key={index}
            type="button"
            className="flex gap-2 items-center hover:opacity-80 transition-opacity cursor-pointer border-none bg-transparent flex-shrink-0 p-0"
            onClick={() => onSelectSymbol && onSelectSymbol(item.target)}
            title={`클릭하여 ${item.symbol} 차트 및 퀀트 지표 동기화`}
          >
            <span className="text-[#f1f5f9] font-bold font-mono">{item.symbol}</span>
            <span className={`font-mono font-semibold ${item.isUp ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {item.price} {item.change}
            </span>
          </button>
        ))}
      </div>
    </header>
  )
}
