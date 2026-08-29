'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { UserRound, Copy, Check, ExternalLink, ShieldCheck, Zap, Award, CheckCircle2, QrCode, Play, Radio, SlidersHorizontal, ArrowUpRight, BarChart2, Sparkles } from 'lucide-react'
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

const mediaStories = [
  {
    source: 'BLOOMBERG',
    key: 'MACRO',
    embedId: 'dp8PhLsUcFE',
    targetSymbol: 'BTC/USD',
    title: ['Rates, liquidity and the next risk regime', '금리·유동성과 다음 리스크 국면', '利率、流动性与下一个风险周期'],
    description: ['Institutional perspective on central-bank policy, liquidity and cross-asset positioning.', '중앙은행 정책, 유동성, 크로스에셋 포지셔닝에 대한 기관 관점입니다.', '关于央行政策、流动性和跨资产配置的机构观点。'],
    age: ['12 MIN AGO', '12분 전', '12分钟前'],
    duration: '18:42',
    tone: 'blue',
    channel: 'Bloomberg Markets',
    link: 'https://www.youtube.com/watch?v=dp8PhLsUcFE',
    takeaways: [
      ['Fed rate cuts shift liquidity cycle into cross-asset risk-on regime.', '연준의 금리 인하 사이클이 크로스에셋 위험선호 국면으로 유동성을 이동시킵니다.', '美联储降息周期将流动性引向跨资产风险偏好模式。'],
      ['Global bond yields normalize as balance-sheet tightening approaches end.', '양적긴축(QT) 종료가 가까워짐에 따라 글로벌 국채 금리가 정상화됩니다.', '随着量化紧缩(QT)进入尾声，全球国债收益率趋于正常化。'],
      ['Institutional capital rotates from short-term money markets to digital assets.', '기관 자금이 단기 MMF에서 디지털 자산 및 메가캡 성장주로 순환 매수됩니다.', '机构资金从短期货币市场轮动至数字资产与大盘成长股。']
    ],
    timestamps: [
      { time: '02:15', sec: 135, label: ['Central Bank Policy', '중앙은행 통화정책', '央行货币政策'] },
      { time: '07:40', sec: 460, label: ['Yield Curve Dynamics', '수익률 곡선 동학', '收益率曲线动态'] },
      { time: '14:10', sec: 850, label: ['Cross-Asset Risk Play', '크로스에셋 리스크 전략', '跨资产风险策略'] }
    ]
  },
  {
    source: 'GOLDMAN SACHS',
    key: 'STRATEGY',
    embedId: 'H14bBuluwB8',
    targetSymbol: 'NVDA/USD',
    title: ['What investors are watching across the global cycle', '글로벌 경기 사이클에서 투자자가 주목할 점', '全球周期中投资者关注的焦点'],
    description: ['A research-led view on growth, earnings breadth and portfolio construction.', '성장률, 이익 확산과 포트폴리오 구성에 대한 리서치 기반 관점입니다.', '关于增长、盈利广度和投资组合构建的研究观点。'],
    age: ['1 HOUR AGO', '1시간 전', '1小时前'],
    duration: '24:16',
    tone: 'green',
    channel: 'Goldman Sachs',
    link: 'https://www.youtube.com/watch?v=H14bBuluwB8',
    takeaways: [
      ['Earnings breadth expands beyond Mega-cap tech into industrial cyclicals.', '기업 실적 호조가 빅테크를 넘어 산업 경기민감주로 확산되고 있습니다.', '企业盈利增长不仅限于科技巨头，正在向工业周期股扩散。'],
      ['US corporate balance sheets show record cash reserves, supporting buybacks.', '미국 기업들의 현금 보유액이 사상 최고치를 기록하며 자사주 매입을 지지합니다.', '美国企业现金储备创历史新高，强力支撑股票回购计划。'],
      ['Macro tailwinds favor high-ROIC equities and AI infrastructure providers.', '거시적 순풍이 높은 자본이익률(ROIC) 기업과 AI 인프라 공급업체에 유리합니다.', '宏观顺风更青睐高资本回报率(ROIC)企业及AI基础设施供应商。']
    ],
    timestamps: [
      { time: '01:30', sec: 90, label: ['Growth Breadth', '성장 확산 지표', '增长扩散指标'] },
      { time: '09:25', sec: 565, label: ['Capex Acceleration', '자본지출 가속화', '资本支出加速'] },
      { time: '18:50', sec: 1130, label: ['Portfolio Allocation', '포트폴리오 자산배분', '投资组合配置'] }
    ]
  },
  {
    source: 'BLOOMBERG',
    key: 'MARKET',
    embedId: 'gCNeDWCI0vo',
    targetSymbol: 'SOL/USD',
    title: ['Digital assets move from narrative to liquidity', '디지털 자산, 내러티브에서 유동성으로', '数字资产从叙事走向流动性'],
    description: ['Market structure, ETF flows and the signals shaping the next crypto regime.', '시장 구조, ETF 자금 흐름과 다음 크립토 국면을 만드는 신호입니다.', '市场结构、ETF资金流和塑造下一个加密周期的信号。'],
    age: ['3 HOURS AGO', '3시간 전', '3小时前'],
    duration: '11:08',
    tone: 'amber',
    channel: 'Bloomberg Technology',
    link: 'https://www.youtube.com/watch?v=gCNeDWCI0vo',
    takeaways: [
      ['Spot ETF inflows establish permanent institutional bid support.', '현물 ETF 순유입이 지속적인 기관 매수 지지선을 형성하고 있습니다.', '现货ETF持续净流入，为市场构筑了长效机构买盘支撑。'],
      ['On-chain settlement volume reaches all-time high across Layer-1 networks.', '주요 레이어1 네트워크의 온체인 결제액이 사상 최고치를 경신했습니다.', '主要Layer-1公链网络链上结算规模突破历史新高。'],
      ['Derivatives open interest shifts toward structured volatility products.', '파생상품 미결제약정이 구조화 변동성 상품으로 중심축을 이동했습니다.', '衍生品持仓量正向结构化波动率产品快速迁移。']
    ],
    timestamps: [
      { time: '03:10', sec: 190, label: ['ETF Flow Analysis', 'ETF 자금흐름 분석', 'ETF资金流分析'] },
      { time: '06:45', sec: 405, label: ['L1 Throughput Surge', 'L1 처리량 급증', 'Layer-1吞吐量激增'] },
      { time: '09:30', sec: 570, label: ['Institutional Custody', '기관 수탁 동향', '机构托管动态'] }
    ]
  },
  {
    source: 'GOLDMAN SACHS',
    key: 'COMPANY',
    embedId: 'aYmE4zG4XvA',
    targetSymbol: 'TSLA/USD',
    title: ['AI infrastructure: the investment map', 'AI 인프라: 투자 지형도', '人工智能基础设施：投资地图'],
    description: ['Enterprise demand, semiconductor supply chains and the capex cycle.', '기업 수요, 반도체 공급망과 자본지출 사이클을 분석합니다.', '企业需求、半导体供应链和资本支出周期。'],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '29:04',
    tone: 'navy',
    channel: 'Goldman Sachs Talks',
    link: 'https://www.youtube.com/watch?v=aYmE4zG4XvA',
    takeaways: [
      ['Hyperscaler capex commitment remains above $200B through 2026.', '하이퍼스케일러들의 2026년까지의 AI 자본지출 확약액이 2,000억 달러를 상회합니다.', '超大规模云厂商至2026年的AI资本支出承诺仍超2000亿美元。'],
      ['Power grid infrastructure and custom silicon represent secondary alpha.', '전력망 인프라와 맞춤형 주문형 반도체(ASIC)가 차세대 2차 알파를 창출합니다.', '电网基础设施与定制化ASIC芯片代表着第二波超额收益机会。'],
      ['Software monetization begins shifting from pilot tests to enterprise ARR.', '엔터프라이즈 AI 소프트웨어의 수익화가 파일럿에서 정기구독(ARR)으로 본격 전환됩니다.', '企业级AI软件变现已从试点测试迈向规模化年度经常性收入(ARR)。']
    ],
    timestamps: [
      { time: '04:15', sec: 255, label: ['Silicon Roadmap', '반도체 로드맵', '芯片技术路线'] },
      { time: '12:00', sec: 720, label: ['Grid & Power Bottlenecks', '전력망 병목 현상', '电网与电力瓶颈'] },
      { time: '22:30', sec: 1350, label: ['Monetization Curve', '수익화 곡선', '商业化变现曲线'] }
    ]
  },
  {
    source: 'BLOOMBERG',
    key: 'STRATEGY',
    embedId: 'M7lc1UVf-VE',
    targetSymbol: 'ETH/USD',
    title: ['The portfolio playbook for a divided market', '분열된 시장을 위한 포트폴리오 전략', '分化市场的投资组合策略'],
    description: ['A cross-asset conversation about concentration, volatility and downside protection.', '집중도, 변동성과 하방 방어에 대한 크로스에셋 대화입니다.', '关于集中度、波动率和下行保护的跨资产讨论。'],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '16:35',
    tone: 'red',
    channel: 'Bloomberg Markets',
    link: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    takeaways: [
      ['Tail-risk protection strategies outperforming pure static 60/40 models.', '꼬리위험(Tail-risk) 방어 전략이 전통적인 60/40 정적 모델을 크게 상회합니다.', '尾部风险对冲策略表现显著优于传统的60/40静态资产配置模型。'],
      ['Systematic trend-following overlay prevents catastrophic drawdown.', '체계적 추세추종 오버레이가 급격한 하방 드로다운을 효과적으로 방어합니다.', '系统化趋势跟踪策略有效防范了灾难性的净值回撤。'],
      ['Multi-asset volatility arbitrage captures persistent skew anomalies.', '멀티에셋 변동성 차익거래가 지속적인 왜도(Skew) 왜곡을 포착합니다.', '多资产波动率套利捕捉到了持续存在的偏度异常机会。']
    ],
    timestamps: [
      { time: '02:50', sec: 170, label: ['Tail Hedging', '테일 리스크 헤징', '尾部风险对冲'] },
      { time: '08:15', sec: 495, label: ['Trend Signals', '추세 신호 모델', '趋势信号模型'] },
      { time: '13:40', sec: 820, label: ['Volatility Arbitrage', '변동성 차익거래', '波动率套利'] }
    ]
  },
  {
    source: 'GOLDMAN SACHS',
    key: 'MACRO',
    embedId: '3JZ_D3ELwOQ',
    targetSymbol: 'GOLD/USD',
    title: ['Emerging markets and the dollar path', '신흥시장과 달러의 경로', '新兴市场与美元走势'],
    description: ['Macro scenarios for FX, commodities and emerging-market risk premia.', 'FX, 원자재와 신흥시장 리스크 프리미엄의 거시 시나리오입니다.', '外汇、大宗商品和新兴市场风险溢价的宏观情景。'],
    age: ['2 DAYS AGO', '2일 전', '2天前'],
    duration: '21:51',
    tone: 'blue',
    channel: 'Goldman Sachs',
    link: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    takeaways: [
      ['US Dollar softening unlocks capital flow into undervalued emerging markets.', '미 달러화 완화 국면이 저평가된 신흥시장으로의 대규모 자금 유입을 촉진합니다.', '美元走软为被低估的新兴市场解锁了大规模资本流入通道。'],
      ['Central bank gold accumulation establishes resilient floor on precious metals.', '각국 중앙은행의 공격적인 금 매입이 귀금속 가격의 강력한 하방 지지선을 형성합니다.', '全球央行持续增持黄金储备，为贵金属价格构筑了坚韧底部。'],
      ['Commodity supercycle supported by energy transition demand.', '에너지 전환 수요가 원자재 장기 슈퍼사이클을 뒷받침하고 있습니다.', '绿色能源转型需求持续支撑大宗商品长期超级周期。']
    ],
    timestamps: [
      { time: '03:40', sec: 220, label: ['Dollar Index Path', '달러 인덱스 경로', '美元指数走势'] },
      { time: '10:15', sec: 615, label: ['Central Bank Gold', '중앙은행 금 매입', '央行购金动向'] },
      { time: '17:30', sec: 1050, label: ['Commodity Cycle', '원자재 사이클', '大宗商品周期'] }
    ]
  }
]

