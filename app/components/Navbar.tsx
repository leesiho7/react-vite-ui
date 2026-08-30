'use client'

import Link from 'next/link'

interface NavbarProps {
  onSelectSymbol?: (symbol: string) => void;
  language?: string;
  onLanguageChange?: (lang: any) => void;
  currentUser?: any;
  onLogout?: () => void;
  onOpenDeposit?: () => void;
}

export default function Navbar({
  onSelectSymbol,
  language = 'ko',
  onLanguageChange,
  currentUser,
  onLogout,
  onOpenDeposit
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

  return (
    <header className="w-full bg-[#121212] text-white border-b border-[#2a2a2a] select-none font-sans sticky top-0 z-50 shadow-md">
      {/* 1단 네비게이션 */}
      <nav className="max-w-7xl mx-auto flex justify-between items-center h-16 px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2 text-white">
            <span className="w-7 h-7 bg-[#ff7700] rounded-sm text-white font-black text-sm grid place-items-center">T</span>
            <span>TradingKey <small className="text-[10px] text-[#ff7700] font-normal tracking-normal border border-[#ff7700]/40 px-1.5 py-0.5 rounded ml-1">PRO</small></span>
          </Link>
          <ul className="flex items-center gap-6 text-sm font-medium text-gray-400">
            <li>
              <a href="#market-pulse" className="hover:text-white transition-colors">시장</a>
            </li>
            <li>
              <a href="#ten-win-league" className="hover:text-white transition-colors flex items-center gap-1.5">
                <span>10연승 리그</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d395] animate-pulse"></span>
              </a>
            </li>
            <li>
              <a href="#live-newswire" className="hover:text-white transition-colors">뉴스</a>
            </li>
            <li>
              <a href="#research-terminal" className="hover:text-white transition-colors">AI 분석</a>
            </li>
            <li>
              <a href="#trading-console" className="hover:text-white transition-colors">24H 봇</a>
            </li>
            <li>
              <a href="#media-wire" className="hover:text-white transition-colors">미디어 데스크</a>
            </li>
          </ul>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 언어 전환 버튼 */}
          <button 
            type="button" 
            className="p-2 text-gray-300 hover:text-white text-xs flex items-center gap-1 border border-[#333] rounded px-2"
            onClick={() => onLanguageChange && onLanguageChange(language === 'ko' ? 'en' : language === 'en' ? 'cn' : 'ko')}
            title="언어 전환"
          >
            <span>🌐</span>
            <span className="uppercase text-[10.5px] font-semibold">{language}</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-xs font-semibold text-emerald-400 hover:underline">
                👤 {currentUser.nickname || currentUser.username}
              </Link>
              <button 
                type="button" 
                onClick={onLogout}
                className="px-2.5 py-1 text-xs text-gray-400 hover:text-white border border-[#333] rounded"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="px-3.5 py-1.5 text-xs font-semibold text-white hover:text-gray-200">
                로그인
              </Link>
              <button 
                type="button" 
                onClick={onOpenDeposit}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#ff7700] text-white rounded-md hover:bg-[#e06900] transition-colors shadow-sm"
              >
                무료 회원가입
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 2단 실시간 티커 바 */}
      <div className="bg-white text-black h-9 px-6 flex items-center gap-8 overflow-x-auto whitespace-nowrap text-xs font-semibold border-t border-[#2a2a2a] scrollbar-none shadow-inner">
        <div className="flex items-center gap-2 pr-2 border-r border-gray-300 font-bold text-[#18334a]">
          <span className="text-[10px] text-gray-400 font-mono uppercase">LIVE PULSE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </div>
        {tickers.map((item, index) => (
          <button 
            key={index} 
            type="button"
            className="flex gap-2 items-center hover:opacity-75 transition-opacity cursor-pointer border-none bg-transparent"
            onClick={() => onSelectSymbol && onSelectSymbol(item.target)}
            title={`클릭하여 ${item.symbol} 차트 동기화`}
          >
            <span className="text-gray-900 font-bold">{item.symbol}</span>
            <span className={item.isUp ? 'text-[#00875a] font-mono' : 'text-[#de350b] font-mono'}>
              {item.price} {item.change}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
}
