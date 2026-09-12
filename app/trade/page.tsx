'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { usePersistentState } from '@/lib/usePersistentState'
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  ChevronDown,
  Search,
  Send,
  Check,
  RefreshCw,
  Zap,
  AlertTriangle,
  ShieldCheck,
  X
} from 'lucide-react'
import { FinanceNav } from '@/components/FinanceNav'
import {
  fetchStrategyResearch,
  approveStrategyResearch,
  fetchCopilotWorkspace,
  fetchInvalidationAlerts,
  approveOrderTicket,
  rejectOrderTicket,
  sendResearchChat
} from '@/lib/api'
import type { StrategyResearchResult, StrategyArchetypeKey, CopilotWorkspaceResponse, InvalidationAlert } from '@/lib/types'
import type { AuthResponse } from '@/lib/types'

export function getSymbolLogo(nameOrTicker: string): string {
  const sym = (nameOrTicker || '').toUpperCase()
  if (sym.includes('BTC') || sym === 'BITCOIN') return 'https://financialmodelingprep.com/image-stock/BTCUSD.png'
  if (sym.includes('ETH') || sym === 'ETHEREUM') return 'https://financialmodelingprep.com/image-stock/ETHUSD.png'
  if (sym.includes('SOL') || sym === 'SOLANA') return 'https://financialmodelingprep.com/image-stock/SOLUSD.png'
  if (sym.includes('XRP') || sym === 'RIPPLE') return 'https://financialmodelingprep.com/image-stock/XRPUSD.png'
  if (sym.includes('BNB')) return 'https://financialmodelingprep.com/image-stock/BNBUSD.png'
  if (sym.includes('DOGE')) return 'https://financialmodelingprep.com/image-stock/DOGEUSD.png'
  if (sym.includes('SUI')) return 'https://financialmodelingprep.com/image-stock/SUIUSD.png'
  if (sym.includes('ADA') || sym === 'CARDANO') return 'https://financialmodelingprep.com/image-stock/ADAUSD.png'
  if (sym.includes('S&P') || sym.includes('SPX') || sym.includes('500') || sym.includes('SPY')) return 'https://financialmodelingprep.com/image-stock/SPY.png'
  if (sym.includes('NASDAQ') || sym.includes('NDX') || sym.includes('QQQ')) return 'https://financialmodelingprep.com/image-stock/QQQ.png'
  if (sym.includes('GOLD') || sym.includes('XAU') || sym === 'GLD') return 'https://financialmodelingprep.com/image-stock/GLD.png'
  if (sym.includes('NVDA')) return 'https://financialmodelingprep.com/image-stock/NVDA.png'
  if (sym.includes('TSLA')) return 'https://financialmodelingprep.com/image-stock/TSLA.png'
  if (sym.includes('AAPL')) return 'https://financialmodelingprep.com/image-stock/AAPL.png'
  return `https://financialmodelingprep.com/image-stock/${sym.replace(/[^A-Z0-9]/g, '')}.png`
}

export interface AssetProfile {
  name: string;
  ticker: string;
  logo: string;
  price: string;
  rawPrice: number;
  change: string;
  type: 'crypto' | 'stocks' | 'index' | 'commodity';
  categoryLabel: string;
  topAxis: string;
  bottomAxis: string;
  support: string;
  resistance: string;
  confidence: string;
  bias: string;
  analysis: string;
  description: string;
}

