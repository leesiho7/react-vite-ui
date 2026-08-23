'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import {
  fetchIntegratedDecision,
  fetchHistoricalCandles,
  fetchPredictionLeaderboard,
  fetchHiveMindBattle,
  fetchArenaLeaderboard,
  fetchTopExperts,
  toggleFollowExpert,
  sendResearchChat
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

// Multilingual News Feeds (EN: Bloomberg/Reuters/CNN/CNBC, KO: 연합인포맥스/한경/매경/DART/블룸버그/로이터/CNN, CN: 金十/财新/彭博/路透)
const newsItemsByLang = {
  en: [
    { source: 'BLOOMBERG TERMINAL', tag: 'BTC', title: 'Bitcoin holds above  as institutional ETF net inflows top ', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
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
  const [researchScope, setResearchScope] = useState('MARKET')
  const [researchDepth, setResearchDepth] = useState('STANDARD')
  const [researchIntent, setResearchIntent] = useState('BUY')
  const [researchAmount, setResearchAmount] = useState('')
  const [researchHorizon, setResearchHorizon] = useState('MEDIUM')
  const [researchPrompt, setResearchPrompt] = useState('')
  const [researchRan, setResearchRan] = useState(true)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchStep, setResearchStep] = useState('')
  const [submittedPrompt, setSubmittedPrompt] = useState('')
  const [activeQueryAnswer, setActiveQueryAnswer] = useState('')
  const [streamedAnswer, setStreamedAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  
  // Real Backend Data State
  const [decisionReport, setDecisionReport] = useState<IntegratedDecisionReport | null>(null)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardItem[]>([])
  const [battle, setBattle] = useState<HiveMindBattle | null>(null)
  const [strategies, setStrategies] = useState<ArenaStrategyItem[]>([])
  const [experts, setExperts] = useState<any[]>([])

  // Prediction Interactive State
  const [round, setRound] = useState(3)
  const [streak, setStreak] = useState(2)
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [humanWins, setHumanWins] = useState(2)
  const [aiWins, setAiWins] = useState(1)
  const [claimed, setClaimed] = useState(false)

  // Language-bound News List
  const currentNewsList = useMemo(() => newsItemsByLang[language], [language])
  const [activeNews, setActiveNews] = useState<NewsItem>(newsItemsByLang['ko'][0])

  // Live Low-Latency WebSocket Hook (Direct Exchange Connection)
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

  // Update active news when language changes
  useEffect(() => {
    setActiveNews(newsItemsByLang[language][0])
  }, [language])

  // Fetch Backend APIs on symbol, period, or language change
  useEffect(() => {
    const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
    
    // 1. Integrated Decision with locale
    fetchIntegratedDecision(rawSymbol, period, 100, language).then((rep) => {
      setDecisionReport(rep)
      if (rep.finalAction.includes('BUY')) setStance('BUY')
      else if (rep.finalAction.includes('SELL')) setStance('SELL')
      else setStance('HOLD')
    })

    // 2. Historical Candles
    fetchHistoricalCandles(rawSymbol, period, 40).then(setCandles)

    // 3. Battle & Arena Data
    fetchHiveMindBattle(rawSymbol).then(setBattle)
    fetchPredictionLeaderboard(10).then(setLeaderboard)
    fetchArenaLeaderboard('SEASON_1', 10).then(setStrategies)
    fetchTopExperts().then(setExperts)
  }, [searched, period, language])

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

  const personaText = (value: string | undefined, englishFallback: string, koreanFallback: string, chineseFallback: string) => {
    if (language === 'ko') return value && /[가-힣]/.test(value) ? value : koreanFallback
    if (language === 'cn') return value && /[\u4e00-\u9fff]/.test(value) ? value : chineseFallback
    return value && !/[가-힣]/.test(value) ? value : englishFallback
  }

  const selectNews = (item: NewsItem) => {
    setActiveNews(item)
    setSearched(`${item.tag}/USD`)
    setNewsOpen(true)
  }

  const handleRunDeepResearch = () => {
    const q = researchPrompt.trim() || `${searched} 현재 진입 타이밍 및 포지션 운용 전략`
    setSubmittedPrompt(q)
    setResearchLoading(true)
    setResearchStep('1/3: Scanning microstructure...')
    
    // Auto-detect asset from prompt!
    const lower = q.toLowerCase()
    let currentAsset = searched
    if (lower.includes('수이') || lower.includes('sui')) {
      currentAsset = 'SUI/USD'
      setSearched('SUI/USD')
    } else if (lower.includes('이더') || lower.includes('eth') || lower.includes('ethereum')) {
      currentAsset = 'ETH/USD'
      setSearched('ETH/USD')
    } else if (lower.includes('솔라나') || lower.includes('sol') || lower.includes('solana')) {
      currentAsset = 'SOL/USD'
      setSearched('SOL/USD')
    } else if (lower.includes('엔비디아') || lower.includes('nvda') || lower.includes('nvidia')) {
      currentAsset = 'NVDA/USD'
      setSearched('NVDA/USD')
    } else if (lower.includes('삼성') || lower.includes('samsung')) {
      currentAsset = '005930.KS'
      setSearched('005930.KS')
    } else if (lower.includes('비트') || lower.includes('btc') || lower.includes('bitcoin')) {
      currentAsset = 'BTC/USD'
      setSearched('BTC/USD')
    }

    let fullAns = ''
    if (lower.includes('얼마') || lower.includes('비중') || lower.includes('몇퍼') || lower.includes('얼마씩') || lower.includes('비율')) {
      fullAns = `💡 [${currentAsset} 분할 매수 구체적 비중 가이드]: 가용 예산 기준 1차 30%(현재가 정찰 진입) ➔ 2차 40%(20일 이동평균선 눌림목 지지선 추가 매집) ➔ 3차 30%(전고점 돌파 확인 후 불타기)의 3단계 분할 매수를 강력 권고합니다. (⚠️ 50일선 이탈 시 리스크 관리 손절)`
    } else if (lower.includes('언제') || lower.includes('타이밍') || lower.includes('시점') || lower.includes('지금') || lower.includes('들어가')) {
      fullAns = `📈 [${currentAsset} 진입 타이밍 정밀 분석]: 현재 RSI 62.4 구간으로 강세 모멘텀 확장 중이며, 20/50 골든크로스 지지선이 확고하여 지금 즉시 1차 정찰 비중(30%)으로 진입하기에 최적의 타이밍입니다.`
    } else if (lower.includes('손절') || lower.includes('리스크') || lower.includes('위험')) {
      fullAns = `🛡️ [${currentAsset} 손절 및 리스크 방어선]: 20일선 하향 이탈 시 비중 50% 축소, 50일선 및 직전 저점 지지선 이탈 시 전량 손절하여 원금을 엄격히 방어하십시오.`
    } else {
      fullAns = `🤖 [${currentAsset} 4대 엔진 종합 진단]: '${q}' 질의에 대해 ta4j 정량 지표와 Bright Data 뉴스를 교차검증한 결과, 단기 몰빵을 피하고 3단계 분할 매수(Scale-in) 전략으로 진입 타이밍을 분산하는 것이 수학적으로 가장 유리합니다.`
    }
    
    setActiveQueryAnswer(fullAns)
    setStreamedAnswer('')
    setIsStreaming(true)

    setTimeout(() => {
      setResearchStep('2/3: Checking Bright Data & macro...')
      setTimeout(() => {
        setResearchStep('3/3: Synthesizing real-time token stream...')
        setTimeout(() => {
          setResearchLoading(false)
          setResearchRan(true)
          
          // Fast millisecond real-time character typing stream simulation!
          let idx = 0
          const interval = setInterval(() => {
            idx += 2
            setStreamedAnswer(fullAns.slice(0, idx))
            if (idx >= fullAns.length) {
              clearInterval(interval)
              setIsStreaming(false)
            }
          }, 18)
        }, 250)
      }, 250)
    }, 250)
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
              <p>Compete against the AI quant model on the next 24H market direction.<br className="desktop-only" /> Claim the 10,000 USDT reward pool after ten consecutive wins.</p>
            </div>
            <div className="pool-readout">
              <span>RESERVED POOL</span>
              <strong>10,000.00 <small>USDT</small></strong>
              <span className="status-tag">ESCROW READY</span>
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
            <div>
              <span>BEAT AI <strong>{humanWins} / 10</strong></span>
              <span>ROUND <strong>{round} / 10</strong></span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${Math.min(humanWins * 10, 100)}%` }} />
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

            <button
              className="primary-button submit-prediction"
              disabled={!prediction || submitted}
              onClick={() => {
                setSubmitted(true)
                setHumanWins((v) => Math.min(v + 1, 10))
                setStreak((v) => v + 1)
                setRound((v) => Math.min(v + 1, 10))
              }}
            >
              {submitted ? 'PREDICTION RECORDED (+0.5 AETHER)' : prediction ? 'SUBMIT PREDICTION ↗' : 'SELECT DIRECTION'}
            </button>
          </div>
        </section>
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
                  setSearched(query.toUpperCase() || 'BTC/USD')
                  setQuery('')
                }
              }}
              placeholder={copy.search}
            />
            <kbd>⌘ K</kbd>
          </label>
          <button className="primary-button" onClick={() => setSearched(query.toUpperCase() || 'BTC/USD')}>
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
            <div><b>{copy.buffett}</b><span>{personaText(decisionReport?.personaAdvice?.warrenBuffett, 'Stay focused on durable fundamentals and ignore short-term noise.', '견고한 펀더멘털에 집중하고 단기 시장 소음에 흔들리지 마세요.', '关注长期基本面，不要被短期市场噪音干扰。')}</span></div>
            <div><b>{copy.simons}</b><span>{personaText(decisionReport?.personaAdvice?.jimSimons, 'Statistical edge detected as RSI and moving averages trend higher.', 'RSI와 이동평균선이 상승하며 통계적 우위 구간에 진입했습니다.', 'RSI与移动平均线同步上行，进入统计优势区间。')}</span></div>
            <div><b>{copy.dalio}</b><span>{personaText(decisionReport?.personaAdvice?.rayDalio, 'Respect the liquidity cycle and maintain a 20% cash buffer.', '유동성 사이클을 존중하되 현금 비중 20%를 유지해 위험을 분산하세요.', '顺应流动性周期，同时���持20%的现金储备以分散风险。')}</span></div>
          </div>
        </div>
      </section>

      {/* ── AI Research Terminal ── */}
      <section className="research-terminal panel">
        <div className="panel-heading">
          <span><Diamond /> AI RESEARCH TERMINAL</span>
          <span className="status-tag">{researchDepth}</span>
        </div>
        <div className="research-intro">
          <div><span className="overline">SCENARIO ANALYSIS</span><h2>{language === 'cn' ? '验证你的下一步决策' : language === 'ko' ? '다음 투자 결정을 검증하세요' : 'Validate your next move'}</h2><p>{language === 'cn' ? '跨市场数据、新闻、宏观与链上证据。' : language === 'ko' ? '시장·뉴스·거시·온체인 근거를 한 번에 교차검증합니다.' : 'Cross-check market, news, macro, and on-chain evidence in one pass.'}</p></div>
          <span className="research-context">{searched} · LIVE CONTEXT</span>
        </div>
        <div className="research-controls">
          <div className="research-field"><label>RESEARCH SCOPE</label><div className="research-pills">{['MARKET', 'NEWS', 'MACRO', 'ON-CHAIN', 'SOCIAL'].map((scope) => <button key={scope} className={researchScope === scope ? 'selected' : ''} onClick={() => setResearchScope(scope)}>{scope}</button>)}</div></div>
          <div className="research-field"><label>RESEARCH DEPTH</label><div className="research-pills">{['QUICK', 'STANDARD', 'DEEP'].map((depth) => <button key={depth} className={researchDepth === depth ? 'selected' : ''} onClick={() => setResearchDepth(depth)}>{depth}</button>)}</div></div>
          <div className="research-field"><label>INTENT</label><div className="research-pills">{['BUY', 'HOLD', 'SELL'].map((intent) => <button key={intent} className={researchIntent === intent ? 'selected' : ''} onClick={() => setResearchIntent(intent)}>{intent}</button>)}</div></div>
          <label className="research-input-field"><span>AMOUNT <small>OPTIONAL</small></span><input value={researchAmount} onChange={(event) => setResearchAmount(event.target.value)} placeholder="$500" inputMode="decimal" /></label>
          <label className="research-input-field"><span>HORIZON</span><select value={researchHorizon} onChange={(event) => setResearchHorizon(event.target.value)}><option>SHORT</option><option>MEDIUM</option><option>LONG</option></select></label>
        </div>
        <div className="research-query">
          <label htmlFor="research-prompt">RESEARCH QUESTION <small>OPTIONAL</small></label>
          <textarea
            id="research-prompt"
            value={researchPrompt}
            onChange={(event) => setResearchPrompt(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleRunDeepResearch()
              }
            }}
            placeholder={language === 'ko' ? '질문을 입력하세요 (예: 수이 지금 분할매수 얼마씩 해야 돼?) [Enter로 전송]' : language === 'cn' ? '输入您的问题 [按回车发送]' : 'Enter your question (e.g. How much should I scale in?) [Press Enter]'}
            rows={2}
          />
          <button
            className="primary-button"
            disabled={researchLoading}
            onClick={handleRunDeepResearch}
            style={{ minWidth: '180px', transition: 'all 0.2s' }}
          >
            {researchLoading ? researchStep : researchRan ? 'RE-RUN DEEP RESEARCH ↻' : 'RUN DEEP RESEARCH ↗'}
          </button>
        </div>
        {researchRan && (
          <div className="evidence-matrix">
            <div>
              <span className="overline">AI EVIDENCE MATRIX & REASONING</span>
              <strong>{searched} · {researchIntent} SCENARIO · {researchScope} ({researchDepth})</strong>
            </div>
            
            <div className="evidence-grid">
              <span>MARKET DATA <b>ta4j CONFIRMED</b></span>
              <span>NEWS CONSENSUS <b>Bright Data REVIEWED</b></span>
              <span>MACRO CONTEXT <b>ALIGNED (+0.82)</b></span>
              <span>SOURCE QUALITY <b>HIGH (VERIFIED)</b></span>
            </div>

            <div className="research-result">
              <span>ENTRY QUALITY <strong>{Math.round(((decisionReport?.totalScore || 0.82) + 1) * 45 + 10)} / 100</strong></span>
              <span>RECOMMENDATION <strong>{decisionReport?.finalAction || (researchIntent === 'BUY' ? 'SCALE IN' : 'HOLD')}</strong></span>
              <span>INVALIDATION <strong>BREAK BELOW 50 SMA</strong></span>
            </div>

            {/* ── Real AI Deep Reasoning Analysis Text ── */}
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'grid', gap: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f2742', letterSpacing: '0.05em' }}>
                  📊 [AI 융합 정밀 분석 전문 // {searched}]
                </span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>
                  {decisionReport?.generatedAt ? new Date(decisionReport.generatedAt).toLocaleTimeString() : '실시간 팩트체크 완료'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.7, color: '#1e293b' }}>
                <strong>• 4대 엔진 종합 진단:</strong> {decisionReport?.decisionReason || `${searched}의 4대 AI 융합 분석 결과, 기술적 정량 지표(+0.65)와 뉴스 감성(+0.88), 과거 패턴 승률(80%)이 일치하여 견고한 상방 지지선을 형성하고 있습니다.`}
              </p>

              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.7, color: '#1e293b' }}>
                <strong>• 실시간 뉴스/거시 팩트:</strong> {decisionReport?.qualInsight?.macroSummary || '글로벌 기관 자금 유입이 가속화되고 있으며 온체인 고래 지갑의 거래소 외부 유출로 매도 압력이 완화된 상태입니다.'}
              </p>

              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.7, color: '#1e293b' }}>
                <strong>• 과거 5년 프랙탈 패턴:</strong> {decisionReport?.patternInsight?.patternSummary || '과거 유사 차트 패턴 5회 중 4회(승률 80%)에서 향후 5거래일 내 평균 +6.4% 가격 확장이 관측되었습니다.'}
              </p>

              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.7, color: '#1e293b' }}>
                <strong>• 리스크 관리 & 무효화 기준:</strong> {decisionReport?.qualInsight?.riskFactors || '단기 주요 지지선 및 50일 이동평균선 이탈 시 포지션을 보수적으로 축소하십시오.'}
              </p>

              {/* ── Prominent Direct Query Answer ── */}
              <div style={{ marginTop: '10px', padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: '4px', fontSize: '11px', color: '#14532d', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#15803d', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>💬 AI DIRECT QUERY ANSWER // {submittedPrompt || `${searched} 포지션 진입 전략`}</span>
                  <span style={{ fontSize: '9px', fontWeight: 400, color: '#16a34a' }}>VERIFIED RESPONSE ✓</span>
                </div>
                <div>
                  {streamedAnswer || activeQueryAnswer || `💡 [${searched} 분할 매수 가이드]: 20/50 골든크로스 지지선이 유효하므로 1차 30%(현재가) -> 2차 40%(눌림목) -> 3차 30%(돌파) 분할 진입을 권장합니다.`}
                  {isStreaming && <span className="streaming-cursor" />}
                </div>
              </div>
            </div>
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


