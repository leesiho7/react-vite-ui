'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, ArrowUpRight, Search, Zap, Cpu, Network } from 'lucide-react'

interface HeroProps {
  query?: string;
  onQueryChange?: (q: string) => void;
  onSearch?: (q: string) => void;
  language?: 'ko' | 'en' | 'cn';
}

export default function Hero({
  query = '',
  onQueryChange,
  onSearch,
  language = 'ko'
}: HeroProps) {
  const [internalQuery, setInternalQuery] = useState(query)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    setInternalQuery(query)
  }, [query])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalQuery(val)
    if (onQueryChange) onQueryChange(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onSearch) onSearch(internalQuery)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
  }

  const quickAssets = [
    { symbol: 'BTC', name: '비트코인' },
    { symbol: 'NVDA', name: '엔비디아' },
    { symbol: 'ETH', name: '이더리움' },
    { symbol: 'SOL', name: '솔라나' },
    { symbol: '005930.KS', name: '삼성전자' }
  ]

  const texts = {
    ko: {
      eyebrow: 'AETHER AI FACT-CHECK & QUANT // INSTITUTIONAL GRADE',
      title: '다음 선택을 현명하게.',
      description:
        'AI가 시장의 소음을 팩트체크하고, 오픈소스 전략은 재현 가능하게 검증합니다. 데이터를 기반으로 한 기관급 인텔리전스입니다.',
      placeholder: '자산(BTC, ETH, SOL, NVDA) 또는 전략 검색...',
      cta: 'AI 융합 분석 실행',
      quickLabel: '빠른 탐색:'
    },
    en: {
      eyebrow: 'AETHER AI FACT-CHECK & QUANT // INSTITUTIONAL GRADE',
      title: 'Make your next move smarter.',
      description:
        'AI fact-checks market noise while open-source quant algorithms verify reproducible strategies. High-precision intelligence powered by on-chain & microsecond orderbook data.',
      placeholder: 'Search assets (BTC, ETH, SOL, NVDA) or strategies...',
      cta: 'Run AI Fusion Analysis',
      quickLabel: 'Popular:'
    },
    cn: {
      eyebrow: 'AETHER AI 事实核查与量化引擎 // 机构级智能',
      title: '让下一次决策更明智。',
      description:
        'AI事实核查过滤市场杂音，开源量化模型保障策略100%可复现。基于多源深度数据的机构级智能终端。',
      placeholder: '搜索资产(BTC, ETH, SOL, NVDA)或策略...',
      cta: '执行 AI 融合分析',
      quickLabel: '热门资产:'
    }
  }[language] || {
    eyebrow: 'AETHER AI FACT-CHECK & QUANT // INSTITUTIONAL GRADE',
    title: '다음 선택을 현명하게.',
    description:
      'AI가 시장의 소음을 팩트체크하고, 오픈소스 전략은 재현 가능하게 검증합니다. 데이터를 기반으로 한 기관급 인텔리전스입니다.',
    placeholder: '자산(BTC, ETH, SOL, NVDA) 또는 전략 검색...',
    cta: 'AI 융합 분석 실행',
    quickLabel: '빠른 탐색:'
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative w-full bg-[#FFFFFF] border-b border-[#E5E7EB] py-14 sm:py-20 lg:py-24 overflow-hidden select-none"
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[56px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ── 좌측 콘텐츠 칼럼 (텍스트 + 검색창 + CTA) ── */}
          <div className="lg:col-span-7 z-10 flex flex-col justify-center">
            
            {/* 상단 브랜딩 뱃지 */}
            <div className="inline-flex items-center gap-2 mb-4 text-[11px] font-mono tracking-wider text-[#6B7280]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875a] animate-pulse"></span>
              <span className="uppercase">{texts.eyebrow}</span>
            </div>

            {/* 핵심 타이틀 */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#121212] tracking-tight leading-[1.12] mb-5 font-sans">
              {texts.title}
            </h1>

            {/* 본문 서술 */}
            <p className="text-[16px] text-[#4A4A4A] leading-[1.6] max-w-[620px] mb-8 font-normal">
              {texts.description}
            </p>

            {/* ── 검색창 & CTA 버튼 가로 배치 ── */}
            <div className="w-full max-w-[620px] mb-4">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-1.5 bg-[#FFFFFF] border border-[#D1D5DB] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:border-[#121212] focus-within:ring-2 focus-within:ring-[#121212]/10 transition-all">
                
                {/* 검색 입력창 */}
                <div className="relative flex-1 flex items-center pl-3">
                  <Search size={18} className="text-[#9CA3AF] mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={internalQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={texts.placeholder}
                    className="w-full bg-transparent text-[#121212] placeholder-[#A0A0A0] text-[14.5px] font-medium outline-none border-none pr-2"
                  />
                  <span className="hidden sm:inline-block text-[10px] font-mono text-[#9CA3AF] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded mr-2 flex-shrink-0">
                    ⌘ K
                  </span>
                </div>

                {/* AI 융합 분석 실행 CTA 버튼 */}
                <button
                  type="button"
                  onClick={() => onSearch && onSearch(internalQuery)}
                  className="flex items-center justify-center gap-2 bg-[#121212] hover:bg-[#262626] text-[#FFFFFF] text-[13.5px] font-semibold px-6 py-3.5 rounded-md transition-all duration-150 cursor-pointer shadow-md hover:shadow-lg flex-shrink-0 whitespace-nowrap active:scale-[0.98]"
                >
                  <Sparkles size={15} className="text-[#38bdf8]" />
                  <span>{texts.cta}</span>
                  <ArrowUpRight size={14} className="text-[#9CA3AF]" />
                </button>
              </div>
            </div>

            {/* 1클릭 추천 자산 칩 */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#6B7280]">
              <span className="font-mono text-[#9CA3AF]">{texts.quickLabel}</span>
              {quickAssets.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => {
                    const target = item.symbol.includes('.KS') ? item.symbol : `${item.symbol}/USD`
                    setInternalQuery(target)
                    if (onQueryChange) onQueryChange(target)
                    if (onSearch) onSearch(target)
                  }}
                  className="px-2.5 py-1 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151] hover:text-[#121212] border border-[#E5E7EB] rounded-[4px] font-mono transition-colors cursor-pointer"
                >
                  ${item.symbol} <span className="text-[#9CA3AF]">({item.name})</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 우측 인터랙티브 AI 라인 아트 (인텔리전스 네트워크 맵) ── */}
          <div className="lg:col-span-5 relative w-full h-[320px] sm:h-[400px] lg:h-[460px] flex items-center justify-center pointer-events-none">
            
            {/* 은은한 앰비언트 글로우 백그라운드 */}
            <div
              className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-gradient-to-tr from-[#00875a]/10 via-[#38bdf8]/10 to-transparent blur-3xl opacity-60 transition-transform duration-700 ease-out"
              style={{
                transform: `translate(${(mousePos.x - 0.5) * 40}px, ${(mousePos.y - 0.5) * 40}px)`
              }}
            />

            {/* 기하학적 AI 네트워크 라인 아트 SVG (미니멀 + 유려한 곡선) */}
            <svg
              className="w-full h-full max-w-[500px] max-h-[460px] overflow-visible opacity-80"
              viewBox="0 0 500 460"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 메인 라인 그라데이션 */}
                <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D0D0D0" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#00875a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
                </linearGradient>

                <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.3" />
                  <stop offset="60%" stopColor="#00875a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D0D0D0" stopOpacity="0.2" />
                </linearGradient>

                {/* 펄스 노드 글로우 필터 */}
                <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. 배경 기하학적 그리드 레이더 링 */}
              <circle cx="250" cy="230" r="190" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
              <circle cx="250" cy="230" r="130" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />
              <circle cx="250" cy="230" r="70" stroke="#00875a" strokeWidth="1" strokeDasharray="4 4" opacity="0.25" />

              {/* 2. 유려한 물결 데이터 커브 (Bezier Splines) */}
              <path
                d="M 30 260 C 120 180, 180 340, 270 210 C 340 100, 420 180, 470 140"
                stroke="url(#lineGrad1)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              >
                <animate
                  attributeName="d"
                  dur="10s"
                  repeatCount="indefinite"
                  values="
                    M 30 260 C 120 180, 180 340, 270 210 C 340 100, 420 180, 470 140;
                    M 30 240 C 130 290, 190 140, 280 250 C 360 320, 410 120, 470 160;
                    M 30 260 C 120 180, 180 340, 270 210 C 340 100, 420 180, 470 140
                  "
                />
              </path>

              <path
                d="M 40 150 C 140 280, 210 90, 310 240 C 380 340, 430 200, 480 290"
                stroke="url(#lineGrad2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
                fill="none"
              >
                <animate
                  attributeName="d"
                  dur="12s"
                  repeatCount="indefinite"
                  values="
                    M 40 150 C 140 280, 210 90, 310 240 C 380 340, 430 200, 480 290;
                    M 40 180 C 110 110, 230 310, 330 170 C 400 90, 450 260, 480 240;
                    M 40 150 C 140 280, 210 90, 310 240 C 380 340, 430 200, 480 290
                  "
                />
              </path>

              {/* 3. 상호 연결되는 퀀트 인텔리전스 노드 (Nodes & Links) */}
              {/* 링크 선들 */}
              <line x1="120" y1="180" x2="250" y2="230" stroke="#D0D0D0" strokeWidth="1" opacity="0.4" />
              <line x1="250" y1="230" x2="380" y2="150" stroke="#00875a" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
              <line x1="250" y1="230" x2="320" y2="340" stroke="#D0D0D0" strokeWidth="1" opacity="0.35" />
              <line x1="160" y1="310" x2="250" y2="230" stroke="#00875a" strokeWidth="1" opacity="0.3" />
              <line x1="380" y1="150" x2="440" y2="210" stroke="#D0D0D0" strokeWidth="1" opacity="0.3" />

              {/* 노드 1: 중심 코어 (AETHER Core Engine) */}
              <g transform="translate(250, 230)">
                <circle r="14" fill="none" stroke="#00875a" strokeWidth="1.2" opacity="0.4">
                  <animate attributeName="r" values="10;22;10" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle r="6" fill="#121212" stroke="#00875a" strokeWidth="2" filter="url(#nodeGlow)" />
                <circle r="2.5" fill="#00d395" />
              </g>

              {/* 노드 2: 좌상단 데이터 피드 (DART / Bloomberg Feed) */}
              <g transform="translate(120, 180)">
                <circle r="4" fill="#FFFFFF" stroke="#6B7280" strokeWidth="1.5" />
                <circle r="1.5" fill="#121212" />
                <text x="-8" y="-10" fill="#9CA3AF" fontSize="8" fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.05em">DATA_FEED</text>
              </g>

              {/* 노드 3: 우상단 퀀트 팩터 (Alpha Factor Matrix) */}
              <g transform="translate(380, 150)">
                <circle r="5" fill="#FFFFFF" stroke="#00875a" strokeWidth="2" filter="url(#nodeGlow)" />
                <circle r="2" fill="#00875a" />
                <text x="10" y="3" fill="#00875a" fontSize="8" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">QUANT_ALPHA</text>
              </g>

              {/* 노드 4: 우하단 온체인 에스크로 (Web3 Escrow) */}
              <g transform="translate(320, 340)">
                <circle r="4.5" fill="#FFFFFF" stroke="#38bdf8" strokeWidth="1.5" />
                <circle r="1.8" fill="#38bdf8" />
                <text x="-12" y="15" fill="#6B7280" fontSize="8" fontFamily="'IBM Plex Mono', monospace">ON_CHAIN</text>
              </g>

              {/* 노드 5: 좌하단 백테스팅 엔진 (ta4j Engine) */}
              <g transform="translate(160, 310)">
                <circle r="4" fill="#FFFFFF" stroke="#6B7280" strokeWidth="1.5" />
                <circle r="1.5" fill="#6B7280" />
              </g>

              {/* 노드 6: 우측 끝 오더북 뎁스 (L2 Depth) */}
              <g transform="translate(440, 210)">
                <circle r="3.5" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
                <circle r="1.2" fill="#9CA3AF" />
              </g>

              {/* 4. 라인을 따라 부드럽게 흐르는 패킷 펄스 (Moving Data Packets) */}
              <circle r="3" fill="#00d395" filter="url(#nodeGlow)">
                <animateMotion
                  path="M 120 180 L 250 230 L 380 150 L 440 210"
                  dur="4.5s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle r="2.5" fill="#38bdf8" opacity="0.8">
                <animateMotion
                  path="M 160 310 L 250 230 L 320 340"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </div>

        </div>
      </div>
    </section>
  )
}