export const registeredSymbols: AssetProfile[] = [
  {
    name: 'BTC / USD',
    ticker: 'BTC',
    logo: 'https://financialmodelingprep.com/image-stock/BTCUSD.png',
    price: '$78,118.40',
    rawPrice: 78118.40,
    change: '+2.84%',
    type: 'crypto',
    categoryLabel: 'Digital Asset · Store of Value',
    topAxis: '78,260',
    bottomAxis: '77,620',
    support: '$76,800',
    resistance: '$79,500',
    confidence: '86%',
    bias: 'BULLISH / MOMENTUM',
    analysis: 'Price is holding steadily above the weekly VWAP with rising volume. The next major resistance zone sits near $79,500.',
    description: 'Digital Gold · Global Reserve Asset'
  },
  {
    name: 'ETH / USD',
    ticker: 'ETH',
    logo: 'https://financialmodelingprep.com/image-stock/ETHUSD.png',
    price: '$3,842.17',
    rawPrice: 3842.17,
    change: '+1.62%',
    type: 'crypto',
    categoryLabel: 'Smart Contract Hub · Layer 1',
    topAxis: '3,890',
    bottomAxis: '3,780',
    support: '$3,740',
    resistance: '$3,950',
    confidence: '79%',
    bias: 'NEUTRAL / ACCUMULATION',
    analysis: 'Ethereum staking inflows remain resilient above the 20-day EMA. Layer 2 gas throughput is sustaining bullish momentum.',
    description: 'Smart Contract Hub · Layer 1'
  },
  {
    name: 'SOL / USD',
    ticker: 'SOL',
    logo: 'https://financialmodelingprep.com/image-stock/SOLUSD.png',
    price: '$182.64',
    rawPrice: 182.64,
    change: '-0.48%',
    type: 'crypto',
    categoryLabel: 'High-Throughput DeFi & Web3',
    topAxis: '188.50',
    bottomAxis: '179.20',
    support: '$176.00',
    resistance: '$192.00',
    confidence: '74%',
    bias: 'CONSOLIDATION / RETEST',
    analysis: 'Consolidating in a tight flag pattern near $182. A breakout above $188 opens the path toward the $195 liquidity pool.',
    description: 'High-Throughput DeFi & Web3'
  },
  {
    name: 'S&P 500',
    ticker: 'SPX',
    logo: 'https://financialmodelingprep.com/image-stock/SPY.png',
    price: '5,842.91',
    rawPrice: 5842.91,
    change: '+0.37%',
    type: 'index',
    categoryLabel: 'US Broad Market Benchmark Index',
    topAxis: '5,875',
    bottomAxis: '5,815',
    support: '5,800',
    resistance: '5,890',
    confidence: '88%',
    bias: 'STEADY UPTREND',
    analysis: 'Corporate earnings beats and macroeconomic disinflation trends are maintaining a solid upward baseline along the 50-day moving average.',
    description: 'US Broad Market Benchmark Index'
  },
  {
    name: 'NASDAQ 100',
    ticker: 'NDX',
    logo: 'https://financialmodelingprep.com/image-stock/QQQ.png',
    price: '20,118.44',
    rawPrice: 20118.44,
    change: '+0.61%',
    type: 'index',
    categoryLabel: 'Top 100 Tech Heavyweights',
    topAxis: '20,240',
    bottomAxis: '20,020',
    support: '19,950',
    resistance: '20,350',
    confidence: '82%',
    bias: 'TECH EXPANSION',
    analysis: 'Tech mega-caps continue to absorb liquidity while broadening cloud AI margins underpin a durable multi-quarter bull channel.',
    description: 'Top 100 Tech Heavyweights'
  },
  {
    name: 'GOLD',
    ticker: 'XAU',
    logo: 'https://financialmodelingprep.com/image-stock/GLD.png',
    price: '$2,348.70',
    rawPrice: 2348.70,
    change: '-0.12%',
    type: 'commodity',
    categoryLabel: 'Physical Precious Metal Store of Value',
    topAxis: '2,365',
    bottomAxis: '2,330',
    support: '$2,320',
    resistance: '$2,380',
    confidence: '77%',
    bias: 'MACRO HEDGE RANGE',
    analysis: 'Central bank physical reserve accumulation and geopolitical hedging remain active near the $2,330 support threshold.',
    description: 'Physical Precious Metal Store of Value'
  },
  {
    name: 'NVDA',
    ticker: 'NVDA',
    logo: 'https://financialmodelingprep.com/image-stock/NVDA.png',
    price: '$138.50',
    rawPrice: 138.50,
    change: '+2.45%',
    type: 'stocks',
    categoryLabel: 'GPU & AI Semiconductor Giant',
    topAxis: '142.20',
    bottomAxis: '135.80',
    support: '$132.00',
    resistance: '$144.00',
    confidence: '89%',
    bias: 'AI HARDWARE LEADER',
    analysis: 'Blackwell GPU enterprise demand is outstripping supply. Forward quarterly guidance reflects continuing hyperscaler Capex expansion.',
    description: 'GPU & AI Semiconductor Giant'
  },
  {
    name: 'TSLA',
    ticker: 'TSLA',
    logo: 'https://financialmodelingprep.com/image-stock/TSLA.png',
    price: '$218.40',
    rawPrice: 218.40,
    change: '-1.71%',
    type: 'stocks',
    categoryLabel: 'Autonomous AI & Energy Platform',
    topAxis: '225.00',
    bottomAxis: '212.00',
    support: '$208.00',
    resistance: '$232.00',
    confidence: '76%',
    bias: 'AUTONOMOUS / ROBOTAXI',
    analysis: 'Testing major horizontal support near $215. Robotaxi regulatory clearances and energy storage deployments represent primary inflection catalysts.',
    description: 'EV & Full Self-Driving Platform'
  },
  {
    name: 'AAPL',
    ticker: 'AAPL',
    logo: 'https://financialmodelingprep.com/image-stock/AAPL.png',
    price: '$224.20',
    rawPrice: 224.20,
    change: '+1.63%',
    type: 'stocks',
    categoryLabel: 'Apple Intelligence Ecosystem',
    topAxis: '228.40',
    bottomAxis: '220.10',
    support: '$216.00',
    resistance: '$230.00',
    confidence: '85%',
    bias: 'APPLE INTELLIGENCE CYCLE',
    analysis: 'On-device Apple Intelligence upgrades are driving replacement supercycles. Services segment recurring revenue maintains robust double-digit growth.',
    description: 'Consumer Hardware & Services'
  },
  {
    name: 'XRP / USD',
    ticker: 'XRP',
    logo: 'https://financialmodelingprep.com/image-stock/XRPUSD.png',
    price: '$2.15',
    rawPrice: 2.15,
    change: '+5.12%',
    type: 'crypto',
    categoryLabel: 'Cross-Border Liquidity Protocol',
    topAxis: '2.28',
    bottomAxis: '2.04',
    support: '$1.98',
    resistance: '$2.35',
    confidence: '81%',
    bias: 'INSTITUTIONAL EXPANSION',
    analysis: 'Strong spot volume breakout with institutional cross-border settlement catalysts supporting an upward price discovery phase.',
    description: 'Cross-Border Settlement Protocol'
  },
  {
    name: 'BNB / USD',
    ticker: 'BNB',
    logo: 'https://financialmodelingprep.com/image-stock/BNBUSD.png',
    price: '$648.20',
    rawPrice: 648.20,
    change: '+0.95%',
    type: 'crypto',
    categoryLabel: 'Binance Chain Gas & Burn Hub',
    topAxis: '662.00',
    bottomAxis: '638.00',
    support: '$630.00',
    resistance: '$675.00',
    confidence: '78%',
    bias: 'EXCHANGE ECOSYSTEM UP',
    analysis: 'Deflationary quarterly burn velocity and Launchpool staking demand continue to support healthy floor valuations above $635.',
    description: 'Binance Chain Gas & Burn Hub'
  },
  {
    name: 'DOGE / USD',
    ticker: 'DOGE',
    logo: 'https://financialmodelingprep.com/image-stock/DOGEUSD.png',
    price: '$0.284',
    rawPrice: 0.284,
    change: '+8.45%',
    type: 'crypto',
    categoryLabel: 'Tier-1 Meme Liquidity Driver',
    topAxis: '0.305',
    bottomAxis: '0.268',
    support: '$0.250',
    resistance: '$0.320',
    confidence: '83%',
    bias: 'COMMUNITY MOMENTUM',
    analysis: 'Surging spot volume and social sentiment metrics indicate continuation of the parabolic momentum channel toward $0.32.',
    description: 'Tier-1 Meme Liquidity Driver'
  }
]

