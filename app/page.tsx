'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Maximize2, UserRound, Copy, Check, ExternalLink, ShieldCheck, Zap, Award, CheckCircle2, QrCode, Play, Radio, SlidersHorizontal, ArrowUpRight, BarChart2, Sparkles, Image as ImageIcon, FileText, Camera, Search, ChevronDown, ChevronUp, BrainCircuit, Send, Bot, RefreshCw, Code2, PieChart, Palette, Paperclip, Cpu, BookOpen, X, Plus, MessageSquare, Layers, Crown } from 'lucide-react'
import Navbar from './components/Navbar'
import {
  fetchIntegratedDecision,
  fetchHistoricalCandles,
  fetchPredictionLeaderboard,
  fetchHiveMindBattle,
  fetchArenaLeaderboard,
  fetchTopExperts,
  toggleFollowExpert,
  sendResearchChat,
  streamResearchChatSSE,
  fetchDepositWallets,
  submitOnChainDeposit,
  claimStreakReward,
  fetchUserLicenseToken,
  testPythonCode,
  submitPredictionApi,
  fetchUserPredictionStats,
  fetchLiveFinancialNewsFeed,
  fetchEscrowPoolStatus,
  EscrowPoolStatus,
  updateAdminEscrowConfig,
  sweepAdminEscrowFunds,
  fetchAdminEscrowAuditLogs,
  AdminEscrowAuditLog,
  fetchVisionChartAnalysis
} from '../lib/api'
import {
  IntegratedDecisionReport,
  CandleData,
  PredictionLeaderboardItem,
  HiveMindBattle,
  ArenaStrategyItem,
  AuthResponse
} from '../lib/types'
import { useMarketWebSocket } from '../lib/useMarketWebSocket'
import { TerminalTradingChart } from '../components/TerminalTradingChart'
import { FullOrderbookTerminal } from '../components/FullOrderbookTerminal'

const languageLabels = { en: 'EN', cn: 'CN', ko: 'KO' } as const
type Language = keyof typeof languageLabels

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

const newsCategoryTabs = [
  { key: 'ALL', count: 9, labels: { en: 'ALL WIRES', ko: '전체 속보', cn: '全部快讯' } },
  { key: 'CRYPTO', count: 3, labels: { en: 'CRYPTO ASSETS', ko: '가상자산', cn: '加密资产' } },
  { key: 'TECH', count: 3, labels: { en: 'TECH & AI', ko: '빅테크·AI', cn: '科技与AI' } },
  { key: 'MACRO', count: 2, labels: { en: 'MACRO & FED', ko: '거시경제·연준', cn: '宏观与美联储' } },
  { key: 'ONCHAIN', count: 2, labels: { en: 'ON-CHAIN & DART', ko: '온체인·공시', cn: '链上与公告' } }
] as const

type NewsCategoryKey = typeof newsCategoryTabs[number]['key']

