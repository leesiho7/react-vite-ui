'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  UserRound,
  Globe,
  ChevronDown,
  Check,
  TrendingUp,
  Bot,
  BrainCircuit,
  Menu,
  X,
  Award,
  Radio,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react'

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
  arbitrageOpen?: boolean;
  onToggleArbitrage?: () => void;
  onOpenUpgrade?: () => void;
  tradeOpen?: boolean;
  onToggleTrade?: () => void;
  researchOpen?: boolean;
  onToggleResearch?: () => void;
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
  onToggleNews,
  arbitrageOpen = false,
  onToggleArbitrage,
  onOpenUpgrade,
  tradeOpen = false,
  onToggleTrade,
  researchOpen = false,
  onToggleResearch
}: NavbarProps) {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const langDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [tickers, setTickers] = useState([
    { symbol: 'BTC', name: 'Bitcoin', logo: 'https://financialmodelingprep.com/image-stock/BTCUSD.png', price: '$78,418.00', change: '+2.41%', isUp: true, target: 'BTC/USD' },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://financialmodelingprep.com/image-stock/ETHUSD.png', price: '$2,340.50', change: '+1.85%', isUp: true, target: 'ETH/USD' },
    { symbol: 'NVDA', name: 'NVIDIA', logo: 'https://financialmodelingprep.com/image-stock/NVDA.png', price: '$138.50', change: '+2.45%', isUp: true, target: 'NVDA' },
    { symbol: 'SOL', name: 'Solana', logo: 'https://financialmodelingprep.com/image-stock/SOLUSD.png', price: '$178.50', change: '+4.20%', isUp: true, target: 'SOL/USD' },
    { symbol: 'TSLA', name: 'Tesla', logo: 'https://financialmodelingprep.com/image-stock/TSLA.png', price: '$218.40', change: '-1.71%', isUp: false, target: 'TSLA' },
    { symbol: 'AAPL', name: 'Apple', logo: 'https://financialmodelingprep.com/image-stock/AAPL.png', price: '$224.20', change: '+1.63%', isUp: true, target: 'AAPL' },
    { symbol: '005930.KS', name: 'Samsung', logo: 'https://financialmodelingprep.com/image-stock/005930.KS.png', price: '₩56,200', change: '+0.89%', isUp: true, target: '005930.KS' },
    { symbol: '000660.KS', name: 'SK Hynix', logo: 'https://financialmodelingprep.com/image-stock/000660.KS.png', price: '₩186,500', change: '+2.14%', isUp: true, target: '000660.KS' },
    { symbol: 'XRP', name: 'Ripple', logo: 'https://financialmodelingprep.com/image-stock/XRPUSD.png', price: '$2.15', change: '+5.12%', isUp: true, target: 'XRP/USD' },
    { symbol: 'BNB', name: 'BNB', logo: 'https://financialmodelingprep.com/image-stock/BNBUSD.png', price: '$648.20', change: '+0.95%', isUp: true, target: 'BNB/USD' }
  ]);

  // Real-time Binance Live Ticker Multi-Stream
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker/xrpusdt@ticker/bnbusdt@ticker');
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const data = payload.data;
          if (!data || !data.s) return;

          const symbolMap: Record<string, string> = {
            BTCUSDT: 'BTC',
            ETHUSDT: 'ETH',
            SOLUSDT: 'SOL',
            XRPUSDT: 'XRP',
            BNBUSDT: 'BNB'
          };

          const symKey = symbolMap[data.s];
          if (!symKey) return;

          const priceNum = parseFloat(data.c || '0');
          const changePct = parseFloat(data.P || '0');
          const isUp = changePct >= 0;

          setTickers((prev) =>
            prev.map((t) => {
              if (t.symbol === symKey) {
                const formattedPrice =
                  priceNum >= 1000
                    ? `$${priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : priceNum >= 1
                    ? `$${priceNum.toFixed(2)}`
                    : `$${priceNum.toFixed(4)}`;
                const formattedChange = `${isUp ? '+' : ''}${changePct.toFixed(2)}%`;
                return { ...t, price: formattedPrice, change: formattedChange, isUp };
              }
              return t;
            })
          );
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // ignore ws setup error
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const menuText = {
    league: language === 'ko' ? '10연승 리그' : language === 'cn' ? '10连胜联赛' : '10-Win League',
    news: language === 'ko' ? '실시간 속보' : language === 'cn' ? '实时快讯' : 'News Wire',
    trade: language === 'ko' ? 'TRADE' : language === 'cn' ? '交易' : 'Trade',
    bots: language === 'ko' ? '24H 자동봇' : language === 'cn' ? '24H自动机器人' : '24H Bots',
    research: language === 'ko' ? 'AI 퀀트 리서치' : language === 'cn' ? 'AI量化研报' : 'AI Quant Research',
    media: language === 'ko' ? '미디어 데스크' : language === 'cn' ? '媒体工作台' : 'Media Desk',
    arbitrage: language === 'ko' ? '김프 / 아비트라지' : language === 'cn' ? '泡菜溢价/套利' : 'Arbitrage',
    login: language === 'ko' ? '로그인' : language === 'cn' ? '登录' : 'Login',
    signup: language === 'ko' ? '1초 시작' : language === 'cn' ? '1秒开始' : 'Get Started',
    logout: language === 'ko' ? '로그아웃' : language === 'cn' ? '退出' : 'Logout',
    pulse: language === 'ko' ? '실시간 펄스' : language === 'cn' ? '实时脉冲' : 'Live Pulse'
  }

  const langOptions = [
    { code: 'ko' as const, label: '한국어' },
    { code: 'en' as const, label: 'English' },
    { code: 'cn' as const, label: '中文' }
  ];

  const infiniteTickers = [...tickers, ...tickers];

  const handleBotScroll = () => {
    const el = document.getElementById('trading-console')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <header className="w-full bg-[#121212] text-white border-b border-[#222222] select-none sticky top-0 z-50 shadow-lg font-sans">
        {/* ── 1단 글로벌 네비게이션: 2-Block justify-between 1줄 칼각 정렬 (56px 높이 & 56px 여백 일치) ── */}
        <nav className="w-full max-w-[1440px] mx-auto flex items-center justify-between h-[56px] px-4 sm:px-8 md:px-[56px] gap-4 bg-[#121212]">
          
          {/* [왼쪽 블록: AETHER 로고 + 다국어 텍스트 링크 메뉴] */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0 flex-1 overflow-hidden">
            <Link href="/" className="flex items-center gap-3 text-white no-underline group flex-shrink-0">
              <img
                src="/brand-logo.png"
                alt="AETHER Brand Logo"
                className="w-[30px] h-[30px] object-contain rounded-[4px] shadow-[0_0_12px_rgba(244,122,32,0.25)] group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <strong className="text-[13px] tracking-[0.16em] text-white font-bold leading-tight">
                  AETHER
                </strong>
                <span className="text-[7.5px] text-[#71717a] tracking-[0.12em] font-mono whitespace-nowrap mt-0.5">
                  AI FACT-CHECK & QUANT
                </span>
              </div>
            </Link>

            {/* 세로 구분선 */}
            <div className="hidden lg:block h-4 w-[1px] bg-[#27272a] flex-shrink-0" />

            {/* 다국어 동기화 메뉴 리스트 (데스크톱) */}
            <ul className="hidden md:flex items-center gap-x-5 lg:gap-x-7 text-[12px] font-medium text-[#a1a1aa] list-none p-0 m-0 whitespace-nowrap overflow-x-auto scrollbar-none">
              <li>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer p-0 text-[12px] font-medium ${eventOpen ? 'text-[#f47a20] font-bold' : 'text-[#a1a1aa] hover:text-[#f47a20]'}`}
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
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer p-0 text-[12px] font-medium ${newsOpen ? 'text-[#f47a20] font-bold' : 'text-[#a1a1aa] hover:text-[#f47a20]'}`}
                  onClick={onToggleNews}
                >
                  <span>{menuText.news}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-ping"></span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  className={`transition-colors cursor-pointer p-0 text-[12px] font-medium ${tradeOpen ? 'text-[#f47a20] font-bold' : 'text-[#a1a1aa] hover:text-[#f47a20]'}`}
                  onClick={onToggleTrade}
                >
                  {menuText.trade}
                </button>
              </li>

              <li>
                <a
                  href="#trading-console"
                  className="text-[#a1a1aa] hover:text-[#f47a20] transition-colors no-underline text-[12px] font-medium"
                >
                  {menuText.bots}
                </a>
              </li>

              <li>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  className={`transition-colors cursor-pointer p-0 text-[12px] font-medium ${researchOpen ? 'text-[#f47a20] font-bold' : 'text-[#a1a1aa] hover:text-[#f47a20]'}`}
                  onClick={onToggleResearch}
                >
                  {menuText.research}
                </button>
              </li>

              <li>
                <a
                  href="#media-wire"
                  className="text-[#a1a1aa] hover:text-[#f47a20] transition-colors no-underline text-[12px] font-medium"
                >
                  {menuText.media}
                </a>
              </li>

              <li>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  className={`transition-colors cursor-pointer p-0 text-[12px] font-medium ${arbitrageOpen ? 'text-[#f47a20] font-bold' : 'text-[#a1a1aa] hover:text-[#f47a20]'}`}
                  onClick={onToggleArbitrage}
                >
                  {menuText.arbitrage}
                </button>
              </li>
            </ul>
          </div>

          {/* [오른쪽 블록: 언어 셀렉터 + UPGRADE + 계정/로그인 버튼] */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {/* 다국어 언어 전환 드롭다운 (데스크톱) */}
            <div className="hidden sm:block relative" ref={langDropdownRef}>
              <button
                type="button"
                style={{ background: 'transparent', boxShadow: 'none' }}
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#a1a1aa] hover:text-white border border-[#27272a] hover:border-[#3f3f46] rounded-[2px] cursor-pointer transition-colors"
                title="Change Language"
              >
                <Globe size={13} className="text-[#a1a1aa]" />
                <span className="font-mono uppercase">{language}</span>
                <ChevronDown size={11} className={`text-[#71717a] transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-28 bg-[#18181b] border border-[#27272a] rounded-[2px] shadow-2xl py-1 z-50 animate-in fade-in duration-150">
                  {langOptions.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                      onClick={() => {
                        onLanguageChange && onLanguageChange(opt.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left cursor-pointer transition-colors ${language === opt.code ? 'text-[#38bdf8] bg-[#27272a]/50 font-bold' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
                    >
                      <span>{opt.label}</span>
                      {language === opt.code && <Check size={12} className="text-[#38bdf8]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── UPGRADE MODEL 버튼 ── */}
            <button
              type="button"
              className="upgrade-model-button text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1.5"
              onClick={onOpenUpgrade}
              title="AETHER Pro Intelligence Upgrade"
            >
              ✦ UPGRADE MODEL
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-[#27272a]">
                <Link href="/profile" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34d399] no-underline hover:underline whitespace-nowrap">
                  <UserRound size={13} />
                  <span className="hidden sm:inline">{currentUser.nickname || currentUser.username}</span>
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
              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#27272a]">
                <Link
                  href="/login"
                  className="hidden sm:inline-block px-3 py-1.5 text-[11px] font-semibold text-[#d4d4d8] hover:text-white no-underline whitespace-nowrap"
                >
                  {menuText.login}
                </Link>
                <button
                  type="button"
                  style={{ border: 'none' }}
                  onClick={onOpenDeposit}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-[3px] cursor-pointer transition-colors shadow-[0_0_12px_rgba(2,132,199,0.35)] whitespace-nowrap"
                >
                  {menuText.signup}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* ── 2단 실시간 펄스 티커 바 ── */}
        <div className="w-full bg-white text-[#0f172a] h-[48px] sm:h-[56px] border-t border-b border-[#e2e8f0] flex items-center overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[56px] flex items-center overflow-hidden h-full">
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-ticker-tape flex items-center gap-6 sm:gap-8 whitespace-nowrap">
                {infiniteTickers.map((item, index) => (
                  <button
                    key={`${item.symbol}-${index}`}
                    type="button"
                    style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                    className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer flex-shrink-0 p-0 text-[11px] sm:text-[11.5px]"
                    onClick={() => onSelectSymbol && onSelectSymbol(item.target)}
                    title={`클릭하여 ${item.symbol} 차트 및 퀀트 지표 동기화`}
                  >
                    <div style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                      <img
                        src={item.logo}
                        alt={item.symbol}
                        width={13}
                        height={13}
                        style={{ width: '13px', height: '13px', objectFit: 'contain', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-[#0f172a] font-bold font-mono tracking-tight">{item.symbol}</span>
                    <span className={`font-mono font-bold ${item.isUp ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                      {item.price} {item.change}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 📱 모바일 엄지 조작 최적화 4개 핵심 하단바 (TRADE / BOT / RESEARCH / MENU) ── */}
      <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile Bottom Navigation">
        <button
          type="button"
          style={{ background: 'transparent', border: 'none' }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${tradeOpen ? 'text-[#f47a20]' : 'text-[#8b929e] hover:text-[#f47a20]'}`}
          onClick={() => {
            setMobileMenuOpen(false);
            if (onToggleTrade) onToggleTrade();
            else {
              const el = document.getElementById('market-intelligence-terminal') || document.getElementById('trading-console');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <TrendingUp size={19} />
          <span className="text-[9px] font-mono font-semibold">TRADE</span>
        </button>

        <button
          type="button"
          style={{ background: 'transparent', border: 'none' }}
          className="flex flex-col items-center justify-center gap-1 text-[#8b929e] hover:text-[#f47a20] cursor-pointer transition-colors"
          onClick={() => {
            setMobileMenuOpen(false);
            handleBotScroll();
          }}
        >
          <Bot size={19} />
          <span className="text-[9px] font-mono font-semibold">BOT</span>
        </button>

        <button
          type="button"
          style={{ background: 'transparent', border: 'none' }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${researchOpen ? 'text-[#f47a20]' : 'text-[#8b929e] hover:text-[#f47a20]'}`}
          onClick={() => {
            setMobileMenuOpen(false);
            if (onToggleResearch) onToggleResearch();
            else {
              const el = document.getElementById('research-terminal');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <BrainCircuit size={19} />
          <span className="text-[9px] font-mono font-semibold">RESEARCH</span>
        </button>

        <button
          type="button"
          style={{ background: 'transparent', border: 'none' }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${mobileMenuOpen ? 'text-[#f47a20]' : 'text-[#8b929e] hover:text-[#f47a20]'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={19} />
          <span className="text-[9px] font-mono font-semibold">MENU</span>
        </button>
      </nav>

      {/* ── 📱 모바일 바텀 시트 햄버거 메뉴 드로어 (Thumb Reachable Bottom Sheet) ── */}
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

            {/* 6개 주요 메뉴 카드 2열 그리드 */}
            <div className="grid grid-template-columns grid-cols-2 gap-2.5 mb-4">
              <button
                type="button"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onToggleEvent) onToggleEvent();
                }}
              >
                <Award size={16} className="text-[#10b981]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">{menuText.league}</div>
                  <div className="text-[9px] text-[#94a3b8]">10연승 실시간 랭킹</div>
                </div>
              </button>

              <button
                type="button"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onToggleNews) onToggleNews();
                }}
              >
                <Radio size={16} className="text-[#38bdf8]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">{menuText.news}</div>
                  <div className="text-[9px] text-[#94a3b8]">AI 팩트체크 속보</div>
                </div>
              </button>

              <button
                type="button"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onToggleArbitrage) onToggleArbitrage();
                }}
              >
                <RefreshCw size={16} className="text-[#f59e0b]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">{menuText.arbitrage}</div>
                  <div className="text-[9px] text-[#94a3b8]">실시간 김프 스캐너</div>
                </div>
              </button>

              <a
                href="#media-wire"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2a3342', textDecoration: 'none' }}
                className="flex items-center gap-2.5 p-3 rounded-[8px] text-left hover:border-[#f47a20] transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles size={16} className="text-[#ec4899]" />
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">{menuText.media}</div>
                  <div className="text-[9px] text-[#94a3b8]">미디어 인텔리전스</div>
                </div>
              </a>
            </div>

            {/* 다국어 언어 변경 & 프로 업그레이드 액션 바 */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#262c36]">
              <div className="flex items-center gap-1.5">
                {langOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    style={{ background: language === opt.code ? '#f47a20' : 'rgba(255,255,255,0.06)', border: 'none' }}
                    onClick={() => {
                      if (onLanguageChange) onLanguageChange(opt.code);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded-[4px] cursor-pointer ${language === opt.code ? 'text-white font-bold' : 'text-[#94a3b8]'}`}
                  >
                    {opt.code.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenUpgrade) onOpenUpgrade();
                }}
                className="upgrade-model-button text-[10px] px-3 py-1"
              >
                ✦ UPGRADE MODEL
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