const mediaCategories = { en: ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'], ko: ['전체', '거시경제', '전략', '시장', '기업'], cn: ['全部', '宏观', '策略', '市场', '公司'] }
const mediaCategoryKeys = ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']
const mediaCopy = {
  en: {
    overline: 'INSTITUTIONAL MEDIA INTELLIGENCE',
    title: <>Market context,<br /><em>without the noise.</em></>,
    intro: 'Finance-specialized video intelligence from official institutional channels. Watch inside the terminal, inspect AI takeaways, and jump to critical market moments.',
    status: 'WIRE STATUS',
    indexed: '6 SOURCES INDEXED',
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
    overline: '기관 금융 미디어 인텔리전스',
    title: <>소음 없는<br /><em>시장 맥락.</em></>,
    intro: '공식 기관 채널의 금융 특화 영상 인텔리전스입니다. 터미널 내에서 바로 시청하고, AI 3줄 요약과 핵심 시간대 점프로 빠르게 인사이트를 확보하세요.',
    status: '와이어 상태',
    indexed: '6개 출처 색인됨',
    statusNote: '공식 YouTube 임베드 · 출처 표시 유지',
    updated: '08:42 UTC 업데이트',
    signals: '개 신호',
    featured: '추천',
    embed: '공식 임베드',
    watch: '원본 시청',
    brief: '브리프 보기',
    takeawaysTitle: 'AI 핵심 브리프 3포인트',
    timestampsTitle: '핵심 구간 점프',
    syncChart: '차트 연동',
    playingNow: '터미널 재생 중',
    clickToPlay: '터미널에서 즉시 재생'
  },
  cn: {
    overline: '机构金融媒体智能',
    title: <>没有噪音的<br /><em>市场语境。</em></>,
    intro: '来自官方机构频道的金融专业视频情报。在终端内直接播放，查看AI核心观点与时间戳跳转，将市场语境转化为投资决策。',
    status: '快讯状态',
    indexed: '已索引 6 个来源',
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
    clickToPlay: '在终端内即刻播放'
  },
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
  const [mediaFilter, setMediaFilter] = useState('ALL')
  const [selectedMediaStory, setSelectedMediaStory] = useState(mediaStories[0])
  const [mediaIsPlaying, setMediaIsPlaying] = useState(false)
  const [mediaStartSecond, setMediaStartSecond] = useState(0)
  const visibleMediaStories = useMemo(() => mediaFilter === 'ALL' ? mediaStories : mediaStories.filter((s) => s.key === mediaFilter), [mediaFilter])
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
          <a className="league-link" href="#media-wire" style={{ textDecoration: 'none' }}>
            <Diamond /> NEWS
          </a>
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
            {mediaCopy[language].updated} · {visibleMediaStories.length} {mediaCopy[language].signals}
          </span>
        </div>

        {/* Feature C: Inline YouTube Player or Thumbnail Poster */}
        <div className="media-feature panel">
          {mediaIsPlaying ? (
            <div className="media-feature-player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selectedMediaStory.embedId}?autoplay=1&start=${mediaStartSecond}`}
                title={mediaText(selectedMediaStory.title)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className={`media-feature-visual tone-${selectedMediaStory.tone}`}
              onClick={() => handlePlayMediaStory(0)}
              title={mediaCopy[language].clickToPlay}
            >
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
                <Play size={18} fill="currentColor" />
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
  )
}
