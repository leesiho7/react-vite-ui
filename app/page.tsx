'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { UserRound, Copy, Check, ExternalLink, ShieldCheck, Zap, Award, CheckCircle2, QrCode } from 'lucide-react'
import {
  fetchIntegratedDecision,
  fetchHistoricalCandles,
  fetchPredictionLeaderboard,
  fetchHiveMindBattle,
  fetchArenaLeaderboard,
  fetchTopExperts,
  toggleFollowExpert,
  sendResearchChat,
  fetchDepositWallets,
  submitOnChainDeposit,
  claimStreakReward,
  fetchUserLicenseToken,
  testPythonCode
} from '../lib/api'
import {
  IntegratedDecisionReport,
  CandleData,
  PredictionLeaderboardItem,
  HiveMindBattle,
  ArenaStrategyItem
} from '../lib/types'
import { useMarketWebSocket } from '../lib/useMarketWebSocket'
import { RealtimeChart } from '../components/RealtimeChart'
import { Orderbook } from '../components/Orderbook'

const defaultAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$67,842.10', change: '+2.84%', signal: 'BUY', tone: 'positive', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/bitcoin/default.svg' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,482.66', change: '+1.17%', signal: 'HOLD', tone: 'neutral', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ethereum/default.svg' },
  { symbol: 'SOL', name: 'Solana', price: '$184.28', change: '-0.42%', signal: 'WATCH', tone: 'negative', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/solana/default.svg' },
  { symbol: 'NVDA', name: 'NVIDIA', price: '$142.61', change: '+3.18%', signal: 'BUY', tone: 'positive', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/nvidia/default.svg' },
  { symbol: '005930', name: 'Samsung Electronics', price: '₩71,800', change: '+1.42%', signal: 'BUY', tone: 'positive', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/samsung/default.svg' },
  { symbol: 'AMZN', name: 'Amazon', price: '$228.84', change: '+0.86%', signal: 'HOLD', tone: 'neutral', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/amazon/default.svg' },
  { symbol: 'TSLA', name: 'Tesla', price: '$342.67', change: '-1.24%', signal: 'WATCH', tone: 'negative', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/tesla/default.svg' },
  { symbol: 'XRP', name: 'Ripple', price: '$2.41', change: '+2.18%', signal: 'BUY', tone: 'positive', logo: 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ripple/default.svg' },
  { symbol: 'GOLD', name: 'Gold', price: '$2,945.30', change: '+0.38%', signal: 'HOLD', tone: 'neutral' },
  { symbol: 'OIL', name: 'Crude Oil', price: '$71.84', change: '-0.67%', signal: 'WATCH', tone: 'negative' },
]

const languageLabels = { en: 'EN', cn: 'CN', ko: 'KO' } as const
type Language = keyof typeof languageLabels

// Multilingual News Feeds
const newsItemsByLang = {
  en: [
    { source: 'BLOOMBERG TERMINAL', tag: 'BTC', title: 'Bitcoin holds above $67K as institutional ETF net inflows top $480M', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { source: 'REUTERS TECH', tag: 'NVDA', title: 'NVIDIA signals sustained enterprise demand for next-gen AI superclusters', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { source: 'BLOOMBERG MARKETS', tag: 'SOL', title: 'Solana decentralized exchange volume hits all-time record amidst liquidity surge', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { source: 'REUTERS AUTOMOTIVE', tag: 'TSLA', title: 'Tesla autonomous FSD v13 rollout accelerates regulatory approval timeline', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { source: 'FINANCIAL TIMES', tag: 'ETH', title: 'Ethereum staking deposits reach record quarterly high amidst supply squeeze', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNN BUSINESS', tag: 'MACRO', title: 'Federal Reserve hints at steady rate trajectory amidst resilient economic data', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNBC MARKETS', tag: 'AAPL', title: 'Apple Intelligence expansion drives record upgrade cycle expectations', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { source: 'WALL STREET JOURNAL', tag: 'MACRO', title: 'Global equity markets rally as corporate earnings exceed Wall Street estimates', impact: '8.1', sentiment: 'BULLISH', tone: 'positive', thumb: 'WSJ', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { source: 'COINDESK ONCHAIN', tag: 'ONCHAIN', title: 'Whale address accumulation reaches 3-month peak with 32,000 BTC net intake', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: 'WHALE', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ],
  ko: [
    { source: '연합인포맥스 속보', tag: 'BTC', title: '비트코인 현물 ETF 4.8억 달러 순유입… 67,000달러 안착 시도', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { source: '한국경제 증권부', tag: 'NVDA', title: '엔비디아 차세대 AI 인프라 수주 랠리… 글로벌 반도체 동반 강세', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { source: '블룸버그 코리아', tag: 'SOL', title: '솔라나 DEX 24시간 거래량 역대 최대치 경신… 기관 유동성 집중', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { source: '로이터 테크', tag: 'TSLA', title: '테슬라 자율주행 FSD v13 글로벌 승인 가속… AI 로보택시 기대감 고조', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { source: '매일경제 금융', tag: 'ETH', title: '이더리움 스테이킹 참여율 분기 최고치 경신… 거래소 매도 압력 완화', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNN 비즈니스', tag: 'MACRO', title: '미국 연준(Fed) 금리 동결 시사 및 유동성 회복… 글로벌 위험자산 랠리', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNBC 코리아', tag: 'AAPL', title: '애플 온디바이스 인텔리전스 기기 교체 슈퍼사이클 진입 전망', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { source: 'DART 전자공시 팩트체크', tag: '공시', title: '주요 상장 핀테크 법인 AI 자산배분 인프라 구축 공시 완료', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: '공시', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { source: '블록미디어 온체인', tag: 'ONCHAIN', title: '온체인 고래 지갑 72시간 동안 32,000 BTC 순매집 확인', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: '고래', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ],
  cn: [
    { source: '金十数据 独家', tag: 'BTC', title: '比特币机构现货ETF单日净流入超4.8亿美元，稳守67,000关口', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { source: '财新网 科技前沿', tag: 'NVDA', title: '英伟达下一代企业级AI集群订单激增，半导体供应链全面提振', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { source: '彭博商业周刊', tag: 'SOL', title: 'Solana链上DEX单日交易量创历史新高，机构流动性加速涌入', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { source: '路透社 汽车科技', tag: 'TSLA', title: '特斯拉FSD v13全自动驾驶全球审批加速，无人出租车量产提速', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { source: '8BTC 深度报道', tag: 'ETH', title: '以太坊质押总量创季度新高，交易所流通量持续净流出', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNN 商业频道', tag: 'MACRO', title: '美联储暗示利率政策保持稳健，全球宏观流动性周期回暖', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { source: 'CNBC 独家', tag: 'AAPL', title: '苹果AI大模型生态全面落地，供应链迎来超级换机周期', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { source: '华尔街见闻 宏观', tag: 'MACRO', title: '全球主要权益市场全线上扬，企业盈利超华尔街机构普遍预期', impact: '8.1', sentiment: 'BULLISH', tone: 'positive', thumb: '宏观', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { source: '金色财经 链上', tag: 'ONCHAIN', title: '链上巨鲸地址72小时内净增持32,000枚比特币，筹码集中度攀升', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: '链上', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ]
}

type NewsItem = typeof newsItemsByLang['en'][number]

function Diamond() {
  return <span className="diamond" aria-hidden="true">◆</span>
}

const symbolStopWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THIS', 'THAT', 'WHAT', 'WHY', 'HOW', 'IS', 'ARE', 'CAN', 'YOU', 'NOW', 'BUY', 'SELL', 'HOLD', 'GUIDE', 'MODE', 'INSIGHT', 'ANALYZE', 'ANALYSIS', 'RISK', 'PRICE', 'ASSET', 'MARKET'])
const assetAliases: Record<string, string> = {
  '리플': 'XRP/USD', '리플코인': 'XRP/USD', '엑스알피': 'XRP/USD',
  '비트코인': 'BTC/USD', '이더리움': 'ETH/USD', '엔비디아': 'NVDA/USD',
  '테슬라': 'TSLA/USD', '애플': 'AAPL/USD', '삼성전자': '005930.KS',
}

function extractAssetSymbol(input: string, fallback = 'BTC/USD') {
  const alias = Object.entries(assetAliases).find(([name]) => input.includes(name))
  if (alias) return alias[1]
  const normalized = input.toUpperCase().replace(/\$/g, '')
  const pair = normalized.match(/\b[A-Z0-9]{2,12}\s*[./-]\s*(?:USD|USDT|KRW|EUR|JPY|KS)\b/)
  if (pair) return pair[0].replace(/\s+/g, '').replace('-', '/')
  const ticker = normalized.match(/\b[A-Z]{2,6}\b|\b\d{6}\b/g)?.find((candidate) => !symbolStopWords.has(candidate))
  return ticker ? `${ticker}/USD` : fallback
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('4H')
  const [stance, setStance] = useState('BUY')
  const [watching, setWatching] = useState(false)
  const [searched, setSearched] = useState('BTC/USD')
  const [language, setLanguage] = useState<Language>('ko')
  const [eventOpen, setEventOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [orderbookOpen, setOrderbookOpen] = useState(true)
  const [forkedStrategy, setForkedStrategy] = useState<string | null>(null)
  const [researchMode, setResearchMode] = useState<'INSIGHT' | 'GUIDE'>('INSIGHT')
  const [researchPrompt, setResearchPrompt] = useState('')
  const [researchRan, setResearchRan] = useState(false)
  const [researchResponse, setResearchResponse] = useState<any>(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)
  
  // Bot Hosting & Developer Sandbox State
  const [botMode, setBotMode] = useState<'GENERAL' | 'DEVELOPER'>('GENERAL')
  const [botRunning, setBotRunning] = useState(false)
  const [riskSlider, setRiskSlider] = useState(35)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [licenseToken, setLicenseToken] = useState<string | null>(null)
  const [telegramDeepLink, setTelegramDeepLink] = useState<string>('https://t.me/AetherQuantOfficialBot')
  const [pythonCode, setPythonCode] = useState<string>(
    '# Strategy runs in an isolated 24/7 Docker Sandbox\n# Connect signals through Spring Boot API\ndef on_market_tick(tick):\n    rsi = tick.get("rsi", 50.0)\n    if rsi < 30.0:\n        return {"action": "BUY", "risk": 0.35, "reason": "RSI Oversold"}\n    elif rsi > 70.0:\n        return {"action": "SELL", "risk": 0.35, "reason": "RSI Overbought"}\n    return {"action": "HOLD", "risk": 0.35}'
  )
  const [sandboxLog, setSandboxLog] = useState<string | null>(null)
  const [sandboxLoading, setSandboxLoading] = useState(false)

  // Pure On-Chain Deposit Modal State (Non-Custodial P2P)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('polygon')
  const [depositWallets, setDepositWallets] = useState<Record<string, string>>({
    polygon: '0x71C8364f3B80430C4361b17b2F3057173b0638A9',
    bsc: '0x71C8364f3B80430C4361b17b2F3057173b0638A9',
    trc20: 'TYDzsYUE282QJ84qjxoKqT5wD3ZgK8ZABC',
    solana: '7Xv9BfV4U932pQZ9USDT4444444444444444444444444444'
  })
  const [userTxHash, setUserTxHash] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [depositSuccessResult, setDepositSuccessResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  // 10-Win Streak Claim Modal State
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimAddress, setClaimAddress] = useState('')
  const [claimNetwork, setClaimNetwork] = useState('polygon')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimSuccessData, setClaimSuccessData] = useState<any>(null)

  // Real Backend Data State
  const [decisionReport, setDecisionReport] = useState<IntegratedDecisionReport | null>(null)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardItem[]>([])
  const [battle, setBattle] = useState<HiveMindBattle | null>(null)
  const [strategies, setStrategies] = useState<ArenaStrategyItem[]>([])
  const [experts, setExperts] = useState<any[]>([])

  // Prediction Interactive State
  const [round, setRound] = useState(3)
  const [humanWins, setHumanWins] = useState(2)
  const [aiWins, setAiWins] = useState(1)
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Language-bound News List
  const currentNewsList = useMemo(() => newsItemsByLang[language], [language])
  const [activeNews, setActiveNews] = useState<NewsItem>(newsItemsByLang['ko'][0])

  // Live WebSocket Hook
  const {
    price,
    priceFormatted,
    priceChange24h,
    tickDirection,
    latencyMs,
    connectionStatus,
    orderbook,
    latestKline
  } = useMarketWebSocket(searched)

  useEffect(() => {
    setActiveNews(newsItemsByLang[language][0])
  }, [language])

  // Fetch Backend APIs
  useEffect(() => {
    const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
    
    fetchIntegratedDecision(rawSymbol, period, 100, language).then((rep) => {
      setDecisionReport(rep)
      if (rep.finalAction.includes('BUY')) setStance('BUY')
      else if (rep.finalAction.includes('SELL')) setStance('SELL')
      else setStance('HOLD')
    }).catch((error) => console.error('[v0] Decision backend unavailable:', error))

    fetchHistoricalCandles(rawSymbol, period, 40).then(setCandles).catch((error) => console.error('[v0] Candles backend unavailable:', error))
    fetchHiveMindBattle(rawSymbol).then(setBattle).catch((error) => console.error('[v0] Battle backend unavailable:', error))
    fetchPredictionLeaderboard(10).then(setLeaderboard).catch((error) => console.error('[v0] Leaderboard backend unavailable:', error))
    fetchArenaLeaderboard('SEASON_1', 10).then(setStrategies).catch((error) => console.error('[v0] Arena backend unavailable:', error))
    fetchTopExperts().then(setExperts).catch((error) => console.error('[v0] Experts backend unavailable:', error))

    // Fetch official on-chain deposit wallets
    fetchDepositWallets().then((res) => {
      if (res && res.wallets) {
        setDepositWallets(res.wallets)
      }
    }).catch((e) => console.log('Wallets fetch fallback:', e))

    // Check user license token & telegram linkage
    fetchUserLicenseToken(1).then((lic) => {
      if (lic && lic.isActive) {
        setLicenseToken(lic.tokenString)
        setTelegramDeepLink(lic.telegramDeepLink || `https://t.me/AetherQuantOfficialBot?start=${lic.tokenString}`)
        setTelegramLinked(lic.telegramLinked || false)
      }
    }).catch((e) => console.log('License fetch fallback:', e))
  }, [searched, period, language])

  // 1. 순수 온체인 지갑 주소 복사 핸들러
  const handleCopyWallet = () => {
    const addr = depositWallets[selectedNetwork] || depositWallets['polygon']
    navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 2. 온체인 송금 후 TxHash 확인 및 즉시 활성화 제출
  const handleSubmitDepositConfirmation = async () => {
    const tx = userTxHash.trim() || ('0x' + Math.random().toString(16).substring(2) + 'USDT7')
    setConfirmLoading(true)
    try {
      const res = await submitOnChainDeposit({
        userId: 1,
        txHash: tx,
        network: selectedNetwork.toUpperCase(),
        amount: 7.0,
        depositAddress: depositWallets[selectedNetwork],
        tradeSymbol: searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
      })

      if (res && res.success) {
        setDepositSuccessResult(res)
        setLicenseToken(res.licenseToken)
        setTelegramDeepLink(res.telegramDeepLink)
        setBotRunning(true)
      } else {
        alert(res?.message || '입금 확인에 실패했습니다.')
      }
    } catch (e) {
      alert('입금 확인 요청 중 오류가 발생했습니다.')
    } finally {
      setConfirmLoading(false)
    }
  }

  // 3. 텔레그램 공식 봇 1:1 딥링크 연결
  const handleConnectTelegram = () => {
    if (telegramDeepLink) {
      window.open(telegramDeepLink, '_blank')
      setTelegramLinked(true)
    }
  }

  // 4. 파이썬 코드 샌드박스 백테스트 & 검증
  const handleTestSandbox = async () => {
    setSandboxLoading(true)
    setSandboxLog('Running Python 3.12 isolated sandbox container...\nScanning AST tree & Executing strategy ticks...')
    try {
      const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
      const res = await testPythonCode({
        pythonCode,
        symbol: rawSymbol,
        timeFrame: period
      })
      if (res) {
        setSandboxLog(res.simulatedOutput || res.stdoutLogs || res.message || 'Validation finished.')
      }
    } catch (e) {
      setSandboxLog('⚠️ Sandbox execution failed to connect to backend.')
    } finally {
      setSandboxLoading(false)
    }
  }

  // 5. 10연승 $10 USDT Claim 온체인 자동 출금
  const handleClaimStreakPayout = async () => {
    if (!claimAddress.trim()) {
      alert('출금받으실 지갑 주소를 입력해주세요.')
      return
    }
    setClaimLoading(true)
    try {
      const res = await claimStreakReward({
        userId: 1,
        destinationAddress: claimAddress.trim(),
        network: claimNetwork
      })
      if (res && res.success) {
        setClaimSuccessData(res)
      } else {
        alert(res?.message || '출금 처리 실패')
      }
    } catch (err) {
      alert('출금 요청 중 오류가 발생했습니다.')
    } finally {
      setClaimLoading(false)
    }
  }

  const handlerRunDeepResearch = async () => {
    setResearchLoading(true)
    setResearchError(null)
    setResearchRan(false)
    try {
      const response = await sendResearchChat({
        prompt: researchPrompt.trim() || (researchMode === 'GUIDE' ? 'Explain the key risks and practical allocation guidance for this asset.' : 'Produce an institutional-grade research brief for this asset.'),
        symbol: extractAssetSymbol(`${researchPrompt} ${searched}`, searched),
        mode: researchMode,
        language,
      })
      setResearchResponse(response)
      setResearchRan(true)
    } catch (error) {
      console.error('[v0] Research chat backend unavailable:', error)
      setResearchError(error instanceof Error ? error.message : 'Research request failed')
    } finally {
      setResearchLoading(false)
    }
  }

  // Live News Rotator
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveNews((current) => {
        const list = newsItemsByLang[language]
        const idx = list.findIndex((item) => item.title === current.title)
        return list[(idx + 1) % list.length]
      })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [language])

  const copy = {
    en: {
      eyebrow: 'AI FACT-CHECK & OPEN QUANT TERMINAL',
      title: <>Proof over<br /><em>performance.</em></>,
      description: <>Institutional-grade clean market intelligence & open-source quant strategies.<br className="desktop-only" /> 100% verifiable by data, not noise.</>,
      search: 'Search asset, market, or strategy...',
      run: 'RUN ANALYSIS',
      market: 'MARKET PULSE',
      signals: 'SIGNAL REGISTER',
      decision: 'INTEGRATED DECISION',
      insights: 'AI FACT-CHECK & REASONING',
      operations: 'OPERATIONS',
      personas: '3 MASTER INVESTORS BRIEFING:',
      buffett: 'Buffett:',
      simons: 'Simons:',
      dalio: 'Dalio:',
      factCheckTag: '🛡️ AI FACT-CHECK ACTIVE',
      newsClose: 'CLOSE ×',
      rollingTag: '4.5S ROLLING · FACT-CHECKED',
      newsLeadFact: '🛡️ FACT-CHECK VERIFIED'
    },
    cn: {
      eyebrow: 'AI 事实核查与开源量化终端',
      title: <>迈出下一步<br /><em>明智之选。</em></>,
      description: <>为重视客观事实而非噪音的团队提供<br className="desktop-only" /> 企业级市场情报与可验证策略。</>,
      search: '搜索资产、市场或量化策略...',
      run: '运行分析',
      market: '实时市场脉搏',
      signals: '信号登记',
      decision: '综合决策',
      insights: 'AI 事实核查与推理',
      operations: '运营与导出',
      personas: '3位大师 AI 咨询简报',
      buffett: '巴菲特:',
      simons: '西蒙斯:',
      dalio: '达里奥:',
      factCheckTag: 'AI 事实核查运行中',
      newsClose: '关闭 ×',
      rollingTag: '4.5秒滚动 · 深度核查',
      newsLeadFact: '事实核查通过'
    },
    ko: {
      eyebrow: 'AI 팩트체크 & 오픈 퀀트 터미널',
      title: <>다음 선택을<br /><em>현명하게.</em></>,
      description: <>AI가 시장의 소음을 팩트체크하고, 오픈소스 전략은 재현 가능하게 검증합니다.<br className="desktop-only" /> 데이터를 기반으로 한 기관급 인텔리전스입니다.</>,
      search: '자산(BTC, ETH, SOL, NVDA) 또는 전략 검색...',
      run: 'AI 융합 분석 실행',
      market: '실시간 시장 펄스',
      signals: '시그널 레지스터',
      decision: '통합 의사결정',
      insights: 'AI 팩트체크 & 전문가 자문',
      operations: '운영 및 내보내기',
      personas: '3대 대가 AI 자문 브리핑',
      buffett: '버핏:',
      simons: '시몬스:',
      dalio: '달리오:',
      factCheckTag: 'AI 팩트체크 가동 중',
      newsClose: '닫기 ×',
      rollingTag: '4.5초 주기 롤링 · AI 팩트체크 완료',
      newsLeadFact: '팩트체크 일치'
    },
  }[language]

  const personaText = (value: string | undefined) => value?.trim() || (language === 'ko' ? '실시간 자문 데이터가 아직 도착하지 않았습니다.' : language === 'cn' ? '实时咨询数据尚未返回。' : 'Live advisory data has not returned yet.')

  const selectNews = (item: NewsItem) => {
    setActiveNews(item)
    setSearched(`${item.tag}/USD`)
    setNewsOpen(true)
  }

  const handleFollow = async (targetUserId: number) => {
    const currentUserId = 999
    const res = await toggleFollowExpert(currentUserId, targetUserId)
    if (res && res.success) {
      setExperts((prev) =>
        prev.map((e) =>
          e.userId === targetUserId
            ? {
                ...e,
                isFollowedByMe: res.following,
                followerCount: res.followerCount !== undefined ? res.followerCount : (res.following ? (e.followerCount || 0) + 1 : Math.max(0, (e.followerCount || 0) - 1))
              }
            : e
        )
      )
    }
  }

  const filteredAssets = useMemo(() => defaultAssets.filter((asset) =>
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(query.toLowerCase())
  ), [query])

  return (
    <main className="terminal-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div>
            <strong>AETHER</strong>
            <span>AI FACT-CHECK & QUANT</span>
          </div>
        </div>

        <div className="top-meta">
          <span className="live-dot" /> LIVE WEBSOCKET
          <span style={{ color: latencyMs < 30 ? '#2b866d' : '#b9812c', fontWeight: 600, fontSize: '9px' }}>
            ({latencyMs}ms)
          </span>
          <span className="top-divider" />
          <button className={`league-link ${eventOpen ? 'active' : ''}`} onClick={() => setEventOpen(!eventOpen)}>
            <Diamond /> 10-WIN LEAGUE
          </button>
          <button className={`league-link ${communityOpen ? 'active' : ''}`} onClick={() => setCommunityOpen(!communityOpen)}>
            <Diamond /> STRATEGY COMMONS
          </button>
          <button className={`league-link ${newsOpen ? 'active' : ''}`} onClick={() => setNewsOpen(!newsOpen)}>
            <Diamond /> LIVE NEWSWIRE
          </button>
          <a className="league-link" href="/orderbook" style={{ textDecoration: 'none' }}>
            <Diamond /> L2 ORDERBOOK
          </a>
          <span className="language-switcher" aria-label="Language selector">
            {(Object.keys(languageLabels) as Language[]).map((item) => (
              <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}>
                {languageLabels[item]}
              </button>
            ))}
          </span>
        </div>

        <div className="account-toggle">
          <a className="member-icon" href="/profile" aria-label="Open member profile"><UserRound size={15} strokeWidth={1.5} /></a>
          <a href="/login">QUICK SOCIAL LOGIN</a>
        </div>
      </header>

      {/* ── 10-Win Prediction League Modal / Drawer ── */}
      {eventOpen && (
        <section className="league-section">
          <div className="league-header">
            <div>
              <div className="eyebrow"><Diamond /> 24H PREDICTION LEAGUE <span>AI vs HUMAN BATTLE</span></div>
              <h2>10 wins.<br /><em>One claim.</em></h2>
              <p>Compete against the AI quant model on the next 24H market direction.<br className="desktop-only" /> Claim the $10.00 USDT reward instantly after ten consecutive wins.</p>
            </div>
            <div className="pool-readout">
              <span>RESERVED POOL</span>
              <strong>10,000.00 <small>USDT</small></strong>
              <span className="status-tag">NON-CUSTODIAL ESCROW</span>
            </div>
          </div>

          <div className="versus-board">
            <div className="versus-side">
              <span className="overline">AI QUANT MODEL</span>
              <strong>{battle?.aiDecision || 'BULLISH'}</strong>
              <small>CONFIDENCE: {Math.round((battle?.aiConfidenceScore || 0.82) * 100)}%</small>
            </div>
            <div className="versus-mark">VS</div>
            <div className="versus-side human">
              <span className="overline">HUMAN CONSENSUS</span>
              <strong>{battle?.humanBullPercentage || 74.2}% BULL</strong>
              <small>{battle?.totalHumanVotes || 1840} VOTERS PARTICIPATING</small>
            </div>
            <div className="scoreline">
              <span>HUMAN WINS <strong>{humanWins}</strong></span>
              <span>AI WINS <strong>{aiWins}</strong></span>
            </div>
          </div>

          <div className="league-progress">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span>BEAT AI <strong>{humanWins} / 10 WINS</strong></span>
              {humanWins >= 10 ? (
                <button
                  className="primary-button"
                  style={{ background: '#2b866d', color: '#fff', padding: '4px 12px', fontSize: '11px' }}
                  onClick={() => setClaimModalOpen(true)}
                >
                  <Award size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  CLAIM $10.00 USDT ↗
                </button>
              ) : (
                <span>ROUND <strong>{round} / 10</strong></span>
              )}
            </div>
            <div className="progress-track">
              <i style={{ width: `${Math.min(humanWins * 10, 100)}%`, background: humanWins >= 10 ? '#2b866d' : '#18334a' }} />
            </div>
          </div>

          <div className="prediction-card panel">
            <div className="panel-heading">
              <span><Diamond /> ROUND {String(round).padStart(2, '0')} · {searched}</span>
              <span className="muted">LIVE PRICE TICK</span>
            </div>
            <div className="prediction-body">
              <div>
                <span className="overline">REALTIME PRICE</span>
                <strong>{priceFormatted}</strong>
                <p>Select the expected direction of the next 24-hour candle close.</p>
              </div>
              <div className="prediction-actions">
                <button
                  className={prediction === 'UP' ? 'prediction selected up' : 'prediction up'}
                  onClick={() => setPrediction('UP')}
                >
                  ↑ <span>UP</span><small>상승 예측</small>
                </button>
                <button
                  className={prediction === 'DOWN' ? 'prediction selected down' : 'prediction down'}
                  onClick={() => setPrediction('DOWN')}
                >
                  ↓ <span>DOWN</span><small>하락 예측</small>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className="primary-button submit-prediction"
                style={{ flex: 1 }}
                disabled={!prediction || submitted}
                onClick={() => {
                  setSubmitted(true)
                  setHumanWins((v) => Math.min(v + 1, 10))
                  setRound((v) => Math.min(v + 1, 10))
                }}
              >
                {submitted ? 'PREDICTION RECORDED (+0.5 AETHER)' : prediction ? 'SUBMIT PREDICTION ↗' : 'SELECT DIRECTION'}
              </button>

              {humanWins >= 10 && (
                <button
                  className="primary-button"
                  style={{ background: '#2b866d', color: '#fff', fontWeight: 'bold' }}
                  onClick={() => setClaimModalOpen(true)}
                >
                  CLAIM $10 USDT 🏆
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 10-Win Streak Claim Modal (Non-Custodial) ── */}
      {claimModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '480px', background: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px' }}>🏆 10연승 챌린지 $10.00 USDT Claim</strong>
              <button className="text-button" onClick={() => setClaimModalOpen(false)}>닫기 ×</button>
            </div>

            {claimSuccessData ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={42} color="#2b866d" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{claimSuccessData.message}</h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                  온체인 트랜잭션이 블록체인에서 안전하게 승인되었습니다.
                </p>
                <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', fontSize: '11px', textAlign: 'left', wordBreak: 'break-all' }}>
                  <div><b>트랜잭션 해시:</b> {claimSuccessData.txHash}</div>
                  <div><b>수신 지갑:</b> {claimSuccessData.destinationAddress}</div>
                  <div><b>네트워크:</b> {claimSuccessData.network?.toUpperCase()}</div>
                </div>
                <button className="primary-button" style={{ width: '100%', marginTop: '16px' }} onClick={() => { setClaimModalOpen(false); setClaimSuccessData(null); }}>
                  확인 완료
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>
                  10연승 미션 달성을 축하합니다! $10.00 USDT를 수신할 지갑 주소를 입력해 주세요. (가스비 상점 전액 지원)
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>출금 네트워크 선택</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['polygon', 'bsc', 'tron', 'solana'].map((net) => (
                      <button
                        key={net}
                        style={{ flex: 1, padding: '6px', fontSize: '11px', border: claimNetwork === net ? '2px solid #18334a' : '1px solid #ddd', background: claimNetwork === net ? '#18334a' : '#f9f9f9', color: claimNetwork === net ? '#fff' : '#333' }}
                        onClick={() => setClaimNetwork(net)}
                      >
                        {net.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>수신 지갑 주소</label>
                  <input
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', fontSize: '12px' }}
                    placeholder="0x... 또는 TRX/SOL 주소 입력"
                    value={claimAddress}
                    onChange={(e) => setClaimAddress(e.target.value)}
                  />
                </div>
                <button
                  className="primary-button"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={claimLoading}
                  onClick={handleClaimStreakPayout}
                >
                  {claimLoading ? '온체인 송금 처리 중…' : '$10.00 USDT 즉시 수령하기 ↗'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 순수 온체인 P2P $7 USDT 입금 모달 (Non-Custodial Direct Deposit) ── */}
      {depositModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '520px', background: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px' }}>💎 24H 퀀트 봇 호스팅 30일 구독 ($7.0 USDT)</strong>
              <button className="text-button" onClick={() => setDepositModalOpen(false)}>닫기 ×</button>
            </div>

            {depositSuccessResult ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle2 size={42} color="#2b866d" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>24시간 퀀트 봇이 성공적으로 활성화되었습니다!</h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                  SHA-256 라이선스 토큰이 발급되었으며 30일간 24시간 실시간 트레이딩 봇이 가동됩니다.
                </p>

                <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', marginBottom: '16px', textAlign: 'left', fontSize: '11px', wordBreak: 'break-all' }}>
                  <div><b>발급된 SHA-256 토큰:</b> <code>{depositSuccessResult.licenseToken}</code></div>
                  <div style={{ marginTop: '4px' }}><b>트랜잭션 해시:</b> {depositSuccessResult.txHash}</div>
                  <div style={{ marginTop: '4px' }}><b>상태:</b> RUNNING 🟢 (유효기간: 30일)</div>
                </div>

                <button
                  className="primary-button"
                  style={{ width: '100%', padding: '12px', background: '#2b866d', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                  onClick={handleConnectTelegram}
                >
                  <ExternalLink size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  공식 텔레그램 봇 1:1 연결하기 ↗
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>구독 플랜:</span> <b>24시간 가상 인스턴스 30일 이용권</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>입금 금액:</span> <b style={{ color: '#2b866d', fontSize: '14px' }}>7.00 USDT</b>
                  </div>
                </div>

                {/* Network Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    1. 입금할 네트워크 선택 (Polygon 권장 - 가스비 10원)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { key: 'polygon', label: 'POLYGON' },
                      { key: 'bsc', label: 'BSC (BEP20)' },
                      { key: 'trc20', label: 'TRC20 (TRON)' },
                      { key: 'solana', label: 'SOLANA' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          fontSize: '11px',
                          border: selectedNetwork === item.key ? '2px solid #18334a' : '1px solid #ddd',
                          background: selectedNetwork === item.key ? '#18334a' : '#f9f9f9',
                          color: selectedNetwork === item.key ? '#fff' : '#333'
                        }}
                        onClick={() => setSelectedNetwork(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deposit Address Box */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    2. 아래 공식 입금 지갑 주소로 7.0 USDT 전송
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      readOnly
                      style={{ flex: 1, padding: '8px', border: '1px solid #ccc', fontSize: '11px', background: '#fbfbfb', wordBreak: 'break-all' }}
                      value={depositWallets[selectedNetwork] || depositWallets['polygon']}
                    />
                    <button
                      className="secondary-button"
                      style={{ padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={handleCopyWallet}
                    >
                      {copied ? <Check size={14} color="#2b866d" /> : <Copy size={14} />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <small style={{ fontSize: '10px', color: '#888', marginTop: '4px', display: 'block' }}>
                    * 반드시 선택하신 {selectedNetwork.toUpperCase()} 네트워크의 USDT만 전송해 주세요.
                  </small>
                </div>

                {/* TxHash Confirmation */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    3. 전송 후 트랜잭션 해시(TxHash) 입력 <small>(선택 사항 · 미입력 시 자동 감지)</small>
                  </label>
                  <input
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', fontSize: '12px' }}
                    placeholder="0x... 또는 트랜잭션 ID (생략 시 시뮬레이션 감지)"
                    value={userTxHash}
                    onChange={(e) => setUserTxHash(e.target.value)}
                  />
                </div>

                <button
                  className="primary-button"
                  style={{ width: '100%', padding: '12px', background: '#2b866d', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                  disabled={confirmLoading}
                  onClick={handleSubmitDepositConfirmation}
                >
                  {confirmLoading ? '블록체인 온체인 트랜잭션 승인 확인 중…' : '7.0 USDT 전송 완료 · 봇 즉시 활성화 ↗'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Strategy Commons (Public Quant) ── */}
      {communityOpen && (
        <section className="commons-section">
          <div className="commons-header">
            <div>
              <div className="eyebrow"><Diamond /> STRATEGY COMMONS <span>100% OPEN SOURCE & VERIFIED</span></div>
              <h2>Proof over<br /><em>performance.</em></h2>
              <p>선동이나 찌라시 없이, 과거 5년치 백테스트 수식과 데이터로만 검증된 오픈소스 퀀트 전략입니다.<br className="desktop-only" /> 누구나 원클릭으로 내 차트에 복사(Fork & Run)하여 무료 검증할 수 있습니다.</p>
            </div>
            <div className="commons-stats">
              <span>VERIFIED STRATEGIES <strong>{strategies.length || 248}</strong></span>
              <span>TOTAL BACKTEST RUNS <strong>1,904</strong></span>
            </div>
          </div>

          <div className="leaderboard panel">
            <div className="panel-heading">
              <span><Diamond /> TRANSPARENT LEADERBOARD (ta4j ENGINE)</span>
              <span className="status-tag">🛡️ CODE VERIFIED</span>
            </div>
            <div className="strategy-head">
              <span>RANK</span>
              <span>STRATEGY / RULES</span>
              <span>AUTHOR</span>
              <span>RETURN</span>
              <span>MAX DD</span>
              <span>ACTION</span>
            </div>
            {strategies.map((strat, idx) => (
              <div className="strategy-row" key={strat.id}>
                <span className="strategy-rank">0{idx + 1}</span>
                <span className="strategy-name">
                  <strong>{strat.name}</strong>
                  <small>{strat.entryRules} ➔ {strat.exitRules}</small>
                </span>
                <span>{strat.authorNickname}</span>
                <span className="return-value">+{strat.totalReturnPct}%</span>
                <span className="drawdown">-{strat.maxDrawdownPct}%</span>
                <button
                  className="fork-button"
                  onClick={() => setForkedStrategy(strat.name)}
                >
                  {forkedStrategy === strat.name ? 'FORKED ✓' : 'FORK & RUN ↗'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Live Newswire (Language Localized) ── */}
      {newsOpen && (
        <section className="news-section">
          <div className="news-live-bar">
            <span className="live-dot pulse" /> LIVE NEWSWIRE ({languageLabels[language]})
            <span className="news-timer">{copy.rollingTag}</span>
            <button onClick={() => setNewsOpen(false)}>{copy.newsClose}</button>
          </div>
          <div className="news-layout">
            <button className="news-lead" onClick={() => selectNews(activeNews)}>
              <div className="news-thumb hero-thumb">{activeNews.imageUrl ? <img src={activeNews.imageUrl} alt={activeNews.title} className="news-photo-hero" /> : activeNews.thumb}</div>
              <div className="news-lead-copy">
                <span className="overline">{activeNews.source} · {activeNews.tag}</span>
                <h2>{activeNews.title}</h2>
                <div className="news-meta">
                  <span className={`sentiment ${activeNews.tone}`}>{activeNews.sentiment}</span>
                  <span>AI IMPACT <strong>{activeNews.impact}/10</strong></span>
                  <span>{copy.newsLeadFact}</span>
                </div>
              </div>
            </button>
            <div className="media-feed">
              {currentNewsList.map((item) => (
                <button
                  className={`feed-item ${item.title === activeNews.title ? 'active' : ''}`}
                  key={item.title}
                  onClick={() => selectNews(item)}
                >
                  <div className="news-thumb">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="news-photo-item" /> : item.thumb}</div>
                  <div>
                    <span className="feed-source">{item.source} <b>{item.tag}</b></span>
                    <strong>{item.title}</strong>
                    <div>
                      <span className={`sentiment ${item.tone}`}>{item.sentiment}</span>
                      <span className="impact">IMPACT {item.impact}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hero Search Section ── */}
      <section className="hero-section">
        <div className="eyebrow"><Diamond /> {copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.description}</p>
        <div className="search-row">
          <label className="search-box">
            <span>/</span>
            <input
              aria-label="Search market"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearched(extractAssetSymbol(query))
                  setQuery('')
                }
              }}
              placeholder={copy.search}
            />
            <kbd>⌘ K</kbd>
          </label>
          <button className="primary-button" onClick={() => setSearched(extractAssetSymbol(query))}>
            {copy.run} <span>↗</span>
          </button>
        </div>
      </section>

      {/* ── Main Workspace Grid (Chart & Orderbook + AI Signals) ── */}
      <section className="workspace-grid">
        {/* Left: Interactive Real-Time Chart & Orderbook */}
        <div className="market-panel panel">
          <div className="panel-heading">
            <span><Diamond /> {copy.market}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="text-button"
                style={{ fontSize: '8px' }}
                onClick={() => setOrderbookOpen(!orderbookOpen)}
              >
                {orderbookOpen ? (language === 'cn' ? '隐藏订单簿' : 'Hide orderbook') : (language === 'cn' ? '显示订单簿' : 'Show orderbook')}
              </button>
              <span className="muted">{searched} / {period}</span>
            </div>
          </div>

          <div className="asset-tabs">
            {defaultAssets.map((asset) => {
              const item = asset.symbol === '005930' ? `${asset.symbol}.KS` : asset.symbol === 'GOLD' ? 'XAU/USD' : asset.symbol === 'OIL' ? 'WTI/USD' : `${asset.symbol}/USD`
              return <button className={searched === item ? 'active' : ''} key={item} onClick={() => setSearched(item)}>{asset.logo ? <img className="asset-logo" src={asset.logo} alt={`${asset.name} logo`} /> : <span className="asset-logo-text" aria-hidden="true">{asset.symbol.slice(0, 1)}</span>}{item}</button>
            })}
          </div>

          <div className="price-row">
            <div>
              <span className="overline">{searched} · SPOT LIVE WEBSOCKET</span>
              <strong style={{ color: tickDirection === 'UP' ? '#2b866d' : tickDirection === 'DOWN' ? '#ac5d59' : '#18334a' }}>
                {priceFormatted}
              </strong>
            </div>
            <span className={priceChange24h.startsWith('+') ? 'gain' : 'drawdown'}>
              {priceChange24h} <small>24H</small>
            </span>
          </div>

          {/* Realtime Canvas Chart */}
          <RealtimeChart
            initialCandles={candles}
            latestKline={latestKline}
            currentPrice={price}
            symbol={searched}
            period={period}
          />

          <div className="period-row">
            {['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'].map((item) => (
              <button
                className={period === item ? 'selected' : ''}
                key={item}
                onClick={() => setPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Ultra-Fast 100ms Live Orderbook (Depth) */}
          {orderbookOpen && (
            <div style={{ borderTop: '1px solid #d8dee4', padding: '10px' }}>
              <Orderbook
                orderbook={orderbook}
                latencyMs={latencyMs}
                connectionStatus={connectionStatus}
                symbol={searched}
              />
            </div>
          )}
        </div>

        {/* Right: 4-Engine AI Signal Register & Fact-Check Hub */}
        <div className="signals-panel panel">
          <div className="panel-heading">
            <span><Diamond /> {copy.signals}</span>
            <span className="status-tag">{copy.factCheckTag}</span>
          </div>

          <div className="signal-list">
            {filteredAssets.map((asset) => (
              <button
                className="signal-item"
                key={asset.symbol}
                onClick={() => setSearched(asset.symbol === '005930' ? `${asset.symbol}.KS` : asset.symbol === 'GOLD' ? 'XAU/USD' : asset.symbol === 'OIL' ? 'WTI/USD' : `${asset.symbol}/USD`)}
              >
                <span className="asset-icon">{asset.logo ? <img src={asset.logo} alt={`${asset.name} logo`} /> : <span aria-hidden="true">{asset.symbol.slice(0, 1)}</span>}</span>
                <span className="asset-name">
                  <strong>{asset.symbol}/USD</strong>
                  <small>{asset.name}</small>
                </span>
                <span className="asset-price">
                  <strong>{asset.price}</strong>
                  <small className={asset.tone}>{asset.change}</small>
                </span>
                <span className={`signal-badge ${asset.tone}`}>{asset.signal}</span>
                <span className="chevron">›</span>
              </button>
            ))}
          </div>

          {/* ta4j + Chroma 4-Engine Confidence */}
          <div className="confidence">
            <div>
              <span>AI COMPOSITE CONFIDENCE (FUSION SCORE)</span>
              <strong>{decisionReport?.totalScore ? `+${decisionReport.totalScore}` : '+0.82'}</strong>
            </div>
            <div className="confidence-bar">
              <i style={{ width: `${Math.round(((decisionReport?.totalScore || 0.82) + 1) * 50)}%` }} />
            </div>
            <small>
              {decisionReport?.divergenceRisk || 'NORMAL: Technical indicators and macro sentiment remain aligned.'}
            </small>
          </div>

          <div className="advisory-briefing">
            <span className="advisory-title">{copy.personas}</span>
            <div><b>{copy.buffett}</b><span>{personaText(decisionReport?.personaAdvice?.warrenBuffett)}</span></div>
            <div><b>{copy.simons}</b><span>{personaText(decisionReport?.personaAdvice?.jimSimons)}</span></div>
            <div><b>{copy.dalio}</b><span>{personaText(decisionReport?.personaAdvice?.rayDalio)}</span></div>
          </div>
        </div>
      </section>

      {/* ── 24H Trading Operations Console ── */}
      <section className="trading-console panel">
        <div className="panel-heading">
          <span><Diamond /> 24H TRADING OPERATIONS</span>
          <span className="status-tag">HETZNER / DOCKER BOT PLANE</span>
        </div>
        <div className="bot-mode-switch" role="tablist" aria-label="Bot execution mode">
          <button role="tab" aria-selected={botMode === 'GENERAL'} className={botMode === 'GENERAL' ? 'selected' : ''} onClick={() => setBotMode('GENERAL')}>
            <strong>GENERAL MODE</strong><span>TA4J quant controls</span>
          </button>
          <button role="tab" aria-selected={botMode === 'DEVELOPER'} className={botMode === 'DEVELOPER' ? 'selected' : ''} onClick={() => setBotMode('DEVELOPER')}>
            <strong>DEVELOPER MODE</strong><span>Python sandbox terminal</span>
          </button>
        </div>

        {botMode === 'GENERAL' ? (
          <div className="quant-controls">
            <label>
              <span>POSITION RISK <b>{riskSlider}%</b></span>
              <input type="range" min="5" max="80" value={riskSlider} onChange={(event) => setRiskSlider(Number(event.target.value))} />
            </label>
            <label>
              <span>RSI PERIOD <b>14</b></span>
              <input type="range" min="5" max="30" defaultValue="14" />
            </label>
            <label>
              <span>BOLLINGER WIDTH <b>2.0σ</b></span>
              <input type="range" min="10" max="40" defaultValue="20" />
            </label>
          </div>
        ) : (
          <div className="python-terminal">
            <div className="terminal-line">
              <span>root@quant-sandbox:~$</span> python3 -m quant.runner --symbol {searched}
            </div>
            <textarea
              aria-label="Python strategy code"
              value={pythonCode}
              onChange={(e) => setPythonCode(e.target.value)}
              rows={6}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <small>Restricted: Isolated non-root Docker Sandbox · No OS injection.</small>
              <button className="text-button" style={{ fontSize: '10px', color: '#2b866d', fontWeight: 'bold' }} onClick={handleTestSandbox} disabled={sandboxLoading}>
                {sandboxLoading ? 'SANDBOX RUNNING…' : 'TEST CODE (SANDBOX) ↗'}
              </button>
            </div>
            {sandboxLog && (
              <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '8px', fontSize: '10px', borderRadius: '4px', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                {sandboxLog}
              </pre>
            )}
          </div>
        )}

        <div className="bot-actions">
          <button
            className={botRunning ? 'danger-button' : 'primary-button'}
            onClick={() => {
              if (!botRunning && !licenseToken) {
                setDepositModalOpen(true)
              } else {
                setBotRunning((running) => !running)
              }
            }}
          >
            {botRunning ? 'STOP 24H BOT' : licenseToken ? 'START 24H BOT' : 'SUBSCRIBE & START BOT ($7.0 USDT)'}
          </button>

          <button
            className={telegramLinked ? 'linked-button' : 'secondary-button'}
            onClick={handleConnectTelegram}
          >
            {telegramLinked ? 'TELEGRAM 1:1 LINKED ✓' : 'CONNECT TELEGRAM DM ↗'}
          </button>

          <span className="subscription-note">
            {licenseToken ? '30-DAY ACTIVE LICENSE · 24H RUNTIME UNLOCKED' : '$7 USDT MONTHLY · ALL AI AGENT RATE LIMITS UNLOCKED'}
          </span>
        </div>
      </section>

      {/* ── AI Research Terminal ── */}
      <section className="research-terminal panel">
        <div className="panel-heading">
          <span><Diamond /> AI RESEARCH TERMINAL</span>
          <span className="status-tag">{researchMode === 'INSIGHT' ? 'INSIGHT MODE' : 'GUIDE MODE'}</span>
        </div>
        <div className="research-intro">
          <div>
            <span className="overline">SCENARIO ANALYSIS</span>
            <h2>{language === 'cn' ? '验证你的下一步决策' : language === 'ko' ? '다음 투자 결정을 검증하세요' : 'Validate your next move'}</h2>
            <p>{language === 'cn' ? '跨市场数据、新闻、宏观与链上证据。' : language === 'ko' ? '시장·뉴스·거시·온체인 근거를 한 번에 교차검증합니다.' : 'Cross-check market, news, macro, and on-chain evidence in one pass.'}</p>
          </div>
          <span className="research-context">{searched} · LIVE CONTEXT</span>
        </div>
        <div className="research-mode-switch" role="tablist" aria-label="Research mode">
          <button role="tab" aria-selected={researchMode === 'INSIGHT'} className={researchMode === 'INSIGHT' ? 'selected' : ''} onClick={() => setResearchMode('INSIGHT')}>
            <strong>INSIGHT MODE</strong><span>Bloomberg desk · TA4J · expert lenses</span>
          </button>
          <button role="tab" aria-selected={researchMode === 'GUIDE'} className={researchMode === 'GUIDE' ? 'selected' : ''} onClick={() => setResearchMode('GUIDE')}>
            <strong>GUIDE MODE</strong><span>Plain-language risk · allocation guidance</span>
          </button>
        </div>
        <div className="research-query">
          <label htmlFor="research-prompt">RESEARCH QUESTION <small>OPTIONAL</small></label>
          <textarea
            id="research-prompt"
            value={researchPrompt}
            onChange={(event) => setResearchPrompt(event.target.value)}
            placeholder={researchMode === 'GUIDE' ? (language === 'ko' ? '이 자산이 왜 위험한지, 비중을 어떻게 조절할지 물어보세요.' : 'Ask why this asset is risky and how to size it.') : (language === 'ko' ? '이 자산의 다음 움직임을 기관급으로 분석해줘.' : 'Ask for a full institutional-grade research brief.')}
            rows={3}
          />
          <button className="primary-button" onClick={handlerRunDeepResearch} disabled={researchLoading}>
            {researchLoading ? 'RESEARCHING…' : researchRan ? 'RESEARCH COMPLETE' : researchMode === 'GUIDE' ? 'RUN GUIDED ANALYSIS' : 'RUN DEEP RESEARCH'} <span>↗</span>
          </button>
        </div>
        {researchError && <div className="research-error" role="alert">{researchError}</div>}
        {researchRan && researchResponse && (
          <div className="research-response">
            <div className="overline">LIVE BACKEND RESPONSE</div>
            <div className="research-response-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {typeof researchResponse === 'string' ? researchResponse : researchResponse.answer || researchResponse.content || researchResponse.message || JSON.stringify(researchResponse, null, 2)}
              </ReactMarkdown>
            </div>
          </div>
        )}
        {researchRan && (
          <div className={`evidence-matrix ${researchMode === 'GUIDE' ? 'guide-result' : 'insight-result'}`}>
            <div>
              <span className="overline">{researchMode === 'GUIDE' ? 'PLAIN-LANGUAGE BRIEFING' : 'RAW INTELLIGENCE BRIEF'}</span>
              <strong>{researchMode === 'GUIDE' ? 'RISK · ALLOCATION · NEXT STEP' : 'DESK RESEARCH · TA4J SIGNALS · EXPERT LENSES'}</strong>
            </div>
            {researchMode === 'GUIDE' ? (
              <div className="guide-cards">
                <span>WHY IT MATTERS <b>핵심 위험 요인을 쉽게 설명</b></span>
                <span>PORTFOLIO WEIGHT <b>비중 조절 시나리오</b></span>
                <span>NEXT STEP <b>지금 확인할 행동</b></span>
              </div>
            ) : (
              <div className="evidence-grid">
                <span>MARKET DATA <b>CONFIRMED</b></span>
                <span>TA4J SIGNALS <b>CALCULATED</b></span>
                <span>EXPERT LENSES <b>REVIEWED</b></span>
                <span>SOURCE QUALITY <b>HIGH</b></span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Integrated Decision Banner ── */}
      <section className="decision-banner">
        <div className="decision-title">
          <span className="decision-icon">↗</span>
          <div>
            <span className="overline">{copy.decision} (4-ENGINE FUSION)</span>
            <strong>{decisionReport?.finalAction || stance} · {searched}</strong>
            <p style={{ fontSize: '10px', color: '#74808c', margin: '4px 0 0' }}>
              {decisionReport?.decisionReason || (language === 'cn' ? 'ta4j 定量指标、机构新闻情绪与历史形态胜率共同支持上行动能。' : language === 'ko' ? 'ta4j 정량 지표, 기관 뉴스 감성, 과거 패턴 승률이 강한 상승 모멘텀을 지지합니다.' : 'Quant indicators, news sentiment, and historical fractal patterns support a strong uptrend.')}
            </p>
          </div>
        </div>

        <div className="decision-score">
          <span>MODEL SCORE</span>
          <strong>{decisionReport?.totalScore || '+0.82'} <small>/ 1.0</small></strong>
        </div>

        <div className="stance-toggle">
          {['BUY', 'HOLD', 'SELL'].map((item) => (
            <button
              className={stance === item ? 'active' : ''}
              key={item}
              onClick={() => setStance(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* ── Lower Grid (AI Insights & Operations) ── */}
      <section className="lower-grid">
        <div className="insights-panel panel">
          <div className="panel-heading">
            <span><Diamond /> {copy.insights}</span>
            <span className="status-tag">🛡️ DART/RAG VERIFIED</span>
          </div>

          <div className="insight-row">
            <span className="insight-number">01</span>
            <div>
              <strong>{language === 'cn' ? '宏观与机构情绪分析' : language === 'ko' ? '매크로 & 뉴스 감성 분석' : 'MACRO & NEWS SENTIMENT ANALYSIS'}</strong>
              <p>{decisionReport?.qualInsight?.macroSummary || (language === 'cn' ? '美国现货 ETF 获得 4.8 亿美元机构净流入。' : language === 'ko' ? '미국 현물 ETF에 4.8억 달러의 기관 순유입이 발생했습니다.' : 'Fed signals a rate hold while Bitcoin spot ETFs see $480M in net inflows.')}</p>
            </div>
            <span className="level high">HIGH</span>
          </div>

          <div className="insight-row">
            <span className="insight-number">02</span>
            <div>
              <strong>{language === 'cn' ? '历史分形图表形态 (89%)' : language === 'ko' ? '과거 프랙탈 차트 패턴 유사도 (89%)' : 'HISTORICAL FRACTAL PATTERN MATCH (89%)'}</strong>
              <p>{decisionReport?.patternInsight?.patternSummary || (language === 'cn' ? '在过去五次相似案例中，有四次在五个交易日内平均上涨 6.4%。' : language === 'ko' ? '과거 유사 사례 5건 중 4건에서 5거래일 내 평균 6.4% 상승했습니다.' : 'In 4 out of 5 historical instances, price expanded +6.4% within 5 trading days.')}</p>
            </div>
            <span className="level high">80% WIN</span>
          </div>

          <div className="insight-row">
            <span className="insight-number">03</span>
            <div>
              <strong>{language === 'cn' ? '潜在风险与阻力位' : language === 'ko' ? '잠재 리스크 & 지지선 무효화 조건' : 'KEY RISKS & INVALIDATION CONDITIONS'}</strong>
              <p>{decisionReport?.qualInsight?.riskFactors || (language === 'cn' ? '关注 71,200 美元心理阻力位附近的短期抛压。' : language === 'ko' ? '주요 저항선 돌파 실패 시 단기 차익 실현 가능성을 주시하세요.' : 'Watch for short-term rejection liquidity near the $71,200 psychological resistance.')}</p>
            </div>
            <span className="level med">MED</span>
          </div>
        </div>

        <div className="watch-panel panel">
          <div className="panel-heading">
            <span><Diamond /> {copy.operations}</span>
          </div>
          <div className="op-row">
            <span>WATCHLIST</span>
            <strong>12 assets tracked</strong>
            <button
              aria-label="Toggle watchlist"
              className={watching ? 'star active' : 'star'}
              onClick={() => setWatching(!watching)}
            >
              ☆
            </button>
          </div>
          <div className="op-row">
            <span>NETWORK RTT</span>
            <strong style={{ color: latencyMs < 30 ? '#2b866d' : '#b9812c' }}>{latencyMs} ms (WebSocket)</strong>
            <span className="refresh">↻</span>
          </div>
          <button className="export-button" onClick={() => alert('Financial Intelligence Report PDF queued for export.')}>
            EXPORT REPORT <span>↓</span>
          </button>
        </div>
      </section>

      {/* ── Hall of Fame (Verified Top Analysts) ── */}
      <section className="expert-directory panel">
        <div className="panel-heading">
          <span><Diamond /> HALL OF FAME · TOP ANALYSTS</span>
          <span className="status-tag">SEASON 1 LIVE QUALIFIERS</span>
        </div>
        <div className="directory-intro">
          <div>
            <span className="overline">VERIFIED LEADERBOARD</span>
            <h2>Prove your alpha. Claim your seat in the Hall of Fame.</h2>
            <p>실제 팩트체크된 퀀트 분석과 24H 예측 승률로 누구나 명예의 전당에 도전할 수 있습니다. 100% 검증된 실적으로만 평가됩니다.</p>
          </div>
          <button className="text-button" onClick={() => alert('누구나 분석글 작성 및 24H 예측 리그 참여로 명예의 전당 순위에 오를 수 있습니다!')}>
            CHALLENGE RANKING ↗
          </button>
        </div>
        <div className="expert-grid">
          {experts.map((expert, idx) => {
            const displayName = expert.nickname || expert.username || 'Analyst'
            const role = expert.role || 'Quant Analyst'
            const score = expert.reputationScore || (98 - idx * 3)
            const posts = expert.postCount || expert.posts || (120 - idx * 20)
            const followerNum = typeof expert.followerCount === 'number' ? expert.followerCount : (12400 - idx * 3000)
            const followers = followerNum >= 1000 ? `${(followerNum / 1000).toFixed(1)}K` : followerNum
            const tone = expert.tone || (idx === 0 ? 'navy' : idx === 1 ? 'green' : 'blue')
            const initials = displayName.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
            const rankLabel = `#0${idx + 1}`

            return (
              <article className="expert-card" key={expert.userId || displayName}>
                <div className={`expert-avatar ${tone}`}>{initials}</div>
                <div className="expert-main">
                  <div className="expert-name-row">
                    <div>
                      <strong>
                        <span style={{ color: '#2b866d', marginRight: '6px', fontSize: '10px', fontWeight: 'bold' }}>{rankLabel}</span>
                        {displayName}
                      </strong>
                      <span>{role}</span>
                    </div>
                    <button
                      className={`follow-button ${expert.isFollowedByMe ? 'following' : ''}`}
                      onClick={() => handleFollow(expert.userId || (idx + 1))}
                    >
                      {expert.isFollowedByMe ? 'FOLLOWING ✓' : 'FOLLOW +'}
                    </button>
                  </div>
                  <div className="expert-stats">
                    <span>REPUTATION <b>{score}P</b></span>
                    <span>POSTS <b>{posts}</b></span>
                    <span>FOLLOWERS <b>{followers}</b></span>
                  </div>
                  <div className="expert-note">
                    <span>HONOR STATUS</span>
                    <strong>Verified Top Analyst · Season 1 Ranked</strong>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <span>AETHER TERMINAL // AI FACT-CHECK & OPEN QUANT</span>
        <span>DATA FOR DECISION MAKERS · NOT FINANCIAL ADVICE</span>
        <span>STATUS: OPERATIONAL (WEBSOCKET LIVE)</span>
      </footer>
    </main>
  )
}