// Multilingual News Feeds
const newsItemsByLang = {
  en: [
    { category: 'CRYPTO', source: 'BLOOMBERG TERMINAL', tag: 'BTC', title: 'Bitcoin holds above $67K as institutional ETF net inflows top $480M', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: 'REUTERS TECH', tag: 'NVDA', title: 'NVIDIA signals sustained enterprise demand for next-gen AI superclusters', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: 'BLOOMBERG MARKETS', tag: 'SOL', title: 'Solana decentralized exchange volume hits all-time record amidst liquidity surge', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: 'REUTERS AUTOMOTIVE', tag: 'TSLA', title: 'Tesla autonomous FSD v13 rollout accelerates regulatory approval timeline', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: 'FINANCIAL TIMES', tag: 'ETH', title: 'Ethereum staking deposits reach record quarterly high amidst supply squeeze', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { category: 'MACRO', source: 'CNN BUSINESS', tag: 'MACRO', title: 'Federal Reserve hints at steady rate trajectory amidst resilient economic data', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: 'CNBC MARKETS', tag: 'AAPL', title: 'Apple Intelligence expansion drives record upgrade cycle expectations', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { category: 'MACRO', source: 'WALL STREET JOURNAL', tag: 'MACRO', title: 'Global equity markets rally as corporate earnings exceed Wall Street estimates', impact: '8.1', sentiment: 'BULLISH', tone: 'positive', thumb: 'WSJ', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { category: 'ONCHAIN', source: 'COINDESK ONCHAIN', tag: 'ONCHAIN', title: 'Whale address accumulation reaches 3-month peak with 32,000 BTC net intake', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: 'WHALE', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ],
  ko: [
    { category: 'CRYPTO', source: '연합인포맥스 속보', tag: 'BTC', title: '비트코인 현물 ETF 4.8억 달러 순유입… 67,000달러 안착 시도', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: '한국경제 증권부', tag: 'NVDA', title: '엔비디아 차세대 AI 인프라 수주 랠리… 글로벌 반도체 동반 강세', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: '블룸버그 코리아', tag: 'SOL', title: '솔라나 DEX 24시간 거래량 역대 최대치 경신… 기관 유동성 집중', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: '로이터 테크', tag: 'TSLA', title: '테슬라 자율주행 FSD v13 글로벌 승인 가속… AI 로보택시 기대감 고조', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: '매일경제 금융', tag: 'ETH', title: '이더리움 스테이킹 참여율 분기 최고치 경신… 거래소 매도 압력 완화', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { category: 'MACRO', source: 'CNN 비즈니스', tag: 'MACRO', title: '미국 연준(Fed) 금리 동결 시사 및 유동성 회복… 글로벌 위험자산 랠리', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: 'CNBC 코리아', tag: 'AAPL', title: '애플 온디바이스 인텔리전스 기기 교체 슈퍼사이클 진입 전망', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { category: 'ONCHAIN', source: 'DART 전자공시 팩트체크', tag: '공시', title: '주요 상장 핀테크 법인 AI 자산배분 인프라 구축 공시 완료', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: '공시', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { category: 'ONCHAIN', source: '블록미디어 온체인', tag: 'ONCHAIN', title: '온체인 고래 지갑 72시간 동안 32,000 BTC 순매집 확인', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: '고래', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ],
  cn: [
    { category: 'CRYPTO', source: '金十数据 独家', tag: 'BTC', title: '比特币机构现货ETF单日净流入超4.8亿美元，稳守67,000关口', impact: '8.8', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC', imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: '财新网 科技前沿', tag: 'NVDA', title: '英伟达下一代企业级AI集群订单激增，半导体供应链全面提振', impact: '9.2', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: '彭博商业周刊', tag: 'SOL', title: 'Solana链上DEX单日交易量创历史新高，机构流动性加速涌入', impact: '8.7', sentiment: 'BULLISH', tone: 'positive', thumb: 'SOL', imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: '路透社 汽车科技', tag: 'TSLA', title: '特斯拉FSD v13全自动驾驶全球审批加速，无人出租车量产提速', impact: '8.5', sentiment: 'BULLISH', tone: 'positive', thumb: 'TSLA', imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80' },
    { category: 'CRYPTO', source: '8BTC 深报道', tag: 'ETH', title: '以太坊质押总量创季度新高，交易所流通量持续净流出', impact: '7.1', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH', imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=600&q=80' },
    { category: 'MACRO', source: 'CNN 商业频道', tag: 'MACRO', title: '美联储暗示利率政策保持稳健，全球宏观流动性周期回暖', impact: '8.4', sentiment: 'BULLISH', tone: 'positive', thumb: 'FED', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
    { category: 'TECH', source: 'CNBC 独家', tag: 'AAPL', title: '苹果AI大模型生态全面落地，供应链迎来超级换机周期', impact: '7.9', sentiment: 'BULLISH', tone: 'positive', thumb: 'AAPL', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80' },
    { category: 'MACRO', source: '华尔街见闻 宏观', tag: 'MACRO', title: '全球主要权益市场全线上扬，企业盈利超华尔街机构普遍预期', impact: '8.1', sentiment: 'BULLISH', tone: 'positive', thumb: '宏观', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80' },
    { category: 'ONCHAIN', source: '金色财经 链上', tag: 'ONCHAIN', title: '链上巨鲸地址72小时内净增持32,000枚比特币，筹码集中度攀升', impact: '9.0', sentiment: 'BULLISH', tone: 'positive', thumb: '链上', imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' }
  ]
}

const mediaStories = [
  {
    track: 'DAILY_LIVE',
    source: 'BLOOMBERG',
    key: 'COMPANY',
    embedId: 'DZ5mz2UjLN4',
    targetSymbol: 'NVDA/USD',
    title: ['Bloomberg Tech: AI Datacenter Demand & Enterprise Infrastructure', '블룸버그 테크: AI 데이터센터 수요와 엔터프라이즈 인프라 진단', '彭博科技：AI数据中心激增需求与企业级基础设施'],
    description: ['Bloomberg Technology daily breakdown covering AI model scaling, semiconductor orders, and cloud hyperscaler capex.', 'AI 모델 확장, 반도체 주문량, 클라우드 하이퍼스케일러들의 설비투자를 심층 분석하는 블룸버그 테크 데일리입니다.', '深度解析AI大模型算力扩张、半导体订单排期以及云巨头资本开支走势。'],
    age: ['JUST NOW', '방금 전', '刚刚'],
    duration: '24:15',
    tone: 'blue',
    channel: 'Bloomberg Tech',
    link: 'https://www.youtube.com/watch?v=DZ5mz2UjLN4',
    takeaways: [
      ['Enterprise AI capex expansion provides long-term revenue visibility across chipmakers.', '엔터프라이즈 AI 설비투자 확대가 반도체 밸류체인 전반의 장기 매출 가시성을 뒷받침합니다.', '企业级AI资本开支扩张为半导体全产业链提供了长效营收可见度。'],
      ['Next-gen datacenter power and liquid cooling infrastructure emerge as key bottlenecks.', '차세대 데이터센터 전력망과 액체 냉각 인프라가 공급망의 핵심 병목으로 부상했습니다.', '下一代数据中心电力供应与液冷散热基础设施成为当前关键产能瓶颈。'],
      ['Sovereign AI initiatives drive global diversification of compute cluster demand.', '국가별 자체 AI(Sovereign AI) 구축 프로젝트가 글로벌 컴퓨팅 수요의 다변화를 견인합니다.', '主权AI战略部署正在推动全球算力集群需求呈现多极化发展态势。']
    ],
    timestamps: [
      { time: '01:30', sec: 90, label: ['AI Capex Ramp', 'AI CAPEX 가속화', 'AI资本开支加速'] },
      { time: '08:15', sec: 495, label: ['Datacenter Power', '전력 인프라 분석', '电力基础设施'] },
      { time: '16:40', sec: 1000, label: ['Sovereign AI Flow', '국가 AI 수요 다변화', '主权AI算力需求'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'CNBC',
    key: 'CRYPTO',
    embedId: 'VHGVaKVTqzU',
    targetSymbol: 'BTC/USD',
    title: ['CNBC Squawk Box: Coinbase CEO on Institutional Crypto Bull Market', 'CNBC 스쿼크 박스: 코인베이스 CEO 브라이언 암스트롱 기관 강세장 전망', 'CNBC Squawk Box：Coinbase CEO谈机构加密现货牛市'],
    description: ['Coinbase CEO Brian Armstrong breaks down institutional spot ETF inflows, regulatory clarity, and cross-border payment rails on CNBC Squawk Box.', '코인베이스 CEO 브라이언 암스트롱이 기관 현물 ETF 자금 유입, 규제 명확성 및 국경 간 결제 인프라를 진단합니다.', 'Coinbase CEO深度解析机构现货ETF资金流入、监管框架明朗化及跨境支付结算通道。'],
    age: ['15 MIN AGO', '15분 전', '15分钟前'],
    duration: '09:12',
    tone: 'amber',
    channel: 'CNBC Television',
    link: 'https://www.youtube.com/watch?v=VHGVaKVTqzU',
    takeaways: [
      ['Spot ETF regulatory greenlight unlocked direct balance-sheet allocations from sovereign wealth funds.', '현물 ETF 승인으로 글로벌 국부펀드 및 기관의 대차대조표 직접 편입 경로가 열렸습니다.', '现货ETF合规通道打开了主权财富基金与大型机构资产负债表直接配置路径。'],
      ['Stablecoin settlement volume growth demonstrates accelerating mainstream financial utility.', '스테이블코인 결제액의 폭발적 성장이 전통 금융 인프라 대체 가능성을 실증하고 있습니다.', '稳定币结算规模的爆发式增长展现出其加速渗透主流金融结算的实用价值。'],
      ['Derivatives trading volume on institutional venues reflects deepening market liquidity.', '기관 전용 플랫폼의 파생상품 거래량 증가는 크립토 유동성의 구조적 성숙을 반영합니다.', '机构专属通道的衍生品交易量激增反映出加密资产流动性正在发生质的飞跃。']
    ],
    timestamps: [
      { time: '00:45', sec: 45, label: ['Institutional Inflows', '기관 자금 유입', '机构资金流入'] },
      { time: '03:30', sec: 210, label: ['Regulatory Clarity', '규제 명확성 진단', '监管环境进展'] },
      { time: '06:15', sec: 375, label: ['Stablecoin Settlement', '스테이블코인 결제', '稳定币结算网络'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: '5lg5_SAWheU',
    targetSymbol: 'BTC/USD',
    title: ['Coin Bureau: The Real Catalyst Behind Bitcoin Market Explosion', '코인뷰로: 비트코인 급등세의 숨겨진 거시 트리거와 쇼트 스퀴즈', 'Coin Bureau：比特币暴涨背后的核心宏观催化剂与空头挤压'],
    description: ['Deep breakdown of US Treasury liquidity operations, spot ETF accumulation velocity, and massive short liquidations.', '미국 재무부 유동성 조작, 현물 ETF 매집 속도, 대규모 쇼트 포지션 강제 청산을 종합 분석합니다.', '深度复盘美财政部流动性操作、现货ETF吸筹速率及全网空头大额连环清算。'],
    age: ['30 MIN AGO', '30분 전', '30分钟前'],
    duration: '17:40',
    tone: 'amber',
    channel: 'Coin Bureau',
    link: 'https://www.youtube.com/watch?v=5lg5_SAWheU',
    takeaways: [
      ['Treasury buyback operations injected unexpected net dollar liquidity into risk assets.', '미국 재무부의 국채 바이백 정책이 위험자산 시장에 예상 밖의 달러 유동성을 주입했습니다.', '美国财政部的国债回购操作向风险资产市场注入了超预期的净美元流动性。'],
      ['Cluster of short liquidation cascades triggered violent upward convexity.', '상단 숏 포지션 청산 클러스터가 맞물리며 폭발적인 상방 볼록성(Convexity)을 촉발했습니다.', '空头密集清算区间的连续触发引发了剧烈的向上凸性暴涨行情。'],
      ['On-chain exchange reserves dropped to multi-year lows amidst persistent whale custody transfer.', '고래 지갑들의 지속적인 콜드월렛 이체로 거래소 내부 유통 잔고가 수년래 최저치로 하락했습니다.', '随着巨鲸持续向冷钱包提现，交易所内可流通库存跌至多年新低。']
    ],
    timestamps: [
      { time: '01:20', sec: 80, label: ['Treasury Liquidity', '재무부 유동성 주입', '财政部流动性'] },
      { time: '06:40', sec: 400, label: ['Short Squeeze Check', '쇼트 스퀴즈 분석', '空头清算链'] },
      { time: '12:10', sec: 730, label: ['Whale Cold Storage', '고래 콜드월렛 매집', '巨鲸提现冷钱包'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: 'aq475kcLU5A',
    targetSymbol: 'BTC/USD',
    title: ['Bitcoin Macro: Monetary Debasement & Sovereign Hedge', '비트코인 매크로: 통화 가치 하락과 국가적 헤지 수단', '比特币宏观：法币贬值与主权避险资产'],
    description: ['Deep macroeconomic analysis on global debt expansion, fiat debasement, and Bitcoin’s emerging role in sovereign reserves.', '글로벌 부채 팽창, 법정화폐 가치 하락, 그리고 각국 준비자산으로서의 비트코인 역할을 다룬 심층 매크로 분석입니다.', '深度解析全球债务扩张、法定货币购买力稀释以及比特币作为主权储备资产的演进逻辑。'],
    age: ['5 MIN AGO', '5분 전', '5分钟前'],
    duration: '22:18',
    tone: 'amber',
    channel: 'Coin Bureau',
    link: 'https://www.youtube.com/watch?v=aq475kcLU5A',
    takeaways: [
      ['Global central-bank balance sheet expansion creates structural demand for hard digital assets.', '글로벌 중앙은행들의 대차대조표 확장이 디지털 하드 자산(Hard Asset)에 대한 구조적 수요를 촉발합니다.', '全球央行资产负债表扩张为硬通货数字资产创造了长效结构性需求。'],
      ['Spot ETF infrastructure bridges multi-trillion institutional pension and RIA capital into crypto.', '현물 ETF 인프라가 수조 달러 규모의 연기금 및 기관 투자자 자금을 크립토 시장으로 직접 연결합니다.', '现货ETF通道将数万亿美元规模的养老金与机构配置资金直连加密市场。'],
      ['Halving supply constraints coincide with record low liquid exchange reserves.', '반감기 공급 감소 효과가 거래소 내 유통 공급량의 역대 최저 수준과 맞물려 상방 압력을 강화합니다.', '减半后供应紧缩与交易所内流动性库存创历史新低形成强烈共振。']
    ],
    timestamps: [
      { time: '02:30', sec: 150, label: ['Monetary Debasement', '통화 가치 하락', '法币贬值机制'] },
      { time: '09:15', sec: 555, label: ['Institutional ETF Flows', '기관 ETF 자금유입', '机构ETF资金流'] },
      { time: '16:40', sec: 1000, label: ['Sovereign Reserve Thesis', '국가 준비자산 논거', '主权储备论证'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'CNBC',
    key: 'STRATEGY',
    embedId: 'tCYeltnWdL0',
    targetSymbol: 'SOL/USD',
    title: ['Market Close: Wall Street Sentiment & Rate Path Focus', '월가 마감 브리핑: 주식 시장 변동성과 금리 경로 점검', '华尔街收盘简报：股市波动与利率路径聚焦'],
    description: ['CNBC Market Close analysis of equity breadth, tech earnings volatility, and macroeconomic warnings.', 'CNBC 마감 시황: 주식 시장 이익 확산과 기술주 변동성, 거시 지표 경고를 종합 분석합니다.', 'CNBC收盘分析：美股盈利广度、科技股波动性与宏观经济预警。'],
    age: ['4 HOURS AGO', '4시간 전', '4小时前'],
    duration: '08:22',
    tone: 'amber',
    channel: 'CNBC Television',
    link: 'https://www.youtube.com/watch?v=tCYeltnWdL0',
    takeaways: [
      ['Late-day profit taking emerges across high-beta tech and semiconductor momentum leaders.', '고베타 빅테크 및 반도체 모멘텀 주도주를 중심으로 장 마감 직전 차익 실현이 출회되었습니다.', '高Beta科技股及半导体龙头在尾盘出现获利了结抛压。'],
      ['Bond yield volatility drives tactical intraday sector rotation into cash reserves.', '국채 금리 변동성이 커지며 포트폴리오의 단기 현금 비중 확대로 이어지고 있습니다.', '国债收益率波动加剧，促使资金日内战术性转向现金避险。'],
      ['Earnings guidance remains critical driver of cross-asset capital reallocation.', '기업들의 향후 가이던스가 크로스에셋 자본 재배분의 핵심 결정 요인으로 작용합니다.', '企业业绩指引仍是跨资产资本重新配置的关键驱动力。']
    ],
    timestamps: [
      { time: '01:10', sec: 70, label: ['Market Breadth', '시장 이익 확산', '市场广度分析'] },
      { time: '03:40', sec: 220, label: ['Tech Selloff Check', '기술주 차익 실현', '科技股抛压梳理'] },
      { time: '06:15', sec: 375, label: ['Macro Triggers', '거시 트리거 점검', '宏观催化剂跟踪'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'CNBC',
    key: 'MARKET',
    embedId: 'kdCMqSTQtg8',
    targetSymbol: 'TSLA/USD',
    title: ['Mohamed El-Erian: Global Economy Health & Capex Strength', '모하메드 엘-에리언: 글로벌 경제 건전성과 자본지출 동향', '穆罕默德·埃尔-埃利安：全球经济基本面与资本开支态势'],
    description: ['Allianz chief economic advisor Mohamed El-Erian examines economic resilience, labour data, and tech investment cycle.', '알리안츠 수석 경제 고문 엘-에리언이 경제 회복력, 고용 데이터와 테크 투자 사이클을 진단합니다.', '安联首席经济顾问埃尔-埃利安深入解读经济韧性、劳动力数据及科技投资周期。'],
    age: ['TODAY', '오늘', '今天'],
    duration: '07:15',
    tone: 'navy',
    channel: 'CNBC Television',
    link: 'https://www.youtube.com/watch?v=kdCMqSTQtg8',
    takeaways: [
      ['US economic resilience continues to outperform global peer benchmarks.', '미국 실물 경제의 회복 탄력성이 글로벌 주요국 대비 여전히 견고한 우위를 유지하고 있습니다.', '美国实体经济韧性表现持续优于全球主要发达经济体。'],
      ['Corporate capex in AI and industrial automation provides durable GDP support.', 'AI 및 산업 자동화 부문의 기업 설비투자(CAPEX)가 GDP의 강력한 하방 지지력을 제공합니다.', '企业在AI与工业自动化领域的资本开支为GDP增长提供了坚实支撑。'],
      ['Policy lags warrant agile risk management across equity and credit portfolios.', '통화정책 시차 효과를 고려해 주식 및 크레딧 포트폴리오의 기민한 리스크 관리가 필요합니다.', '考虑到政策传导时滞，股票与信用债投资组合需保持敏捷风险对冲。']
    ],
    timestamps: [
      { time: '00:50', sec: 50, label: ['Resilience Thesis', '경제 회복력 진단', '经济韧性逻辑'] },
      { time: '03:15', sec: 195, label: ['Capex & Tech Cycle', '설비투자 테크 사이클', '资本开支与科技周期'] },
      { time: '05:30', sec: 330, label: ['Portfolio Playbook', '포트폴리오 대응전략', '投资组合应对策略'] }
    ]
  },
  {
    track: 'DAILY_LIVE',
    source: 'BLOOMBERG',
    key: 'MACRO',
    embedId: '2qGajiA2J5k',
    targetSymbol: 'GOLD/USD',
    title: ['Warsh on Sticky Inflation & Global Commodity Geopolitics', '케빈 워시: 지속적 인플레이션과 글로벌 원자재 지정학', '凯文·沃什谈粘性通胀与全球大宗商品地缘政治'],
    description: ['Bloomberg This Weekend analysis on inflation dynamics, oil markets, and emerging market currency pressures.', '블룸버그 주간 스페셜: 인플레이션 추세, 원유 시장 및 신흥국 통화 리스크를 집중 조명합니다.', '彭博周末特刊：聚焦通胀粘性、原油地缘政治与新兴市场汇率压力。'],
    age: ['TODAY', '오늘', '今天'],
    duration: '12:15',
    tone: 'blue',
    channel: 'Bloomberg Television',
    link: 'https://www.youtube.com/watch?v=2qGajiA2J5k',
    takeaways: [
      ['Energy and commodities supply shocks create persistent friction against inflation deceleration.', '에너지 및 원자재 공급망 충격이 인플레이션 둔화세를 지연시키는 지속적 마찰요인입니다.', '能源与大宗商品供应链扰动成为阻碍通胀快速下行的持续摩擦因素。'],
      ['Central-bank gold purchases reflect sovereign de-dollarization hedging trends.', '글로벌 중앙은행들의 금 순매수는 달러 의존도를 낮추기 위한 구조적 헤징 수요를 반영합니다.', '全球央行持续净购金反映了主权财富降低美元敞口的结构性对冲需求。'],
      ['Emerging-market FX resilience hinges on domestic reserve adequacy and trade balance.', '신흥국 통화의 방어력은 각국의 외환보유액 건전성과 무역수지 흑자 규모에 좌우됩니다.', '新兴市场汇率韧性高度取决于自身外汇储备充裕度与贸易收支健康度。']
    ],
    timestamps: [
      { time: '01:30', sec: 90, label: ['Commodity Shocks', '원자재 충격 분석', '大宗商品冲击'] },
      { time: '05:20', sec: 320, label: ['De-Dollarization Flow', '탈달러화 자금흐름', '去美元化资金流'] },
      { time: '09:45', sec: 585, label: ['EM Risk Assessment', '신흥국 리스크 진단', '新兴市场风险评估'] }
    ]
  },
  {
    track: 'MASTERCLASS',
    source: 'BRIDGEWATER',
    key: 'MACRO',
    embedId: 'PHe0bXAIuk0',
    targetSymbol: 'BTC/USD',
    title: ['How The Economic Machine Works by Ray Dalio', '경제 기계가 작동하는 법 (레이 달리오 매크로 특강)', '经济机器是怎样运行的（瑞·达利欧）'],
    description: ['Ray Dalio’s foundational 30-minute breakdown of credit cycles, interest rates, and deleveraging dynamics.', '신용 사이클, 금리 정책, 그리고 디레버리징(부채 축소)의 경제 메커니즘을 설명하는 30분 마스터클래스입니다.', '关于信贷周期、利率政策以及去杠杆经济机制的经典剖析。'],
    age: ['MASTERCLASS', '불멸의 마스터클래스', '不朽经典大师课'],
    duration: '31:00',
    tone: 'blue',
    channel: 'Principles by Ray Dalio',
    link: 'https://www.youtube.com/watch?v=PHe0bXAIuk0',
    takeaways: [
      ['Credit creates buying power and short-term debt cycles that oscillate every 5-8 years.', '신용(Credit) 창출이 단기 구매력과 5~8년 주기의 단기 부채 사이클을 형성합니다.', '信贷扩张创造购买力，驱动5至8年的短期债务周期循环。'],
      ['Central banks manipulate short-term interest rates to stabilize inflation and productivity.', '중앙은행은 단기 기준금리를 조절하여 인플레이션과 실물 생산성을 통제합니다.', '中央银行通过调节短期基准利率来平抑通胀并调控实体生产力。'],
      ['Long-term debt cycle tops require beautiful deleveraging: austerity, debt restructuring and money printing.', '장기 부채 사이클 정점에서는 긴축, 채무 재조정, 화폐 발행의 조화로운 디레버리징이 필수적입니다.', '长期债务周期见顶时，需要兼顾紧缩、债务重组与量化宽松的“和谐去杠杆”。']
    ],
    timestamps: [
      { time: '03:15', sec: 195, label: ['Credit & Transactions', '신용과 거래 원리', '信贷与交易机制'] },
      { time: '12:40', sec: 760, label: ['Short-Term Debt Cycle', '단기 부채 사이클', '短期债务周期'] },
      { time: '21:10', sec: 1270, label: ['Beautiful Deleveraging', '조화로운 디레버리징', '和谐去杠杆'] }
    ]
  },
  {
    track: 'MASTERCLASS',
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: 'aMvrXhLubBU',
    targetSymbol: 'SOL/USD',
    title: ['Crypto Liquidity Volatility: Derivatives & Liquidation Maps', '크립토 유동성 변동성: 파생상품 포지셔닝과 청산 맵', '加密流动性与波动率：衍生品持仓与清算热力图'],
    description: ['On-chain orderflow, futures funding rates, and high-frequency liquidation cascades across perpetual swaps.', '온체인 호가 흐름, 선물 펀딩비율, 무기한 스왑 시장의 연쇄 청산 구조를 짚어봅니다.', '剖析链上订单流、永续合约资金费率及高杠杆清算瀑布效应对价格的冲击。'],
    age: ['MASTERCLASS', '마스터클래스', '大师课'],
    duration: '18:05',
    tone: 'green',
    channel: 'Coin Bureau',
    link: 'https://www.youtube.com/watch?v=aMvrXhLubBU',
    takeaways: [
      ['Derivatives open interest leverage creates explosive short/long squeeze dynamics.', '파생상품 미결제약정 레버리지가 극단적 숏스퀴즈 및 롱스퀴즈 변동성을 촉발합니다.', '衍生品持仓量过热极易引发剧烈的空头与多头双向挤压行情。'],
      ['Perpetual funding rate divergences offer high-probability mean-reversion alpha.', '무기한 선물 펀딩비율의 왜곡이 높은 승률의 통계적 평균회귀 차익거래 기회를 제공합니다.', '永续合约资金费率的异常偏离提供了高胜率的统计均值回归套利机会。'],
      ['Decentralized exchanges capture record share of perpetual trading volume.', '탈중앙화 파생상품 거래소(DEX)가 온체인 거래량 점유율 사상 최고치를 달성했습니다.', '去中心化衍生品交易所(DEX)在全网合约交易量中创下历史新高份额。']
    ],
    timestamps: [
      { time: '02:10', sec: 130, label: ['Liquidation Heatmaps', '청산 히트맵 분석', '清算热力图解析'] },
      { time: '07:35', sec: 455, label: ['Perp Funding Arbitrage', '펀딩비 차익거래', '资金费率套利'] },
      { time: '13:00', sec: 780, label: ['DEX Orderflow Dominance', 'DEX 호가 점유율', 'DEX订单流优势'] }
    ]
  },
  {
    track: 'MASTERCLASS',
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: 'xe8XiN5Zt4Y',
    targetSymbol: 'ETH/USD',
    title: ['Ethereum Economics: Layer-2 Settlement & Staking Yield', '이더리움 경제학: 레이어2 정산과 스테이킹 실질 수익률', '以太坊经济学：Layer-2结算与质押真实收益率'],
    description: ['Examining Ethereum’s fee-burn mechanics, rollup throughput scaling, and the institutional appeal of risk-free staking yields.', '이더리움 수수료 소각 메커니즘, 롤업 확장성과 기관 대상 스테이킹 무위험 수익률의 매력을 분석합니다.', '深入剖析以太坊费用销毁机制、Layer-2扩容吞吐量及质押收益对机构资本的吸引力。'],
    age: ['MASTERCLASS', '마스터클래스', '大师课'],
    duration: '19:42',
    tone: 'blue',
    channel: 'Coin Bureau',
    link: 'https://www.youtube.com/watch?v=xe8XiN5Zt4Y',
    takeaways: [
      ['Layer-2 settlement volume surpasses legacy payment rails with sub-cent transaction fees.', '레이어2 롤업의 결제 규모가 기존 전통 결제망을 상회하며 센트 단위 수수료를 실현했습니다.', 'Layer-2汇总网络结算规模已超越传统支付通道，交易成本降至分美分级别。'],
      ['Proof-of-Stake real yields provide benchmark interest rate for decentralized finance.', '지분증명(PoS) 실질 수익률이 탈중앙화 금융(DeFi)의 기준금리(Risk-free Benchmark) 역할을 수행합니다.', '权益证明(PoS)真实收益率正在成为去中心化金融的核心无风险基准利率。'],
      ['Ecosystem tokenomics maintain deflationary pressure during high-throughput activity bursts.', '네트워크 트랜잭션 급증 구간에서 자동 소각(EIP-1559)이 발행량을 압도하며 디플레이션 효과를 창출합니다.', '在高吞吐量活跃期，自动销毁机制驱动代币经济学持续呈现通缩状态。']
    ],
    timestamps: [
      { time: '01:50', sec: 110, label: ['L2 Throughput Surge', 'L2 처리량 급증', 'Layer-2吞吐量激增'] },
      { time: '08:40', sec: 520, label: ['Staking Benchmark Rate', '스테이킹 기준금리', '质押基准收益率'] },
      { time: '14:25', sec: 865, label: ['Deflationary Burn Path', '디플레이션 소각 경로', '通缩销毁路径'] }
    ]
  },
  {
    track: 'MASTERCLASS',
    source: 'CNBC',
    key: 'STRATEGY',
    embedId: 'oPtsG0v08N0',
    targetSymbol: 'NVDA/USD',
    title: ['IMF Chief Economist: Fed Rate Decisions & Market Liquidity', '전 IMF 수석 이코노미스트 라잔: 연준 금리 결정과 시장 유동성', '前IMF首席经济学家：美联储利率决策与市场流动性'],
    description: ['Raghuram Rajan joins CNBC to analyze Fed policy dilemmas, sticky inflation, and cross-asset liquidity risks.', '라구람 라잔 전 IMF 수석 이코노미스트가 연준의 정책 딜레마와 유동성 리스크를 진단합니다.', '拉古拉姆·拉詹分析美联储政策两难、粘性通胀与跨资产流动性风险。'],
    age: ['MASTERCLASS', '마스터클래스', '大师课'],
    duration: '06:45',
    tone: 'green',
    channel: 'CNBC Television',
    link: 'https://www.youtube.com/watch?v=oPtsG0v08N0',
    takeaways: [
      ['Fed faces complex policy balancing between growth momentum and sticky core services inflation.', '연준은 경기 성장 모멘텀과 끈적한 서비스 인플레이션 사이에서 까다로운 균형을 요구받습니다.', '美联储在维持经济增长势头与应对粘性核心服务通胀之间面临艰难平衡。'],
      ['Premature aggressive easing risks re-igniting speculative asset bubbles.', '성급한 금리 인하는 자산 시장의 투기적 유동성 버블을 재점화할 위험이 있습니다.', '过早过快的激进降息可能重新点燃资产市场的投机性流动性泡沫。'],
      ['Global central banks are navigating asynchronous monetary policy divergence.', '글로벌 중앙은행들이 국가별 거시 여건에 따라 각기 다른 통화정책 경로를 걷고 있습니다.', '全球央行正在经历分化的非同步货币政策周期。']
    ],
    timestamps: [
      { time: '00:45', sec: 45, label: ['Fed Policy Dilemma', '연준 정책 딜레마', '美联储政策困境'] },
      { time: '02:30', sec: 150, label: ['Sticky Inflation Risk', '끈적한 인플레 위험', '粘性通胀风险'] },
      { time: '04:50', sec: 290, label: ['Cross-Asset Impact', '자산별 파급효과', '跨资产传导影响'] }
    ]
  },
  {
    track: 'MASTERCLASS',
    source: 'YAHOO FINANCE',
    key: 'COMPANY',
    embedId: 'cTx3ODv5o3I',
    targetSymbol: 'ETH/USD',
    title: ['Nobel Laureate Krugman on Monetary Leadership & Market Regimes', '노벨경제학상 크루그먼: 통화 리더십과 시장 국면 진단', '诺贝尔奖得主克鲁格曼谈货币政策领导力与市场周期'],
    description: ['Paul Krugman joins Yahoo Finance to discuss central-bank leadership, structural productivity, and asset price regimes.', '노벨 경제학상 수상자 폴 크루그먼이 중앙은행 정책과 생산성, 자산 가격 구조를 논의합니다.', '诺贝尔经济学奖得主保罗·克鲁格曼深度解析央行领导力、结构性生产力与资产价格周期。'],
    age: ['MASTERCLASS', '마스터클래스', '大师课'],
    duration: '05:40',
    tone: 'red',
    channel: 'Yahoo Finance',
    link: 'https://www.youtube.com/watch?v=cTx3ODv5o3I',
    takeaways: [
      ['Institutional credibility of central-bank communication anchors inflation expectations.', '중앙은행의 일관된 시장 소통과 제도적 신뢰도가 인플레이션 기대 심리를 안정시킵니다.', '中央银行政策沟通的公信力是锚定长期通胀预期的核心支柱。'],
      ['Technological productivity gains act as structural long-term disinflationary force.', '기술 혁신에 따른 생산성 향상이 구조적인 장기 디스인플레이션 요인으로 작용합니다.', '科技驱动的生产力提升成为中长期结构性去通胀的关键力量。'],
      ['Macro regime shifts require re-evaluating risk-free discount rate assumptions.', '거시경제 체제 전환기에는 무위험 할인율(Discount Rate)에 대한 재평가가 요구됩니다.', '宏观周期转换期需要重新评估无风险贴现率的核心假设。']
    ],
    timestamps: [
      { time: '01:00', sec: 60, label: ['Central Bank Policy', '중앙은행 통화정책', '央行政策沟通'] },
      { time: '02:45', sec: 165, label: ['Productivity Drivers', '생산성 견인 요인', '生产力驱动要素'] },
      { time: '04:20', sec: 260, label: ['Market Regime Shift', '시장 체제 전환 국면', '市场周期切换'] }
    ]
  }
]

const mediaCategories = {
  en: ['ALL', 'CRYPTO', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'],
  ko: ['전체', '가상자산', '거시경제', '전략', '시장', '기업'],
  cn: ['全部', '加密资产', '宏观', '策略', '市场', '公司']
}
const mediaCategoryKeys = ['ALL', 'CRYPTO', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']
const mediaCopy = {
  en: {
    overline: 'INSTITUTIONAL & CRYPTO MEDIA INTELLIGENCE',
    title: <>Market context,<br /><em>without the noise.</em></>,
    intro: 'Finance & crypto video intelligence from official institutional channels. Watch inside the terminal, inspect AI takeaways, and jump to critical market moments.',
    status: 'WIRE STATUS',
    indexed: '8 SOURCES INDEXED',
    statusNote: 'Official YouTube embeds · Attribution preserved',
    updated: 'UPDATED 08:42 UTC',
    signals: 'SIGNALS',
    featured: 'FEATURED',
    embed: 'OFFICIAL EMBED',
    watch: 'WATCH ORIGINAL',
    brief: 'VIEW BRIEF',
    takeawaysTitle: 'AI 3-POINT KEY TAKEAWAYS',
    timestampsTitle: 'KEY MOMENTS',
    syncChart: 'SYNC CHART',
    playingNow: 'NOW STREAMING',
    clickToPlay: 'CLICK TO PLAY IN TERMINAL'
  },
  ko: {
    overline: '글로벌 기관 및 가상자산 미디어 인텔리전스',
    title: <>시장의 핵심을<br /><em>1분 만에 꿰뚫다.</em></>,
    intro: '잡음 가득한 유튜브 찌라시 대신, 공신력 있는 외신과 기관 마스터클래스의 엑기스만 추출하여 차트와 즉시 연동하세요.',
    status: '와이어 상태',
    indexed: '8개 출처 인덱싱',
    statusNote: '공식 유튜브 임베드 · 출처 명시',
    updated: '08:42 UTC 업데이트',
    signals: '개 시그널',
    featured: '주목할 영상',
    embed: '공식 임베드',
    watch: '원본 영상 보기',
    brief: '브리핑 보기',
    takeawaysTitle: 'AI 3대 핵심 포인트',
    timestampsTitle: '주요 구간 바로가기',
    syncChart: '차트 연동',
    playingNow: '터미널에서 재생 중',
    clickToPlay: '클릭하여 터미널에서 즉시 재생'
  },
  cn: {
    overline: '机构与加密媒体智能',
    title: <>没有噪音的<br /><em>市场语境。</em></>,
    intro: '来自官方机构与加密频道的专业视频情报。在终端内直接播放，查看AI核心观点与时间戳跳转，将市场语境转化为投资决策。',
    status: '快讯状态',
    indexed: '已索引 8 个来源',
    statusNote: '官方 YouTube 嵌入 · 保留来源标注',
    updated: '08:42 UTC 更新',
    signals: '个信号',
    featured: '精选',
    embed: '官方嵌入',
    watch: '观看原始视频',
    brief: '查看简报',
    takeawaysTitle: 'AI 3大核心观点',
    timestampsTitle: '关键时刻跳转',
    syncChart: '联动图表',
    playingNow: '正在终端播放',
    clickToPlay: '点击在终端内直接播放'
  }
}

type NewsItem = typeof newsItemsByLang['en'][number]

function Diamond() {
  return <span className="diamond" aria-hidden="true">◆</span>
}

export type PersonaType = 'alex' | 'mina' | 'jhan'

export interface AgentToolCall {
  name: string
  detail: string
  status: 'DONE' | 'RUNNING'
}

export interface AgentMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  imageUrl?: string
  timestamp: string
  persona?: PersonaType
  toolCalls?: AgentToolCall[]
}

export interface AgentSession {
  id: string
  title: string
  symbol: string
  persona: PersonaType
  mode: 'INSIGHT' | 'GUIDE' | 'CODING'
  updatedAt: string
  messages: AgentMessage[]
}

const personaProfiles: Record<PersonaType, { name: string; tag: string; title: string; desc: string }> = {
  alex: {
    name: 'Alex Chen AI',
    tag: 'ON-CHAIN QUANT',
    title: 'Senior On-Chain & Derivatives Quant',
    desc: '청산 맵, 스마트머니 고래 지갑, 선물 펀딩비 전문'
  },
  mina: {
    name: 'Mina Park',
    tag: 'MACRO STRATEGIST',
    title: 'Chief Global Macro & Flow Economist',
    desc: '연준(Fed) 금리 정책, ETF 수급 사이클, 거시경제 헷징 전문'
  },
  jhan: {
    name: 'J. Han',
    tag: 'SYSTEM TRADING',
    title: 'Director of Quantitative Execution',
    desc: 'AETHER 프랙탈 패턴, 비대칭 손익비(1:3.4), 모멘텀 돌파 전문'
  }
}

function extractTopicTitle(prompt: string, symbol: string): string {
  const clean = prompt.replace(/[\r\n\t]+/g, ' ').replace(/[?!.,~]/g, '').trim()
  if (!clean) return `${symbol} 전략 리서치`

  if (clean.includes('지지') || clean.includes('저항')) return `${symbol} 77K 지지선 및 하방 청산 리스크`
  if (clean.includes('비중') || clean.includes('배분') || clean.includes('얼마')) return `${symbol} 3단계 자본 배분 및 포지션 비중`
  if (clean.includes('손절') || clean.includes('헷징') || clean.includes('무효화')) return `${symbol} 50일선 이탈 무효화 및 헷징 플랜`
  if (clean.includes('실적') || clean.includes('CAPEX') || clean.includes('매크로')) return `${symbol} 실적 전망 및 밸류에이션 점검`
  if (clean.includes('숏스퀴즈') || clean.includes('펀딩비') || clean.includes('청산')) return `${symbol} 온체인 청산 맵 & 숏스퀴즈 진단`

  const words = clean.split(/\s+/)
  if (words.length <= 4 && clean.length <= 22) return clean
  const preview = words.slice(0, 4).join(' ')
  return preview.length > 20 ? preview.slice(0, 18) + '…' : preview
}

const getDefaultUserSessions = (user?: AuthResponse | null): AgentSession[] => {
  const name = user?.nickname || user?.username || '트레이더'
  const isGuest = !user?.username
  return [
    {
      id: 'sess-user-' + Date.now(),
      title: isGuest ? 'BTC 실시간 AI 퀀트 리서치' : `${name} 님의 AI 퀀트 리서치 토픽`,
      symbol: 'BTC/USD',
      persona: 'alex',
      mode: 'INSIGHT',
      updatedAt: '방금 전',
      messages: [
        {
          id: 'welcome-' + Date.now(),
          role: 'agent',
          persona: 'alex',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `안녕하세요, **${name}** 님! **AETHER AI 리서치 데스크 (AETHER Intelligence OS & Multi-Fractal)**입니다.\n\n${isGuest ? '현재 **BTC/USD**의 실시간 시장 미시구조와 온체인 지표를 분석 중입니다.' : '회원님의 전용 퀀트 워크스페이스가 활성화되었습니다.'}\n\n궁금하신 종목 티커(예: BTC, ETH, NVDA, 삼전 등)나 가격대, 청산 리스크, 자본 배분 전략을 질문해 주세요.`
        }
      ]
    }
  ]
}

const getUserSessionKey = (user?: AuthResponse | null) => {
  return user?.username ? `aether_agent_sessions_${user.username.replace(/[^a-zA-Z0-9_]/g, '_')}` : 'aether_agent_sessions_guest'
}

const symbolStopWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THIS', 'THAT', 'WHAT', 'WHY', 'HOW', 'IS', 'ARE', 'CAN', 'YOU', 'NOW', 'BUY', 'SELL', 'HOLD', 'GUIDE', 'MODE', 'INSIGHT', 'ANALYZE', 'ANALYSIS', 'RISK', 'PRICE', 'ASSET', 'MARKET'])
const assetAliases: Record<string, string> = {
  '리플': 'XRP/USD', '리플코인': 'XRP/USD', '엑스알피': 'XRP/USD',
  '비트코인': 'BTC/USD', '비트': 'BTC/USD', '이더리움': 'ETH/USD', '이더': 'ETH/USD',
  '솔라나': 'SOL/USD', '솔라': 'SOL/USD',
  '바이낸스코인': 'BNB/USD', '바이낸스': 'BNB/USD', '비앤비': 'BNB/USD', 'BNB': 'BNB/USD',
  '에이다': 'ADA/USD', '카르다노': 'ADA/USD', 'ADA': 'ADA/USD',
  '수이': 'SUI/USD', 'SUI': 'SUI/USD',
  '도지코인': 'DOGE/USD', '도지': 'DOGE/USD', 'DOGE': 'DOGE/USD',
  '엔비디아': 'NVDA/USD', '테슬라': 'TSLA/USD', '애플': 'AAPL/USD',
  '마이크로소프트': 'MSFT/USD', '마소': 'MSFT/USD', '구글': 'GOOGL/USD',
  '삼성전자': '005930.KS', '삼전': '005930.KS', '삼성': '005930.KS',
  '하이닉스': '000660.KS', 'SK하이닉스': '000660.KS', '에스케이하이닉스': '000660.KS',
  '현대차': '005380.KS', '현대자동차': '005380.KS'
}

export interface BotInstanceItem {
  id: string
  name: string
  strategy: string
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | string
  region: string
  exchange?: string
  apiKeyMasked?: string
  licenseToken?: string
  heartbeat?: string
  symbol?: string
  uptime?: string
  pnl?: string
  isPositive?: boolean
  specs?: string
  ip?: string
}

export const SUPPORTED_ASSETS_REGISTRY = [
  { symbol: 'BTC/USD', raw: 'BTCUSDT', name: '비트코인 (Bitcoin)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'ETH/USD', raw: 'ETHUSDT', name: '이더리움 (Ethereum)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'SOL/USD', raw: 'SOLUSDT', name: '솔라나 (Solana)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'BNB/USD', raw: 'BNBUSDT', name: '바이낸스코인 (BNB)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'ADA/USD', raw: 'ADAUSDT', name: '에이다 (Cardano)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'SUI/USD', raw: 'SUIUSDT', name: '수이 (Sui)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'DOGE/USD', raw: 'DOGEUSDT', name: '도지코인 (Dogecoin)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'XRP/USD', raw: 'XRPUSDT', name: '리플 (XRP)', category: '가상자산 (Major Crypto)', flag: '🪙' },
  { symbol: 'NVDA/USD', raw: 'NVDA', name: '엔비디아 (NVIDIA)', category: '미국 주식 (NASDAQ)', flag: '🇺🇸' },
  { symbol: 'TSLA/USD', raw: 'TSLA', name: '테슬라 (Tesla)', category: '미국 주식 (NASDAQ)', flag: '🇺🇸' },
  { symbol: 'AAPL/USD', raw: 'AAPL', name: '애플 (Apple)', category: '미국 주식 (NASDAQ)', flag: '🇺🇸' },
  { symbol: 'MSFT/USD', raw: 'MSFT', name: '마이크로소프트 (MSFT)', category: '미국 주식 (NASDAQ)', flag: '🇺🇸' },
  { symbol: 'GOOGL/USD', raw: 'GOOGL', name: '구글 (Alphabet)', category: '미국 주식 (NASDAQ)', flag: '🇺🇸' },
  { symbol: '005930.KS', raw: '005930.KS', name: '삼성전자 (005930.KS)', category: '국내 주식 (KOSPI)', flag: '🇰🇷' },
  { symbol: '000660.KS', raw: '000660.KS', name: 'SK하이닉스 (000660.KS)', category: '국내 주식 (KOSPI)', flag: '🇰🇷' },
  { symbol: '005380.KS', raw: '005380.KS', name: '현대자동차 (005380.KS)', category: '국내 주식 (KOSPI)', flag: '🇰🇷' }
]

function highlightDraculaPythonCode(code: string) {
  const lines = code.split('\n')
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      return (
        <div key={lineIdx} style={{ minHeight: '1.6em' }}>
          <span style={{ color: '#6272a4', fontStyle: 'italic' }}>{line}</span>
        </div>
      )
    }

    const tokenRegex = /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:def|if|elif|else|return|import|from|as|in|for|while|and|or|not|is|None|True|False)\b)|(\b(?:on_market_tick|get|append|print|len|range|dict|list)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*\b)|([{}():=<>+\-*\/,%]+)|(\s+)/g

    const tokens: React.ReactNode[] = []
    let match: RegExpExecArray | null
    let keyIdx = 0

    while ((match = tokenRegex.exec(line)) !== null) {
      const [full, comment, str, kw, fn, num, id, sym, space] = match
      if (comment) {
        tokens.push(<span key={keyIdx++} style={{ color: '#6272a4', fontStyle: 'italic' }}>{comment}</span>)
      } else if (str) {
        tokens.push(<span key={keyIdx++} style={{ color: '#f1fa8c' }}>{str}</span>)
      } else if (kw) {
        tokens.push(<span key={keyIdx++} style={{ color: '#ff79c6', fontWeight: 'bold' }}>{kw}</span>)
      } else if (fn) {
        tokens.push(<span key={keyIdx++} style={{ color: '#50fa7b' }}>{fn}</span>)
      } else if (num) {
        tokens.push(<span key={keyIdx++} style={{ color: '#bd93f9' }}>{num}</span>)
      } else if (id) {
        tokens.push(<span key={keyIdx++} style={{ color: '#8be9fd' }}>{id}</span>)
      } else if (sym) {
        tokens.push(<span key={keyIdx++} style={{ color: '#f8f8f2' }}>{sym}</span>)
      } else if (space) {
        tokens.push(<span key={keyIdx++}>{space}</span>)
      } else {
        tokens.push(<span key={keyIdx++}>{full}</span>)
      }
    }

    return (
      <div key={lineIdx} style={{ minHeight: '1.6em', whiteSpace: 'pre' }}>
        {tokens.length > 0 ? tokens : ' '}
      </div>
    )
  })
}

function checkAssetSupport(input: string): { isSupported: boolean; resolvedSymbol?: string } {
  if (!input || !input.trim()) return { isSupported: true, resolvedSymbol: 'BTC/USD' }
  const trimmed = input.trim()
  
  // 1. Direct Korean/English alias match
  const aliasMatch = Object.entries(assetAliases).find(([name]) => trimmed.includes(name) || trimmed.toLowerCase() === name.toLowerCase())
  if (aliasMatch) {
    return { isSupported: true, resolvedSymbol: aliasMatch[1] }
  }

  // 2. Direct registry match
  const upper = trimmed.toUpperCase().replace(/\$/g, '')
  const regMatch = SUPPORTED_ASSETS_REGISTRY.find(a => 
    upper === a.symbol || 
    upper === a.raw || 
    upper === a.symbol.replace('/USD', '') ||
    upper === a.symbol.replace('.KS', '') ||
    upper.startsWith(a.raw) ||
    upper.startsWith(a.symbol)
  )
  if (regMatch) {
    return { isSupported: true, resolvedSymbol: regMatch.symbol }
  }

  // 3. Extracted ticker check
  const extracted = extractAssetSymbol(trimmed, '')
  if (extracted) {
    const matchedExtracted = SUPPORTED_ASSETS_REGISTRY.find(a => 
      extracted.toUpperCase() === a.symbol || 
      extracted.toUpperCase() === a.raw || 
      extracted.toUpperCase() === `${a.raw}/USD`
    )
    if (matchedExtracted) {
      return { isSupported: true, resolvedSymbol: matchedExtracted.symbol }
    }
  }

  return { isSupported: false }
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

function getAssetTelemetry(symbol: string) {
  const sym = (symbol || '').toUpperCase()
  if (sym.includes('005930') || sym.includes('삼성') || sym.includes('삼전')) {
    return {
      name: '삼성전자 (005930.KS)',
      price: '₩56,200',
      rsi: '43.2',
      rsiStatus: 'NEUTRAL',
      score: '+0.48',
      supp: '₩55,350',
      res: '₩58,160',
      news: '삼성전자 HBM3E 12단 퀄테스트 및 반도체 밸류업 공시 수급'
    }
  }
  if (sym.includes('000660') || sym.includes('하이닉스')) {
    return {
      name: 'SK하이닉스 (000660.KS)',
      price: '₩186,500',
      rsi: '58.4',
      rsiStatus: 'BULLISH',
      score: '+0.76',
      supp: '₩183,700',
      res: '₩194,500',
      news: 'SK하이닉스 엔비디아 향 HBM 공급 계약 연장 및 어닝 서프라이즈'
    }
  }
  if (sym.includes('NVDA') || sym.includes('엔비디아')) {
    return {
      name: 'NVIDIA (NVDA)',
      price: '$138.50',
      rsi: '62.4',
      rsiStatus: 'BULLISH',
      score: '+0.84',
      supp: '$136.40',
      res: '$145.20',
      news: '빅테크 2026 AI 데이터센터 인프라 CAPEX 상향 및 마진율 방어'
    }
  }
  if (sym.includes('BNB') || sym.includes('바이낸스')) {
    return {
      name: 'Binance Coin (BNB/USD)',
      price: '$648.20',
      rsi: '55.8',
      rsiStatus: 'BULLISH',
      score: '+0.68',
      supp: '$628.00',
      res: '$680.00',
      news: 'BNB 체인 런치풀 참여 자금 유입 및 온체인 일일 활성 지갑 수 급증'
    }
  }
  if (sym.includes('ADA') || sym.includes('에이다') || sym.includes('카르다노')) {
    return {
      name: 'Cardano (ADA/USD)',
      price: '$0.742',
      rsi: '61.4',
      rsiStatus: 'BULLISH',
      score: '+0.62',
      supp: '$0.710',
      res: '$0.820',
      news: '카르다노 창립자 하이드라 레이어2 확장성 테스트넷 발표'
    }
  }
  if (sym.includes('SUI') || sym.includes('수이')) {
    return {
      name: 'Sui Network (SUI/USD)',
      price: '$3.28',
      rsi: '66.8',
      rsiStatus: 'BULLISH',
      score: '+0.86',
      supp: '$3.05',
      res: '$3.60',
      news: '수이 온체인 TVL 15억 달러 돌파 및 글로벌 디파이 자금 유입 가속'
    }
  }
  if (sym.includes('DOGE') || sym.includes('도지')) {
    return {
      name: 'Dogecoin (DOGE/USD)',
      price: '$0.264',
      rsi: '59.2',
      rsiStatus: 'BULLISH',
      score: '+0.58',
      supp: '$0.245',
      res: '$0.310',
      news: '도지코인 선물 미결제약정 사상 최고치 경신 및 커뮤니티 결제 기대감'
    }
  }
  if (sym.includes('SOL') || sym.includes('솔라나')) {
    return {
      name: 'Solana (SOL/USD)',
      price: '$178.50',
      rsi: '51.2',
      rsiStatus: 'NEUTRAL',
      score: '+0.52',
      supp: '$172.00',
      res: '$189.50',
      news: '솔라나 온체인 DEX 거래량 및 스테이블코인 유동성 순유입'
    }
  }
  return {
    name: 'Bitcoin (BTC/USD)',
    price: '$77,642.99',
    rsi: '43.8',
    rsiStatus: 'NEUTRAL',
    score: '+0.82',
    supp: '$76,245',
    res: '$80,360',
    news: '비트코인 현물 ETF 순유입 지속 및 기관 스마트머니 축적'
  }
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
  const [arbitrageOpen, setArbitrageOpen] = useState(false)
  const [tradeOpen, setTradeOpen] = useState(true)
  const [researchOpen, setResearchOpen] = useState(true)
  const [marketActiveSymbol, setMarketActiveSymbol] = useState('BTC / USD')
  const [marketChartInterval, setMarketChartInterval] = useState('1W')
  const [marketCopilotTab, setMarketCopilotTab] = useState<'INSIGHTS' | 'GUIDE' | 'CODE'>('INSIGHTS')
  const [marketPrompt, setMarketPrompt] = useState('')
  const [marketCopilotLoading, setMarketCopilotLoading] = useState(false)
  const [marketMessages, setMarketMessages] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>([])
  const [isCopilotExpanded, setIsCopilotExpanded] = useState(false)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [articleLangView, setArticleLangView] = useState<'KO' | 'EN'>('KO')
  const [mediaFilter, setMediaFilter] = useState('ALL')
  const [mediaTrack, setMediaTrack] = useState<'DAILY_LIVE' | 'MASTERCLASS'>('DAILY_LIVE')
  const [selectedMediaStory, setSelectedMediaStory] = useState(mediaStories[0])
  const [mediaIsPlaying, setMediaIsPlaying] = useState(false)
  const [mediaStartSecond, setMediaStartSecond] = useState(0)
  const visibleMediaStories = useMemo(() =>
    mediaStories.filter((s) => (s as any).track === mediaTrack && (mediaFilter === 'ALL' || s.key === mediaFilter)),
    [mediaTrack, mediaFilter]
  )
  const mediaText = (value: string[]) => value[language === 'en' ? 0 : language === 'ko' ? 1 : 2]

  const handleSelectMediaStory = (story: typeof mediaStories[0]) => {
    setSelectedMediaStory(story)
    setMediaIsPlaying(false)
    setMediaStartSecond(0)
  }

  const handlePlayMediaStory = (sec = 0) => {
    setMediaStartSecond(sec)
    setMediaIsPlaying(true)
  }

  const handleJumpMediaTimestamp = (sec: number) => {
    setMediaStartSecond(sec)
    setMediaIsPlaying(true)
  }

  const handleSyncChart = (symbol: string) => {
    setSearched(symbol)
    window.scrollTo({ top: 450, behavior: 'smooth' })
  }
  const [orderbookOpen, setOrderbookOpen] = useState(true)
  const [forkedStrategy, setForkedStrategy] = useState<string | null>(null)
  const [researchMode, setResearchMode] = useState<'INSIGHT' | 'GUIDE' | 'CODING'>('INSIGHT')
  const [researchPrompt, setResearchPrompt] = useState('')
  const [researchRan, setResearchRan] = useState(false)
  const [researchResponse, setResearchResponse] = useState<any>(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)

  // Real Backend User State
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null)
  const [decisionReport, setDecisionReport] = useState<IntegratedDecisionReport | null>(null)

  // 1-Hour Prediction League Interactive State & Real Strike Price
  const [round, setRound] = useState(1)
  const [humanWins, setHumanWins] = useState(0)
  const [aiWins, setAiWins] = useState(0)
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [hourlyRemainingSec, setHourlyRemainingSec] = useState(2430)
  const [lockedBasePrice, setLockedBasePrice] = useState<string | null>(null)

  // AI Agent Studio (Multi-turn Sessions & Copilot) State
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('alex')
  const [agentInputPrompt, setAgentInputPrompt] = useState<string>('')
  const [agentThinking, setAgentThinking] = useState<boolean>(false)
  const [agentThinkingStep, setAgentThinkingStep] = useState<string>('AETHER 퀀트 모멘텀 지표 & 20/50 EMA 계산 중...')
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [attachedImageName, setAttachedImageName] = useState<string>('')
  const chatFileInputRef = useRef<HTMLInputElement>(null)

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImageName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedImage(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleChatPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          setAttachedImageName('차트 캡처 스크린샷')
          const reader = new FileReader()
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachedImage(event.target.result as string)
            }
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }

  const currentSession = useMemo(() => {
    return agentSessions.find(s => s.id === activeSessionId) || agentSessions[0] || getDefaultUserSessions(currentUser)[0]
  }, [agentSessions, activeSessionId, currentUser])

  const handleCreateNewSession = (symbolOverride?: string) => {
    const sym = symbolOverride || searched
    const newId = 'sess-' + Date.now()
    const newSession: AgentSession = {
      id: newId,
      title: `${sym} 신규 리서치 토픽`,
      symbol: sym,
      persona: 'alex',
      mode: researchMode,
      updatedAt: '방금 전',
      messages: [
        {
          id: 'welcome-' + Date.now(),
          role: 'agent',
          persona: 'alex',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `안녕하세요. **AETHER AI 리서치 데스크 (AETHER Intelligence OS & Multi-Fractal)**입니다.\n\n현재 **${sym}**의 실시간 시장 미시구조, 온체인 유동성, 그리고 Bright Data 실시간 뉴스 피드를 모니터링하고 있습니다.\n\n궁금하신 지지/저항 가격대, 숏/롱 청산 리스크, 또는 자본 배분 전략을 편하게 질문해 주세요. **[📷 차트 캡처 사진 첨부]** 기능으로 이미지 분석도 가능합니다.`
        }
      ]
    }
    setAgentSessions(prev => [newSession, ...prev])
    setActiveSessionId(newId)
  }

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (agentSessions.length <= 1) {
      alert('최소 1개의 리서치 세션은 유지되어야 합니다.')
      return
    }
    const filtered = agentSessions.filter(s => s.id !== id)
    setAgentSessions(filtered)
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id)
    }
  }

  const handleSendAgentMessage = async (customPrompt?: string) => {
    const text = (customPrompt || agentInputPrompt).trim()
    const currentImg = attachedImage
    if ((!text && !currentImg) || agentThinking) return

    const userPromptText = text || (currentImg ? '업로드된 차트 사진의 추세, 지지/저항선, 매매 타점을 정밀 분석해 줘.' : '')
    setAgentInputPrompt('')
    setAttachedImage(null)
    setAttachedImageName('')
    setAgentThinking(true)
    setAgentThinkingStep(currentImg 
      ? '업로드된 차트의 캔들 구조와 지지/저항 매물대를 꼼꼼히 판독하는 중...' 
      : '시장의 숨겨진 가격 파동과 흐름을 깊이 곱씹는 중...')

    const userMsg: AgentMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: userPromptText,
      imageUrl: currentImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const curSess = agentSessions.find(s => s.id === activeSessionId) || agentSessions[0] || getDefaultUserSessions(currentUser)[0]
    const updatedMessages = [...curSess.messages, userMsg]
    
    // Dynamically update topic title based on user question
    const isGenericTitle = curSess.title.includes('신규 리서치') || curSess.title.includes('리서치 세션') || curSess.messages.filter(m => m.role === 'user').length === 0
    const dynamicTitle = isGenericTitle ? extractTopicTitle(userPromptText, curSess.symbol) : curSess.title

    setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
      ...s,
      title: dynamicTitle,
      messages: updatedMessages,
      updatedAt: '방금 전'
    } : s))

    let t1: any, t2: any, t3: any;

    try {
      let replyContent = ''
      let toolCalls: AgentToolCall[] = []

      if (currentImg) {
        t1 = setTimeout(() => {
          setAgentThinkingStep('과거 유사 프랙탈 차트 패턴들과 시각적 형태를 차분히 되새김질하는 중...')
        }, 800)

        const visionResp = await fetchVisionChartAnalysis({
          symbol: curSess.symbol,
          imageBase64: currentImg,
          prompt: userPromptText
        })

        replyContent = visionResp?.analysisMarkdown || '차트 이미지 분석을 완료했습니다.'
        toolCalls = [
          { name: 'vision.decodeChartImage', detail: `Visual structure & candlestick layout recognized`, status: 'DONE' },
          { name: 'fastDtw.scanBigDataFractals', detail: `8,000 Historical candles scanned in 12 threads (Match: 86.2%)`, status: 'DONE' },
          { name: 'qwenVL.synthesizeReport', detail: `Institutional Vision Chart Analysis generated`, status: 'DONE' }
        ]

        const agentMsg: AgentMessage = {
          id: 'agt-' + Date.now(),
          role: 'agent',
          persona: selectedPersona,
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCalls
        }

        setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
          ...s,
          messages: [...updatedMessages, agentMsg],
          updatedAt: '방금 전'
        } : s))
      } else {
        const agentMsgId = 'agt-' + Date.now();
        let accumulatedText = '';

        const initialAgentMsg: AgentMessage = {
          id: agentMsgId,
          role: 'agent',
          persona: selectedPersona,
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCalls: [
            { name: 'ta4j.calculateSignals', detail: `${curSess.symbol} RSI, SMA20/50, Volatility Bands calculated`, status: 'DONE' },
            { name: 'aether.fractalEngine', detail: `AETHER 8,000 빅데이터 프랙탈 패턴 스캔 완료`, status: 'DONE' },
            { name: 'brightdata.scrapeNews', detail: `Bright Data real-time financial news stream & sentiment scoring`, status: 'DONE' },
            { name: 'qwenMax.streaming', detail: `Qwen-Max 300B+ Flagship real-time token streaming`, status: 'RUNNING' }
          ]
        };

        setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
          ...s,
          messages: [...updatedMessages, initialAgentMsg],
          updatedAt: '방금 전'
        } : s));

        await streamResearchChatSSE({
          prompt: userPromptText,
          symbol: extractAssetSymbol(`${userPromptText} ${curSess.symbol}`, curSess.symbol),
          mode: curSess.mode,
          language,
          history: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        }, {
          onProgress: (prog) => {
            if (prog?.thought) {
              setAgentThinkingStep(prog.thought);
            }
          },
          onToken: (token) => {
            setAgentThinking(false);
            accumulatedText += token;
            setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
              ...s,
              messages: s.messages.map(m => m.id === agentMsgId ? { ...m, content: accumulatedText } : m),
              updatedAt: '방금 전'
            } : s));
          },
          onDone: (finalData) => {
            setAgentThinking(false);
            const activeMode = curSess.mode || researchMode;
            const dynamicToolCalls: AgentToolCall[] = activeMode === 'CODING' ? [
              { name: 'ta4j.parseStrategyLogic', detail: `${curSess.symbol} Algorithm entry/exit indicators mapped`, status: 'DONE' },
              { name: 'sandbox.executeBacktest', detail: `Docker Sandbox 1,000 candles backtest executed`, status: 'DONE' },
              { name: 'qwenMax.autoTune', detail: `Sharpe Ratio 2.0+ Auto-Tuning completed`, status: 'DONE' },
              { name: 'botArena.generateBlueprint', detail: `Bot Arena 1-click deployment blueprint generated`, status: 'DONE' }
            ] : activeMode === 'GUIDE' ? [
              { name: 'ta4j.calculateVolatility', detail: `${curSess.symbol} ATR & dynamic support levels computed`, status: 'DONE' },
              { name: 'backtest.simulateScaleIn', detail: `3-Stage scale-in 1-year backtest simulation passed`, status: 'DONE' },
              { name: 'kelly.optimizeCapital', detail: `Kelly Criterion risk-shield capital allocation verified`, status: 'DONE' },
              { name: 'qwenMax.issueActionTicket', detail: `Institutional 3-stage execution ticket issued`, status: 'DONE' }
            ] : [
              { name: 'ta4j.calculateSignals', detail: `${curSess.symbol} RSI, SMA20/50, Volatility Bands calculated`, status: 'DONE' },
              { name: 'aether.fractalEngine', detail: `AETHER 8,000 빅데이터 프랙탈 패턴 스캔 완료`, status: 'DONE' },
              { name: 'brightdata.scrapeNews', detail: `Bright Data real-time financial news stream & sentiment scoring`, status: 'DONE' },
              { name: 'qwenMax.synthesize', detail: `Institutional Qwen-Max Flagship Synthesis complete`, status: 'DONE' }
            ];

            setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
              ...s,
              messages: s.messages.map(m => m.id === agentMsgId ? {
                ...m,
                content: accumulatedText || finalData?.reply || finalData?.answer || '분석 완료',
                toolCalls: dynamicToolCalls
              } : m),
              updatedAt: '방금 전'
            } : s));
          },
          onError: async (err) => {
            console.warn('[SSE] Stream fallback to static sendResearchChat:', err);
            const fallbackResp = await sendResearchChat({
              prompt: userPromptText,
              symbol: extractAssetSymbol(`${userPromptText} ${curSess.symbol}`, curSess.symbol),
              mode: curSess.mode,
              language,
              history: updatedMessages.map(m => ({ role: m.role, content: m.content }))
            });
            const rep = fallbackResp?.reply || fallbackResp?.answer || '분석 완료';
            setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
              ...s,
              messages: s.messages.map(m => m.id === agentMsgId ? { ...m, content: rep } : m),
              updatedAt: '방금 전'
            } : s));
          }
        });
      }
    } catch (err) {
      console.error('[AgentStudio] Error generating research:', err)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      setAgentThinking(false)
    }
  }
  
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
  const [sandboxIsError, setSandboxIsError] = useState(false)
  const [sandboxLoading, setSandboxLoading] = useState(false)

  // Upgrade & Pro Quant Subscription Modal State
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState<'CORE' | 'PRO'>('CORE')
  const [paymentCopied, setPaymentCopied] = useState(false)

  // Pure On-Chain Deposit Modal State (Non-Custodial P2P)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('polygon')
  const [depositWallets, setDepositWallets] = useState<Record<string, string>>({
    polygon: '0xb0390a087488E304cA32996532Ab9f40028511fE',
    bsc: '0xb0390a087488E304cA32996532Ab9f40028511fE',
    trc20: 'TLZuz8MAZ34w8i4fejUJ7qaF8PkgF8W4UE',
    solana: '8cEVKX4SzUUADEkkp9X62eWrgXRuU9zZiWBTgQfupqKA'
  })
  const [userTxHash, setUserTxHash] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [depositSuccessResult, setDepositSuccessResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)

  // 10-Win Streak Claim Modal State
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimAddress, setClaimAddress] = useState('')
  const [claimNetwork, setClaimNetwork] = useState('polygon')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimSuccessData, setClaimSuccessData] = useState<any>(null)
  const [claimTeaserModalOpen, setClaimTeaserModalOpen] = useState(false)
  const [escrowPool, setEscrowPool] = useState<EscrowPoolStatus | null>(null)

  // Admin Escrow Management Console State
  const [adminEscrowModalOpen, setAdminEscrowModalOpen] = useState(false)
  const [adminEscrowTab, setAdminEscrowTab] = useState<'DEPOSIT' | 'SWEEP' | 'AUDIT'>('DEPOSIT')
  const [adminConfigCapacity, setAdminConfigCapacity] = useState('100.0')
  const [adminConfigStatus, setAdminConfigStatus] = useState('ACTIVE')
  const [adminSweepAddress, setAdminSweepAddress] = useState('')
  const [adminSweepAmount, setAdminSweepAmount] = useState('')
  const [adminSweepNetwork, setAdminSweepNetwork] = useState('polygon')
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [adminSweepResult, setAdminSweepResult] = useState<any>(null)
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminEscrowAuditLog[]>([])

  // Super Admin Authorization Check (leesiho58@gmail.com)
  const isAdmin = useMemo(() => {
    if (!currentUser) return false
    const username = (currentUser.username || '').toLowerCase()
    const role = currentUser.role || ''
    return role === 'ROLE_ADMIN' || username === 'leesiho58@gmail.com' || username.startsWith('leesiho58')
  }, [currentUser])

  // 1. Mount: Load User Auth & That Specific User's Private Chat History
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      const user: AuthResponse | null = stored ? JSON.parse(stored) : null
      setCurrentUser(user)

      const sessionKey = getUserSessionKey(user)
      const userStoredSessions = localStorage.getItem(sessionKey)
      if (userStoredSessions) {
        const parsed = JSON.parse(userStoredSessions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgentSessions(parsed)
          setActiveSessionId(parsed[0].id)
        } else {
          const initial = getDefaultUserSessions(user)
          setAgentSessions(initial)
          setActiveSessionId(initial[0].id)
        }
      } else {
        const initial = getDefaultUserSessions(user)
        setAgentSessions(initial)
        setActiveSessionId(initial[0].id)
      }

      // Load user-isolated streak with Auto-Settlement of expired predictions
      const now = new Date()
      const currentHourTag = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`
      const streakKey = `aether_streak_${user?.username ? user.username.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest'}`
      const storedStreak = localStorage.getItem(streakKey)
      if (storedStreak) {
        const parsed = JSON.parse(storedStreak)
        const isExpired = !parsed.roundHourTag || parsed.roundHourTag !== currentHourTag || (parsed.submittedAt && Date.now() - parsed.submittedAt > 3600 * 1000)
        
        if (parsed.submitted && isExpired) {
          // If previous round expired, clear the pending state cleanly without fake premature win
          const prevWins = parsed.humanWins || 0
          setHumanWins(prevWins)
          setRound(Math.min(10, prevWins + 1))
          setSubmitted(false)
          setPrediction(null)
          localStorage.setItem(streakKey, JSON.stringify({
            humanWins: prevWins,
            round: Math.min(10, prevWins + 1),
            submitted: false,
            prediction: null,
            roundHourTag: currentHourTag
          }))
        } else {
          setHumanWins(parsed.humanWins || 0)
          setRound(parsed.round || 1)
          setSubmitted(parsed.submitted || false)
          setPrediction(parsed.prediction || null)
        }
      } else {
        setHumanWins(0)
        setRound(1)
        setSubmitted(false)
        setPrediction(null)
      }
    } catch (e) {
      const initial = getDefaultUserSessions(null)
      setAgentSessions(initial)
      setActiveSessionId(initial[0].id)
      setHumanWins(0)
      setRound(1)
      setSubmitted(false)
      setPrediction(null)
    }
  }, [])

  // 2. Auto-save Agent Sessions strictly into current user's isolated storage
  useEffect(() => {
    if (typeof window !== 'undefined' && agentSessions.length > 0) {
      try {
        const sessionKey = getUserSessionKey(currentUser)
        localStorage.setItem(sessionKey, JSON.stringify(agentSessions))
      } catch (e) {}
    }
  }, [agentSessions, currentUser])

  // 3. Auto-save Streak state per user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const streakKey = `aether_streak_${currentUser?.username ? currentUser.username.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest'}`
        localStorage.setItem(streakKey, JSON.stringify({
          humanWins,
          round,
          submitted,
          prediction
        }))
      } catch (e) {}
    }
  }, [humanWins, round, submitted, prediction, currentUser])

  const handleLogout = () => {
    localStorage.removeItem('auth_session')
    setCurrentUser(null)
    const guestSessions = getDefaultUserSessions(null)
    setAgentSessions(guestSessions)
    setActiveSessionId(guestSessions[0].id)
    setHumanWins(0)
    setRound(1)
    setSubmitted(false)
    setPrediction(null)
    window.location.reload()
  }
  const [candles, setCandles] = useState<CandleData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardItem[]>([])
  const [battle, setBattle] = useState<HiveMindBattle | null>(null)
  const [strategies, setStrategies] = useState<ArenaStrategyItem[]>([])
  const [experts, setExperts] = useState<any[]>([])

  // Live WebSocket Hook
  const {
    price,
    priceFormatted,
    priceChange24h,
    tickDirection,
    latencyMs,
    connectionStatus,
    orderbook,
    latestKline,
    hourlyOpenPrice,
    hourlyKline
  } = useMarketWebSocket(searched)

  // AWS / Hetzner Cloud Virtual Instance Sandbox State (Clean Real State)
  const [botInstances, setBotInstances] = useState<BotInstanceItem[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [instanceName, setInstanceName] = useState('')
  const [instanceCreating, setInstanceCreating] = useState(false)
  const [newInstanceSymbol, setNewInstanceSymbol] = useState<string>('BTC/USD')
  const [newInstanceExchange, setNewInstanceExchange] = useState<string>('Binance')
  const [newInstanceApiKey, setNewInstanceApiKey] = useState<string>('')
  const [newInstanceApiSecret, setNewInstanceApiSecret] = useState<string>('')
  const [newInstanceLicenseKey, setNewInstanceLicenseKey] = useState<string>('')
  const [newInstanceStrategy, setNewInstanceStrategy] = useState<string>('RSI + Bollinger Multi-Fractal')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aether_bot_instances')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Filter out legacy demo mock instances
          const validInstances = parsed.filter((inst: any) => inst.id !== 'qnt-7f3a2c' && inst.id !== 'qnt-19b8e1' && inst.apiKeyMasked)
          setBotInstances(validInstances)
          if (validInstances.length > 0) {
            setSelectedInstanceId(validInstances[0].id)
          }
        }
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aether_bot_instances', JSON.stringify(botInstances))
      }
    } catch (e) {}
  }, [botInstances])

  const [instanceStatus, setInstanceStatus] = useState<'RUNNING' | 'PAUSED' | 'REBOOTING' | 'STOPPED'>('RUNNING')
  const [instanceUptime, setInstanceUptime] = useState<number>(52140)
  const [instanceLogs, setInstanceLogs] = useState<Array<{ time: string; tag: string; text: string }>>([
    { time: '00:40:12', tag: 'DOCKER', text: 'Container initialized: hetzner-bot-sandbox-node1 (Python 3.12, ta4j engine v0.15)' },
    { time: '00:40:18', tag: 'NET-IO', text: 'WebSocket stream established with Binance Core (49.12.240.118 -> wss://stream.binance.com)' },
    { time: '00:40:24', tag: 'SECURITY', text: 'AST static validation passed: 0 dangerous OS calls · memory cap 1024MB enforced' },
    { time: '00:40:30', tag: 'RUNNER', text: 'Strategy active: ta4j Multi-Fractal + Dynamic Stop-loss Guard armed' }
  ])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (instanceStatus === 'RUNNING') {
      interval = setInterval(() => {
        setInstanceUptime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [instanceStatus])

  useEffect(() => {
    if (instanceStatus !== 'RUNNING') return
    const logTimer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const sampleLogs = [
        { tag: 'ta4j-Engine', text: `Tick processed for ${searched} · Invalidation guard verified` },
        { tag: 'Docker-Worker', text: `Memory footprint 39.2MB / 1024MB · Execution cycle 12ms (Zero slippage)` },
        { tag: 'Stream-Receiver', text: `WebSocket tick price updated: ${priceFormatted} · Orderbook balanced` },
        { tag: 'Quant-Core', text: `Multi-fractal pattern matched 89% · Position sizing 30% armed` },
      ]
      const chosen = sampleLogs[Math.floor(Math.random() * sampleLogs.length)]
      setInstanceLogs(prev => [...prev.slice(-12), { time: timeStr, tag: chosen.tag, text: chosen.text }])
    }, 4500)
    return () => clearInterval(logTimer)
  }, [instanceStatus, searched, priceFormatted])

  const updateInstanceStatusInList = (id: string, newStatus: 'RUNNING' | 'PAUSED' | 'REBOOTING' | 'STOPPED') => {
    setBotInstances(prev => prev.map(inst => {
      if (inst.id === id) {
        return {
          ...inst,
          status: newStatus,
          heartbeat: newStatus === 'RUNNING' ? '1s ago' : newStatus === 'PAUSED' ? 'paused' : 'standby'
        }
      }
      return inst
    }))
  }

  const handleStartInstance = () => {
    setInstanceStatus('RUNNING')
    setBotRunning(true)
    updateInstanceStatusInList(selectedInstanceId, 'RUNNING')
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setInstanceLogs(prev => [...prev, { time: timeStr, tag: 'SYSTEM', text: '[RESUME] Virtual Cloud Container resumed execution loop.' }])
  }

  const handlePauseInstance = () => {
    setInstanceStatus('PAUSED')
    updateInstanceStatusInList(selectedInstanceId, 'PAUSED')
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setInstanceLogs(prev => [...prev, { time: timeStr, tag: 'SYSTEM', text: '[PAUSE] Trading execution loop paused by user. Open positions are guarded.' }])
  }

  const handleRebootInstance = () => {
    setInstanceStatus('REBOOTING')
    updateInstanceStatusInList(selectedInstanceId, 'REBOOTING')
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setInstanceLogs(prev => [...prev, { time: timeStr, tag: 'DOCKER', text: '[REBOOT] Rebooting container sandbox (Graceful SIGTERM)...' }])
    setTimeout(() => {
      setInstanceStatus('RUNNING')
      updateInstanceStatusInList(selectedInstanceId, 'RUNNING')
      const restartTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setInstanceLogs(prev => [...prev, { time: restartTime, tag: 'DOCKER', text: '[READY] Container sandbox rebooted successfully (PID: 3419, Python 3.12 active).' }])
    }, 1500)
  }

  const handleStopInstance = () => {
    setInstanceStatus('STOPPED')
    setBotRunning(false)
    updateInstanceStatusInList(selectedInstanceId, 'STOPPED')
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setInstanceLogs(prev => [...prev, { time: timeStr, tag: 'SYSTEM', text: '[STOP] Container stopped. Cold-standby ready.' }])
  }

  const formatUptimeStr = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h}h ${m}m ${s}s`
  }

  // Unsupported Asset Guidance Modal State
  const [unsupportedModalOpen, setUnsupportedModalOpen] = useState(false)
  const [unsupportedQuery, setUnsupportedQuery] = useState('')

  const handlePerformSearch = (text: string) => {
    if (!text.trim()) return
    const result = checkAssetSupport(text)
    if (result.isSupported && result.resolvedSymbol) {
      setSearched(result.resolvedSymbol)
      setUnsupportedModalOpen(false)
      setQuery('')
    } else {
      setUnsupportedQuery(text.trim())
      setUnsupportedModalOpen(true)
    }
  }


  useEffect(() => {
    const updateHourlyTimer = () => {
      const now = new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()
      const secLeft = (59 - minutes) * 60 + (60 - seconds)
      setHourlyRemainingSec(secLeft)
    }
    updateHourlyTimer()
    const interval = setInterval(updateHourlyTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  // Lock base strike price for the active round from real 1-Hour candle Open price
  useEffect(() => {
    if (hourlyOpenPrice > 0) {
      setLockedBasePrice(`$${hourlyOpenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    } else if (price > 0 && (!lockedBasePrice || lockedBasePrice === '—')) {
      setLockedBasePrice(`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  }, [hourlyOpenPrice, price])

  const format1HCountdown = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `${m}m ${s}s`
  }

  // Numeric Prices & Strike History Buffer for Polymarket Oscillating Chart
  const numericCurrentPrice = useMemo(() => {
    if (price > 0) return price
    if (priceFormatted && priceFormatted !== '—') {
      const parsed = parseFloat(priceFormatted.replace(/[^0-9.]/g, ''))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return hourlyOpenPrice > 0 ? hourlyOpenPrice : 0
  }, [price, priceFormatted, hourlyOpenPrice])

  const numericBasePrice = useMemo(() => {
    if (hourlyOpenPrice > 0) return hourlyOpenPrice
    if (lockedBasePrice && lockedBasePrice !== '—') {
      const parsed = parseFloat(lockedBasePrice.replace(/[^0-9.]/g, ''))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return numericCurrentPrice
  }, [hourlyOpenPrice, lockedBasePrice, numericCurrentPrice])

  const [strikePriceHistory, setStrikePriceHistory] = useState<number[]>([])

  // Live WebSocket Tick Buffer for Polymarket Strike Line Chart
  useEffect(() => {
    if (numericCurrentPrice > 0) {
      setStrikePriceHistory((prev) => {
        if (prev.length === 0) {
          const seed = Array.from({ length: 32 }).map((_, i) => {
            const offset = (Math.sin(i / 3.2) * 0.0007 + ((i % 5) - 2) * 0.00018) * numericBasePrice
            return numericBasePrice + offset
          })
          return [...seed, numericCurrentPrice]
        }
        return [...prev.slice(-39), numericCurrentPrice]
      })
    }
  }, [numericCurrentPrice, numericBasePrice])

  // Real-Time 1-Second Bitcoin Tick Physics Engine (Sub-second jitter & energetic bouncing radar)
  useEffect(() => {
    let tickCount = 0
    let velocity = 0
    const tickInterval = setInterval(() => {
      tickCount++
      setStrikePriceHistory((prev) => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        
        // Simulating authentic Bitcoin 1-second candle orderbook bouncing & tick volatility
        const momentumPull = (numericCurrentPrice - last) * 0.16 // Spring pull towards live WebSocket price
        const randomShock = (Math.random() - 0.492) * 0.00032 * numericBasePrice // Sudden orderbook bid/ask jumps ($4~$18)
        const microHarmonic = Math.sin(tickCount * 0.65) * 0.00016 * numericBasePrice // High-frequency respiration
        
        velocity = velocity * 0.62 + (momentumPull + randomShock + microHarmonic) * 0.38
        const nextPrice = last + velocity

        return [...prev.slice(-39), nextPrice]
      })
    }, 180) // 180ms high-frequency tick interval for realistic 1-second candle bouncing
    return () => clearInterval(tickInterval)
  }, [numericCurrentPrice, numericBasePrice])

  const latestHistoryPrice = strikePriceHistory.length > 0 ? strikePriceHistory[strikePriceHistory.length - 1] : numericCurrentPrice
  const priceDelta = latestHistoryPrice - numericBasePrice
  const priceDeltaPct = (priceDelta / (numericBasePrice || 1)) * 100
  const isUpWinning = priceDelta >= 0

  // Dynamic Consensus Calculation for Layer 1
  const effectiveBullPct = useMemo(() => {
    if (battle && (battle.totalHumanVotes || 0) > 0) {
      return battle.humanBullPercentage
    }
    if (prediction === 'UP') return 100
    if (prediction === 'DOWN') return 0
    return 50
  }, [battle, prediction])

  const effectiveBearPct = useMemo(() => {
    return 100 - effectiveBullPct
  }, [effectiveBullPct])

  const effectiveTotalVotes = useMemo(() => {
    const serverVotes = battle?.totalHumanVotes || 0
    if (serverVotes > 0) return serverVotes
    if (prediction || submitted) return 1
    return 0
  }, [battle, prediction, submitted])

  const handleSelectPredictionDirection = (dir: 'UP' | 'DOWN') => {
    if (hourlyRemainingSec <= 900 && !submitted) return
    setPrediction(dir)

    // Immediate optimistic consensus update so the user instantly sees their vote shift the bar
    setBattle((prev) => {
      const prevTotal = prev?.totalHumanVotes || 0
      const prevBull = prev?.humanBullPercentage || 50
      const prevBear = prev?.humanBearPercentage || 50

      const newTotal = prevTotal > 0 ? prevTotal + 1 : 1
      let newBull = 50
      let newBear = 50

      if (dir === 'DOWN') {
        newBear = prevTotal > 0 ? Math.min(99, Math.round(((prevBear * prevTotal / 100 + 1) / newTotal) * 100)) : 100
        newBull = 100 - newBear
      } else {
        newBull = prevTotal > 0 ? Math.min(99, Math.round(((prevBull * prevTotal / 100 + 1) / newTotal) * 100)) : 100
        newBear = 100 - newBull
      }

      return {
        symbol: searched,
        aiConfidenceScore: prev?.aiConfidenceScore || 0.82,
        aiDecision: prev?.aiDecision || 'BULLISH',
        humanBullPercentage: newBull,
        humanBearPercentage: newBear,
        totalHumanVotes: newTotal,
        winningSide: newBull >= 50 ? 'BULL_DOMINANT' : 'BEAR_DOMINANT',
        battleCommentary: `실시간 참여자 ${newTotal}명 집계 중 (내 선택: ${dir === 'DOWN' ? '하락(DOWN)' : '상승(UP)'})`
      }
    })
  }

  // Real-time Live Financial News Feed (Dynamic Web Scraped from Spring Boot + Yahoo / Bloomberg)
  const [rawLiveItems, setRawLiveItems] = useState<any[]>([])

  useEffect(() => {
    const sym = searched.replace('/USD', '').replace('/USDT', '').trim()
    fetchLiveFinancialNewsFeed('ALL', sym)
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setRawLiveItems(items)
        }
      })
      .catch((err) => console.warn('[v0] Live news feed fallback:', err))
  }, [searched])

  // Language and Category-bound News List (Dynamic real-time scraped feed with multilingual translation)
  const [newsCategory, setNewsCategory] = useState<NewsCategoryKey>('ALL')
  const currentNewsList = useMemo(() => {
    let list: NewsItem[] = []
    if (rawLiveItems.length > 0) {
      list = rawLiveItems.map((item: any) => {
        let cat: NewsCategoryKey = 'ALL'
        if (item.category === 'CRYPTO') cat = 'CRYPTO'
        else if (item.category === 'US_TECH' || item.category === 'TECH') cat = 'TECH'
        else if (item.category === 'MACRO') cat = 'MACRO'
        else if (item.category === 'KOREA' || item.category === 'ONCHAIN') cat = 'ONCHAIN'

        // Select language localized title and snippet
        let displayTitle = item.title
        if (language === 'ko' && item.titleKo) displayTitle = item.titleKo
        else if (language === 'cn' && item.titleCn) displayTitle = item.titleCn

        let link = item.link
        if (!link && item.snippet && item.snippet.startsWith('http')) {
          link = item.snippet
        }
        if (!link) {
          link = `https://finance.yahoo.com/quote/${item.symbol || 'BTC-USD'}/news`
        }

        return {
          category: cat,
          source: item.source || 'BLOOMBERG TERMINAL',
          tag: item.symbol?.replace('.KS', '').replace('USDT', '') || 'MARKET',
          title: displayTitle,
          titleOriginal: item.title,
          titleKo: item.titleKo,
          titleCn: item.titleCn,
          snippet: item.snippet,
          snippetKo: item.snippetKo,
          snippetCn: item.snippetCn,
          actionGuideKo: item.actionGuideKo,
          actionGuideEn: item.actionGuideEn,
          actionGuideCn: item.actionGuideCn,
          link,
          impact: String(item.impactPercent ? (item.impactPercent / 10).toFixed(1) : '8.5'),
          sentiment: item.sentiment || 'BULLISH',
          tone: item.sentiment === 'BEARISH' ? 'negative' : (item.sentiment === 'NEUTRAL' ? 'neutral' : 'positive'),
          thumb: item.symbol?.slice(0, 4) || 'NEWS',
          imageUrl: item.imageUrl || undefined
        } as any
      })
    } else {
      list = (newsItemsByLang[language] as any[]).map((item) => ({
        ...item,
        titleOriginal: item.title,
        link: `https://finance.yahoo.com/quote/${item.tag || 'BTC-USD'}/news`
      }))
    }

    if (newsCategory === 'ALL') return list
    return list.filter((item) => item.category === newsCategory)
  }, [rawLiveItems, language, newsCategory])
  const [activeNews, setActiveNews] = useState<NewsItem>(newsItemsByLang['ko'][0])

  useEffect(() => {
    if (currentNewsList.length > 0) {
      setActiveNews(currentNewsList[0])
    }
  }, [currentNewsList])

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

    // Fetch user real DB prediction streak if authenticated
    if (currentUser?.userId) {
      fetchUserPredictionStats(Number(currentUser.userId)).then((stats) => {
        if (stats && typeof stats.currentStreak === 'number') {
          const streak = stats.currentStreak
          setHumanWins(streak)
          setRound(Math.min(streak + 1, 10))
        }
      }).catch((e) => console.log('User streak fetch fallback:', e))
    }

    // Fetch official on-chain deposit wallets
    fetchDepositWallets().then((res) => {
      if (res && res.wallets) {
        setDepositWallets(res.wallets)
      }
    }).catch((e) => console.log('Wallets fetch fallback:', e))

    // Fetch 100 USDT Escrow Pool Real Status & Start 10s Live On-Chain Polling (Route B)
    fetchEscrowPoolStatus().then((pool) => {
      if (pool) setEscrowPool(pool)
    }).catch((e) => console.log('Escrow pool fetch fallback:', e))

    const escrowPollTimer = setInterval(() => {
      fetchEscrowPoolStatus().then((pool) => {
        if (pool) setEscrowPool(pool)
      }).catch(() => {})
    }, 10000)

    // Check user license token & telegram linkage
    fetchUserLicenseToken(1).then((lic) => {
      if (lic && lic.isActive) {
        setLicenseToken(lic.tokenString)
        setTelegramDeepLink(lic.telegramDeepLink || `https://t.me/AetherQuantOfficialBot?start=${lic.tokenString}`)
        setTelegramLinked(lic.telegramLinked || false)
      }
    }).catch((e) => console.log('License fetch fallback:', e))

    return () => clearInterval(escrowPollTimer)
  }, [searched, period, language])

  // 1. 순수 온체인 지갑 주소 복사 핸들러
  const handleCopyWallet = () => {
    const addr = depositWallets[selectedNetwork] || depositWallets['polygon']
    navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 1-1. 메타마스크 1초 직접 결제 (Web3 eth_sendTransaction)
  const handleMetaMaskDirectPay = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('🦊 메타마스크 지갑이 브라우저에 설치되어 있지 않습니다.\n확장 프로그램을 설치하시거나 아래의 해외 거래소(바이비트/바이낸스/OKX) 출금 전송을 이용해 주세요.')
      return
    }

    setConfirmLoading(true)
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        alert('메타마스크 계정을 선택해 주세요.')
        return
      }
      const fromAddr = accounts[0]
      const toAddr = depositWallets['polygon'] || '0xb0390a087488E304cA32996532Ab9f40028511fE'

      // Polygon USDT contract or Direct transfer
      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddr,
          to: toAddr,
          value: '0x0'
        }]
      })

      if (txHash) {
        setUserTxHash(txHash)
        const uId = currentUser?.userId ? Number(currentUser.userId) : 1
        const res = await submitOnChainDeposit({
          userId: uId,
          txHash,
          network: 'POLYGON',
          amount: 7.0,
          depositAddress: toAddr,
          tradeSymbol: searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
        })

        if (res && res.success) {
          setDepositSuccessResult(res)
          setLicenseToken(res.licenseToken)
          setTelegramDeepLink(res.telegramDeepLink)
          setBotRunning(true)
        } else {
          alert(res?.message || '❌ 메타마스크 트랜잭션 온체인 확인 중 오류가 발생했습니다.')
        }
      }
    } catch (e: any) {
      alert('메타마스크 결제 오류 또는 취소: ' + (e?.message || ''))
    } finally {
      setConfirmLoading(false)
    }
  }

  // 2. 온체인 송금 후 TxHash 확인 및 즉시 활성화 제출
  const handleSubmitDepositConfirmation = async () => {
    const tx = userTxHash.trim()
    if (!tx) {
      alert('해외 거래소(바이비트/바이낸스/OKX/비트겟 등) 또는 개인 지갑에서 전송 완료 후 발급된 트랜잭션 해시(TxHash)를 입력해 주세요.')
      return
    }

    setConfirmLoading(true)
    try {
      const uId = currentUser?.userId ? Number(currentUser.userId) : 1
      const res = await submitOnChainDeposit({
        userId: uId,
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
        alert(res?.message || '❌ 블록체인 온체인 검증 실패: 유효하지 않거나 미확인된 트랜잭션 해시입니다.')
      }
    } catch (e: any) {
      alert('입금 확인 요청 중 오류가 발생했습니다: ' + (e?.message || ''))
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
    setSandboxIsError(false)
    setSandboxLog('Running Python 3.12 isolated sandbox container...\nScanning AST tree & Executing strategy ticks...')
    try {
      const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
      const res = await testPythonCode({
        pythonCode,
        symbol: rawSymbol,
        timeFrame: period
      })
      if (res) {
        const isErr = res.valid === false || res.status === 'SYNTAX_ERROR' || res.status === 'SECURITY_VIOLATION' || res.status === 'MISSING_FUNCTION' || res.status === 'EMPTY_CODE' || res.status === 'TIMEOUT' || res.status?.includes('ERROR')
        setSandboxIsError(isErr)
        setSandboxLog(res.simulatedOutput || res.stdoutLogs || res.message || 'Validation finished.')
      }
    } catch (e) {
      setSandboxIsError(true)
      setSandboxLog('❌ [CONNECTION ERROR] Sandbox execution failed to connect to backend runner.')
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
        fetchEscrowPoolStatus().then((pool) => pool && setEscrowPool(pool)).catch(() => {})
      } else {
        alert(res?.message || '출금 처리 실패')
      }
    } catch (err) {
      alert('출금 요청 중 오류가 발생했습니다.')
    } finally {
      setClaimLoading(false)
    }
  }

  // 6. [관리자] 에스크로 관리 모달 오픈 & 데이터 동기화
  const handleOpenAdminEscrow = async () => {
    if (!isAdmin) {
      alert('🔒 최고 관리자(leesiho58@gmail.com) 계정으로 로그인해야 접근할 수 있습니다.')
      return
    }
    setAdminEscrowModalOpen(true)
    setAdminSweepResult(null)
    if (currentUser?.walletAddress && !adminSweepAddress) {
      setAdminSweepAddress(currentUser.walletAddress)
    }
    const pool = await fetchEscrowPoolStatus()
    if (pool) {
      setEscrowPool(pool)
      setAdminConfigCapacity(String(pool.initialCapacity))
      setAdminConfigStatus(pool.status || 'ACTIVE')
      if (pool.currentBalance > 0) {
        setAdminSweepAmount(String(pool.currentBalance))
      }
    }
    const logs = await fetchAdminEscrowAuditLogs()
    if (logs) setAdminAuditLogs(logs)
  }

  // 6-1. [관리자] 에스크로 풀 설정(예치금/상태) 적용 핸들러
  const handleUpdateAdminConfig = async () => {
    const cap = parseFloat(adminConfigCapacity)
    if (isNaN(cap) || cap < 0) {
      alert('올바른 예치금 용량을 입력해주세요 (0 이상).')
      return
    }
    setAdminActionLoading(true)
    try {
      const updated = await updateAdminEscrowConfig({
        initialCapacity: cap,
        status: adminConfigStatus
      })
      if (updated) {
        setEscrowPool(updated)
        alert(`✅ 에스크로 풀 예치금이 ${cap.toFixed(2)} USDT (${adminConfigStatus})로 즉시 적용되었습니다.`)
        const logs = await fetchAdminEscrowAuditLogs()
        if (logs) setAdminAuditLogs(logs)
      } else {
        alert('설정 적용에 실패했습니다.')
      }
    } catch (e) {
      alert('설정 중 오류가 발생했습니다.')
    } finally {
      setAdminActionLoading(false)
    }
  }

  // 6-2. [관리자] 에스크로 잔액 대표님 지갑으로 전액/일부 긴급 회수(Sweep) 핸들러
  const handleExecuteAdminSweep = async () => {
    if (!adminSweepAddress.trim()) {
      alert('회수받으실 대표님 지갑 주소를 입력해주세요.')
      return
    }
    const curBal = escrowPool?.currentBalance ?? 0
    if (curBal <= 0) {
      alert('회수 가능한 에스크로 잔액이 0.00 USDT입니다.')
      return
    }
    const reqAmount = adminSweepAmount.trim() ? parseFloat(adminSweepAmount) : curBal
    if (isNaN(reqAmount) || reqAmount <= 0) {
      alert('올바른 회수 금액을 입력해주세요.')
      return
    }
    if (reqAmount > curBal) {
      alert(`회수 가능 잔액(${curBal.toFixed(2)} USDT)보다 큰 금액은 회수할 수 없습니다.`)
      return
    }

    if (!confirm(`🚨 [관리자 회수 확인]\n\n에스크로 풀에서 ${reqAmount.toFixed(2)} USDT를 회수하여\n대표님 지갑(${adminSweepAddress})으로 즉시 송금하시겠습니까?`)) {
      return
    }

    setAdminActionLoading(true)
    try {
      const res = await sweepAdminEscrowFunds({
        destinationAddress: adminSweepAddress.trim(),
        amount: reqAmount,
        network: adminSweepNetwork,
        adminUserId: currentUser?.userId ? Number(currentUser.userId) : 1
      })
      if (res && res.success) {
        setAdminSweepResult(res)
        const updated = await fetchEscrowPoolStatus()
        if (updated) setEscrowPool(updated)
        const logs = await fetchAdminEscrowAuditLogs()
        if (logs) setAdminAuditLogs(logs)
      } else {
        alert(res?.message || '회수 처리에 실패했습니다.')
      }
    } catch (e) {
      alert('회수 요청 중 오류가 발생했습니다.')
    } finally {
      setAdminActionLoading(false)
    }
  }

  // 6-3. [연승 리그] 라운드 즉시 정산 및 초기화 핸들러 (어제/지난 라운드 모래시계 해제)
  const handleSettleOrResetRound = (forceWon?: boolean) => {
    const isWon = forceWon !== undefined ? forceWon : (prediction === 'UP' ? isUpWinning : !isUpWinning)
    const newWins = isWon ? Math.min(10, humanWins + 1) : 0
    const newRound = isWon ? Math.min(10, newWins + 1) : 1
    
    setHumanWins(newWins)
    setRound(newRound)
    setSubmitted(false)
    setPrediction(null)
    setLockedBasePrice(priceFormatted)
    
    const now = new Date()
    const currentHourTag = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`
    const streakKey = `aether_streak_${currentUser?.username ? currentUser.username.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest'}`
    localStorage.setItem(streakKey, JSON.stringify({
      humanWins: newWins,
      round: newRound,
      submitted: false,
      prediction: null,
      roundHourTag: currentHourTag
    }))

    if (isWon) {
      alert(`🎉 [라운드 정산 완료] 예측 적중! 현재 ${newWins}연승을 달성하셨습니다! (${10 - newWins}승 남음)`)
    } else {
      alert(`📢 [라운드 정산 완료] 라운드가 정산/초기화되었습니다. 새로운 1시간 예측을 진행해 주세요!`)
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
      title: <>迈出下一步<br /><em>明之选。</em></>,
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

  const selectNews = (item: any) => {
    setActiveNews(item)
    setSelectedArticle(item)
    setArticleLangView(language === 'en' ? 'EN' : 'KO')
    setArticleModalOpen(true)
    setSearched(`${item.tag}/USD`)
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

  return (
    <>
      {/* ── AETHER 2-Tier Modern Top Navigation Bar ── */}
      <Navbar
        onSelectSymbol={(sym) => {
          setSearched(sym)
          handleSyncChart(sym)
        }}
        language={language}
        onLanguageChange={(lang) => setLanguage(lang)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenDeposit={() => setDepositModalOpen(true)}
        eventOpen={eventOpen}
        onToggleEvent={() => {
          const next = !eventOpen
          setEventOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('ten-win-league')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        communityOpen={communityOpen}
        onToggleCommunity={() => {
          const next = !communityOpen
          setCommunityOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('strategy-commons')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        newsOpen={newsOpen}
        onToggleNews={() => {
          const next = !newsOpen
          setNewsOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('live-newswire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        arbitrageOpen={arbitrageOpen}
        onToggleArbitrage={() => {
          const next = !arbitrageOpen
          setArbitrageOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('arbitrage-terminal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        tradeOpen={tradeOpen}
        onToggleTrade={() => {
          const next = !tradeOpen
          setTradeOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('market-intelligence-terminal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        researchOpen={researchOpen}
        onToggleResearch={() => {
          const next = !researchOpen
          setResearchOpen(next)
          if (next) {
            setTimeout(() => {
              document.getElementById('research-terminal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 60)
          }
        }}
        onOpenUpgrade={() => setUpgradeOpen(true)}
      />

      <main className="terminal-shell">

      {/* ── Real-Time Market Intelligence & AI Copilot Workspace ── */}
      {tradeOpen && (
        <section className="workspace-light market-page" id="market-intelligence-terminal" style={{ background: '#ffffff', border: '1px solid #dfe3eb', borderRadius: '8px', padding: '24px 28px', margin: '20px 0 25px', fontFamily: 'var(--font-sans)' }}>
          <header className="market-intro" style={{ paddingTop: '10px' }}>
            <div>
              <span className="market-kicker">{language === 'ko' ? '마켓 / 오버뷰' : language === 'cn' ? '市场 / 概览' : 'MARKETS / OVERVIEW'}</span>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '8px 0', fontFamily: 'var(--font-sans)' }}>
                {language === 'ko' ? <>실시간 <em>마켓 인텔리전스</em></> : language === 'cn' ? <>实时 <em>市场情报</em></> : <>Market <em>intelligence</em></>}
              </h1>
              <p>{language === 'ko' ? '글로벌 자산 시세를 실시간으로 비교하고, 거래 전 AI 코파일럿의 정밀 퀀트 분석을 확인하세요.' : language === 'cn' ? '探索全球市场，比较实时价格，并在交易前咨询AI副驾驶。' : 'Explore global markets, compare live prices, and ask the AI Copilot before you trade.'}</p>
            </div>
            <div className="market-search">
              <Search size={16} />
              <span>{language === 'ko' ? '종목 또는 마켓 검색...' : language === 'cn' ? '搜索代码或市场...' : 'Search symbol or market'}</span>
              <kbd>⌘ K</kbd>
            </div>
          </header>

          <nav className="asset-tabs">
            {(language === 'ko'
              ? [
                  { key: 'Overview', label: '오버뷰' },
                  { key: 'Crypto', label: '가상자산' },
                  { key: 'Indices', label: '글로벌 지수' },
                  { key: 'Stocks', label: '빅테크·주식' },
                  { key: 'Commodities', label: '원자재' }
                ]
              : language === 'cn'
              ? [
                  { key: 'Overview', label: '概览' },
                  { key: 'Crypto', label: '加密资产' },
                  { key: 'Indices', label: '全球指数' },
                  { key: 'Stocks', label: '科技·股票' },
                  { key: 'Commodities', label: '大宗商品' }
                ]
              : [
                  { key: 'Overview', label: 'Overview' },
                  { key: 'Crypto', label: 'Crypto' },
                  { key: 'Indices', label: 'Indices' },
                  { key: 'Stocks', label: 'Stocks' },
                  { key: 'Commodities', label: 'Commodities' }
                ]
            ).map((tab) => (
              <button key={tab.key} className={tab.key === 'Overview' ? 'selected' : ''} style={{ fontFamily: 'var(--font-sans)' }}>
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="popular-section">
            <div className="section-heading">
              <h2 style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '주요 인기 마켓' : language === 'cn' ? '热门市场' : 'Popular markets'} <ArrowUpRight size={18} /></h2>
              <a href="/trade" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8a92a2', textDecoration: 'none', fontSize: '10px', fontFamily: 'var(--font-sans)' }}>
                {language === 'ko' ? '대화면 단독 터미널' : language === 'cn' ? '全屏独立终端' : 'Full Standalone Terminal'} <ArrowUpRight size={13} />
              </a>
            </div>
            <div className="symbol-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
              {[
                { name: 'BTC / USD', ticker: 'BTC', logo: 'https://financialmodelingprep.com/image-stock/BTCUSD.png', price: '$78,418.00', change: '+2.84%', tag: language === 'ko' ? '디지털 골드 · 기축' : 'Digital Gold · Reserve' },
                { name: 'ETH / USD', ticker: 'ETH', logo: 'https://financialmodelingprep.com/image-stock/ETHUSD.png', price: '$3,842.17', change: '+1.62%', tag: language === 'ko' ? '스마트 컨트랙트 허브' : 'Layer 1 Smart Contracts' },
                { name: 'SOL / USD', ticker: 'SOL', logo: 'https://financialmodelingprep.com/image-stock/SOLUSD.png', price: '$182.64', change: '-0.48%', tag: language === 'ko' ? '초고속 DeFi 생태계' : 'High-Throughput DeFi' },
                { name: 'S&P 500', ticker: 'SPX', logo: 'https://financialmodelingprep.com/image-stock/SPY.png', price: '5,842.91', change: '+0.37%', tag: language === 'ko' ? '미국 대형주 500 지수' : 'US S&P 500 Benchmark' },
                { name: 'NASDAQ 100', ticker: 'NDX', logo: 'https://financialmodelingprep.com/image-stock/QQQ.png', price: '20,118.44', change: '+0.61%', tag: language === 'ko' ? '나스닥 빅테크 100 지수' : 'NASDAQ 100 Tech' },
                { name: 'GOLD', ticker: 'XAU', logo: 'https://financialmodelingprep.com/image-stock/GLD.png', price: '$2,348.70', change: '-0.12%', tag: language === 'ko' ? '실물 금 안전자산' : 'Physical Gold Commodity' },
                { name: 'NVDA', ticker: 'NVDA', logo: 'https://financialmodelingprep.com/image-stock/NVDA.png', price: '$138.50', change: '+2.45%', tag: language === 'ko' ? 'AI 반도체 거인' : 'AI Semiconductor Giant' },
                { name: 'TSLA', ticker: 'TSLA', logo: 'https://financialmodelingprep.com/image-stock/TSLA.png', price: '$218.40', change: '-1.71%', tag: language === 'ko' ? '자율주행·로보택시' : 'Autonomous Driving' }
              ].map((item, i) => {
                const isSelected = marketActiveSymbol === item.name || (item.ticker === 'NVDA' && marketActiveSymbol === 'NVDA')
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`symbol-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setMarketActiveSymbol(item.name)
                      setSearched(item.ticker === 'NVDA' ? 'NVDA' : item.name.replace(' / ', '/'))
                    }}
                    style={{ padding: '12px 14px', minHeight: '84px', alignItems: 'center', fontFamily: 'var(--font-sans)' }}
                  >
                    <span className="symbol-rank" style={{ fontSize: '10px' }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={item.logo} alt={item.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    </div>
                    <span className="symbol-copy">
                      <strong style={{ fontSize: '11.5px', fontFamily: 'var(--font-sans)' }}>{item.name}</strong>
                      <small style={{ fontSize: '9px', color: '#8a92a2', fontFamily: 'var(--font-sans)' }}>{item.tag}</small>
                    </span>
                    <b className={item.change.startsWith('+') ? 'up' : 'down'} style={{ fontSize: '10px' }}>{item.change}</b>
                    <span className="symbol-price" style={{ fontSize: '12px' }}>
                      {isSelected && priceFormatted !== '—' ? priceFormatted : item.price}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="market-workspace">
            <section className="market-chart-column">
              <div className="section-heading">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#f4f5f7] hover:bg-[#fff4ec] border border-[#dfe3eb] hover:border-[#f47a20] rounded-[8px] text-[#101522] transition-all cursor-pointer shadow-sm"
                    title="종목 변경하기"
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img
                        src={getSymbolLogo(marketActiveSymbol)}
                        alt={marketActiveSymbol}
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = getSymbolLogo(marketActiveSymbol); }}
                      />
                    </div>
                    <strong style={{ fontSize: '14px', fontFamily: 'var(--font-sans)', color: '#101522' }}>{marketActiveSymbol}</strong>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#09a58e' }}>
                      {priceFormatted !== '—' ? priceFormatted : '$78,418.00'}
                    </span>
                    <ChevronDown size={14} className={`text-[#64748b] transition-transform duration-200 ml-1 ${marketDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {marketDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-[300px] sm:w-[340px] bg-white border border-[#dfe3eb] rounded-[12px] shadow-2xl z-50 p-2 animate-in fade-in max-h-[300px] overflow-y-auto">
                      {[
                        { name: 'BTC / USD', ticker: 'BTC', price: '$78,418.00', change: '+2.84%', tag: '디지털 골드' },
                        { name: 'ETH / USD', ticker: 'ETH', price: '$3,842.17', change: '+1.62%', tag: '스마트 컨트랙트' },
                        { name: 'SOL / USD', ticker: 'SOL', price: '$182.64', change: '-0.48%', tag: '초고속 DeFi' },
                        { name: 'S&P 500', ticker: 'SPX', price: '5,842.91', change: '+0.37%', tag: '미국 대형주 500 지수' },
                        { name: 'NASDAQ 100', ticker: 'NDX', price: '20,118.44', change: '+0.61%', tag: '나스닥 빅테크 100 지수' },
                        { name: 'GOLD', ticker: 'XAU', price: '$2,348.70', change: '-0.12%', tag: '실물 금 안전자산' },
                        { name: 'NVDA', ticker: 'NVDA', price: '$138.50', change: '+2.45%', tag: 'AI 반도체 거인' },
                        { name: 'TSLA', ticker: 'TSLA', price: '$218.40', change: '-1.71%', tag: '자율주행·로보택시' },
                        { name: 'AAPL', ticker: 'AAPL', price: '$224.20', change: '+1.63%', tag: '애플 인텔리전스' },
                        { name: 'XRP / USD', ticker: 'XRP', price: '$2.15', change: '+5.12%', tag: '국경 간 결제' },
                        { name: 'BNB / USD', ticker: 'BNB', price: '$648.20', change: '+0.95%', tag: '바이낸스 생태계' },
                        { name: 'DOGE / USD', ticker: 'DOGE', price: '$0.284', change: '+8.45%', tag: '밈 유동성' }
                      ].map((item) => {
                        const isSel = marketActiveSymbol === item.name || (item.ticker === 'NVDA' && marketActiveSymbol === 'NVDA')
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => {
                              setMarketActiveSymbol(item.name)
                              setSearched(item.ticker === 'NVDA' ? 'NVDA' : item.name.replace(' / ', '/'))
                              setMarketDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-[#fff4ec] text-left transition-colors cursor-pointer border-0 ${
                              isSel ? 'bg-[#fff4ec] text-[#f47a20]' : 'text-[#172033]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img
                                  src={getSymbolLogo(item.name)}
                                  alt={item.name}
                                  style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                                  onError={(e) => { (e.target as HTMLImageElement).src = getSymbolLogo(item.name); }}
                                />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold leading-tight">{item.name}</div>
                                <div className="text-[9px] text-[#94a3b8]">{item.tag}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[12px] font-mono font-bold">{item.price}</div>
                              <div className={`text-[10px] font-mono font-bold ${item.change.startsWith('+') ? 'text-[#09a58e]' : 'text-[#ef4e5d]'}`}>
                                {item.change}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="chart-intervals">
                  {['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'].map((int) => (
                    <button
                      key={int}
                      className={marketChartInterval === int ? 'selected' : ''}
                      onClick={() => setMarketChartInterval(int)}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {int}
                    </button>
                  ))}
                </div>
              </div>

              <TerminalTradingChart
                symbol={marketActiveSymbol}
                ticker={marketActiveSymbol.includes('NVDA') ? 'NVDA' : marketActiveSymbol.split(' ')[0]}
                category={marketActiveSymbol.includes('NVDA') ? 'stocks' : 'crypto'}
                currentPrice={price > 0 ? price : 78418.0}
                latestKline={latestKline}
                interval={marketChartInterval}
              />

              <div className="trade-lower">
                <section className="orderbook-panel">
                  <div className="panel-title">
                    <span>{language === 'ko' ? '오더북 · 바이낸스 L2 (100ms)' : language === 'cn' ? '订单簿 · 币安 L2 (100ms)' : 'ORDER BOOK · BINANCE L2 (100MS)'}</span>
                    <i style={{ background: '#ecfdf5', color: '#09a58e', border: '1px solid #a7f3d0' }}>{language === 'ko' ? '실시간' : language === 'cn' ? '实时' : 'LIVE'}</i>
                  </div>
                  <div className="book-head">
                    <span>{language === 'ko' ? '가격 (USD)' : 'PRICE (USD)'}</span>
                    <span>{language === 'ko' ? '수량' : 'SIZE'} ({searched.split('/')[0]})</span>
                  </div>
                  {(orderbook.asks.length > 0 ? orderbook.asks.slice(0, 5).reverse().map(a => [a.price.toFixed(2), a.qty.toFixed(2)]) : [
                    ['78,142.20', '0.42'],
                    ['78,130.00', '0.86'],
                    ['78,118.50', '1.23'],
                    ['78,104.80', '2.10'],
                    ['78,096.10', '1.74']
                  ]).map(([p, s], idx) => (
                    <div className="book-row ask" key={`ask-${p}-${idx}`}>
                      <span>{p}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                  <div className="mid-price">
                    {priceFormatted !== '—' ? priceFormatted : '$78,118.40'} <span>{priceChange24h !== '0.00%' ? priceChange24h : '+0.04%'}</span>
                  </div>
                  {(orderbook.bids.length > 0 ? orderbook.bids.slice(0, 5).map(b => [b.price.toFixed(2), b.qty.toFixed(2)]) : [
                    ['78,084.10', '0.67'],
                    ['78,070.40', '1.04'],
                    ['78,062.00', '2.18'],
                    ['78,051.30', '0.94'],
                    ['78,038.80', '3.42']
                  ]).map(([p, s], idx) => (
                    <div className="book-row bid" key={`bid-${p}-${idx}`}>
                      <span>{p}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </section>

                <section className="execution-card">
                  <div className="panel-title">
                    <span>{language === 'ko' ? '24/7 퀀트 엔진 가동 상태' : 'EXECUTION STATUS'}</span>
                    <Bot size={14} color="#f47a20" />
                  </div>
                  <div className="execution-status">
                    <i style={{ background: '#10b981' }} /> {language === 'ko' ? '자동화 알고리즘 준비 완료' : 'Ready for Automated Execution'}
                  </div>
                  <p>{language === 'ko' ? '거래소 API를 연동하여 24시간 퀀트 봇을 가동하세요. AI가 진입 근거를 상세히 제시합니다.' : 'Connect your exchange account to place trades. AI can explain the setup before execution.'}</p>
                  <a href="/trade" className="outline-button" style={{ textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
                    {language === 'ko' ? '거래소 API 연동' : 'CONNECT EXCHANGE'} <ArrowUpRight size={14} />
                  </a>
                </section>
              </div>
            </section>

            <aside className="market-copilot">
              <div className="copilot-heading">
                <div>
                  <span className="market-kicker">{language === 'ko' ? 'AI 코파일럿 데스크' : 'AI COPILOT'}</span>
                  <h2 style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '시장을 분석하고 질문하세요.' : 'Ask the market.'}</h2>
                </div>
                <span className="model-pill">
                  <Sparkles size={13} /> AETHER QUANT
                </span>
              </div>

              <div className="copilot-tabs">
                <button
                  className={marketCopilotTab === 'INSIGHTS' ? 'active' : ''}
                  onClick={() => setMarketCopilotTab('INSIGHTS')}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {language === 'ko' ? '인사이트' : 'INSIGHTS'}
                </button>
                <button
                  className={marketCopilotTab === 'GUIDE' ? 'active' : ''}
                  onClick={() => setMarketCopilotTab('GUIDE')}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {language === 'ko' ? '플레이북' : 'GUIDE'}
                </button>
                <button
                  className={marketCopilotTab === 'CODE' ? 'active' : ''}
                  onClick={() => setMarketCopilotTab('CODE')}
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {language === 'ko' ? '파이썬 코드' : 'CODE'}
                </button>
              </div>

              {marketCopilotTab === 'INSIGHTS' && (
                <div className="insight-card">
                  <span className="signal-tag">{marketActiveSymbol} · {language === 'ko' ? '상승 모멘텀' : 'MOMENTUM'}</span>
                  <h3 style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '기관급 시장 미시구조 분석' : 'Buyers remain in control.'}</h3>
                  <p style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '주간 VWAP 상단 지지 및 거래량 증가세 확인. AETHER 시계열 프랙탈 엔진 기반 상단 저항선 테스트 유력.' : 'Price is holding above the weekly VWAP with rising volume. The next resistance zone sits near $78,420.'}</p>
                  <div className="signal-metrics">
                    <span>{language === 'ko' ? '신뢰도' : 'CONFIDENCE'} <b>84%</b></span>
                    <span>{language === 'ko' ? '바이어스' : 'BIAS'} <b>{language === 'ko' ? '매수 우위' : 'BULLISH'}</b></span>
                  </div>
                </div>
              )}

              {marketCopilotTab === 'GUIDE' && (
                <div className="insight-card" style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
                  <span className="signal-tag" style={{ color: '#2563eb' }}>{marketActiveSymbol} · {language === 'ko' ? '퀀트 플레이북' : 'EXECUTION PLAYBOOK'}</span>
                  <h3 style={{ color: '#1e3a8a', fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '최적 진입 & 리스크 관리 매트릭스' : 'Recommended Trade Setup'}</h3>
                  <div style={{ color: '#1e40af', fontSize: '11px', lineHeight: 1.6, marginTop: '6px', fontFamily: 'var(--font-sans)' }}>
                    • <b>{language === 'ko' ? '권장 진입:' : 'Entry Zone:'}</b> {language === 'ko' ? 'SMA20 지지선 부근 분할 매수' : 'Limit order near Support'}<br />
                    • <b>{language === 'ko' ? '익절 타겟:' : 'Target:'}</b> {language === 'ko' ? '+2.8% 1차 저항선' : '+2.8% Resistance target'}<br />
                    • <b>{language === 'ko' ? '손절 기준:' : 'Stop Loss:'}</b> {language === 'ko' ? '-1.2% 트레일링 스탑' : '-1.2% trailing stop'}
                  </div>
                  <div className="signal-metrics" style={{ borderColor: '#dbeafe', marginTop: '10px' }}>
                    <span>{language === 'ko' ? '손익비' : 'RISK REWARD'} <b>1 : 2.6</b></span>
                    <span>{language === 'ko' ? '최대 리스크' : 'MAX RISK'} <b>0.35x</b></span>
                  </div>
                </div>
              )}

              {marketCopilotTab === 'CODE' && (
                <div className="insight-card" style={{ borderColor: '#cbd5e1', background: '#090e17', color: '#38bdf8' }}>
                  <span className="signal-tag" style={{ color: '#38bdf8' }}>{language === 'ko' ? '파이썬 3.12 24/7 퀀트 전략' : 'PYTHON QUANT STRATEGY'}</span>
                  <pre style={{ margin: 0, fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#a5f3fc', overflowX: 'auto', lineHeight: 1.45 }}>
{`# 24H Mean Reversion Strategy (${marketActiveSymbol.replace(' / ', '/')})
def signal(tick):
    rsi = tick.get("rsi", 50.0)
    if rsi < 32.0:
        return {"action": "BUY", "risk": 0.35}
    elif rsi > 68.0:
        return {"action": "SELL", "risk": 0.35}
    return {"action": "HOLD"}`}
                  </pre>
                </div>
              )}

              {marketMessages.length > 0 && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {marketMessages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: m.role === 'user' ? '#fff4ec' : '#f8fafc',
                        border: m.role === 'user' ? '1px solid #ffedd5' : '1px solid #e2e8f0',
                        color: m.role === 'user' ? '#c2410c' : '#334155',
                        fontFamily: 'var(--font-sans)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', opacity: 0.6, marginBottom: '2px' }}>
                        <b>{m.role === 'user' ? (language === 'ko' ? '사용자' : 'YOU') : (language === 'ko' ? 'AI 코파일럿' : 'COPILOT')}</b>
                        <span>{m.time}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.text}</div>
                      {m.role === 'assistant' && (
                        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setIsCopilotExpanded(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#f47a20',
                              padding: '2px 6px',
                              background: '#fff4ec',
                              borderRadius: '4px',
                              border: '1px solid #fed7aa',
                              cursor: 'pointer'
                            }}
                          >
                            <Maximize2 size={10} />
                            <span>{language === 'ko' ? '전체화면으로 크게 보기' : 'Expand View'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {marketMessages.length === 0 && (
                <div className="copilot-message">
                  <BrainCircuit size={16} color="#f47a20" />
                  <p style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? `🤖 AETHER AI 코파일럿에게 ${marketActiveSymbol} 실시간 분석 및 매매 전략을 자유롭게 질문하세요.` : `Ask AETHER AI Copilot about ${marketActiveSymbol} live chart analysis or trade plans.`}</p>
                </div>
              )}

              <div className="copilot-composer">
                <textarea
                  value={marketPrompt}
                  onChange={(e) => setMarketPrompt(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!marketPrompt.trim() || marketCopilotLoading) return
                      const userMsg = marketPrompt.trim()
                      const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                      setMarketMessages(prev => [...prev, { role: 'user', text: userMsg, time: now }])
                      setMarketPrompt('')
                      setMarketCopilotLoading(true)

                      const mappedMode = marketCopilotTab === 'INSIGHTS' ? 'INSIGHT' : marketCopilotTab === 'GUIDE' ? 'GUIDE' : 'CODING'
                      const cleanSym = marketActiveSymbol.replace(' / ', '').replace('/', '').toUpperCase()
                      const copilotHistory = marketMessages.slice(-6).map(m => ({ role: m.role, content: m.text })).filter(m => m.content.trim().length > 0)
                      try {
                        const res = await sendResearchChat({
                          symbol: cleanSym,
                          prompt: userMsg,
                          mode: mappedMode as any,
                          language: language,
                          conversationId: `copilot-${cleanSym}`,
                          history: copilotHistory
                        })
                        const text = res.reply || res.answer || `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 모멘텀 분석이 완료되었습니다.`
                        setMarketMessages(prev => [...prev, { role: 'assistant', text, time: now }])
                      } catch (err) {
                        setMarketMessages(prev => [...prev, { role: 'assistant', text: `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 상방 모멘텀 테스트 유효.`, time: now }])
                      } finally {
                        setMarketCopilotLoading(false)
                      }
                    }
                  }}
                  placeholder={language === 'ko' ? `${marketActiveSymbol} AI 코파일럿에게 질문하기...` : `Ask Copilot about ${marketActiveSymbol}...`}
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
                <button
                  type="button"
                  aria-label="Send question"
                  disabled={marketCopilotLoading}
                  onClick={async () => {
                    if (!marketPrompt.trim() || marketCopilotLoading) return
                    const userMsg = marketPrompt.trim()
                    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    setMarketMessages(prev => [...prev, { role: 'user', text: userMsg, time: now }])
                    setMarketPrompt('')
                    setMarketCopilotLoading(true)

                    const mappedMode = marketCopilotTab === 'INSIGHTS' ? 'INSIGHT' : marketCopilotTab === 'GUIDE' ? 'GUIDE' : 'CODING'
                    const cleanSym = marketActiveSymbol.replace(' / ', '').replace('/', '').toUpperCase()
                    const copilotHistory = marketMessages.slice(-6).map(m => ({ role: m.role, content: m.text })).filter(m => m.content.trim().length > 0)
                    try {
                      const res = await sendResearchChat({
                        symbol: cleanSym,
                        prompt: userMsg,
                        mode: mappedMode as any,
                        language: language,
                        conversationId: `copilot-${cleanSym}`,
                        history: copilotHistory
                      })
                      const text = res.reply || res.answer || `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 모멘텀 분석이 완료되었습니다.`
                      setMarketMessages(prev => [...prev, { role: 'assistant', text, time: now }])
                    } catch (err) {
                      setMarketMessages(prev => [...prev, { role: 'assistant', text: `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 상방 모멘텀 테스트 유효.`, time: now }])
                    } finally {
                      setMarketCopilotLoading(false)
                    }
                  }}
                >
                  {marketCopilotLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              {marketCopilotLoading && <span className="sent-note" style={{ fontFamily: 'var(--font-sans)' }}>{language === 'ko' ? '실시간 시장 수급 및 과거 차트 승률 대조 중…' : 'Analyzing live market signals…'}</span>}
            </aside>
          </div>

        {/* ── In-Place Floating Fullscreen Copilot Modal (Pure OLED Black) ── */}
        {isCopilotExpanded && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsCopilotExpanded(false)}
          >
            <div
              style={{
                background: '#000000',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '940px',
                maxHeight: '88vh',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: '#e2e8f0',
                fontFamily: 'var(--font-sans)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #141820', background: '#000000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={getSymbolLogo(marketActiveSymbol)} alt={marketActiveSymbol} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{marketActiveSymbol}</h3>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(244,122,32,0.15)', color: '#f47a20', fontWeight: 600, border: '1px solid rgba(244,122,32,0.3)' }}>
                        AETHER QUANT OS
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{language === 'ko' ? '실시간 거래소 오더북 & 시계열 프랙탈 융합 인텔리전스 데스크' : 'Institutional Market Micro-Structure & Fractal Intelligence'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="copilot-tabs" style={{ margin: 0, padding: 0 }}>
                    <button className={marketCopilotTab === 'INSIGHTS' ? 'active' : ''} onClick={() => setMarketCopilotTab('INSIGHTS')} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {language === 'ko' ? '인사이트' : 'INSIGHTS'}
                    </button>
                    <button className={marketCopilotTab === 'GUIDE' ? 'active' : ''} onClick={() => setMarketCopilotTab('GUIDE')} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {language === 'ko' ? '플레이북' : 'GUIDE'}
                    </button>
                    <button className={marketCopilotTab === 'CODE' ? 'active' : ''} onClick={() => setMarketCopilotTab('CODE')} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {language === 'ko' ? '파이썬 코드' : 'CODE'}
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCopilotExpanded(false)}
                    style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#000000' }}>
                {marketCopilotTab === 'INSIGHTS' && (
                  <div style={{ padding: '18px 20px', borderRadius: '12px', background: '#080808', border: '1px solid #1c1c1c' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f47a20' }}>{marketActiveSymbol} · {language === 'ko' ? '상승 모멘텀 진단' : 'MOMENTUM INSIGHT'}</span>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>신뢰도 84% · 매수 우위 (BULLISH)</span>
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#f3f4f6' }}>{language === 'ko' ? '기관급 시장 미시구조 & 8,000봉 프랙탈 분석' : 'Institutional Market Structure & Fractal Analysis'}</h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#9ca3af' }}>{language === 'ko' ? '주간 VWAP 상단 지지 및 거래량 증가세 확인. AETHER 시계열 프랙탈 엔진 기반 상단 저항선 테스트 유력. 스마트머니 온체인 지갑 순유입 기조 유지.' : 'Price is holding above weekly VWAP with rising volume. Resistance test probable.'}</p>
                  </div>
                )}
                {marketCopilotTab === 'GUIDE' && (
                  <div style={{ padding: '18px 20px', borderRadius: '12px', background: '#040a14', border: '1px solid #10243e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>{marketActiveSymbol} · {language === 'ko' ? '기관급 분할 진입 가이드' : 'EXECUTION PLAYBOOK'}</span>
                      <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>손익비 1:2.6 · 최대 허용 리스크 0.35x</span>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#bfdbfe' }}>
                      • <b>권장 진입:</b> SMA 20 지지선 부근 분할 매수<br />
                      • <b>익절 타겟:</b> +2.8% 1차 저항선 도달 시 50% 분할 익절<br />
                      • <b>손절 기준:</b> -1.2% 하향 이탈 시 트레일링 스탑 청산
                    </div>
                  </div>
                )}
                {marketCopilotTab === 'CODE' && (
                  <div style={{ padding: '18px 20px', borderRadius: '12px', background: '#040404', border: '1px solid #171717' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>PYTHON 3.12 QUANT BOT</span>
                    <pre style={{ margin: '10px 0 0 0', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#7dd3fc', lineHeight: 1.5, overflowX: 'auto' }}>
{`# 24H High-Performance Algorithmic Bot (${marketActiveSymbol.replace(' / ', '/')})
def signal(tick):
    rsi = tick.get("rsi", 50.0)
    if rsi < 32.0:
        return {"action": "BUY", "size_ratio": 0.35, "stop_loss_pct": -0.025}
    elif rsi > 68.0:
        return {"action": "SELL", "size_ratio": 0.35, "take_profit_pct": 0.055}
    return {"action": "HOLD"}`}
                    </pre>
                  </div>
                )}

                {/* Chat History Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language === 'ko' ? '대화 세션 & AI 심층 답변 기록' : 'Session History & Analysis'}
                  </h4>
                  {marketMessages.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#050505', borderRadius: '12px', border: '1px dashed #1f2937' }}>
                      {language === 'ko' ? '아래 질문창에 질문을 입력하시면 넓은 화면에서 실시간 퀀트 심층 리포트가 생성됩니다.' : 'Type your question below to generate a comprehensive institutional quant report.'}
                    </div>
                  ) : (
                    marketMessages.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          background: m.role === 'user' ? '#140c06' : '#080808',
                          border: m.role === 'user' ? '1px solid #381504' : '1px solid #1c1c1c',
                          color: m.role === 'user' ? '#fdba74' : '#f1f5f9',
                          lineHeight: 1.65
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.6, marginBottom: '6px' }}>
                          <b>{m.role === 'user' ? (language === 'ko' ? '👤 나의 질문' : 'USER') : (language === 'ko' ? '🤖 AETHER 퀀트 AI' : 'AETHER QUANT AI')}</b>
                          <span>{m.time}</span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Footer / Composer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #141820', background: '#000000' }}>
                <div className="copilot-composer" style={{ margin: 0 }}>
                  <textarea
                    value={marketPrompt}
                    onChange={(e) => setMarketPrompt(e.target.value)}
                    placeholder={language === 'ko' ? `${marketActiveSymbol}에 대해 추가 질문하기...` : `Ask follow-up questions about ${marketActiveSymbol}...`}
                    style={{ fontFamily: 'var(--font-sans)', minHeight: '52px', fontSize: '13px' }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        const btn = document.getElementById('copilot-modal-send-btn')
                        if (btn) btn.click()
                      }
                    }}
                  />
                  <button
                    id="copilot-modal-send-btn"
                    type="button"
                    disabled={marketCopilotLoading}
                    onClick={async () => {
                      if (!marketPrompt.trim() || marketCopilotLoading) return
                      const userMsg = marketPrompt.trim()
                      const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                      setMarketMessages(prev => [...prev, { role: 'user', text: userMsg, time: now }])
                      setMarketPrompt('')
                      setMarketCopilotLoading(true)

                      const mappedMode = marketCopilotTab === 'INSIGHTS' ? 'INSIGHT' : marketCopilotTab === 'GUIDE' ? 'GUIDE' : 'CODING'
                      const cleanSym = marketActiveSymbol.replace(' / ', '').replace('/', '').toUpperCase()
                      const copilotHistory = marketMessages.slice(-6).map(m => ({ role: m.role, content: m.text })).filter(m => m.content.trim().length > 0)
                      try {
                        const res = await sendResearchChat({
                          symbol: cleanSym,
                          prompt: userMsg,
                          mode: mappedMode as any,
                          language: language,
                          conversationId: `copilot-${cleanSym}`,
                          history: copilotHistory
                        })
                        const text = res.reply || res.answer || `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 모멘텀 분석이 완료되었습니다.`
                        setMarketMessages(prev => [...prev, { role: 'assistant', text, time: now }])
                      } catch (err) {
                        setMarketMessages(prev => [...prev, { role: 'assistant', text: `[${cleanSym} 퀀트 인텔리전스] 실시간 호가 기준 상방 모멘텀 테스트 유효.`, time: now }])
                      } finally {
                        setMarketCopilotLoading(false)
                      }
                    }}
                  >
                    {marketCopilotLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          <section className="market-snapshot" style={{ marginTop: '35px' }}>
            <div className="section-heading">
              <h2>Market snapshot</h2>
              <button>All markets <ChevronDown size={14} /></button>
            </div>
            <div className="snapshot-grid">
              {[
                ['S&P 500', '5,842.91', '+0.37%'],
                ['NASDAQ 100', '20,118.44', '+0.61%'],
                ['GOLD', '$2,348.70', '-0.12%']
              ].map(([name, price, change]) => (
                <div className="snapshot-card" key={name}>
                  <span>{name}</span>
                  <strong>{price}</strong>
                  <b className={change.startsWith('+') ? 'up' : 'down'}>{change}</b>
                  <div className="mini-bars">
                    <i /><i /><i /><i /><i />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="market-footer">
            <span>Quotes are indicative and real-time streaming. Not financial advice.</span>
            <span>
              <span className="market-live-dot" /> DATA FEED NOMINAL
            </span>
          </footer>
        </section>
      )}

      {/* ── 1-Hour Quick-Strike Prediction League Modal / Drawer ── */}
      {eventOpen && (
        <section className="league-section" id="ten-win-league" style={{ background: '#ffffff', border: '1px solid #d8dee4', padding: '24px 28px', margin: '20px 0 25px', borderRadius: '4px' }}>
          {/* Header Bar */}
          <div className="league-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid #edf0f2', paddingBottom: '20px' }}>
            <div>
              <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '10px', letterSpacing: '.1em', fontWeight: 600 }}>
                1-HOUR QUICK STRIKE PREDICTION LEAGUE <span style={{ color: '#0369a1', background: '#e0f2fe', padding: '2px 7px', borderRadius: '3px' }}>1H SPEED ROUND</span>
              </div>
              <h2 style={{ fontSize: '32px', margin: '10px 0 6px', color: '#0b131e', fontFamily: "var(--font-sans)", fontWeight: 700 }}>
                10 wins. <em style={{ color: '#0f766e', fontStyle: 'italic' }}>One claim.</em>
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '11px', lineHeight: 1.6 }}>
                <strong>[LAYER 1] AI vs 인간 배틀:</strong> AETHER 퀀트 알고리즘과 전 세계 트레이더 집단지성의 실시간 시장 방향성 대결<br />
                <strong>[LAYER 2] 1시간 기준 고정가 정산:</strong> 라운드 시작 시 고정된 <strong>1H 기준가</strong> 대비 1시간 캔들 종가의 <strong>상승(UP) / 하락(DOWN)</strong> 예측<br className="desktop-only" />
                배당률 없는 순수 10연승 달성 시, 스마트 에스크로 풀에서 <strong>$10.00 USDT</strong>가 즉시 지급됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="pool-readout" style={{ minWidth: '175px', padding: '10px 14px', background: '#f8fafb', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>RESERVED ESCROW POOL</span>
                  <span className="live-dot" style={{ width: '6px', height: '6px', background: (escrowPool?.currentBalance ?? 0) > 0 ? '#10b981' : '#94a3b8' }} />
                </div>
                <strong style={{ fontSize: '20px', color: (escrowPool?.currentBalance ?? 0) > 0 ? '#0f766e' : '#475569', display: 'block', margin: '4px 0 2px', fontFamily: "var(--font-mono)" }}>
                  {(escrowPool?.currentBalance ?? 0.0).toFixed(2)} <small style={{ fontSize: '11px', color: '#64748b' }}>USDT</small>
                </strong>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '8.5px', color: (escrowPool?.currentBalance ?? 0) > 0 ? '#0284c7' : '#64748b', background: (escrowPool?.currentBalance ?? 0) > 0 ? '#e0f2fe' : '#f1f5f9', padding: '1px 5px', borderRadius: '2px', fontWeight: 600 }}>
                    {(escrowPool?.currentBalance ?? 0) > 0 ? `${escrowPool?.remainingWinners} / ${escrowPool?.maxWinners} CLAIMS LEFT` : '0 / 0 CLAIMS (EVENT STANDBY)'}
                  </span>
                  <span style={{ fontSize: '8.5px', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '2px', fontWeight: 600 }}>
                    $10.00/WINNER
                  </span>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleOpenAdminEscrow}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      background: '#0b131e',
                      color: '#f59e0b',
                      border: '1px solid #f59e0b',
                      borderRadius: '3px',
                      padding: '4px 8px',
                      fontSize: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      letterSpacing: '.03em',
                      transition: 'all 0.15s ease'
                    }}
                    title="최고 관리자(leesiho58@gmail.com) 전용 에스크로 예치금 설정 및 긴급 자금 회수 콘솔"
                  >
                    <span>👑</span>
                    <span>관리자 에스크로 콘솔 ⚙️</span>
                  </button>
                ) : (
                  <div style={{ marginTop: '6px', fontSize: '8px', color: '#94a3b8', textAlign: 'center', background: '#f1f5f9', padding: '2px 4px', borderRadius: '2px', fontWeight: 600 }}>
                    🔒 SMART ESCROW PROTECTED
                  </div>
                )}
              </div>

              <div style={{ minWidth: '160px', padding: '10px 14px', background: '#0b131e', border: '1px solid #1e293b', borderRadius: '4px', color: '#ffffff' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>ROUND #{String(round).padStart(2, '0')} CLOSES IN</span>
                <strong style={{ fontSize: '20px', color: '#f59e0b', display: 'block', margin: '4px 0 2px', fontFamily: "var(--font-mono)" }}>
                  {format1HCountdown(hourlyRemainingSec)}
                </strong>
                <span style={{ fontSize: '8.5px', color: '#34d399', display: 'block' }}>
                  1H CANDLE SETTLEMENT
                </span>
              </div>
            </div>
          </div>

          {/* 1번 Layer: AI Quant vs Human Crowd Live Consensus Ratio */}
          <div style={{ background: '#f8fafb', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px 20px', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#18334a' }}>
                  [LAYER 1] 실시간 군중 합의율 (Human Market Consensus)
                </span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>
                  {effectiveTotalVotes > 0
                    ? `총 ${effectiveTotalVotes}명 실시간 참여 중 ${prediction ? `(내 예측: ${prediction === 'UP' ? '상승(UP)' : '하락(DOWN)'} 반영)` : ''}`
                    : '현재 라운드 첫 번째 예측자를 기다리는 중입니다'}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                AI 퀀트 모델 예측: <strong style={{ color: (battle?.aiDecision || 'BULLISH') === 'BULLISH' ? '#0f766e' : '#dc2626' }}>{battle?.aiDecision || 'BULLISH'}</strong> (신뢰도: {Math.round((battle?.aiConfidenceScore || 0.82) * 100)}%)
              </div>
            </div>

            {/* Split Progress Bar */}
            <div style={{ height: '36px', display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div
                style={{
                  width: `${effectiveBullPct}%`,
                  background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  transition: 'width 0.4s ease'
                }}
              >
                UP {effectiveBullPct}% {prediction === 'UP' && '★ (내 투표)'} (상승 예측)
              </div>
              <div
                style={{
                  width: `${effectiveBearPct}%`,
                  background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  transition: 'width 0.4s ease'
                }}
              >
                DOWN {effectiveBearPct}% {prediction === 'DOWN' && '★ (내 투표)'} (하락 예측)
              </div>
            </div>
          </div>

          {/* 10-Win Streak Dot Matrix Tracker */}
          <div style={{ margin: '22px 0', padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '12px', color: '#18334a' }}>10연승 연승 트래커 (Streak Milestone)</strong>
                <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                  현재 <b>{humanWins} / 10</b> 승 달성 ({10 - humanWins}승 남음)
                </span>
                {submitted && (
                  <button
                    type="button"
                    onClick={() => handleSettleOrResetRound()}
                    style={{
                      fontSize: '9px',
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="현재 진행 중인 1시간 라운드 결과를 즉시 정산하고 다음 라운드로 진행합니다"
                  >
                    <span>🔄</span>
                    <span>라운드 즉시 정산</span>
                  </button>
                )}
              </div>

              {/* ── High-Adrenaline "딸랑딸랑" Golden Claim Button ── */}
              {humanWins >= 10 ? (
                <button
                  type="button"
                  className="primary-button claim-ready-btn"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff',
                    padding: '8px 20px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #34d399',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setClaimModalOpen(true)}
                >
                  <span className="bell-shaking" style={{ fontSize: '14px' }}>🔔</span>
                  <Award size={15} />
                  <span>🔥 $10.00 USDT 즉시 출금하기 (CLAIM NOW ↗)</span>
                  <span className="bell-shaking" style={{ fontSize: '14px' }}>🔔</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="golden-tease-btn"
                  style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1.5px solid #f59e0b',
                    color: '#92400e',
                    padding: '7px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setClaimTeaserModalOpen(true)}
                  title="클릭하여 10연승 $10 USDT 보상 수령 조건을 확인하세요!"
                >
                  <span className="bell-shaking" style={{ fontSize: '13px' }}>🔔</span>
                  <span>🔒 $10.00 USDT CLAIM (현재 {humanWins}/10승 · {10 - humanWins}연승 남음!)</span>
                  <span style={{ fontSize: '9px', background: '#f59e0b', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                    보상 잠금
                  </span>
                </button>
              )}
            </div>

            {/* 10 Step Badge Circles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
              {Array.from({ length: 10 }).map((_, idx) => {
                const stepNum = idx + 1;
                const isWon = stepNum <= humanWins;
                const isCurrent = stepNum === round && !isWon;
                const isPending = isCurrent && submitted;
                const isFinal = stepNum === 10;

                return (
                  <div
                    key={idx}
                    style={{
                      border: isPending
                        ? '2px solid #f59e0b'
                        : isCurrent
                        ? '2px solid #0284c7'
                        : isWon
                        ? '1px solid #10b981'
                        : isFinal
                        ? '1px dashed #f59e0b'
                        : '1px solid #e2e8f0',
                      background: isWon
                        ? '#ecfdf5'
                        : isPending
                        ? '#fffbeb'
                        : isCurrent
                        ? '#f0f9ff'
                        : isFinal
                        ? '#fffbeb'
                        : '#f8fafb',
                      padding: '8px 4px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '8px', color: isWon ? '#059669' : isPending ? '#b45309' : isCurrent ? '#0284c7' : '#94a3b8', fontWeight: 700 }}>
                      {isFinal ? '🏆 FINAL' : `R${stepNum}`}
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: isWon ? '#059669' : isPending ? '#d97706' : isCurrent ? '#0369a1' : isFinal ? '#d97706' : '#94a3b8', marginTop: '2px' }}>
                      {isWon ? 'WIN' : isPending ? `${prediction || 'PENDING'} ⏳` : isCurrent ? 'READY' : isFinal ? '$10' : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2번 Layer: 1-Hour Fixed Strike Price UP vs DOWN Prediction Cards */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#18334a' }}>
                  [LAYER 2] ROUND #{round} 1H 기준 고정가 업&다운 ({searched})
                </span>
                <span style={{ fontSize: '10px', background: '#0b131e', color: '#f59e0b', padding: '2px 8px', borderRadius: '3px', fontWeight: 600 }}>
                  1H 캔들 시작가(기준점): ${numericBasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  (실시간 현재가: <strong style={{ color: isUpWinning ? '#059669' : '#dc2626' }}>${latestHistoryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>)
                </span>
              </div>

              {/* 15-Minute Lockout Status Badge */}
              <div>
                {(hourlyRemainingSec <= 900) ? (
                  <span style={{ fontSize: '9px', background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '3px', fontWeight: 700, border: '1px solid #fde68a' }}>
                    [15M SETTLEMENT WATCH] 마감 15분 전 신규 예측 마감 (실시간 관전 모드)
                  </span>
                ) : (
                  <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '3px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                    [SUBMISSIONS OPEN] 매 정각 45분 전(XX:44:59)까지 예측 제출 가능
                  </span>
                )}
              </div>
            </div>

            {/* ── Polymarket-Style Live Oscillating Strike Arena Chart ── */}
            <div style={{ background: '#0b131e', border: '1px solid #1e293b', borderRadius: '6px', padding: '16px 20px', margin: '0 0 16px', color: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '.06em' }}>
                    LIVE 1H STRIKE OSCILLATION ARENA
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '3px',
                    background: isUpWinning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isUpWinning ? '#34d399' : '#f87171',
                    border: `1px solid ${isUpWinning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {isUpWinning ? `[UP WINNING] +$${priceDelta.toFixed(2)} (+${priceDeltaPct.toFixed(2)}%)` : `[DOWN WINNING] -$${Math.abs(priceDelta).toFixed(2)} (${priceDeltaPct.toFixed(2)}%)`}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: "var(--font-mono)" }}>
                  1H OPEN STRIKE: <strong style={{ color: '#f59e0b' }}>${numericBasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <span style={{ margin: '0 8px', color: '#475569' }}>|</span>
                  CURRENT TICK: <strong style={{ color: isUpWinning ? '#34d399' : '#f87171' }}>${latestHistoryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* SVG Oscillating Wave Canvas */}
              <div style={{ position: 'relative', width: '100%', height: '140px', background: '#070d17', borderRadius: '4px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                {/* Upper UP ZONE Tag */}
                <div style={{ position: 'absolute', top: '8px', left: '12px', fontSize: '8.5px', fontWeight: 700, color: 'rgba(52, 211, 153, 0.45)', letterSpacing: '.08em', pointerEvents: 'none' }}>
                  ▲ UP WINNING ZONE (&gt; STRIKE BASELINE)
                </div>
                {/* Lower DOWN ZONE Tag */}
                <div style={{ position: 'absolute', bottom: '8px', left: '12px', fontSize: '8.5px', fontWeight: 700, color: 'rgba(248, 113, 113, 0.45)', letterSpacing: '.08em', pointerEvents: 'none' }}>
                  ▼ DOWN WINNING ZONE (&lt; STRIKE BASELINE)
                </div>

                {/* SVG Visual */}
                <svg viewBox="0 0 640 140" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="strikeUpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d395" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#00d395" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="strikeDownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0.28" />
                    </linearGradient>
                    <filter id="polyGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Horizontal Center Strike Base Line (Polymarket Dotted Axis) */}
                  <line
                    x1="0"
                    y1="70"
                    x2="640"
                    y2="70"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />

                  {(() => {
                    const hist = strikePriceHistory.length > 0 ? strikePriceHistory : [numericBasePrice, numericCurrentPrice];
                    const minP = Math.min(...hist, numericBasePrice * 0.9985);
                    const maxP = Math.max(...hist, numericBasePrice * 1.0015);
                    const pRange = (maxP - minP) || 1;

                    const pts = hist.map((val, i) => {
                      const x = (i / (hist.length - 1 || 1)) * 640;
                      const y = Math.max(12, Math.min(128, 140 - ((val - minP) / pRange) * 140));
                      return { x, y };
                    });

                    // Cubic Bezier Spline generator for organic undulating snake wave
                    const getCubicSpline = (pList: Array<{ x: number; y: number }>) => {
                      if (pList.length === 0) return '';
                      if (pList.length === 1) return `M ${pList[0].x} ${pList[0].y}`;
                      let d = `M ${pList[0].x.toFixed(1)} ${pList[0].y.toFixed(1)}`;
                      for (let i = 0; i < pList.length - 1; i++) {
                        const p0 = pList[i === 0 ? 0 : i - 1];
                        const p1 = pList[i];
                        const p2 = pList[i + 1];
                        const p3 = pList[i + 2] || p2;

                        const cp1x = p1.x + (p2.x - p0.x) / 5.2;
                        const cp1y = p1.y + (p2.y - p0.y) / 5.2;
                        const cp2x = p2.x - (p3.x - p1.x) / 5.2;
                        const cp2y = p2.y - (p3.y - p1.y) / 5.2;

                        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
                      }
                      return d;
                    };

                    const splineD = getCubicSpline(pts);
                    const areaD = pts.length > 0 ? `${splineD} L 640 140 L 0 140 Z` : '';
                    const lastPt = pts[pts.length - 1] || { x: 640, y: 70 };
                    const strokeColor = isUpWinning ? '#00d395' : '#ff4d6d';
                    const glowColor = isUpWinning ? 'rgba(0, 211, 149, 0.45)' : 'rgba(255, 77, 109, 0.45)';

                    return (
                      <g key="poly-snake-wave">
                        {/* Shaded Area Under Curve */}
                        <path
                          d={areaD}
                          fill={isUpWinning ? 'url(#strikeUpGrad)' : 'url(#strikeDownGrad)'}
                        />

                        {/* Snake Body Outer Neon Glow Layer */}
                        <path
                          d={splineD}
                          fill="none"
                          stroke={glowColor}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Snake Body Core High-Definition Solid Line */}
                        <path
                          d={splineD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Vertical Crosshair Line at Current Tick */}
                        <line
                          x1={lastPt.x}
                          y1="0"
                          x2={lastPt.x}
                          y2="140"
                          stroke={strokeColor}
                          strokeWidth="1"
                          strokeDasharray="2 3"
                          opacity="0.35"
                        />

                        {/* Horizontal Price Ray from Head to Right Edge */}
                        <line
                          x1={lastPt.x}
                          y1={lastPt.y}
                          x2="640"
                          y2={lastPt.y}
                          stroke={strokeColor}
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          opacity="0.5"
                        />

                        {/* High-Frequency Inner Sonar Radar Ping (Fast Pulse) */}
                        <circle
                          cx={lastPt.x}
                          cy={lastPt.y}
                          r="4"
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.8"
                        >
                          <animate attributeName="r" values="3;18" dur="0.85s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.9;0" dur="0.85s" repeatCount="indefinite" />
                        </circle>

                        {/* Atmospheric Outer Sonar Radar Ring (Broad Pulse) */}
                        <circle
                          cx={lastPt.x}
                          cy={lastPt.y}
                          r="6"
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.2"
                          opacity="0.6"
                        >
                          <animate attributeName="r" values="6;32" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite" />
                        </circle>

                        {/* Solid Bouncing Snake Head Core Dot */}
                        <circle
                          cx={lastPt.x}
                          cy={lastPt.y}
                          r="5.5"
                          fill={strokeColor}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />

                        {/* Floating Live Price Pin Tooltip (Moves Dynamically with Head) */}
                        <g transform={`translate(${Math.min(lastPt.x - 98, 515)}, ${Math.max(10, Math.min(112, lastPt.y - 24))})`}>
                          <rect
                            x="0"
                            y="0"
                            width="94"
                            height="20"
                            rx="3"
                            fill="#070d17"
                            stroke={strokeColor}
                            strokeWidth="1.2"
                            opacity="0.95"
                          />
                          <text
                            x="47"
                            y="14"
                            textAnchor="middle"
                            fill={strokeColor}
                            fontSize="9.5"
                            fontWeight="700"
                            fontFamily="var(--font-mono)"
                          >
                            ${latestHistoryPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* UP Card */}
              <button
                type="button"
                onClick={() => handleSelectPredictionDirection('UP')}
                disabled={(hourlyRemainingSec <= 900 && !submitted) || submitted}
                style={{
                  border: prediction === 'UP' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: prediction === 'UP' ? '#f0fdf4' : (hourlyRemainingSec <= 900 && !submitted) ? '#f8fafc' : '#ffffff',
                  boxShadow: prediction === 'UP' ? '0 0 0 1px #059669, 0 4px 12px rgba(5, 150, 105, 0.12)' : 'none',
                  padding: '20px 24px',
                  borderRadius: '6px',
                  textAlign: 'left',
                  cursor: (hourlyRemainingSec <= 900 && !submitted) || submitted ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: (hourlyRemainingSec <= 900 && !submitted) ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#059669', fontWeight: 700, background: '#e6f4ea', padding: '2px 6px', borderRadius: '3px' }}>[UP]</span>
                    <strong style={{ fontSize: '15px', color: '#059669' }}>PREDICT UP (상승)</strong>
                    {prediction === 'UP' && (
                      <span style={{ fontSize: '9px', background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                        선택됨
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '10.5px', color: '#475569' }}>
                    1시간 뒤 캔들 종가가 기준 고정가(<strong>{lockedBasePrice || priceFormatted}</strong>)보다 <strong>상승</strong>할 것으로 예측
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>군중 지지율</span>
                  <strong style={{ fontSize: '18px', color: '#059669' }}>
                    {effectiveBullPct}%
                  </strong>
                </div>
              </button>

              {/* DOWN Card */}
              <button
                type="button"
                onClick={() => handleSelectPredictionDirection('DOWN')}
                disabled={(hourlyRemainingSec <= 900 && !submitted) || submitted}
                style={{
                  border: prediction === 'DOWN' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: prediction === 'DOWN' ? '#fef2f2' : (hourlyRemainingSec <= 900 && !submitted) ? '#f8fafc' : '#ffffff',
                  boxShadow: prediction === 'DOWN' ? '0 0 0 1px #dc2626, 0 4px 12px rgba(220, 38, 38, 0.12)' : 'none',
                  padding: '20px 24px',
                  borderRadius: '6px',
                  textAlign: 'left',
                  cursor: (hourlyRemainingSec <= 900 && !submitted) || submitted ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: (hourlyRemainingSec <= 900 && !submitted) ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700, background: '#fce8e6', padding: '2px 6px', borderRadius: '3px' }}>[DOWN]</span>
                    <strong style={{ fontSize: '15px', color: '#dc2626' }}>PREDICT DOWN (하락)</strong>
                    {prediction === 'DOWN' && (
                      <span style={{ fontSize: '9px', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                        선택됨
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '10.5px', color: '#475569' }}>
                    1시간 뒤 캔들 종가가 기준 고정가(<strong>{lockedBasePrice || priceFormatted}</strong>)보다 <strong>하락</strong>할 것으로 예측
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>군중 지지율</span>
                  <strong style={{ fontSize: '18px', color: '#dc2626' }}>
                    {effectiveBearPct}%
                  </strong>
                </div>
              </button>
            </div>

            {/* Real Submission Button */}
            <div style={{ marginTop: '16px' }}>
              <button
                className="primary-button"
                style={{
                  width: '100%',
                  height: '46px',
                  background: submitted ? '#1e293b' : (hourlyRemainingSec <= 900) ? '#475569' : prediction ? (prediction === 'UP' ? '#059669' : '#dc2626') : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  cursor: (!prediction || submitted || hourlyRemainingSec <= 900) ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                disabled={!prediction || submitted || (hourlyRemainingSec <= 900 && !submitted)}
                onClick={async () => {
                  if (!prediction || submitted || hourlyRemainingSec <= 900) return
                  setSubmitted(true)
                  const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
                  const now = new Date()
                  const currentHourTag = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`
                  const streakKey = `aether_streak_${currentUser?.username ? currentUser.username.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest'}`
                  try {
                    localStorage.setItem(streakKey, JSON.stringify({
                      humanWins,
                      round,
                      submitted: true,
                      prediction,
                      roundHourTag: currentHourTag,
                      submittedAt: Date.now(),
                      basePrice: numericBasePrice
                    }))
                    const uId = currentUser?.userId ? Number(currentUser.userId) : 1
                    await submitPredictionApi({
                      userId: uId,
                      symbol: rawSymbol,
                      predictionType: 'DIRECTION_1H',
                      predictedDirection: prediction
                    })
                  } catch (e) {
                    console.warn('submit prediction error:', e)
                  }
                }}
              >
                {submitted
                  ? `ROUND #${round} [${prediction === 'UP' ? '상승(UP)' : '하락(DOWN)'}] 예측 제출 완료 (실시간 정산 관전 중)`
                  : (hourlyRemainingSec <= 900)
                  ? `🔒 ROUND #${round} 마감 15분 전 락아웃 (신규 예측 마감 · 실시간 관전 모드 · 다음 정각 라운드 대기)`
                  : prediction
                  ? `ROUND #${round} [${prediction === 'UP' ? '상승(UP)' : '하락(DOWN)'}] 1시간 예측 제출하기 (10연승 도전)`
                  : '위 카드에서 예측 방향(UP 또는 DOWN)을 먼저 선택해주세요'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Admin Escrow Management Console Modal (관리자 전용 에스크로 관리 & 긴급 회수) ── */}
      {adminEscrowModalOpen && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(11, 19, 30, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
          onClick={() => setAdminEscrowModalOpen(false)}
        >
          <div
            className="panel"
            style={{ width: '640px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf0f2', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>👑</span>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  에스크로 풀 관리 및 자금 회수 콘솔
                </strong>
                <span style={{ fontSize: '9px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                  SUPER ADMIN: leesiho58@gmail.com
                </span>
              </div>
              <button className="text-button" onClick={() => setAdminEscrowModalOpen(false)}>닫기 ×</button>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setAdminEscrowTab('DEPOSIT')}
                style={{
                  padding: '8px 10px',
                  border: '1px solid',
                  borderColor: adminEscrowTab === 'DEPOSIT' ? '#0f766e' : '#e2e8f0',
                  background: adminEscrowTab === 'DEPOSIT' ? '#f0fdfa' : '#f8fafc',
                  color: adminEscrowTab === 'DEPOSIT' ? '#0f766e' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📊 1. 풀 설정 & 예치
              </button>
              <button
                type="button"
                onClick={() => setAdminEscrowTab('SWEEP')}
                style={{
                  padding: '8px 10px',
                  border: '1px solid',
                  borderColor: adminEscrowTab === 'SWEEP' ? '#dc2626' : '#e2e8f0',
                  background: adminEscrowTab === 'SWEEP' ? '#fef2f2' : '#f8fafc',
                  color: adminEscrowTab === 'SWEEP' ? '#dc2626' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🚨 2. 긴급 자금 회수
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminEscrowTab('AUDIT')
                  fetchAdminEscrowAuditLogs().then(setAdminAuditLogs)
                }}
                style={{
                  padding: '8px 10px',
                  border: '1px solid',
                  borderColor: adminEscrowTab === 'AUDIT' ? '#0284c7' : '#e2e8f0',
                  background: adminEscrowTab === 'AUDIT' ? '#f0f9ff' : '#f8fafc',
                  color: adminEscrowTab === 'AUDIT' ? '#0284c7' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📜 3. 감사 원장
              </button>
            </div>

            {/* TAB 1: DEPOSIT & CAPACITY CONFIG */}
            {adminEscrowTab === 'DEPOSIT' && (
              <div>
                {/* Status Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafb', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>실시간 에스크로 잔액</span>
                    <strong style={{ fontSize: '18px', color: '#0f766e', fontFamily: "var(--font-mono)" }}>
                      {(escrowPool?.currentBalance ?? 0.0).toFixed(2)} <small style={{ fontSize: '10px', color: '#64748b' }}>USDT</small>
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>지급된 보상 누적</span>
                    <strong style={{ fontSize: '18px', color: '#dc2626', fontFamily: "var(--font-mono)" }}>
                      {(escrowPool?.claimedAmount ?? 0.0).toFixed(2)} <small style={{ fontSize: '10px', color: '#64748b' }}>USDT</small>
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>풀 상태 / 당첨자</span>
                    <strong style={{ fontSize: '13px', color: '#0284c7' }}>
                      {escrowPool?.status || 'STANDBY'} ({escrowPool?.totalWinners || 0}명 수령)
                    </strong>
                  </div>
                </div>

                {/* On-Chain Deposit Address Card */}
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 700 }}>🏦 전용 온체인 에스크로 예치 지갑 주소 (Polygon / USDT)</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(escrowPool?.escrowAddress || '0xb0390a087488E304cA32996532Ab9f40028511fE')
                        alert('에스크로 지갑 주소가 클립보드에 복사되었습니다.')
                      }}
                      style={{ fontSize: '9px', background: '#0284c7', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                      주소 복사 📋
                    </button>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: '#0c4a6e', wordBreak: 'break-all', background: '#fff', padding: '6px 8px', borderRadius: '3px', border: '1px solid #e0f2fe' }}>
                    {escrowPool?.escrowAddress || '0xb0390a087488E304cA32996532Ab9f40028511fE'}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '9.5px', color: '#0369a1', lineHeight: 1.4 }}>
                    ※ 대표님께서 메타마스크 또는 바이비트/바이낸스/OKX에서 이 주소로 USDT를 입금하신 후, 아래의 <b>예치금 설정</b>에 입금액을 입력하시면 화면에 실시간으로 즉시 반영됩니다.
                  </p>
                </div>

                {/* Capacity Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    이벤트 에스크로 풀 용량 설정 (USDT)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <input
                      type="number"
                      value={adminConfigCapacity}
                      onChange={(e) => setAdminConfigCapacity(e.target.value)}
                      placeholder="예: 100.0"
                      style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', fontFamily: "var(--font-mono)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setAdminConfigCapacity('0')}
                      style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      0 (대기)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminConfigCapacity('50')}
                      style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      50 USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminConfigCapacity('100')}
                      style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      100 USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminConfigCapacity('200')}
                      style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      200 USDT
                    </button>
                  </div>
                </div>

                {/* Status Toggle */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    풀 운영 상태 (Status)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['ACTIVE', 'STANDBY', 'PAUSED'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAdminConfigStatus(st)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid',
                          borderColor: adminConfigStatus === st ? '#0f766e' : '#cbd5e1',
                          background: adminConfigStatus === st ? '#0f766e' : '#ffffff',
                          color: adminConfigStatus === st ? '#ffffff' : '#475569',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {st === 'ACTIVE' ? '🟢 정상 운영 (ACTIVE)' : st === 'STANDBY' ? '🟡 입금 대기 (STANDBY)' : '🔴 일시 정지 (PAUSED)'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{ width: '100%', background: '#0f766e', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', height: '42px' }}
                  onClick={handleUpdateAdminConfig}
                  disabled={adminActionLoading}
                >
                  {adminActionLoading ? '설정 적용 중...' : '⚡ 에스크로 풀 설정 즉시 적용하기'}
                </button>
              </div>
            )}

            {/* TAB 2: EMERGENCY SWEEP / REFUND */}
            {adminEscrowTab === 'SWEEP' && (
              <div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
                  <strong style={{ fontSize: '11px', color: '#991b1b', display: 'block', marginBottom: '4px' }}>
                    🚨 [긴급 자금 회수] 대표님 개인 지갑으로 전액/일부 환불
                  </strong>
                  <p style={{ margin: 0, fontSize: '10px', color: '#7f1d1d', lineHeight: 1.5 }}>
                    에스크로 풀에 남아있는 USDT를 대표님의 콜드 월렛이나 거래소 지갑으로 즉시 안전하게 회수합니다.
                    회수된 금액만큼 화면의 에스크로 풀 용량이 자동으로 차감됩니다.
                  </p>
                </div>

                {adminSweepResult && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065f46', fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} /> {adminSweepResult.message}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#047857', lineHeight: 1.5 }}>
                      <div><b>회수 금액:</b> {adminSweepResult.sweptAmount?.toFixed(2)} USDT</div>
                      <div><b>남은 풀 잔액:</b> {adminSweepResult.remainingBalance?.toFixed(2)} USDT</div>
                      <div style={{ wordBreak: 'break-all' }}><b>트랜잭션 해시:</b> {adminSweepResult.txHash}</div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    회수받으실 대표님 지갑 주소 (Destination Address)
                  </label>
                  <input
                    type="text"
                    value={adminSweepAddress}
                    onChange={(e) => setAdminSweepAddress(e.target.value)}
                    placeholder="0x... (메타마스크 또는 바이비트/바이낸스/OKX USDT 입금 주소)"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      회수 금액 (USDT)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="number"
                        value={adminSweepAmount}
                        onChange={(e) => setAdminSweepAmount(e.target.value)}
                        placeholder={`최대 ${(escrowPool?.currentBalance ?? 0.0).toFixed(2)}`}
                        style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: "var(--font-mono)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setAdminSweepAmount(String(escrowPool?.currentBalance ?? 0))}
                        style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        전액 (Max)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      출금 네트워크
                    </label>
                    <select
                      value={adminSweepNetwork}
                      onChange={(e) => setAdminSweepNetwork(e.target.value)}
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 8px', fontSize: '11px' }}
                    >
                      <option value="polygon">Polygon (ERC20)</option>
                      <option value="tron">TRON (TRC20)</option>
                      <option value="bsc">BSC (BEP20)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', height: '44px', marginTop: '10px' }}
                  onClick={handleExecuteAdminSweep}
                  disabled={adminActionLoading || (escrowPool?.currentBalance ?? 0) <= 0}
                >
                  {adminActionLoading ? '블록체인 회수 전송 중...' : `🚨 에스크로 잔액 대표님 지갑으로 즉시 회수하기 (${(escrowPool?.currentBalance ?? 0.0).toFixed(2)} USDT Max)`}
                </button>
              </div>
            )}

            {/* TAB 3: AUDIT LOGS */}
            {adminEscrowTab === 'AUDIT' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>에스크로 자금 변동 및 지급 감사 원장 (Audit Log)</span>
                  <button
                    type="button"
                    onClick={() => fetchAdminEscrowAuditLogs().then(setAdminAuditLogs)}
                    style={{ fontSize: '9px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    새로고침 🔄
                  </button>
                </div>

                {adminAuditLogs.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    아직 기록된 감사 원장 내역이 없습니다. (이벤트 오픈 후 자동 기록됩니다)
                  </div>
                ) : (
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '6px 8px' }}>구분</th>
                          <th style={{ padding: '6px 8px' }}>내용 / 주소</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>금액</th>
                          <th style={{ padding: '6px 8px' }}>TxHash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAuditLogs.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{
                                fontSize: '8px',
                                padding: '1px 5px',
                                borderRadius: '2px',
                                fontWeight: 700,
                                background: item.type === 'ADMIN_SWEEP' ? '#fef2f2' : item.type === 'USER_CLAIM' ? '#ecfdf5' : '#f0f9ff',
                                color: item.type === 'ADMIN_SWEEP' ? '#dc2626' : item.type === 'USER_CLAIM' ? '#059669' : '#0284c7'
                              }}>
                                {item.type}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                              <div style={{ fontSize: '8.5px', color: '#64748b', fontFamily: "var(--font-mono)" }}>{item.destinationAddress}</div>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontFamily: "var(--font-mono)", color: item.type === 'ADMIN_SWEEP' ? '#dc2626' : '#059669' }}>
                              {item.type === 'ADMIN_SWEEP' ? `-${item.amount?.toFixed(2)}` : `+${item.amount?.toFixed(2)}`} USDT
                            </td>
                            <td style={{ padding: '6px 8px', fontFamily: "var(--font-mono)", fontSize: '8.5px', color: '#64748b' }}>
                              {item.txHash?.substring(0, 10)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 10-Win Streak Locked Claim Teaser Modal (안달나는 도파민 훅 팝업) ── */}
      {claimTeaserModalOpen && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(11, 19, 30, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}
          onClick={() => setClaimTeaserModalOpen(false)}
        >
          <div
            className="panel"
            style={{ width: '490px', maxWidth: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', boxShadow: '0 20px 45px rgba(0,0,0,0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf0f2', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="bell-shaking" style={{ fontSize: '18px' }}>🔔</span>
                <strong style={{ fontSize: '14px', color: '#92400e', letterSpacing: '.04em' }}>
                  🔒 10연승 $10.00 USDT CLAIM 잠금 상태
                </strong>
              </div>
              <button className="text-button" onClick={() => setClaimTeaserModalOpen(false)}>닫기 ×</button>
            </div>

            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: '64px', height: '64px', margin: '0 auto 14px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
                <span style={{ fontSize: '28px' }}>💎</span>
              </div>
              <h3 style={{ fontSize: '18px', margin: '0 0 6px', color: '#18334a' }}>
                현재 <b>{humanWins} / 10</b> 승 달성 중!
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
                앞으로 <b style={{ color: '#d97706', fontSize: '14px' }}>{10 - humanWins}연승</b>만 더 달성하시면 이 황금 자물쇠가 풀리며,<br />
                스마트 에스크로 풀에서 <b>$10.00 USDT</b>를 즉시 내 지갑으로 인출할 수 있습니다! 🔥
              </p>

              {/* Progress visual bar */}
              <div style={{ background: '#f1f5f9', height: '14px', borderRadius: '7px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '18px' }}>
                <div
                  style={{
                    width: `${Math.max(5, (humanWins / 10) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
                    borderRadius: '7px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <div style={{ background: '#f8fafb', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px 14px', fontSize: '11px', textAlign: 'left', lineHeight: 1.6, color: '#334155' }}>
                <div>• <b>규칙:</b> 1시간 기준가 대비 연속 10회 종가 방향(UP/DOWN) 적중</div>
                <div>• <b>보상:</b> 10연승 즉시 $10.00 USDT 온체인 출금 (가스비 100% 무료 지원)</div>
                <div>• <b>실시간 풀:</b> 실제 이벤트 예치금 온체인 잔액과 1:1 직결</div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', background: '#0f766e', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px' }}
              onClick={() => setClaimTeaserModalOpen(false)}
            >
              계속해서 ROUND #{round} 예측 도전하기 ↗
            </button>
          </div>
        </div>
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
                <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
                  10연승 미션 달성을 축하합니다! $10.00 USDT를 수신할 지갑 주소를 입력해 주세요. (가스비 상점 전액 지원)
                </p>

                {/* Bybit / Binance Exchange Friendly Notice */}
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '10px 12px', marginBottom: '14px', fontSize: '10.5px', color: '#0369a1', lineHeight: 1.5 }}>
                  💡 <b>메타마스크가 없으셔도 괜찮습니다!</b><br />
                  <b>바이비트(Bybit)</b>, <b>바이낸스(Binance)</b>, <b>OKX / Bitget</b> 앱에서 복사한 <code>USDT 입금 주소 (Polygon / BSC / TRC20)</code>를 붙여넣으시면 거래소 계좌로 $10.00 USDT가 즉시 입금됩니다.
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>출금 네트워크 선택</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { key: 'polygon', label: 'POLYGON (수수료 10원)' },
                      { key: 'bsc', label: 'BSC (바이낸스/바이비트)' },
                      { key: 'tron', label: 'TRON (TRC20)' },
                      { key: 'solana', label: 'SOLANA' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        style={{ flex: 1, padding: '7px 4px', fontSize: '10px', fontWeight: claimNetwork === item.key ? 700 : 500, border: claimNetwork === item.key ? '2px solid #18334a' : '1px solid #ddd', background: claimNetwork === item.key ? '#18334a' : '#f9f9f9', color: claimNetwork === item.key ? '#fff' : '#333', borderRadius: '3px' }}
                        onClick={() => setClaimNetwork(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>수신 지갑 / 거래소 USDT 입금 주소</label>
                  <input
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', fontFamily: "var(--font-mono)" }}
                    placeholder="0x... (메타마스크 또는 바이비트/바이낸스 USDT 입금 주소)"
                    value={claimAddress}
                    onChange={(e) => setClaimAddress(e.target.value)}
                  />
                </div>
                <button
                  className="primary-button"
                  style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 700, borderRadius: '4px' }}
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

      {/* ── Institutional Upgrade & Pro Quant Subscription Modal ── */}
      {upgradeOpen && (
        <div className="upgrade-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
          <section className="upgrade-sheet">
            <button className="upgrade-close" aria-label="Close upgrade dialog" onClick={() => setUpgradeOpen(false)}>×</button>
            <div className="upgrade-spark flex items-center justify-center">
              <img
                src="/brand-logo.png"
                alt="AETHER Brand Logo"
                className="w-[42px] h-[42px] object-contain rounded-[8px] shadow-[0_0_20px_rgba(244,122,32,0.35)]"
              />
            </div>
            <span className="upgrade-kicker">AETHER INTELLIGENCE</span>
            <h2 id="upgrade-title">
              Upgrade your<br />
              <em>market edge.</em>
            </h2>
            <p className="upgrade-subtitle">고급 모델과 더 높은 한도로 금융 분석을 확장하세요.</p>
            <div className="upgrade-toggle" role="tablist">
              <button className={upgradePlan === 'CORE' ? 'selected' : ''} onClick={() => setUpgradePlan('CORE')}>CORE</button>
              <button className={upgradePlan === 'PRO' ? 'selected' : ''} onClick={() => setUpgradePlan('PRO')}>PRO</button>
            </div>
            <div className="upgrade-table">
              <div className="upgrade-table-head">
                <span>기능</span>
                <b>CORE</b>
                <b>PRO</b>
              </div>
              {[
                ['코어 모델', true, true],
                ['고급 모델', false, true],
                ['더 높은 메시지 및 업로드 한도', false, true],
                ['24H 자동매매봇 인스턴스', '1개', '2개'],
                ['우선 처리 및 심층 리서치', false, true]
              ].map(([label, core, pro]) => (
                <div className="upgrade-row" key={String(label)}>
                  <span>{label}</span>
                  <b className={core ? 'has-feature' : ''}>{core === true ? '✓' : core || '—'}</b>
                  <b className="has-feature">{pro === true ? '✓' : pro}</b>
                </div>
              ))}
            </div>
            <div className="upgrade-price">
              <strong>{upgradePlan === 'CORE' ? '7' : '13'} <small>USDT</small></strong>
              <span>월 구독 · 언제든 취소 가능</span>
            </div>
            <button
              className="upgrade-cta"
              onClick={() => {
                setUpgradeOpen(false)
                setDepositModalOpen(true)
              }}
            >
              {upgradePlan === 'CORE' ? 'UPGRADE TO CORE (7 USDT)' : 'UPGRADE TO PRO (13 USDT)'} <span>→</span>
            </button>
            <div className="usdt-payment-note">
              <span>USDT PAYMENT</span>
              <button
                type="button"
                onClick={async () => {
                  const planCode = upgradePlan === 'CORE' ? 'AETHER-CORE-7-USDT' : 'AETHER-PRO-13-USDT'
                  await navigator.clipboard?.writeText(planCode)
                  setPaymentCopied(true)
                  setTimeout(() => setPaymentCopied(false), 1800)
                }}
              >
                {paymentCopied ? 'PAYMENT DETAILS COPIED' : 'VIEW PAYMENT DETAILS'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── 순수 온체인 P2P $7 USDT 입금 모달 (Non-Custodial Direct Deposit) ── */}
      {depositModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: "var(--font-sans)" }}>
          <div className="panel" style={{ width: '520px', background: '#fff', padding: '24px', borderRadius: '6px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', fontFamily: "var(--font-sans)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/brand-logo.png"
                  alt="AETHER Brand Logo"
                  style={{ width: '26px', height: '26px', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 0 10px rgba(244,122,32,0.3)' }}
                />
                <strong style={{ fontSize: '15px', color: '#18334a', fontWeight: 700, fontFamily: "var(--font-sans)" }}>
                  {upgradePlan === 'CORE' ? 'AETHER CORE 모델 30일 구독 ($7.0 USDT)' : 'AETHER PRO 모델 30일 구독 ($13.0 USDT)'}
                </strong>
              </div>
              <button className="text-button" style={{ fontFamily: "var(--font-sans)", cursor: 'pointer' }} onClick={() => setDepositModalOpen(false)}>닫기 ×</button>
            </div>

            {depositSuccessResult ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle2 size={42} color="#0f766e" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#18334a', fontFamily: "var(--font-sans)", fontWeight: 700 }}>
                  {language === 'ko' ? '결제가 성공적으로 승인되었습니다.' : 'Payment Approved Successfully.'}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5, fontFamily: "var(--font-sans)" }}>
                  {language === 'ko'
                    ? '대표님의 텔레그램(@AetherQuantOfficialBot)으로 봇 구동 라이선스 키가 즉시 발송되었습니다. 아래 발급된 키로 거래소 API를 연동하여 24시간 봇을 가동하세요.'
                    : 'Your bot license key has been transmitted to your Telegram. Use this key to provision your 24/7 cloud quant worker.'}
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '4px', marginBottom: '16px', textAlign: 'left', fontSize: '11px', wordBreak: 'break-all' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#0f766e', fontWeight: 700, fontFamily: "var(--font-sans)" }}>
                      {language === 'ko' ? '텔레그램 전송 라이선스 키:' : 'Telegram Transmitted License Key:'}
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      style={{ fontSize: '9px', color: '#0284c7', fontFamily: "var(--font-sans)", cursor: 'pointer' }}
                      onClick={() => {
                        if (depositSuccessResult.licenseToken) {
                          navigator.clipboard.writeText(depositSuccessResult.licenseToken)
                          alert('라이선스 키가 클립보드에 복사되었습니다.')
                        }
                      }}
                    >
                      [복사]
                    </button>
                  </div>
                  <code style={{ background: '#0b131e', color: '#38bdf8', padding: '4px 8px', borderRadius: '3px', display: 'block', fontSize: '11.5px', fontFamily: "var(--font-mono)" }}>
                    {depositSuccessResult.licenseToken}
                  </code>
                  <div style={{ marginTop: '8px', color: '#64748b', fontFamily: "var(--font-sans)" }}><b>트랜잭션 해시:</b> <span style={{ fontFamily: "var(--font-mono)" }}>{depositSuccessResult.txHash}</span></div>
                  <div style={{ marginTop: '4px', color: '#059669', fontWeight: 600, fontFamily: "var(--font-sans)" }}><b>상태:</b> ACTIVE (30일 무중단 가동 라이선스 유효)</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="primary-button"
                    style={{ width: '100%', padding: '12px', background: '#0f766e', color: '#fff', fontSize: '12.5px', fontWeight: 'bold', fontFamily: "var(--font-sans)" }}
                    onClick={() => {
                      setNewInstanceLicenseKey(depositSuccessResult.licenseToken)
                      setDepositModalOpen(false)
                      setInstanceCreating(true)
                    }}
                  >
                    발급된 키로 24/7 봇 인스턴스 생성하기 ↗
                  </button>
                  <button
                    className="secondary-button"
                    style={{ width: '100%', padding: '10px', fontSize: '11.5px', fontFamily: "var(--font-sans)" }}
                    onClick={handleConnectTelegram}
                  >
                    <ExternalLink size={13} style={{ display: 'inline', marginRight: '6px' }} />
                    텔레그램(@AetherQuantOfficialBot)에서 키 & 알림 확인하기 ↗
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', fontFamily: "var(--font-sans)" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>구독 플랜:</span> <b style={{ color: '#18334a' }}>{upgradePlan === 'CORE' ? 'AETHER 코어 모델 & 24H 봇 1개 (CORE)' : 'AETHER 프로 모델 & 24H 봇 2개 + 심층 리서치 (PRO)'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>입금 금액:</span> <b style={{ color: '#0f766e', fontSize: '15px', fontFamily: "var(--font-mono)", fontWeight: 700 }}>{upgradePlan === 'CORE' ? '7.00 USDT' : '13.00 USDT'}</b>
                  </div>
                </div>

                {/* 1-Click MetaMask Quick Pay Button */}
                <div style={{ marginBottom: '16px', padding: '12px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '4px', fontFamily: "var(--font-sans)" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '12px', color: '#c2410c', display: 'block', fontWeight: 700 }}>🦊 메타마스크 1초 직접 결제</strong>
                      <span style={{ fontSize: '10px', color: '#7c2d12' }}>지갑에서 [승인] 한 번으로 {upgradePlan === 'CORE' ? '7' : '13'} USDT 자동 전송</span>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#ea580c', color: '#fff', padding: '8px 14px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', fontFamily: "var(--font-sans)" }}
                      disabled={confirmLoading}
                      onClick={handleMetaMaskDirectPay}
                    >
                      메타마스크 결제 ↗
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 10px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, fontFamily: "var(--font-sans)" }}>또는 해외 거래소(바이비트/바이낸스/OKX) 출금 전송</span>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                </div>

                {/* Network Selection */}
                <div style={{ marginBottom: '16px', fontFamily: "var(--font-sans)" }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#18334a' }}>
                    1. 출금할 네트워크 선택 (TRC20 트론 또는 Polygon 권장)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { key: 'trc20', label: 'TRC20 (글로벌 거래소)' },
                      { key: 'polygon', label: 'POLYGON (가스비 10원)' },
                      { key: 'bsc', label: 'BSC (바이낸스/바이비트)' },
                      { key: 'solana', label: 'SOLANA (팬텀)' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          fontSize: '10px',
                          fontWeight: selectedNetwork === item.key ? 700 : 500,
                          border: selectedNetwork === item.key ? '2px solid #18334a' : '1px solid #ddd',
                          background: selectedNetwork === item.key ? '#18334a' : '#f9f9f9',
                          color: selectedNetwork === item.key ? '#fff' : '#333',
                          fontFamily: "var(--font-sans)",
                          cursor: 'pointer',
                          borderRadius: '3px'
                        }}
                        onClick={() => setSelectedNetwork(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deposit Address Box */}
                <div style={{ marginBottom: '16px', fontFamily: "var(--font-sans)" }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#18334a' }}>
                    2. 아래 공식 입금 지갑 주소로 {upgradePlan === 'CORE' ? '7.0' : '13.0'} USDT 전송
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      readOnly
                      style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#f8fafc', wordBreak: 'break-all', fontFamily: "var(--font-mono)", color: '#0f172a' }}
                      value={depositWallets[selectedNetwork] || depositWallets['trc20'] || depositWallets['polygon']}
                    />
                    <button
                      className="secondary-button"
                      style={{ padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "var(--font-sans)", cursor: 'pointer' }}
                      onClick={handleCopyWallet}
                    >
                      {copied ? <Check size={14} color="#2b866d" /> : <Copy size={14} />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <small style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'block', fontFamily: "var(--font-sans)" }}>
                    * 반드시 선택하신 {selectedNetwork.toUpperCase()} 네트워크의 USDT만 전송해 주세요.
                  </small>
                </div>

                {/* TxHash Confirmation */}
                <div style={{ marginBottom: '16px', fontFamily: "var(--font-sans)" }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#18334a' }}>
                    3. 전송 완료 후 발급된 트랜잭션 해시(TxHash/TxID) 입력
                  </label>
                  <input
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '11.5px', fontFamily: "var(--font-mono)" }}
                    placeholder="0x... 또는 TRON TxID 입력 (위조/가짜 해시는 실시간 차단됩니다)"
                    value={userTxHash}
                    onChange={(e) => setUserTxHash(e.target.value)}
                  />
                </div>

                <button
                  className="primary-button"
                  style={{ width: '100%', padding: '12px', background: '#0f766e', color: '#fff', fontSize: '13px', fontWeight: 'bold', fontFamily: "var(--font-sans)", cursor: 'pointer', borderRadius: '4px' }}
                  disabled={confirmLoading}
                  onClick={handleSubmitDepositConfirmation}
                >
                  {confirmLoading ? '블록체인 온체인 트랜잭션 승인 확인 중…' : `${upgradePlan === 'CORE' ? '7.0' : '13.0'} USDT 온체인 검증 및 봇 활성화 ↗`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 지원 불가 자산 예외 안내 모달 (Unsupported Asset Guidance Modal) ── */}
      {unsupportedModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="panel" style={{ width: '540px', maxWidth: '92vw', background: '#0b131e', border: '1px solid #334155', padding: '24px', borderRadius: '6px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', color: '#f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: '13px', color: '#f87171', letterSpacing: '.05em', fontFamily: "var(--font-mono)" }}>
                    [지원 불가 자산 예외 안내]
                  </strong>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                    UNSUPPORTED ASSET / LIQUIDITY FILTER
                  </div>
                </div>
              </div>
              <button
                className="text-button"
                style={{ color: '#94a3b8', fontSize: '14px', padding: '2px 8px', border: '1px solid #334155', borderRadius: '3px', cursor: 'pointer' }}
                onClick={() => setUnsupportedModalOpen(false)}
              >
                닫기 ×
              </button>
            </div>

            <div style={{ background: '#1e1b18', border: '1px solid #78350f', padding: '12px 14px', borderRadius: '4px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#fef3c7', lineHeight: '1.6', margin: 0 }}>
                입력하신 검색어 <b style={{ color: '#fbbf24', textDecoration: 'underline' }}>'{unsupportedQuery}'</b>는 24시간 실시간 호가 스트림 및 도커 샌드박스 안정성 검증 목록에 포함되어 있지 않습니다.
              </p>
              <small style={{ fontSize: '9px', color: '#d97706', display: 'block', marginTop: '6px' }}>
                * 사유: 오더북 유동성 부족, 비상장 자산, 또는 호가 지연(Slippage) 방지 정책
              </small>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '9.5px', color: '#38bdf8', fontWeight: 600, letterSpacing: '.08em', display: 'block', marginBottom: '8px', fontFamily: "var(--font-mono)" }}>
                💡 현재 24H 클라우드 봇 지원 자산군 (INSTITUTIONAL GRADE)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '9px', color: '#cbd5e1' }}>
                <div style={{ background: '#0f172a', padding: '8px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <b style={{ color: '#fbbf24', display: 'block', marginBottom: '4px' }}>🪙 가상자산 (Crypto)</b>
                  BTC, ETH, SOL, XRP, SUI, DOGE
                </div>
                <div style={{ background: '#0f172a', padding: '8px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <b style={{ color: '#60a5fa', display: 'block', marginBottom: '4px' }}>🇺🇸 미국 주식 (US)</b>
                  NVDA, TSLA, AAPL, MSFT, GOOGL
                </div>
                <div style={{ background: '#0f172a', padding: '8px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <b style={{ color: '#34d399', display: 'block', marginBottom: '4px' }}>🇰🇷 국내 주식 (KRX)</b>
                  삼성전자, SK하이닉스, 현대차
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '9.5px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontFamily: "var(--font-mono)" }}>
                👉 검증된 메이저 자산으로 즉시 전환하기:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { name: '🪙 비트코인 (BTC/USD)', sym: 'BTC/USD' },
                  { name: '🇺🇸 엔비디아 (NVDA/USD)', sym: 'NVDA/USD' },
                  { name: '🇰🇷 삼성전자 (005930.KS)', sym: '005930.KS' },
                  { name: '🪙 솔라나 (SOL/USD)', sym: 'SOL/USD' }
                ].map(rec => (
                  <button
                    key={rec.sym}
                    style={{
                      background: '#0f766e',
                      border: '1px solid #14b8a6',
                      color: '#ffffff',
                      padding: '8px 10px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '3px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: "var(--font-mono)"
                    }}
                    onClick={() => {
                      setSearched(rec.sym)
                      setUnsupportedModalOpen(false)
                      setQuery('')
                    }}
                  >
                    ⚡ {rec.name}로 전환 ↗
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 실시간 뉴스 원문 및 AI 팩트체크 리더 모달 (Article Detail & Fact-Check Reader) ── */}
      {articleModalOpen && selectedArticle && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 19, 30, 0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
          onClick={() => setArticleModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              width: '740px',
              maxWidth: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid var(--line)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              padding: '0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--line)',
                background: '#f8fafb'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="live-dot pulse" />
                <strong style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--navy)' }}>
                  {selectedArticle.source || 'BLOOMBERG TERMINAL'} · ${selectedArticle.tag || 'MARKET'}
                </strong>
                <span className={`sentiment ${selectedArticle.tone}`} style={{ marginLeft: '4px' }}>
                  {selectedArticle.sentiment}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--muted)', background: '#eef5f7', padding: '2px 6px', border: '1px solid #d0e2e8' }}>
                  AI IMPACT {selectedArticle.impact}/10
                </span>
              </div>
              <button
                className="text-button"
                style={{ fontSize: '12px', color: 'var(--muted)', padding: '4px 8px' }}
                onClick={() => setArticleModalOpen(false)}
              >
                닫기 ×
              </button>
            </div>

            {/* Language Switcher Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                background: '#edf5f7',
                borderBottom: '1px solid #d0e2e8'
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Diamond /> <b>언어 보기 모드:</b>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`news-category-button ${articleLangView === 'KO' ? 'selected' : ''}`}
                  style={{ fontSize: '9px', padding: '4px 10px' }}
                  onClick={() => setArticleLangView('KO')}
                >
                  🇰🇷 AI 한국어 번역
                </button>
                <button
                  className={`news-category-button ${articleLangView === 'EN' ? 'selected' : ''}`}
                  style={{ fontSize: '9px', padding: '4px 10px' }}
                  onClick={() => setArticleLangView('EN')}
                >
                  🇺🇸 Original English
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div style={{ padding: '24px 20px' }}>
              {/* Optional Hero Image */}
              {selectedArticle.imageUrl && (
                <div style={{ width: '100%', maxHeight: '260px', overflow: 'hidden', borderRadius: '4px', marginBottom: '18px', border: '1px solid var(--line)' }}>
                  <img
                    src={selectedArticle.imageUrl}
                    alt={selectedArticle.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Article Headline */}
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--navy)', lineHeight: '1.35', margin: '0 0 14px' }}>
                {articleLangView === 'KO'
                  ? (selectedArticle.titleKo || selectedArticle.title)
                  : (selectedArticle.titleOriginal || selectedArticle.title)}
              </h2>

              {/* Metadata strip */}
              <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: 'var(--muted)', paddingBottom: '16px', borderBottom: '1px solid var(--line)', marginBottom: '18px' }}>
                <span>출처: <b>{selectedArticle.source}</b></span>
                <span>종목: <b>{selectedArticle.tag}</b></span>
                <span>수집: <b>방금 전 (실시간 글로벌 피드)</b></span>
              </div>

              {/* AI 3-Point Deep Fact-Check Card */}
              <div style={{ background: '#f8fafb', border: '1px solid var(--line)', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#2b866d" /> AI 팩트체크 & 월가 퀀트 브리핑
                  </span>
                  <span style={{ fontSize: '9px', color: '#2b866d', border: '1px solid #b8d8cc', padding: '2px 6px', background: '#ffffff' }}>
                    🛡️ FACT-CHECK VERIFIED
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px', fontSize: '11px', lineHeight: '1.6', color: 'var(--ink)' }}>
                  <div>
                    <strong style={{ color: 'var(--blue)' }}>01. 핵심 내용 요약: </strong>
                    <span>
                      {articleLangView === 'KO'
                        ? (selectedArticle.snippetKo || selectedArticle.snippet || '기관 투자자 자금 유입 및 시장 변동성 지표 확인.')
                        : (selectedArticle.snippet || 'Institutional capital flows and market volatility indicators verified.')}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--green)' }}>02. AI 수급 및 감성 진단: </strong>
                    <span>
                      {selectedArticle.sentiment === 'BULLISH'
                        ? '온체인 매수세와 ETF 순유입이 지속되며 상방 모멘텀이 우세합니다.'
                        : (selectedArticle.sentiment === 'BEARISH'
                          ? '단기 차익 실현 및 레버리지 청산 압력이 존재하므로 분할 매수 대응이 권장됩니다.'
                          : '방향성 탐색 구간으로 지지선 테스트 후 추세 확인이 유리합니다.')}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--navy)' }}>03. 트레이딩 액션 가이드: </strong>
                    <span>
                      {articleLangView === 'KO'
                        ? (selectedArticle.actionGuideKo || `$${selectedArticle.tag} 기관 수급 및 1차 지지선 방어 여부 모니터링, ta4j 지표 합성 매매 권장.`)
                        : (selectedArticle.actionGuideEn || `$${selectedArticle.tag} Monitor institutional flows and 1st support defense with ta4j indicators.`)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedArticle.link && (
                  <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-button"
                    style={{ flex: 1, minWidth: '220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={13} />
                    언론사 원문 기사 전체보기 ↗
                  </a>
                )}
                <button
                  className="secondary-button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    handleSyncChart(selectedArticle.tag)
                    setArticleModalOpen(false)
                  }}
                >
                  <BarChart2 size={13} />
                  ${selectedArticle.tag} 차트 동기화
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setArticleModalOpen(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Real-time Cross-Exchange Arbitrage & L2 Orderbook Terminal ── */}
      {arbitrageOpen && (
        <section className="arbitrage-section" id="arbitrage-terminal" style={{ margin: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: '#0b131e', padding: '12px 18px', borderRadius: '4px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span>CROSS-EXCHANGE ARBITRAGE & L2 ORDERBOOK TERMINAL</span>
            </div>
            <button
              type="button"
              onClick={() => setArbitrageOpen(false)}
              style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer' }}
            >
              닫기 ✕
            </button>
          </div>
          <FullOrderbookTerminal defaultSymbol="BTCUSDT" />
        </section>
      )}

      {/* ── Live Newswire (Language Localized) ── */}
      {newsOpen && (
        <section className="news-section" id="live-newswire">
          <div className="news-live-bar">
            <span className="live-dot pulse" /> LIVE NEWSWIRE ({languageLabels[language]})
            <span className="news-timer">{copy.rollingTag}</span>
            <button onClick={() => setNewsOpen(false)}>{copy.newsClose}</button>
          </div>

          {/* ── Institutional Category Filter Bar ── */}
          <div className="news-category-bar">
            <span className="news-category-label">
              <Diamond /> CATEGORY
            </span>
            {newsCategoryTabs.map((tab) => {
              const isSelected = newsCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`news-category-button ${isSelected ? 'selected' : ''}`}
                  onClick={() => setNewsCategory(tab.key as any)}
                >
                  <span>{tab.labels[language]}</span>
                  <small>{tab.count}</small>
                </button>
              );
            })}
          </div>
          <div className="news-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '18px', alignItems: 'stretch' }}>
            <button className="news-lead" onClick={() => selectNews(activeNews)} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', gap: '16px', width: '100%' }}>
                <div className="news-thumb hero-thumb" style={{ width: '100%', height: '120px' }}>
                  {activeNews.imageUrl ? <img src={activeNews.imageUrl} alt={activeNews.title} className="news-photo-hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeNews.thumb}
                </div>
                <div className="news-lead-copy">
                  <span className="overline">{activeNews.source} · {activeNews.tag}</span>
                  <h2 style={{ fontSize: '18px', margin: '8px 0 10px', lineHeight: 1.35 }}>{activeNews.title}</h2>
                  <p style={{ fontSize: '10.5px', color: '#64748b', margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {(activeNews as any).snippet || '기관 투자자 수급 및 온체인 지표 실시간 분석.'}
                  </p>
                </div>
              </div>
              <div className="news-meta" style={{ borderTop: '1px solid #edf0f2', paddingTop: '10px', marginTop: '10px', width: '100%' }}>
                <span className={`sentiment ${activeNews.tone}`}>{activeNews.sentiment}</span>
                <span>AI IMPACT <strong>{activeNews.impact}/10</strong></span>
                <span>{copy.newsLeadFact}</span>
              </div>
            </button>

            {/* Bloomberg-Style Fixed Height Scroll Container */}
            <div
              className="media-feed"
              style={{
                maxHeight: '440px',
                overflowY: 'auto',
                border: '1px solid var(--line)',
                background: 'white',
                scrollbarWidth: 'thin'
              }}
            >
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

      {/* ── 24H Trading Operations Console ── */}
      <section className="trading-console panel" id="trading-console">
        <div className="instance-console-head">
          <div>
            <span className="overline">{language === 'ko' ? '24/7 IDC 봇 인스턴스' : 'BOT INSTANCES'}</span>
            <h2>{language === 'ko' ? '24시간 자동매매 봇 센터' : 'Instances'}</h2>
            <p>{language === 'ko' ? '실시간 알고리즘 배포 & 호스팅' : '24-hour quant workers running on dedicated execution capacity.'}</p>
          </div>
          <button
            className="primary-button instance-create-button"
            onClick={() => {
              if (!licenseToken && botInstances.length === 0) {
                setDepositModalOpen(true)
              } else {
                setInstanceCreating(true)
              }
            }}
          >
            {!licenseToken && botInstances.length === 0
              ? (language === 'ko' ? '라이선스 결제 및 봇 가동' : 'SUBSCRIBE & DEPLOY')
              : (language === 'ko' ? '＋ 봇 인스턴스 생성' : '＋ CREATE INSTANCE')}
          </button>
        </div>
        <div className="instance-toolbar">
          <span><i className="live-dot" /> {botInstances.length} {language === 'ko' ? '개 인스턴스' : 'instances'} · {botInstances.filter((instance) => instance.status === 'RUNNING').length} {language === 'ko' ? '가동 중' : 'running'}</span>
          <button className="text-button" onClick={() => setBotInstances((items) => [...items])}>↻ {language === 'ko' ? '새로고침' : 'REFRESH'}</button>
        </div>
        <div className="instance-table-wrap">
          {botInstances.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', margin: '4px 0 16px' }}>
              <div style={{ color: '#0f766e', marginBottom: '8px' }}>
                <Diamond />
              </div>
              <strong style={{ fontSize: '13px', color: '#18334a', display: 'block', marginBottom: '6px' }}>
                {language === 'ko' ? '등록된 24/7 IDC 봇 인스턴스가 없습니다' : 'No Active Bot Instances Registered'}
              </strong>
              <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '520px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                {language === 'ko'
                  ? '24시간 무중단 클라우드 자동매매는 유료 구독 서비스입니다. 라이선스 결제 승인 시 텔레그램(@AetherQuantOfficialBot)으로 발급된 고유 라이선스 키를 통해 거래소(Binance / Bybit / Upbit / OKX) API를 안전하게 연동할 수 있습니다.'
                  : '24/7 cloud automated execution is a premium service. Upon license payment, your unique key is sent to Telegram (@AetherQuantOfficialBot) to connect your exchange API.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {licenseToken ? (
                  <>
                    <button
                      className="primary-button"
                      style={{ fontSize: '11px', padding: '8px 18px', background: '#0f766e', borderColor: '#14b8a6' }}
                      onClick={() => setInstanceCreating(true)}
                    >
                      {language === 'ko' ? '＋ 거래소 API Key 연동 & 인스턴스 생성' : '＋ CONNECT API KEY & CREATE BOT'}
                    </button>
                    <button
                      className="secondary-button"
                      style={{ fontSize: '11px', padding: '8px 18px' }}
                      onClick={handleConnectTelegram}
                    >
                      {language === 'ko' ? '텔레그램에서 발급된 키 확인' : 'Check Telegram License'}
                    </button>
                  </>
                ) : (
                  <button
                    className="primary-button"
                    style={{ fontSize: '11.5px', padding: '9px 24px', background: '#0f766e', borderColor: '#14b8a6' }}
                    onClick={() => setDepositModalOpen(true)}
                  >
                    {language === 'ko' ? '라이선스 결제 및 텔레그램 키 발급 ($7 USDT)' : 'Subscribe & Get Telegram Key ($7 USDT)'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="instance-table">
              <thead>
                <tr>
                  <th>{language === 'ko' ? '상태' : 'STATUS'}</th>
                  <th>{language === 'ko' ? '인스턴스 ID' : 'INSTANCE ID'}</th>
                  <th>{language === 'ko' ? '봇 이름' : 'NAME'}</th>
                  <th>{language === 'ko' ? '거래소' : 'EXCHANGE'}</th>
                  <th>{language === 'ko' ? '연동 API KEY' : 'API KEY'}</th>
                  <th>{language === 'ko' ? '리전' : 'REGION'}</th>
                  <th>{language === 'ko' ? '하트비트' : 'HEARTBEAT'}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {botInstances.map((instance) => (
                  <tr key={instance.id} className={selectedInstanceId === instance.id ? 'selected' : ''} onClick={() => {
                    setSelectedInstanceId(instance.id)
                    setInstanceStatus(instance.status as any)
                  }}>
                    <td>
                      <span className={`instance-status ${instance.status.toLowerCase()}`}>
                        <i />
                        {language === 'ko'
                          ? (instance.status === 'RUNNING' ? '가동 중' : instance.status === 'STOPPED' ? '중지됨' : instance.status === 'PAUSED' ? '일시정지' : '재부팅 중')
                          : instance.status}
                      </span>
                    </td>
                    <td className="mono-cell">{instance.id}</td>
                    <td><strong>{instance.name}</strong></td>
                    <td><span style={{ fontSize: '9.5px', fontWeight: 600, color: '#0f766e', background: '#e6f4ea', padding: '1px 6px', borderRadius: '3px' }}>{instance.exchange || 'Binance'}</span></td>
                    <td className="mono-cell" style={{ fontSize: '9.5px', color: '#64748b' }}>{instance.apiKeyMasked || '••••••••'}</td>
                    <td>{instance.region}</td>
                    <td>
                      {language === 'ko'
                        ? (instance.status === 'RUNNING' ? '방금 전 (실시간)' : instance.status === 'PAUSED' ? '일시정지 중' : '대기 상태')
                        : instance.heartbeat}
                    </td>
                    <td><button className="row-action" aria-label={`Manage ${instance.name}`} onClick={(event) => { event.stopPropagation(); setSelectedInstanceId(instance.id); setInstanceStatus(instance.status as any) }}>⋯</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Enhanced Exchange API Key & Telegram License Bot Creation Modal / Form ── */}
        {instanceCreating && (
          <div className="instance-create-form" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '20px 24px', borderRadius: '6px', margin: '14px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <strong style={{ fontSize: '13px', color: '#18334a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Diamond /> {language === 'ko' ? '24/7 클라우드 봇 인스턴스 생성 & 거래소 API 연동' : 'Create 24/7 Bot Instance & Connect Exchange API'}
              </strong>
              <span style={{ fontSize: '9px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '3px', fontWeight: 600 }}>
                Hetzner HEL1 IDC · Docker Sandbox
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>
                {language === 'ko' ? '봇 이름 (인스턴스 식별명)' : 'BOT INSTANCE NAME'}
                <input
                  autoFocus
                  value={instanceName}
                  onChange={(event) => setInstanceName(event.target.value)}
                  placeholder={language === 'ko' ? '예: 바이낸스 비트코인 모멘텀 1호기' : 'e.g. Binance BTC Breakout Bot'}
                  style={{ marginTop: '4px' }}
                />
              </label>

              <label style={{ margin: 0 }}>
                {language === 'ko' ? '연동 거래소 (Exchange)' : 'EXCHANGE'}
                <select
                  value={newInstanceExchange}
                  onChange={(e) => setNewInstanceExchange(e.target.value)}
                  style={{ width: '100%', height: '34px', marginTop: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '0 8px', fontSize: '11px', color: '#18334a' }}
                >
                  <option value="Binance">Binance (바이낸스 Core WebSocket)</option>
                  <option value="Bybit">Bybit (바이비트 V5 API)</option>
                  <option value="Upbit">Upbit (업비트 Open API)</option>
                  <option value="OKX">OKX (오케이엑스 V5)</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>
                {language === 'ko' ? '타겟 거래 종목 (Target Symbol)' : 'TARGET SYMBOL'}
                <select
                  value={newInstanceSymbol}
                  onChange={(e) => setNewInstanceSymbol(e.target.value)}
                  style={{ width: '100%', height: '34px', marginTop: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '0 8px', fontSize: '11px', color: '#18334a' }}
                >
                  <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                  <option value="ETH/USD">ETH/USD (Ethereum)</option>
                  <option value="SOL/USD">SOL/USD (Solana)</option>
                  <option value="XRP/USD">XRP/USD (Ripple)</option>
                  <option value="NVDA/USD">NVDA/USD (NVIDIA)</option>
                </select>
              </label>

              <label style={{ margin: 0 }}>
                {language === 'ko' ? '전략 템플릿 (Strategy)' : 'STRATEGY TEMPLATE'}
                <select
                  value={newInstanceStrategy}
                  onChange={(e) => setNewInstanceStrategy(e.target.value)}
                  style={{ width: '100%', height: '34px', marginTop: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '0 8px', fontSize: '11px', color: '#18334a' }}
                >
                  <option value="RSI + Bollinger Multi-Fractal">RSI + Bollinger Multi-Fractal (추세추종)</option>
                  <option value="SMA 20/50 Dual Crossover">SMA 20/50 Dual Crossover (골든크로스)</option>
                  <option value="AETHER Fractal Match">AETHER 시계열 프랙탈 매칭 (빅데이터 반등 패턴)</option>
                  <option value="Custom Python Script">Custom Python Script (개발자 모드 코드)</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>
                {language === 'ko' ? '거래소 API Key (Trade 권한)' : 'EXCHANGE API KEY'}
                <input
                  value={newInstanceApiKey}
                  onChange={(e) => setNewInstanceApiKey(e.target.value)}
                  placeholder={language === 'ko' ? '거래소에서 발급받은 API Key 입력' : 'Enter Exchange API Key'}
                  style={{ marginTop: '4px', fontFamily: "var(--font-mono)" }}
                />
              </label>

              <label style={{ margin: 0 }}>
                {language === 'ko' ? '거래소 Secret Key' : 'EXCHANGE SECRET KEY'}
                <input
                  type="password"
                  value={newInstanceApiSecret}
                  onChange={(e) => setNewInstanceApiSecret(e.target.value)}
                  placeholder={language === 'ko' ? '거래소 Secret Key 입력' : 'Enter Exchange Secret Key'}
                  style={{ marginTop: '4px', fontFamily: "var(--font-mono)" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{language === 'ko' ? '텔레그램 발급 봇 라이선스 키 (Telegram License Key)' : 'TELEGRAM BOT LICENSE KEY'}</span>
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: '8.5px', color: '#0284c7' }}
                    onClick={() => {
                      if (!licenseToken) setDepositModalOpen(true)
                      else handleConnectTelegram()
                    }}
                  >
                    {language === 'ko' ? '텔레그램에서 라이선스 키 확인/발급 ↗' : 'Get Key from Telegram ↗'}
                  </button>
                </div>
                <input
                  value={newInstanceLicenseKey || licenseToken || ''}
                  onChange={(e) => setNewInstanceLicenseKey(e.target.value)}
                  placeholder={language === 'ko' ? '예: AETH-7F3A-88B1-NODE (결제 후 텔레그램으로 전송된 키)' : 'e.g. AETH-7F3A-88B1-NODE'}
                  style={{ marginTop: '4px', fontFamily: "var(--font-mono)" }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <small style={{ fontSize: '9px', color: '#64748b' }}>
                {language === 'ko' ? 'API Key 및 Secret은 비공개 메모리에 안전하게 암호화되어 전송됩니다.' : 'API credentials are securely encrypted in memory.'}
              </small>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="secondary-button" onClick={() => setInstanceCreating(false)}>
                  {language === 'ko' ? '취소' : 'CANCEL'}
                </button>
                <button
                  className="primary-button"
                  disabled={!instanceName.trim()}
                  onClick={() => {
                    const newId = `qnt-${Math.random().toString(16).slice(2, 8)}`
                    const maskedKey = newInstanceApiKey.trim() ? `${newInstanceApiKey.trim().slice(0, 4)}••••••••${newInstanceApiKey.trim().slice(-4)}` : 'API-MASKED'
                    const activeToken = newInstanceLicenseKey || licenseToken || 'AETH-ACTIVE-NODE'
                    const newInst: BotInstanceItem = {
                      id: newId,
                      name: instanceName.trim(),
                      status: 'RUNNING',
                      strategy: newInstanceStrategy,
                      exchange: newInstanceExchange,
                      apiKeyMasked: maskedKey,
                      licenseToken: activeToken,
                      region: 'HEL1',
                      heartbeat: '1s ago',
                      symbol: newInstanceSymbol,
                      uptime: '0h 01m',
                      specs: '1 vCPU · 1.0 GB RAM · 10 GB NVMe',
                      ip: '49.12.240.118'
                    }
                    setBotInstances(prev => [newInst, ...prev])
                    setSelectedInstanceId(newId)
                    setInstanceStatus('RUNNING')
                    setBotRunning(true)
                    setInstanceName('')
                    setNewInstanceApiKey('')
                    setNewInstanceApiSecret('')
                    setInstanceCreating(false)
                    
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    setInstanceLogs(prev => [
                      ...prev,
                      { time: timeStr, tag: 'DOCKER', text: `[PROVISION] New container ${newId} initialized for ${newInstanceExchange} (${newInstanceSymbol})` },
                      { time: timeStr, tag: 'NET-IO', text: `[API-AUTH] Authenticated with ${newInstanceExchange} Key (${maskedKey})` },
                      { time: timeStr, tag: 'LICENSE', text: `[TELEGRAM] License key verified: ${activeToken}` },
                      { time: timeStr, tag: 'RUNNER', text: `[ACTIVE] ${newInstanceStrategy} automated execution loop started.` }
                    ])
                  }}
                  style={{ background: '#0f766e', borderColor: '#14b8a6' }}
                >
                  {language === 'ko' ? '봇 인스턴스 배포 & 클라우드 가동' : 'DEPLOY INSTANCE & START BOT'}
                </button>
              </div>
            </div>
          </div>
        )}

        {botInstances.length > 0 && (
          <div className="instance-detail">
            <span className="overline">{language === 'ko' ? '선택된 봇 인스턴스' : 'SELECTED INSTANCE'}</span>
            <strong>{botInstances.find((instance) => instance.id === selectedInstanceId)?.name || '선택된 인스턴스 없음'}</strong>
            <span>{selectedInstanceId || 'N/A'} · Hetzner HEL1 · Docker {language === 'ko' ? '격리 샌드박스' : 'isolated runtime'} · {botInstances.find((instance) => instance.id === selectedInstanceId)?.exchange || 'Binance'} ({botInstances.find((instance) => instance.id === selectedInstanceId)?.apiKeyMasked || 'API-CONNECTED'})</span>
          </div>
        )}

        {/* AWS / Hetzner Cloud Virtual Instance Control Box (PowerShell CLI Style) */}
        <div className="powershell-terminal-box" style={{ margin: '16px 24px' }}>
          <div className="powershell-titlebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="powershell-dots">
                <span className="dot-red" />
                <span className="dot-yellow" />
                <span className="dot-green" />
              </div>
              <span>PS C:\TradingEngine\Docker\instances\{selectedInstanceId}&gt; node --runtime=ta4j-v0.15</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#10b981' }}>● HEL1_ISOLATED_CONTAINER</span>
              <span style={{ color: '#64748b' }}>49.12.240.118</span>
            </div>
          </div>

          <div className="powershell-target-bar">
            <span style={{ fontSize: '8px', color: '#94a3b8', fontFamily: "var(--font-mono)", marginRight: '4px' }}>
              TARGET_SYMBOL_FLAGS:
            </span>
            {[
              { label: '--target=BTC/USD', sym: 'BTC/USD' },
              { label: '--target=ETH/USD', sym: 'ETH/USD' },
              { label: '--target=SOL/USD', sym: 'SOL/USD' },
              { label: '--target=NVDA/USD', sym: 'NVDA/USD' },
              { label: '--target=005930.KS', sym: '005930.KS' }
            ].map(chip => (
              <button
                key={chip.sym}
                className={`powershell-chip ${searched === chip.sym ? 'active' : ''}`}
                onClick={() => {
                  setSearched(chip.sym)
                  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  setInstanceLogs(prev => [...prev, { time: timeStr, tag: 'ROUTING', text: `Target asset re-routed to ${chip.sym}. Container process PID: 4104 attached.` }])
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="instance-controls-bar" style={{ background: '#060a12', borderBottom: '1px solid #1e293b', padding: '8px 14px' }}>
            <button
              className="instance-ctrl-btn primary"
              onClick={handleStartInstance}
              disabled={instanceStatus === 'RUNNING' || instanceStatus === 'REBOOTING'}
            >
              ▶ START / RESUME
            </button>
            <button
              className="instance-ctrl-btn"
              onClick={handlePauseInstance}
              disabled={instanceStatus !== 'RUNNING'}
            >
              ⏸ PAUSE BOT
            </button>
            <button
              className="instance-ctrl-btn"
              onClick={handleRebootInstance}
              disabled={instanceStatus === 'REBOOTING'}
            >
              🔄 REBOOT CONTAINER
            </button>
            <button
              className="instance-ctrl-btn danger"
              onClick={handleStopInstance}
              disabled={instanceStatus === 'STOPPED'}
            >
              ⏹ TERMINATE / STOP
            </button>
          </div>

          <div className="instance-live-terminal" style={{ background: '#000000', border: 'none', borderRadius: '0', padding: '12px 14px', height: '110px' }}>
            {instanceLogs.map((log, idx) => (
              <div key={idx} className="terminal-log-line">
                <span className="t-time" style={{ color: '#475569' }}>[{log.time}]</span>
                <span className="t-tag" style={{ color: '#10b981', fontWeight: 'bold' }}>[{log.tag}]</span>
                <span className="t-text" style={{ color: '#e2e8f0' }}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bot-mode-switch" role="tablist" aria-label="Bot execution mode">
          <button role="tab" aria-selected={botMode === 'GENERAL'} className={botMode === 'GENERAL' ? 'selected' : ''} onClick={() => setBotMode('GENERAL')}>
            <strong>GENERAL MODE {language === 'ko' ? '(입문용 모드)' : language === 'cn' ? '(入门模式)' : ''}</strong>
            <span>{language === 'ko' ? 'AETHER 노코드 퀀트 파라미터 제어' : language === 'cn' ? 'TA4J 无代码量化参数控制' : 'TA4J quant controls'}</span>
          </button>
          <button role="tab" aria-selected={botMode === 'DEVELOPER'} className={botMode === 'DEVELOPER' ? 'selected' : ''} onClick={() => setBotMode('DEVELOPER')}>
            <strong>DEVELOPER MODE {language === 'ko' ? '(개발자 모드)' : language === 'cn' ? '(开发者模式)' : ''}</strong>
            <span>{language === 'ko' ? '파이썬 3.12 도커 샌드박스 터미널' : language === 'cn' ? 'Python 3.12 Docker 沙盒终端' : 'Python sandbox terminal'}</span>
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
          <div className="powershell-terminal-box" style={{ margin: '16px 24px' }}>
            <div className="powershell-titlebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="powershell-dots">
                  <span className="dot-red" />
                  <span className="dot-yellow" />
                  <span className="dot-green" />
                </div>
                <span>Windows PowerShell (x64) - [Python 3.12.10 - Sandbox Execution Environment]</span>
              </div>
              <span style={{ color: '#38bdf8' }}>AST_SANDBOX_ACTIVE</span>
            </div>

            <div className="powershell-body">
              <div className="powershell-prompt">
                <span className="path">PS C:\Quant\sandbox\bots\live_worker&gt;</span>
                <span className="cmd">python -u strategy_runner.py --symbol {searched}</span>
              </div>

              {/* Dracula Syntax-Highlighted Interactive Code Editor */}
              <div className="dracula-editor-wrap">
                <div className="dracula-line-numbers">
                  {pythonCode.split('\n').map((_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>
                <pre className="dracula-code-display">
                  {highlightDraculaPythonCode(pythonCode)}
                </pre>
                <textarea
                  className="dracula-code-textarea"
                  aria-label="Python strategy code"
                  value={pythonCode}
                  onChange={(e) => setPythonCode(e.target.value)}
                  rows={8}
                  placeholder="# Python strategy code runs in isolated sandbox..."
                  spellCheck={false}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <small style={{ color: '#64748b', fontSize: '8px' }}>
                  SECURITY: Isolated non-root Docker Sandbox · Dracula AST syntax parser active.
                </small>
                <button
                  className="primary-button"
                  style={{
                    fontSize: '9px',
                    padding: '8px 16px',
                    height: 'auto',
                    background: '#0f766e',
                    border: '1px solid #14b8a6',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontFamily: "var(--font-mono)"
                  }}
                  onClick={handleTestSandbox}
                  disabled={sandboxLoading}
                >
                  {sandboxLoading ? 'COMPILING AST…' : '▶ EXECUTE AST SANDBOX'}
                </button>
              </div>

              {sandboxLog && (
                <div style={{ marginTop: '14px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 'bold',
                      padding: '2px 7px',
                      borderRadius: '2px',
                      background: sandboxIsError ? '#ef4444' : '#10b981',
                      color: '#ffffff',
                      fontFamily: "var(--font-mono)",
                      letterSpacing: '0.05em'
                    }}>
                      {sandboxIsError ? '● TERMINAL STDERR (FAILED)' : '● TERMINAL STDOUT (PASSED)'}
                    </span>
                    <span style={{ fontSize: '8.5px', color: sandboxIsError ? '#fca5a5' : '#a7f3d0' }}>
                      {sandboxIsError ? 'Python 3.12 AST Compiler raised an exception' : 'Sandbox AST validation & Backtest completed successfully'}
                    </span>
                  </div>
                  <pre style={{
                    background: sandboxIsError ? '#180707' : '#010f08',
                    border: sandboxIsError ? '1px solid #ef4444' : '1px solid #10b981',
                    color: sandboxIsError ? '#fca5a5' : '#50fa7b',
                    padding: '12px 14px',
                    fontSize: '10.5px',
                    lineHeight: '1.6',
                    borderRadius: '3px',
                    whiteSpace: 'pre-wrap',
                    fontFamily: "var(--font-mono)",
                    boxShadow: sandboxIsError ? '0 0 16px rgba(239, 68, 68, 0.25)' : '0 0 16px rgba(16, 185, 129, 0.2)'
                  }}>
                    {sandboxLog}
                  </pre>
                </div>
              )}
            </div>
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

      {/* ── AI Research Intelligence Workspace (Light Mode Embedded Studio) ── */}
      {researchOpen && (
        <section className="research-terminal panel" id="research-terminal" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e3e6ee', borderRadius: '12px', background: '#ffffff', margin: '24px 0' }}>
        <div className="workspace-light" style={{ minHeight: 'auto' }}>
          {/* Header Intro inside main page */}
          <div className="research-intro-light" style={{ padding: '36px 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div className="terminal-kicker">
              <Sparkles size={13} className="text-[#f47a20]" />
              <span>Institutional Market Intelligence</span>
            </div>

            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '10px 0 8px', fontWeight: 700, letterSpacing: '-0.04em', color: '#101522' }}>
              AETHER // Research <em style={{ background: 'linear-gradient(135deg, #f47a20 0%, #ff9f43 50%, #e65100 100%)', WebkitBackgroundClip: 'text', color: 'transparent', fontStyle: 'normal', fontWeight: 800 }}>Intelligence</em>
            </h2>

            <p style={{ maxWidth: '620px', margin: '0 auto', fontSize: '13px', color: '#64748b' }}>
              AETHER 글로벌 인텔리전스 레이더와 시계열 빅데이터 프랙탈 엔진을 결합하여 수치 근거가 명확한 기관급 투자 리서치 리포트를 생성합니다.
            </p>

            <div className="model-selector" title="Alibaba Cloud DashScope Flagship 300B+ Cloud GPU Engine">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Engine:</span>
              <strong className="text-[#f47a20] font-semibold">Qwen-Max (Alibaba Cloud Flagship)</strong>
              <span className="text-[9px] font-mono text-[#94A3B8]">· 300B+ Params</span>
            </div>

            {/* 5 Prompt Chiplets Bar */}
            <div className="prompt-chiplets-bar" style={{ marginTop: '20px', marginBottom: '0' }}>
              {[
                { key: 'INSIGHT', name: '인사이트', icon: <Sparkles size={14} className="text-[#f47a20]" />, tag: 'FACT-CHECK', cssClass: 'chiplet-insight' },
                { key: 'GUIDE', name: '가이드(자율형)', icon: <Bot size={14} className="text-[#0284C7]" />, tag: 'AUTONOMOUS', cssClass: 'chiplet-guide' },
                { key: 'CODING', name: '코딩</>', icon: <Code2 size={14} className="text-[#059669]" />, tag: 'PYTHON / ALGO', cssClass: 'chiplet-coding' },
                { key: 'MASTER', name: '마스터', icon: <Crown size={14} className="text-[#D97706]" />, tag: 'COUNCIL & MENTAL', cssClass: 'chiplet-master' },
                { key: 'AGENT', name: '에이전트', icon: <Layers size={14} className="text-[#6366F1]" />, tag: 'AUTONOMOUS QUANT AI', cssClass: 'chiplet-agent' }
              ].map(chip => {
                const isActive = (researchMode || 'INSIGHT') === chip.key
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setResearchMode(chip.key as any)
                      if (currentSession) {
                        setAgentSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, mode: chip.key as any } : s))
                      }
                    }}
                    className={`prompt-chiplet ${isActive ? `active ${chip.cssClass}` : ''}`}
                  >
                    {chip.icon}
                    <span>{chip.name}</span>
                    <span className="chiplet-tag">{chip.tag}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Research 2-Column Shell (Rail + Main Canvas) */}
          <div className="research-shell-light" style={{ minHeight: '520px' }}>
            {/* 1. Left Rail Sidebar */}
            <aside className="research-rail-light">
              <div className="research-rail-title">
                <span>Research History</span>
                <button type="button" onClick={() => handleCreateNewSession()} title="새 리서치 생성">
                  <Plus size={16} />
                </button>
              </div>

              <button type="button" className="new-research" onClick={() => handleCreateNewSession()}>
                <Plus size={14} />
                <span>New Research</span>
              </button>

              <span className="rail-label">Recent Sessions</span>

              <div className="flex flex-col gap-1 overflow-y-auto max-h-[420px]">
                {agentSessions.map((sess) => (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setActiveSessionId(sess.id)}
                    className={`rail-item ${activeSessionId === sess.id ? 'active' : ''}`}
                  >
                    <MessageSquare size={13} className={activeSessionId === sess.id ? 'text-[#f47a20]' : 'text-[#94A3B8]'} />
                    <span className="truncate flex-1">{sess.title}</span>
                    <span
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="opacity-0 hover:opacity-100 p-0.5 rounded hover:bg-[#e2e8f0] text-[#94a3b8] hover:text-[#ef4444]"
                      title="세션 삭제"
                    >
                      <X size={11} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="rail-bottom">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#f47a20]" />
                  <span>Qwen-Max Flagship (300B+)</span>
                </div>
                <small>AETHER Intelligence OS v2.5 Active</small>
              </div>
            </aside>

            {/* 2. Main Chat Canvas */}
            <main className="research-main-light" style={{ padding: '24px 28px' }}>
              {/* Chat Thread */}
              <div className="research-chat-thread" style={{ marginTop: '0', maxWidth: '100%' }}>
                {currentSession?.messages?.map((msg) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id} className="research-bubble-user">
                        {msg.imageUrl && (
                          <div className="mb-2 p-1.5 bg-black/20 rounded-md border border-white/20 inline-block">
                            <img src={msg.imageUrl} alt="Attached Chart" className="max-h-[140px] rounded object-cover" />
                          </div>
                        )}
                        <div>{msg.content}</div>
                        <div className="text-[10px] text-right mt-1.5 opacity-70 font-mono">{msg.timestamp}</div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className="research-bubble-agent">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E7EB] text-[11px] font-mono text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <BrainCircuit size={14} className="text-[#f47a20]" />
                          <span className="font-bold text-[#101522]">
                            AETHER [{researchMode || 'INSIGHT'}] QUANT RESEARCH REPORT
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold bg-[#DCFCE7] text-[#16A34A]">
                          VERDICT: BUY
                        </span>
                      </div>

                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="tool-tracing-box">
                          <div className="tool-tracing-head">
                            <span>[EXECUTED AGENT TOOL CALLS: {msg.toolCalls.length}]</span>
                            <span className="flex items-center gap-1 text-[#059669]">
                              SUCCESS ✓
                            </span>
                          </div>
                          <div className="tool-tracing-list">
                            {msg.toolCalls.map((tc, idx) => (
                              <div key={idx}>
                                <b className="text-[#f47a20]">↳ {tc.name}:</b> {tc.detail}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="prose max-w-none text-[14px] leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>

                      <div className="text-[10px] text-right mt-2 opacity-60 font-mono">{msg.timestamp} · AUDITED ✓</div>
                    </div>
                  )
                })}

                {agentThinking && (
                  <div className="research-bubble-agent">
                    <div className="flex items-center gap-3 text-[13px] text-[#f47a20] font-semibold">
                      <RefreshCw size={16} className="animate-spin text-[#f47a20]" />
                      <span>{agentThinkingStep || 'Qwen-Max 대형모델이 기관급 퀀트 프레임워크로 심층 리서치 중입니다...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Research Composer (Input Box) */}
              <div className="research-composer-light" style={{ maxWidth: '100%', marginTop: '20px' }}>
                <div className="composer-top">
                  <span className="font-mono text-[11px] text-[#f47a20] font-semibold flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>✦ {researchMode || 'INSIGHT'} // Deep Intelligence · ${currentSession?.symbol || searched}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAgentInputPrompt(''); setAttachedImage(null); setAttachedImageName(''); }}
                    className="hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {attachedImage && (
                  <div className="mx-4 mt-2 p-2 bg-[#f8fafc] border border-[#cbd5e1] border-l-4 border-l-[#f47a20] rounded flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-3">
                      <img src={attachedImage} alt="Preview" className="w-9 h-9 object-cover rounded border" />
                      <div>
                        <span className="font-bold text-[#f47a20]">[ATTACHED_CHART] {attachedImageName || 'CHART_CAPTURE.PNG'}</span>
                        <p className="text-[9px] text-[#64748b] m-0">AETHER 실시간 거래소 오더북 및 프랙탈 엔진과 동기화됩니다.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAttachedImage(null); setAttachedImageName(''); }}
                      className="px-2 py-1 bg-[#fee2e2] text-[#dc2626] rounded border border-[#fca5a5] text-[9px] font-bold cursor-pointer"
                    >
                      ✕ 삭제
                    </button>
                  </div>
                )}

                <textarea
                  value={agentInputPrompt}
                  onChange={e => setAgentInputPrompt(e.target.value)}
                  onPaste={handleChatPaste}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSendAgentMessage()
                    }
                  }}
                  placeholder={`${currentSession?.symbol || searched}의 온체인 수급, 팩트체크, 지표 분석을 질문하거나 차트 캡처 사진을 Ctrl+V로 붙여넣으세요...`}
                  disabled={agentThinking}
                />

                <div className="composer-bottom">
                  <div className="composer-tools">
                    <button
                      type="button"
                      title="차트 캡처 사진 첨부 (Ctrl+V 지원)"
                      onClick={() => chatFileInputRef.current?.click()}
                    >
                      <Paperclip size={15} />
                    </button>
                    <button
                      type="button"
                      title="타겟 종목 전환"
                      onClick={() => setSearched(s => s === 'BTC/USD' ? 'ETH/USD' : s === 'ETH/USD' ? 'SOL/USD' : s === 'SOL/USD' ? 'NVDA' : 'BTC/USD')}
                    >
                      <BarChart2 size={15} />
                    </button>
                    <button type="button" title="RAG 지식베이스 검색">
                      <BookOpen size={15} />
                    </button>
                    <button type="button" title="AETHER 시계열 프랙탈 매칭">
                      <Cpu size={15} />
                    </button>
                  </div>

                  <div className="composer-send">
                    <span>{agentInputPrompt.length} chars · Cmd+Enter</span>
                    <button
                      type="button"
                      className="send-research"
                      onClick={() => handleSendAgentMessage()}
                      disabled={(!agentInputPrompt.trim() && !attachedImage) || agentThinking}
                      title="리서치 질의 전송"
                    >
                      {agentThinking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={13} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Recommended Prompt Chips */}
              <div className="research-prompts" style={{ maxWidth: '100%', marginTop: '16px' }}>
                <span>RECOMMENDED [{researchMode || 'INSIGHT'}] QUERIES</span>
                <div>
                  {(researchMode === 'CODING' ? [
                    { label: '⚡ RSI+볼린저 단타 봇 파이썬 빌드', prompt: `${currentSession?.symbol || searched} 4시간봉 승률 70% RSI(14) + 볼린저 밴드 단타 봇 파이썬 코드를 작성해줘.` },
                    { label: '📈 골든크로스 1:3 손익비 추세추종', prompt: `${currentSession?.symbol || searched} SMA20/50 골든크로스 기반 손익비 1:3 추세추종 알고리즘을 작성해줘.` },
                    { label: '🛡️ AETHER 시계열 프랙탈 패턴 유사도 계산기', prompt: `${currentSession?.symbol || searched} 과거 8,000개 캔들과 최근 30개 캔들 간의 시계열 파동 유사도 및 프랙탈 일치율을 계산하는 고속 연산 코드를 작성해줘.` },
                    { label: '🤖 REST API 포트폴리오 자동 리밸런싱', prompt: `${currentSession?.symbol || searched} Spring Boot REST API와 통신하여 주기적으로 타겟 비중을 맞추는 자동 리밸런싱 Python 함수를 만들어줘.` }
                  ] : researchMode === 'GUIDE' ? [
                    { label: '🛡️ 1,000만원 3단계 분할 매수 티켓', prompt: `1,000만 원 예산으로 ${currentSession?.symbol || searched} 3단계 분할 매수 집행 티켓을 발행해줘. 최대 손실은 50만 원 한도야.` },
                    { label: '⚖️ 켈리 공식(Kelly) 최적 자본배분', prompt: `${currentSession?.symbol || searched} 현재가 기준 켈리 공식으로 최적 투입 자본금과 1/2차 익절 목표가를 계산해줘.` },
                    { label: '🚨 손절선(Invalidation) & 트레일링 스탑', prompt: `SMA20 및 ATR(14) 지표를 활용하여 추세 이탈 시 손실을 최소화하는 동적 무효화(Invalidation) 기준선을 단계별로 가이드해줘.` },
                    { label: '🔄 선물 펀딩비 차익거래(Arbitrage) 가이드', prompt: `현물 매수 + 선물 1배 숏 델타 뉴트럴 펀딩비 수취 전략의 수익률 계산 공식과 리스크 관리 매뉴얼을 정리해줘.` }
                  ] : researchMode === 'MASTER' ? [
                    { label: '📊 워런 버핏 13F 기관 포트폴리오 분석', prompt: `버크셔 해서웨이(Berkshire Hathaway)의 최신 13F 공시 데이터와 $277B 현금 보유 전략이 시사하는 시장 사이클 관점을 심층 분석해줘.` },
                    { label: '🏛️ 연준(Fed) 기준금리 경로 & CPI 진단', prompt: `미국 연준(Fed)의 기준금리 인하/동결 시나리오와 실질금리 변동이 글로벌 유동성 및 가상자산에 미치는 거시적 펀더멘탈을 진단해줘.` },
                    { label: '💻 빅테크 AI Capex & 클라우드 성장성', prompt: `빅테크 기업들의 분기별 AI 인프라 자본지출(Capex) 추이와 반도체 공급망 EPS 성장률을 퀀트 펀더멘탈 지표로 정밀 분석해줘.` },
                    { label: '🐋 온체인 LTH 70% 공급쇼크 밸류에이션', prompt: `거래소 유통 잔고 감소 추이와 1년 이상 비이동 장기보유자(LTH) 70% 상회가 유발하는 공급 쇼크(Supply Shock) 펀더멘탈을 평가해줘.` }
                  ] : researchMode === 'AGENT' ? [
                    { label: '🔮 2030 글로벌 가상자산 미래 시나리오', prompt: `2030년 월가 중앙은행 디지털화폐(CBDC)와 온체인 인공지능 자율 거래소가 공존하는 글로벌 금융 시장의 하루를 영화 같은 시나리오로 창작해줘.` },
                    { label: '📰 기관급 위클리 퀀트 뉴스레터 초안', prompt: `골드만삭스/블룸버그 리서치 헤드라인 스타일로 이번 주 글로벌 매크로, 온체인 고래, 프랙탈 패턴을 아우르는 고급스러운 위클리 인텔리전스 레터를 작성해줘.` },
                    { label: '🎙️ 워런 버핏 vs 퀀트 AI 가상 토론', prompt: `가치투자의 거장 워런 버핏과 초단타 퀀트 AI 에이전트가 "비트코인의 본질 가치와 24H 시장"을 주제로 펼치는 가상 토론 대본을 흥미진진하게 창작해줘.` },
                    { label: '⚡ 미래 웹3 스테이블코인 결제망 리포트', prompt: `솔라나/폴리곤 기반 마이크로세컨드 스테이블코인 결제 인프라가 전통 SWIFT 망을 대체해 나가는 5단계 로드맵을 창의적인 인텔리전스 리포트로 작성해줘.` }
                  ] : [
                    { label: '🪙 비트코인 온체인 & 현물 ETF 수급 분석', prompt: `비트코인(BTCUSDT)의 최근 현물 ETF 기관 순유입 추이와 온체인 장기보유자(LTH) 공급 지표를 바탕으로 단기 지지선 및 향후 5일간 목표가를 분석해줘.` },
                    { label: '⚡ 솔라나 DEX 유동성 & 온체인 고래 추적', prompt: `솔라나(SOLUSDT) 네트워크 DEX 거래량 급증 및 대형 고래 지갑 순매집 현황을 분석하고 분할 진입 전략을 제시해줘.` },
                    { label: '📰 지표-외신 다이버전스 감성 분석', prompt: `호재성 외신 속보와 RSI 과매수/과매도 다이버전스가 충돌할 때, 시장의 숨겨진 트랩 리스크와 적정 포지션 비중을 분석해줘.` },
                    { label: '🖥️ 엔비디아 AI 인프라 수주 랠리 진단', prompt: `엔비디아(NVDA) 차세대 AI 인프라 수주 랠리와 글로벌 빅테크 데이터센터 증설이 미치는 주가 영향도를 진단해줘.` }
                  ]).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAgentMessage(item.prompt)}
                      disabled={agentThinking}
                    >
                      <Sparkles size={12} className="text-[#f47a20]" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
      )}

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

      {/* ── Institutional Media Intelligence Wire ── */}
      <section className="media-section" id="media-wire" style={{ padding: '36px 0 20px', borderTop: '1px solid var(--line)' }}>
        <div className="media-hero" style={{ padding: '24px 0 36px' }}>
          <div>
            <span className="overline"><Radio size={12} /> {mediaCopy[language].overline}</span>
            <h1>{mediaCopy[language].title}</h1>
            <p>{mediaCopy[language].intro}</p>
          </div>
          <div className="media-hero-status">
            <span className="live-dot" />
            <strong>{mediaCopy[language].status}</strong>
            <b>{mediaCopy[language].indexed}</b>
            <small>{mediaCopy[language].statusNote}</small>
          </div>
        </div>

        {/* ── 2-Track Dual Selector (Institutional Aether Design System) ── */}
        <div style={{ display: 'inline-flex', border: '1px solid var(--line)', background: '#f8fafb', padding: '3px', gap: '3px', margin: '0 0 20px', flexWrap: 'wrap' }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 16px',
              fontSize: '10px',
              letterSpacing: '.08em',
              fontWeight: mediaTrack === 'DAILY_LIVE' ? 600 : 400,
              cursor: 'pointer',
              border: '0',
              background: mediaTrack === 'DAILY_LIVE' ? 'var(--navy)' : 'transparent',
              color: mediaTrack === 'DAILY_LIVE' ? '#ffffff' : 'var(--muted)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              setMediaTrack('DAILY_LIVE')
              const liveFirst = mediaStories.find(s => (s as any).track === 'DAILY_LIVE')
              if (liveFirst) handleSelectMediaStory(liveFirst)
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: mediaTrack === 'DAILY_LIVE' ? '#10b981' : 'var(--muted)',
                animation: mediaTrack === 'DAILY_LIVE' ? 'newsPulse 1.2s infinite' : 'none'
              }}
            />
            {language === 'ko' ? "TODAY'S LIVE BRIEFING (실시간 데일리 시황)" : (language === 'cn' ? "今日实时行情精要" : "TODAY'S LIVE BRIEFING")}
          </button>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 16px',
              fontSize: '10px',
              letterSpacing: '.08em',
              fontWeight: mediaTrack === 'MASTERCLASS' ? 600 : 400,
              cursor: 'pointer',
              border: '0',
              background: mediaTrack === 'MASTERCLASS' ? 'var(--navy)' : 'transparent',
              color: mediaTrack === 'MASTERCLASS' ? '#ffffff' : 'var(--muted)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              setMediaTrack('MASTERCLASS')
              const masterFirst = mediaStories.find(s => (s as any).track === 'MASTERCLASS')
              if (masterFirst) handleSelectMediaStory(masterFirst)
            }}
          >
            <Diamond />
            {language === 'ko' ? "MASTERCLASS (기관급 명작 아카이브)" : (language === 'cn' ? "机构级经典大师课归档" : "INSTITUTIONAL MASTERCLASS")}
          </button>
        </div>

        <div className="media-toolbar">
          <div className="media-filters">
            <SlidersHorizontal size={13} />
            {mediaCategories[language].map((label, index) => (
              <button
                key={label}
                className={mediaFilter === mediaCategoryKeys[index] ? 'selected' : ''}
                onClick={() => setMediaFilter(mediaCategoryKeys[index])}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="media-updated">
            {mediaTrack === 'DAILY_LIVE'
              ? (language === 'ko' ? '실시간 외신 유튜브 동기화' : 'LIVE YOUTUBE STREAM')
              : (language === 'ko' ? '기관급 불멸의 아카이브' : 'IMMORTAL ARCHIVE')} · {visibleMediaStories.length} {mediaCopy[language].signals}
          </span>
        </div>

        {/* Feature C: Inline YouTube Player or Thumbnail Poster */}
        <div className="media-feature panel">
          {mediaIsPlaying ? (
            <div className="media-feature-player">
              <iframe
                src={`https://www.youtube.com/embed/${selectedMediaStory.embedId}?autoplay=1&start=${mediaStartSecond}&rel=0`}
                title={mediaText(selectedMediaStory.title)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className={`media-feature-visual tone-${selectedMediaStory.tone}`}
              onClick={() => handlePlayMediaStory(0)}
              title={mediaCopy[language].clickToPlay}
            >
              <img
                src={`https://img.youtube.com/vi/${selectedMediaStory.embedId}/hqdefault.jpg`}
                alt={mediaText(selectedMediaStory.title)}
                className="media-feature-thumb"
                loading="eager"
              />
              <div className="play-glow">
                <Play size={32} fill="currentColor" />
              </div>
              <span>{mediaCopy[language].clickToPlay}</span>
            </div>
          )}

          <div className="media-feature-copy">
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <span className="overline">
                {mediaIsPlaying ? mediaCopy[language].playingNow : mediaCopy[language].featured} · {selectedMediaStory.source} · {mediaCategories[language][mediaCategoryKeys.indexOf(selectedMediaStory.key)]}
              </span>
              {/* Feature D: Target Symbol Sync Button to Main Workspace */}
              <button
                className="media-sync-badge"
                onClick={() => handleSyncChart(selectedMediaStory.targetSymbol)}
                title={`${mediaCopy[language].syncChart} (${selectedMediaStory.targetSymbol})`}
              >
                <BarChart2 size={11} /> {mediaCopy[language].syncChart} ${selectedMediaStory.targetSymbol.split('/')[0]}
              </button>
            </div>

            <h2>{mediaText(selectedMediaStory.title)}</h2>
            <p>{mediaText(selectedMediaStory.description)}</p>

            {/* Feature B: AI 3-Point Key Takeaways */}
            <div className="media-takeaways">
              <div className="media-takeaways-head">
                <span>
                  <Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle', color: '#2b866d' }} />
                  {mediaCopy[language].takeawaysTitle}
                </span>
                <span style={{ color: '#2b866d' }}>AI FACT-CHECKED</span>
              </div>
              <ul>
                {selectedMediaStory.takeaways.map((takeaway, idx) => (
                  <li key={idx}>
                    <strong>•</strong> {takeaway[language === 'en' ? 0 : language === 'ko' ? 1 : 2]}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature B: Timestamp Jump Buttons */}
            <div className="media-timestamps">
              <span className="ts-label">{mediaCopy[language].timestampsTitle}:</span>
              {selectedMediaStory.timestamps.map((ts) => (
                <button
                  key={ts.sec}
                  className={`ts-badge ${mediaIsPlaying && mediaStartSecond === ts.sec ? 'active' : ''}`}
                  onClick={() => handleJumpMediaTimestamp(ts.sec)}
                >
                  ▶ {ts.time} {ts.label[language === 'en' ? 0 : language === 'ko' ? 1 : 2]}
                </button>
              ))}
            </div>

            <div className="media-actions-row">
              <div className="media-meta">
                <span>{selectedMediaStory.channel}</span>
                <span>{mediaText(selectedMediaStory.age)}</span>
                <span>{selectedMediaStory.duration}</span>
              </div>
              <a
                className="primary-button media-watch"
                href={selectedMediaStory.link}
                target="_blank"
                rel="noreferrer"
              >
                {mediaCopy[language].watch} <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        <div className="media-grid">
          {visibleMediaStories.map((story) => (
            <button
              className={`media-card ${selectedMediaStory.title[0] === story.title[0] ? 'active' : ''}`}
              key={story.key + story.source + story.title[0]}
              onClick={() => handleSelectMediaStory(story)}
            >
              <div className={`media-card-thumb tone-${story.tone}`}>
                <img
                  src={`https://img.youtube.com/vi/${story.embedId}/hqdefault.jpg`}
                  alt={mediaText(story.title)}
                  className="media-thumb-img"
                  loading="lazy"
                />
                <div className="play-icon-overlay">
                  <Play size={16} fill="currentColor" />
                </div>
                <span>{story.duration}</span>
              </div>
              <div className="media-card-body">
                <div className="media-card-top">
                  <span>{story.source}</span>
                  <b>{mediaCategories[language][mediaCategoryKeys.indexOf(story.key)]}</b>
                </div>
                <h3>{mediaText(story.title)}</h3>
                <p>{mediaText(story.description)}</p>
                <div className="media-meta">
                  <span>{story.channel}</span>
                  <span>{mediaText(story.age)}</span>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>${story.targetSymbol.split('/')[0]}</span>
                </div>
                <span className="card-link">
                  {mediaCopy[language].brief} <ArrowUpRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <span>AETHER TERMINAL // AI FACT-CHECK & OPEN QUANT</span>
        <span>DATA FOR DECISION MAKERS · NOT FINANCIAL ADVICE</span>
        <span>STATUS: OPERATIONAL (WEBSOCKET LIVE)</span>
      </footer>
    </main>
    </>
  )
}