export const symbols = registeredSymbols.map(s => [s.name, s.price, s.change, s.type])

export default function TradePage() {
  const [active, setActive] = usePersistentState('trade_active_symbol', 'BTC / USD')
  const [activeTab, setActiveTab] = usePersistentState('trade_active_tab', 'Overview')
  const [activeInterval, setActiveInterval] = useState('1W')
  const [copilotMode, setCopilotMode] = useState<'RESEARCH' | 'POSITION'>('RESEARCH')
  const [mobilePanel, setMobilePanel] = useState<'chart' | 'book' | 'ai'>('chart')
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // 로그인 유저 (없으면 GLOBAL_USER로 백엔드 기본값 사용)
  const [activeUserId, setActiveUserId] = useState<number | null>(null)

  // ── 전략 연구·검증 ──
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchResult, setResearchResult] = useState<StrategyResearchResult | null>(null)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [deployArchetype, setDeployArchetype] = useState<StrategyArchetypeKey | null>(null)
  const [deployBotName, setDeployBotName] = useState('')
  const [deployExchange, setDeployExchange] = useState<'BINANCE' | 'BYBIT' | 'OKX'>('OKX')
  const [deployApiKey, setDeployApiKey] = useState('')
  const [deployApiSecret, setDeployApiSecret] = useState('')
  const [deployApiPassphrase, setDeployApiPassphrase] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployResultMsg, setDeployResultMsg] = useState<string | null>(null)

  // ── 포지션 코파일럿 ──
  const [workspace, setWorkspace] = useState<CopilotWorkspaceResponse | null>(null)
  const [invalidationAlerts, setInvalidationAlerts] = useState<InvalidationAlert[]>([])
  const [positionLoading, setPositionLoading] = useState(false)
  const [positionChatMessages, setPositionChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; orderTicket?: any }>
  >([])
  const [positionPrompt, setPositionPrompt] = useState('')
  const [positionSending, setPositionSending] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSymbolDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      const user: AuthResponse | null = stored ? JSON.parse(stored) : null
      setActiveUserId(user?.userId ? Number(user.userId) : null)
    } catch (e) {
      console.warn('Failed to read auth session:', e)
      setActiveUserId(null)
    }
  }, [])

  const loadPositionData = async () => {
    setPositionLoading(true)
    try {
      const uid = activeUserId ? String(activeUserId) : 'GLOBAL_USER'
      const [ws, alerts] = await Promise.all([
        fetchCopilotWorkspace(uid),
        fetchInvalidationAlerts()
      ])
      setWorkspace(ws)
      setInvalidationAlerts(alerts)
    } catch (e) {
      console.warn('Failed to load position copilot data:', e)
    } finally {
      setPositionLoading(false)
    }
  }

  useEffect(() => {
    if (copilotMode === 'POSITION') {
      loadPositionData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotMode])

  const runStrategyResearch = async () => {
    setResearchLoading(true)
    setResearchError(null)
    setResearchResult(null)
    setDeployArchetype(null)
    try {
      const result = await fetchStrategyResearch(currentAsset.ticker, 'H4')
      if (result) {
        setResearchResult(result)
      } else {
        setResearchError('전략 리서치 응답을 받지 못했습니다. 백엔드 연결을 확인해 주세요.')
      }
    } catch (e) {
      setResearchError('전략 리서치 요청 중 오류가 발생했습니다.')
    } finally {
      setResearchLoading(false)
    }
  }

  const openDeployForm = (archetype: StrategyArchetypeKey) => {
    setDeployArchetype(archetype)
    setDeployBotName(`${currentAsset.ticker} ${archetype.replace(/_/g, ' ')} Bot`)
    setDeployResultMsg(null)
  }

  const submitDeploy = async () => {
    if (!deployArchetype) return
    if (activeUserId === null) {
      setDeployResultMsg('봇을 배포하려면 로그인이 필요합니다.')
      return
    }
    setDeploying(true)
    setDeployResultMsg(null)
    try {
      const result = await approveStrategyResearch({
        userId: activeUserId,
        botName: deployBotName || `${currentAsset.ticker} Copilot Bot`,
        archetype: deployArchetype,
        exchange: deployExchange,
        symbol: `${currentAsset.ticker}USDT`,
        timeFrame: '1h',
        apiKey: deployApiKey,
        apiSecret: deployApiSecret,
        apiPassphrase: deployApiPassphrase
      })
      setDeployResultMsg(result?.message || (result?.success ? '봇이 생성되었습니다 (Paper Trading).' : '봇 생성에 실패했습니다.'))
      if (result?.success) {
        setDeployArchetype(null)
      }
    } catch (e) {
      setDeployResultMsg('봇 생성 요청 중 오류가 발생했습니다.')
    } finally {
      setDeploying(false)
    }
  }

  const sendPositionChat = async () => {
    const text = positionPrompt.trim()
    if (!text || positionSending) return

    setPositionChatMessages(prev => [...prev, { role: 'user', content: text }])
    setPositionPrompt('')
    setPositionSending(true)
    try {
      const data = await sendResearchChat({
        symbol: `${currentAsset.ticker}USDT`,
        prompt: text,
        mode: 'GUIDE',
        language: 'ko'
      })
      setPositionChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data?.reply || data?.answer || '응답을 받지 못했습니다.',
        orderTicket: data?.orderTicket || null
      }])
    } catch (e: any) {
      setPositionChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${e?.message || '백엔드 연결에 실패했습니다.'}`
      }])
    } finally {
      setPositionSending(false)
    }
  }

  const handleApproveTicket = async (ticket: any) => {
    const uid = activeUserId ? String(activeUserId) : 'GLOBAL_USER'
    const result = await approveOrderTicket(ticket, uid)
    alert(result?.message || (result?.success ? '주문 티켓이 승인되었습니다.' : '승인에 실패했습니다.'))
    if (result?.success) loadPositionData()
  }

  const handleRejectTicket = async (ticket: any) => {
    await rejectOrderTicket(ticket)
    alert('주문 티켓을 거부했습니다.')
  }

  const currentAsset = useMemo(() => {
    return registeredSymbols.find(s => s.name === active) || registeredSymbols[0]
  }, [active])

  const asks = useMemo(() => {
    const p = currentAsset.rawPrice
    const digits = p < 1 ? 4 : p < 10 ? 3 : 2
    return [
      [(p * 1.002).toFixed(digits), '0.42'],
      [(p * 1.0015).toFixed(digits), '0.86'],
      [(p * 1.001).toFixed(digits), '1.23'],
      [(p * 1.0005).toFixed(digits), '2.10'],
      [(p * 1.0001).toFixed(digits), '1.74'],
    ]
  }, [currentAsset])

  const bids = useMemo(() => {
    const p = currentAsset.rawPrice
    const digits = p < 1 ? 4 : p < 10 ? 3 : 2
    return [
      [(p * 0.9999).toFixed(digits), '0.65'],
      [(p * 0.9995).toFixed(digits), '1.40'],
      [(p * 0.999).toFixed(digits), '2.80'],
      [(p * 0.9985).toFixed(digits), '0.92'],
      [(p * 0.998).toFixed(digits), '3.15'],
    ]
  }, [currentAsset])

  const filteredSymbols = useMemo(() => {
    let list = registeredSymbols
    if (activeTab === 'Crypto') list = registeredSymbols.filter(s => s.type === 'crypto')
    else if (activeTab === 'Indices') list = registeredSymbols.filter(s => s.type === 'index')
    else if (activeTab === 'Stocks') list = registeredSymbols.filter(s => s.type === 'stocks')
    else if (activeTab === 'Commodities') list = registeredSymbols.filter(s => s.type === 'commodity')

    if (searchQuery.trim()) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return list
  }, [activeTab, searchQuery])

  const dropdownFilteredSymbols = useMemo(() => {
    if (!dropdownSearch.trim()) return registeredSymbols
    const q = dropdownSearch.toLowerCase()
    return registeredSymbols.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.ticker.toLowerCase().includes(q) ||
      s.categoryLabel.toLowerCase().includes(q)
    )
  }, [dropdownSearch])

  return (
    <main className="workspace-light market-page">
      <FinanceNav active="trade" />

      <div className="market-container">
        <header className="market-intro">
          <div>
            <span className="market-kicker">MARKETS / OVERVIEW</span>
            <h1>
              Market <em>intelligence</em>
            </h1>
            <p>Explore global markets, compare live prices, and ask the AI Copilot before you trade.</p>
          </div>
          <div className="market-search">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search symbol or market (BTC, ETH, NVDA, S&P 500...)"
              className="bg-transparent border-0 outline-none text-[#101522] text-[11px] w-full"
            />
            <kbd>⌘ K</kbd>
          </div>
        </header>

        <nav className="asset-tabs">
          {['Overview', 'Crypto', 'Indices', 'Stocks', 'Commodities'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'selected' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* ── Popular Markets Section ── */}
        <section className="popular-section">
          <div className="section-heading">
            <h2>
              Popular markets <ArrowUpRight size={18} />
            </h2>
            <button type="button" onClick={() => setSymbolDropdownOpen(true)}>
              View all markets ({registeredSymbols.length}) <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="symbol-grid">
            {filteredSymbols.slice(0, 6).map((item, i) => (
              <button
                key={item.name}
                className={`symbol-card ${active === item.name ? 'selected' : ''}`}
                onClick={() => setActive(item.name)}
              >
                <span className="symbol-rank">{String(i + 1).padStart(2, '0')}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={item.logo}
                    alt={item.name}
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = getSymbolLogo(item.name); }}
                  />
                </div>
                <span className="symbol-copy">
                  <strong>{item.name}</strong>
                  <small>{item.categoryLabel}</small>
                </span>
                <b className={item.change.startsWith('+') ? 'up' : 'down'}>{item.change}</b>
                <span className="symbol-price">{item.price}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Mobile 3-Way Segment Tabs with copilot-launch button ── */}
        <div className="mobile-trade-tabs" role="tablist" aria-label="Trade workspace panels">
          <button
            type="button"
            className={mobilePanel === 'chart' ? 'selected' : ''}
            onClick={() => setMobilePanel('chart')}
          >
            CHART
          </button>
          <button
            type="button"
            className={mobilePanel === 'book' ? 'selected' : ''}
            onClick={() => setMobilePanel('book')}
          >
            ORDER BOOK
          </button>
          <button
            type="button"
            className="copilot-launch"
            onClick={() => setCopilotOpen(true)}
          >
            <BrainCircuit size={14} /> AI COPILOT
          </button>
        </div>

        <button
          type="button"
          className="mobile-copilot-fab"
          onClick={() => setCopilotOpen(true)}
          aria-label="Open AI Copilot"
        >
          <BrainCircuit size={18} /> Ask Copilot
        </button>

        {/* ── Main Trading Workspace (Chart + L2 Orderbook + AI Copilot) ── */}
        <div className="market-workspace">
          <section className={`market-chart-column mobile-panel-${mobilePanel === 'chart' ? 'active' : 'hidden'}`}>
            <div className="section-heading">
              {/* ── Interactive Symbol Selector Dropdown ── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#f4f5f7] hover:bg-[#fff4ec] border border-[#dfe3eb] hover:border-[#f47a20] rounded-[8px] text-[#101522] transition-all cursor-pointer shadow-sm"
                  title="종목 변경하기"
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={currentAsset.logo}
                      alt={currentAsset.name}
                      style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = getSymbolLogo(currentAsset.name); }}
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-[14px] font-bold text-[#101522]">{currentAsset.name}</strong>
                      <span className={`text-[11px] font-mono font-bold ${currentAsset.change.startsWith('+') ? 'text-[#09a58e]' : 'text-[#ef4e5d]'}`}>
                        {currentAsset.price} ({currentAsset.change})
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-[#64748b] transition-transform duration-200 ml-1 ${symbolDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* ── Dropdown Modal Menu ── */}
                {symbolDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[320px] sm:w-[360px] bg-white border border-[#dfe3eb] rounded-[12px] shadow-2xl z-50 p-2.5 animate-in fade-in">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[6px] mb-2">
                      <Search size={13} className="text-[#94a3b8]" />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={e => setDropdownSearch(e.target.value)}
                        placeholder="종목명 또는 심볼 검색..."
                        className="bg-transparent border-0 outline-none text-[#101522] text-[11px] w-full"
                        autoFocus
                      />
                      {dropdownSearch && (
                        <button type="button" onClick={() => setDropdownSearch('')} className="text-[#94a3b8] hover:text-[#101522]">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="max-h-[280px] overflow-y-auto space-y-1 scrollbar-thin">
                      {dropdownFilteredSymbols.map((item) => {
                        const isSel = active === item.name
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => {
                              setActive(item.name)
                              setSymbolDropdownOpen(false)
                              setDropdownSearch('')
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-[#fff4ec] text-left transition-colors cursor-pointer border-0 ${
                              isSel ? 'bg-[#fff4ec] text-[#f47a20]' : 'text-[#172033]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                <img
                                  src={item.logo}
                                  alt={item.name}
                                  style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                                  onError={(e) => { (e.target as HTMLImageElement).src = getSymbolLogo(item.name); }}
                                />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold leading-tight">{item.name}</div>
                                <div className="text-[9px] text-[#94a3b8]">{item.categoryLabel}</div>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div>
                                <div className="text-[12px] font-mono font-bold">{item.price}</div>
                                <div className={`text-[10px] font-mono font-bold ${item.change.startsWith('+') ? 'text-[#09a58e]' : 'text-[#ef4e5d]'}`}>
                                  {item.change}
                                </div>
                              </div>
                              {isSel && <Check size={14} className="text-[#f47a20]" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Interval Buttons */}
              <div className="chart-intervals">
                {['1D', '1W', '1M', '1Y'].map(int => (
                  <button
                    key={int}
                    className={activeInterval === int ? 'selected' : ''}
                    onClick={() => setActiveInterval(int)}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Dynamic Interactive Chart ── */}
            <div className="market-chart">
              <div className="chart-grid" />
              <div className="chart-line chart-line-one" />
              <div className="chart-line chart-line-two" />
              <div className="chart-candle c1" />
              <div className="chart-candle c2" />
              <div className="chart-candle c3" />
              <div className="chart-candle c4" />
              <div className="chart-candle c5" />
              <span className="chart-axis top">{currentAsset.topAxis}</span>
              <span className="chart-axis bottom">{currentAsset.bottomAxis}</span>
              <div className="chart-volume v1" />
              <div className="chart-volume v2" />
              <div className="chart-volume v3" />
              <div className="chart-volume v4" />
            </div>

            {/* ── Lower Panels: L2 Orderbook & Execution Status ── */}
            <div className="trade-lower">
              <section className={`orderbook-panel mobile-book-${mobilePanel === 'book' ? 'active' : 'hidden'}`}>
                <div className="panel-title">
                  <span>ORDER BOOK · {currentAsset.name}</span>
                  <i>LIVE</i>
                </div>
                <div className="book-head">
                  <span>PRICE (USD)</span>
                  <span>SIZE ({currentAsset.ticker})</span>
                </div>
                {asks.map(([p, size], idx) => (
                  <div className="book-row ask" key={`ask-${p}-${idx}`}>
                    <span>{p}</span>
                    <span>{size}</span>
                  </div>
                ))}
                <div className="mid-price">
                  {currentAsset.price} <span>{currentAsset.change}</span>
                </div>
                {bids.map(([p, size], idx) => (
                  <div className="book-row bid" key={`bid-${p}-${idx}`}>
                    <span>{p}</span>
                    <span>{size}</span>
                  </div>
                ))}
              </section>

              <section className="execution-card">
                <div className="panel-title">
                  <span>EXECUTION STATUS</span>
                  <Bot size={14} color="#f47a20" />
                </div>
                <div className="execution-status">
                  <i style={{ background: '#10b981' }} /> Ready for {currentAsset.name} Quant Orders
                </div>
                <p>Connect your exchange account to place trades. AI can explain the setup before execution.</p>
                <button type="button" className="outline-button">
                  CONNECT EXCHANGE <ArrowUpRight size={14} />
                </button>
              </section>
            </div>
          </section>

          {/* ── AI Copilot Panel with Dynamic Per-Symbol Context ── */}
          <aside className={`market-copilot mobile-ai-${mobilePanel === 'ai' ? 'active' : 'hidden'} ${copilotOpen ? 'copilot-drawer-open' : ''}`}>
            <button
              type="button"
              className="copilot-drawer-close"
              onClick={() => setCopilotOpen(false)}
              aria-label="Close AI Copilot"
            >
              ×
            </button>

            <div className="copilot-heading">
              <div>
                <span className="market-kicker">AI COPILOT</span>
                <h2>{copilotMode === 'RESEARCH' ? 'Research a strategy.' : 'Watch your position.'}</h2>
              </div>
            </div>

            <div className="copilot-tabs">
              <button
                className={copilotMode === 'RESEARCH' ? 'active' : ''}
                onClick={() => setCopilotMode('RESEARCH')}
              >
                전략 연구·검증
              </button>
              <button
                className={copilotMode === 'POSITION' ? 'active' : ''}
                onClick={() => setCopilotMode('POSITION')}
              >
                포지션 코파일럿
              </button>
            </div>

            {copilotMode === 'RESEARCH' ? (
              <div className="copilot-scroll-body">
                <div className="insight-card">
                  <span className="signal-tag">{currentAsset.name} · STRATEGY RESEARCH</span>
                  <h3>검증된 전략으로 봇을 만들어보세요.</h3>
                  <p>Trend Following · Mean Reversion · Breakout 3개 전략을 실측 캔들로 백테스트하고 워크포워드로 검증합니다.</p>
                  <button
                    type="button"
                    className="copilot-primary-button"
                    onClick={runStrategyResearch}
                    disabled={researchLoading}
                  >
                    {researchLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                    {researchLoading ? '리서치 진행 중...' : `${currentAsset.ticker} 전략 리서치 시작`}
                  </button>
                </div>

                {researchError && (
                  <div className="copilot-message copilot-message-warn">
                    <AlertTriangle size={16} />
                    <p>{researchError}</p>
                  </div>
                )}

                {researchResult?.failureReason && (
                  <div className="copilot-message copilot-message-warn">
                    <AlertTriangle size={16} />
                    <p>{researchResult.failureReason}</p>
                  </div>
                )}

                {researchResult && researchResult.candidates.length > 0 && (
                  <>
                    <div className="strategy-candidate-grid">
                      {researchResult.candidates.map(c => {
                        const isRecommended = researchResult.recommendedArchetype === c.archetype
                        return (
                          <div key={c.archetype} className={`strategy-candidate-card ${isRecommended ? 'recommended' : ''}`}>
                            <div className="strategy-candidate-head">
                              <span>{c.label}</span>
                              {isRecommended && (
                                <b className="recommended-badge">
                                  <ShieldCheck size={11} /> 추천
                                </b>
                              )}
                            </div>
                            {!c.metricsReliable ? (
                              <p className="strategy-unreliable">⚠️ {c.reliabilityNote}</p>
                            ) : (
                              <>
                                <div className="strategy-metrics-grid">
                                  <span>승률 <b>{(c.winRate * 100).toFixed(1)}%</b></span>
                                  <span>샤프 <b>{c.sharpeRatio.toFixed(2)}</b></span>
                                  <span>MDD <b>{c.maxDrawdownPct.toFixed(1)}%</b></span>
                                  <span>손익비 <b>{c.profitFactor.toFixed(2)}</b></span>
                                  <span>누적수익 <b>{c.totalReturnPct >= 0 ? '+' : ''}{c.totalReturnPct.toFixed(1)}%</b></span>
                                  <span>거래 <b>{c.totalTrades}회</b></span>
                                </div>
                                <div className={`walkforward-tag ${c.walkForwardConsistent ? 'ok' : 'warn'}`}>
                                  워크포워드 {c.walkForwardProfitableSegments}/{c.walkForwardReliableSegments}구간 순이익
                                  {c.walkForwardConsistent ? ' · 일관됨' : ' · 일관되지 않음'}
                                </div>
                                <button
                                  type="button"
                                  className="strategy-deploy-button"
                                  onClick={() => openDeployForm(c.archetype)}
                                >
                                  이 전략으로 봇 생성 (Paper Trading)
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {researchResult.narrative && (
                      <div className="copilot-message">
                        <BrainCircuit size={16} />
                        <p>{researchResult.narrative}</p>
                      </div>
                    )}
                  </>
                )}

                {deployArchetype && (
                  <div className="copilot-deploy-form">
                    <div className="copilot-deploy-form-head">
                      <span>{deployArchetype.replace(/_/g, ' ')} 봇 생성</span>
                      <button type="button" onClick={() => setDeployArchetype(null)}><X size={14} /></button>
                    </div>
                    <input value={deployBotName} onChange={e => setDeployBotName(e.target.value)} placeholder="봇 이름" />
                    <select value={deployExchange} onChange={e => setDeployExchange(e.target.value as any)}>
                      <option value="OKX">OKX</option>
                      <option value="BINANCE">Binance</option>
                      <option value="BYBIT">Bybit</option>
                    </select>
                    <input type="password" value={deployApiKey} onChange={e => setDeployApiKey(e.target.value)} placeholder="API Key" />
                    <input type="password" value={deployApiSecret} onChange={e => setDeployApiSecret(e.target.value)} placeholder="API Secret" />
                    {deployExchange === 'OKX' && (
                      <input type="password" value={deployApiPassphrase} onChange={e => setDeployApiPassphrase(e.target.value)} placeholder="OKX Passphrase" />
                    )}
                    <button type="button" className="copilot-primary-button" onClick={submitDeploy} disabled={deploying}>
                      {deploying ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                      {deploying ? '배포 중...' : 'Paper Trading으로 배포'}
                    </button>
                    {deployResultMsg && <p className="copilot-deploy-result">{deployResultMsg}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="copilot-scroll-body">
                <div className="insight-card">
                  <span className="signal-tag">{currentAsset.name} · POSITION WORKSPACE</span>
                  {positionLoading ? (
                    <p><RefreshCw size={12} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />포지션 워크스페이스 불러오는 중...</p>
                  ) : activeUserId === null ? (
                    <p>로그인하면 보유 포지션과 무효화 경고를 확인할 수 있습니다.</p>
                  ) : workspace && workspace.openPositionCount > 0 ? (
                    <p>{workspace.summaryText || `${workspace.openPositionCount}개의 포지션을 추적 중입니다.`}</p>
                  ) : (
                    <p>현재 추적 중인 보유 포지션이 없습니다.</p>
                  )}
                </div>

                {invalidationAlerts.length > 0 && (
                  <div className="copilot-message copilot-message-warn">
                    <AlertTriangle size={16} />
                    <div>
                      {invalidationAlerts.map((a, idx) => (
                        <p key={idx} style={{ margin: '0 0 4px' }}>{a.message || JSON.stringify(a)}</p>
                      ))}
                    </div>
                  </div>
                )}

                {positionChatMessages.length > 0 && (
                  <div className="position-chat-thread">
                    {positionChatMessages.map((m, idx) => (
                      <div key={idx} className={m.role === 'user' ? 'position-bubble-user' : 'position-bubble-agent'}>
                        <p>{m.content}</p>
                        {m.orderTicket && (
                          <div className="order-ticket-card">
                            <div className="order-ticket-head">
                              <span>{m.orderTicket.side} {m.orderTicket.symbol}</span>
                              <b>{m.orderTicket.status}</b>
                            </div>
                            <div className="order-ticket-metrics">
                              <span>진입 <b>{m.orderTicket.entryPrice}</b></span>
                              <span>손절 <b>{m.orderTicket.stopLoss}</b></span>
                              <span>목표 <b>{m.orderTicket.takeProfit}</b></span>
                            </div>
                            {m.orderTicket.status === 'PROPOSED' && (
                              <div className="order-ticket-actions">
                                <button type="button" onClick={() => handleApproveTicket(m.orderTicket)}><Check size={12} /> 승인</button>
                                <button type="button" onClick={() => handleRejectTicket(m.orderTicket)}><X size={12} /> 거부</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="copilot-composer">
                  <textarea
                    value={positionPrompt}
                    onChange={e => setPositionPrompt(e.target.value)}
                    placeholder={`${currentAsset.name} 포지션에 대해 물어보세요...`}
                    disabled={positionSending}
                  />
                  <button
                    type="button"
                    aria-label="Send question"
                    onClick={sendPositionChat}
                    disabled={!positionPrompt.trim() || positionSending}
                  >
                    {positionSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        <footer className="market-footer" style={{ width: '100%', display: 'block', borderTop: '1px solid #1e293b', paddingTop: '16px', marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textAlign: 'center' }}>
            ⚠️ DISCLAIMER: AETHER 터미널이 제공하는 차익거래 및 펀딩비 데이터는 정보 제공 목적으로만 사용되며, 금융 투자 조언이 아닙니다. 모든 트레이딩의 최종 책임은 본인에게 있습니다.
          </p>
        </footer>
      </div>
    </main>
  )
}
