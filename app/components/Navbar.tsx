'use client'

import Link from 'next/link'
import { UserRound, Globe } from 'lucide-react'

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
    { symbol: '000660.KS', price: '₩186,500', change: '+2.14%', isUp: true, target: '000660.KS' },
    { symbol: 'XRP', price: '$2.15', change: '+5.12%', isUp: true, target: 'XRP/USD' },
    { symbol: 'BNB', price: '$648.20', change: '+0.95%', isUp: true, target: 'BNB/USD' }
  ];

  const menuText = {
    ko: {
      league: '10연승 리그',
      commons: '전략 커먼즈',
      newswire: '실시간 속보',
      bot: '24H 자동봇',
      research: 'AI 퀀트 리서치',
      media: '미디어 데스크',
      arbitrage: '아비트라지 ↗',
      login: '로그인',
      signup: '1초 소셜 시작 ↗',
      logout: '로그아웃',
      pulse: '실시간 펄스'
    },
    en: {
      league: '10-WIN LEAGUE',
      commons: 'STRATEGY COMMONS',
      newswire: 'LIVE NEWSWIRE',
      bot: '24H BOT',
      research: 'AI RESEARCH',
      media: 'MEDIA DESK',
      arbitrage: 'ARBITRAGE ↗',
      login: 'LOGIN',
      signup: '1-SEC ACCESS ↗',
      logout: 'LOGOUT',
      pulse: 'LIVE PULSE'
    },
    cn: {
      league: '10连胜联赛',
      commons: '策略社区',
      newswire: '实时快讯',
      bot: '24H 机器人',
      research: 'AI 量化研报',
      media: '媒体中心',
      arbitrage: '跨期套利 ↗',
      login: '登录',
      signup: '1秒快捷进入 ↗',
      logout: '退出登录',
      pulse: '实时行情'
    }
  }[language] || {
    league: '10연승 리그',
    commons: '전략 커먼즈',
    newswire: '실시간 속보',
    bot: '24H 자동봇',
    research: 'AI 퀀트 리서치',
    media: '미디어 데스크',
    arbitrage: '아비트라지 ↗',
    login: '로그인',
    signup: '1초 소셜 시작 ↗',
    logout: '로그아웃',
    pulse: '실시간 펄스'
  }

  const langOptions = [
    { code: 'ko' as const, label: '한국어' },
    { code: 'en' as const, label: 'English' },
    { code: 'cn' as const, label: '中文' }
  ];

  // 무한 롤링 티커용 중복 배열 (끊김 없는 연속 루프)
  const infiniteTickers = [...tickers, ...tickers];

  return (
    <header className="w-full bg-[#121212] text-white border-b border-[#222222] select-none sticky top-0 z-50 shadow-lg font-sans">
      {/* ── 1단 글로벌 네비게이션: 2-Block justify-between 1줄 칼각 정렬 (56px 여백 일치) ── */}
      <nav className="w-full max-w-[1440px] mx-auto flex items-center justify-between h-[64px] px-4 sm:px-8 md:px-[56px] gap-4 bg-[#121212]">
        
        {/* [왼쪽 블록: AETHER 로고 + 다국어 텍스트 링크 메뉴] */}
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

          {/* 다국어 동기화 메뉴 리스트 (호가 -> 아비트라지로 변경 완료) */}
          <ul className="hidden md:flex items-center gap-x-5 lg:gap-x-7 text-[12px] font-medium text-[#a1a1aa] list-none p-0 m-0 whitespace-nowrap overflow-x-auto scrollbar-none">
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer p-0 text-[12px] font-medium ${eventOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleEvent}
              >
                <span>{menuText.league}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              </button>
            </li>
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`transition-colors cursor-pointer p-0 text-[12px] font-medium ${communityOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleCommunity}
              >
                {menuText.commons}
              </button>
            </li>
            <li>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                className={`transition-colors cursor-pointer p-0 text-[12px] font-medium ${newsOpen ? 'text-[#38bdf8] font-bold' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={onToggleNews}
              >
                {menuText.newswire}
              </button>
            </li>
            <li>
              <a href="#trading-console" className="hover:text-white transition-colors no-underline text-[#a1a1aa] text-[12px] font-medium">
                {menuText.bot}
              </a>
            </li>
            <li>
              <a href="#research-terminal" className="hover:text-white transition-colors no-underline text-[#a1a1aa] text-[12px] font-medium">
                {menuText.research}
              </a>
            </li>
            <li>
              <a href="#media-wire" className="hover:text-white transition-colors no-underline text-[#a1a1aa] text-[12px] font-medium">
                {menuText.media}
              </a>
            </li>
            <li>
              <Link href="/orderbook" className="hover:text-[#38bdf8] transition-colors no-underline text-[#38bdf8] font-mono text-[11px] font-semibold flex items-center gap-1 bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">
                {menuText.arbitrage}
              </Link>
            </li>
          </ul>
        </div>

        {/* [오른쪽 블록: 한국어·English·中文 선택기 + 계정 유틸리티] */}
        <div className="flex items-center gap-3.5 flex-shrink-0 ml-auto">
          {/* 3대 언어 명시적 선택 탭 (한국어 / English / 中文) */}
          <div className="flex items-center border border-[#27272a] rounded-[4px] p-[2px] bg-[#18181b]">
            <Globe size={11} className="text-[#71717a] ml-1.5 mr-1" />
            {langOptions.map((item) => (
              <button
                key={item.code}
                type="button"
                style={{ border: 'none', boxShadow: 'none' }}
                className={`px-2 py-1 text-[10px] font-medium rounded-[3px] cursor-pointer transition-all ${language === item.code ? 'bg-[#38bdf8] text-[#090e17] font-bold shadow-sm' : 'bg-transparent text-[#a1a1aa] hover:text-white'}`}
                onClick={() => onLanguageChange && onLanguageChange(item.code)}
                title={`${item.label}로 언어 설정`}
              >
                {item.label}
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
                className="px-2 py-1 text-[9.5px] font-mono text-[#a1a1aa] hover:text-white border border-[#27272a] rounded-[2px] cursor-pointer whitespace-nowrap"
              >
                {menuText.logout}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-[#27272a]">
              <Link
                href="/login"
                className="px-3 py-1.5 text-[11px] font-semibold text-[#d4d4d8] hover:text-white no-underline whitespace-nowrap"
              >
                {menuText.login}
              </Link>
              <button
                type="button"
                style={{ border: 'none' }}
                onClick={onOpenDeposit}
                className="px-3.5 py-1.5 text-[11px] font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-[3px] cursor-pointer transition-colors shadow-[0_0_12px_rgba(2,132,199,0.35)] whitespace-nowrap"
              >
                {menuText.signup}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── 2단 실시간 펄스 티커 바: 좌측 고정 배지 + 사이드로 끊김없이 슥슥 흐르는 무한 롤링 테이프 ── */}
      <div className="w-full bg-[#161616] text-white h-[36px] border-t border-[#222222] flex items-center overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[56px] flex items-center overflow-hidden">
          {/* LIVE PULSE 고정 라벨 (왼쪽 고정 및 그림자 마스크) */}
          <div className="flex items-center gap-2 pr-4 mr-2 border-r border-[#27272a] font-bold text-[#38bdf8] flex-shrink-0 z-10 bg-[#161616]">
            <span className="text-[9.5px] text-[#38bdf8] font-mono tracking-wider font-bold">{menuText.pulse}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          </div>

          {/* 사이드로 유려하게 슥슥 무한 이동하는 동적 마키 테이프 (마우스 호버 시 일시정지) */}
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-ticker-tape flex items-center gap-8 whitespace-nowrap">
              {infiniteTickers.map((item, index) => (
                <button
                  key={`${item.symbol}-${index}`}
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
      </div>
    </header>
  )
}
