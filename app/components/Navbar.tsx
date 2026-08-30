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
    <header className="w-full bg-[#121212] text-white border-b border-[#222222] select-none sticky top-0 z-50 shadow-lg font-sans">
      {/* ── 1단 글로벌 네비게이션: 2-Block justify-between 1줄 칼각 정렬 ── */}
      <nav className="w-full max-w-[1440px] mx-auto flex items-center justify-between h-[64px] px-6 sm:px-8 gap-4 bg-[#121212]">
        
        {/* [왼쪽 블록: AETHER 로고 + 텍스트 링크 메뉴] */}
        <div className="flex items-center gap-6 lg:gap-8 min-w-0 flex-1 overflow-hidden">
          {/* A 네모상자 + AETHER 브랜드 락업 (고정 크기) */}
          <Link href="/" className="flex items-center gap-3 text-white no-underline group flex-shrink-0">
            <div className="w-[30px] h-[30px] border border-[#38bdf8] bg-[#090e17] text-[#38bdf8] font-serif font-bold text-[18px] grid place-items-center rounded-[2px] shadow-[0_0_12px_rgba(56,189,248,0.3)] group-hover:border-white transition-colors">
              A
            </div>
            <div className="flex flex-col">
              <strong className="text-[14px] tracking-[0.16em] text-white font-bold leading-tight">
                AETHER
              </strong>
              <span className="text-[8px] text-[#71717a] tracking-[0.12em] font-mono whitespace-nowrap mt-0.5">
                AI FACT-CHECK & QUANT
              </span>
            </div>
          </Link>

          {/* 세로 구분선 */}
          <div className="hidden lg:block h-4 w-[1px] bg-[#27272a] flex-shrink-0" />

          {/* 메뉴 리스트: 흰색 박스 제거, 깔끔한 텍스트 링크 스타일 */}
          <ul className="hidden md:flex items-center gap-x-5 lg:gap-x-7 text-[12px] font-medium text-[#a1a1aa] list-none p-0 m-0 whitespace-nowrap overflow-x-auto scrollbar-none">
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer p-0 text-[12px] ${eventOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleEvent}
              >
                <span>10-WIN LEAGUE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              </button>
            </li>
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`transition-colors cursor-pointer p-0 text-[12px] ${communityOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleCommunity}
              >
                STRATEGY COMMONS
              </button>
            </li>
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`transition-colors cursor-pointer p-0 text-[12px] ${newsOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleNews}
              >
                LIVE NEWSWIRE
              </button>
            </li>
            <li>
              <a href="#trading-console" className="hover:text-white transition-colors no-underline text-[#a1a1aa]">
                24H BOT
              </a>
            </li>
            <li>
              <a href="#research-terminal" className="hover:text-white transition-colors no-underline text-[#a1a1aa]">
                AI RESEARCH
              </a>
            </li>
            <li>
              <a href="#media-wire" className="hover:text-white transition-colors no-underline text-[#a1a1aa]">
                MEDIA DESK
              </a>
            </li>
            <li>
              <a href="/orderbook" className="hover:text-[#38bdf8] transition-colors no-underline text-[#71717a] font-mono text-[11px]">
                L2 ORDERBOOK ↗
              </a>
            </li>
          </ul>
        </div>

        {/* [오른쪽 블록: 언어 + 계정 유틸리티] */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          {/* 언어 전환 버튼 */}
          <div className="flex items-center border border-[#27272a] rounded-[3px] p-[2px] bg-[#18181b]">
            {(['ko', 'en', 'cn'] as const).map((item) => (
              <button
                key={item}
                type="button"
                style={{ border: 'none', boxShadow: 'none' }}
                className={`px-2 py-0.5 text-[9.5px] font-mono font-semibold rounded-[2px] cursor-pointer transition-colors ${language === item ? 'bg-[#38bdf8] text-[#090e17] font-bold' : 'bg-transparent text-[#a1a1aa] hover:text-white'}`}
                onClick={() => onLanguageChange && onLanguageChange(item)}
              >
                {languageLabels[item]}
              </button>
            ))}
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#27272a]">
              <Link href="/profile" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34d399] no-underline hover:underline whitespace-nowrap">
                <UserRound size={13} />
                <span>{currentUser.nickname || currentUser.username}</span>
              </Link>
              <button
                type="button"
                style={{ background: 'transparent', boxShadow: 'none' }}
                onClick={onLogout}
                className="px-2 py-0.5 text-[9px] font-mono text-[#a1a1aa] hover:text-white border border-[#27272a] rounded-[2px] cursor-pointer whitespace-nowrap"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-[#27272a]">
              <Link
                href="/login"
                className="px-3 py-1.5 text-[11px] font-semibold text-[#d4d4d8] hover:text-white no-underline whitespace-nowrap"
              >
                로그인
              </Link>
              <button
                type="button"
                style={{ border: 'none' }}
                onClick={onOpenDeposit}
                className="px-3.5 py-1.5 text-[11px] font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-[3px] cursor-pointer transition-colors shadow-[0_0_12px_rgba(2,132,199,0.35)] whitespace-nowrap"
              >
                1-SEC SOCIAL ACCESS ↗
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── 2단 실시간 펄스 티커 바: 완전 다크(#161616) 배경 & 흰색 박스 원천 박멸 ── */}
      <div className="w-full bg-[#161616] text-white h-[36px] px-6 sm:px-8 border-t border-[#222222] flex items-center overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="w-full max-w-[1440px] mx-auto flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
          {/* LIVE PULSE 라벨 */}
          <div className="flex items-center gap-2 pr-3 border-r border-[#27272a] font-bold text-[#38bdf8] flex-shrink-0">
            <span className="text-[9.5px] text-[#71717a] font-mono tracking-wider">LIVE PULSE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          </div>

          {/* 8대 종목 실시간 흐름 */}
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
            {tickers.map((item, index) => (
              <button
                key={index}
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 p-0 text-[11px]"
                onClick={() => onSelectSymbol && onSelectSymbol(item.target)}
                title={`클릭하여 ${item.symbol} 차트 및 퀀트 지표 동기화`}
              >
                <span className="text-[#e4e4e7] font-bold font-mono">{item.symbol}</span>
                <span className={`font-mono font-semibold ${item.isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {item.price} {item.change}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
