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
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: 'xe8XiN5Zt4Y',
    targetSymbol: 'ETH/USD',
    title: ['Ethereum Economics: Layer-2 Settlement & Staking Yield', '이더리움 경제학: 레이어2 정산과 스테이킹 실질 수익률', '以太坊经济学：Layer-2结算与质押真实收益率'],
    description: ['Examining Ethereum’s fee-burn mechanics, rollup throughput scaling, and the institutional appeal of risk-free staking yields.', '이더리움 수수료 소각 메커니즘, 롤업 확장성과 기관 대상 스테이킹 무위험 수익률의 매력을 분석합니다.', '深入剖析以太坊费用销毁机制、Layer-2扩容吞吐量及质押收益对机构资本的吸引力。'],
    age: ['25 MIN AGO', '25분 전', '25分钟前'],
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
    source: 'COIN BUREAU',
    key: 'CRYPTO',
    embedId: 'aMvrXhLubBU',
    targetSymbol: 'SOL/USD',
    title: ['Crypto Liquidity Volatility: Derivatives & Liquidation Maps', '크립토 유동성 변동성: 파생상품 포지셔닝과 청산 맵', '加密流动性与波动率：衍生品持仓与清算热力图'],
    description: ['On-chain orderflow, futures funding rates, and high-frequency liquidation cascades across perpetual swaps.', '온체인 호가 흐름, 선물 펀딩비율, 무기한 스왑 시장의 연쇄 청산 구조를 짚어봅니다.', '剖析链上订单流、永续合约资金费率及高杠杆清算瀑布效应对价格的冲击。'],
    age: ['42 MIN AGO', '42분 전', '42分钟前'],
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
    source: 'BRIDGEWATER',
    key: 'MACRO',
    embedId: 'PHe0bXAIuk0',
    targetSymbol: 'BTC/USD',
    title: ['How The Economic Machine Works by Ray Dalio', '경제 기계가 작동하는 법 (레이 달리오 매크로 특강)', '经济机器是怎样运行的（瑞·达利欧）'],
    description: ['Ray Dalio’s foundational 30-minute breakdown of credit cycles, interest rates, and deleveraging dynamics.', '신용 사이클, 금리 정책, 그리고 디레버리징(부채 축소)의 경제 메커니즘을 설명하는 30분 마스터클래스입니다.', '关于信贷周期、利率政策以及去杠杆经济机制的经典剖析。'],
    age: ['1 HOUR AGO', '1시간 전', '1小时前'],
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
    source: 'CNBC',
    key: 'STRATEGY',
    embedId: 'oPtsG0v08N0',
    targetSymbol: 'NVDA/USD',
    title: ['IMF Chief Economist: Fed Rate Decisions & Market Liquidity', '전 IMF 수석 이코노미스트 라잔: 연준 금리 결정과 시장 유동성', '前IMF首席经济学家：美联储利率决策与市场流动性'],
    description: ['Raghuram Rajan joins CNBC to analyze Fed policy dilemmas, sticky inflation, and cross-asset liquidity risks.', '라구람 라잔 전 IMF 수석 이코노미스트가 연준의 정책 딜레마와 유동성 리스크를 진단합니다.', '拉古拉姆·拉詹分析美联储政策两难、粘性通胀与跨资产流动性风险。'],
    age: ['2 HOURS AGO', '2시간 전', '2小时前'],
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
    source: 'CNBC',
    key: 'MARKET',
    embedId: 'kdCMqSTQtg8',
    targetSymbol: 'TSLA/USD',
    title: ['Mohamed El-Erian: Global Economy Health & Capex Strength', '모하메드 엘-에리언: 글로벌 경제 건전성과 자본지출 동향', '穆罕默德·埃尔-埃利安：全球经济基本面与资本开支态势'],
    description: ['Allianz chief economic advisor Mohamed El-Erian examines economic resilience, labour data, and tech investment cycle.', '알리안츠 수석 경제 고문 엘-에리언이 경제 회복력, 고용 데이터와 테크 투자 사이클을 진단합니다.', '安联首席经济顾问埃尔-埃利安深入解读经济韧性、劳动力数据及科技投资周期。'],
    age: ['YESTERDAY', '어제', '昨天'],
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
    source: 'YAHOO FINANCE',
    key: 'COMPANY',
    embedId: 'cTx3ODv5o3I',
    targetSymbol: 'ETH/USD',
    title: ['Nobel Laureate Krugman on Monetary Leadership & Market Regimes', '노벨경제학상 크루그먼: 통화 리더십과 시장 국면 진단', '诺贝尔奖得主克鲁格曼谈货币政策领导力与市场周期'],
    description: ['Paul Krugman joins Yahoo Finance to discuss central-bank leadership, structural productivity, and asset price regimes.', '노벨 경제학상 수상자 폴 크루그먼이 중앙은행 정책과 생산성, 자산 가격 구조를 논의합니다.', '诺贝尔经济学奖得主保罗·克鲁格曼深度解析央行领导力、结构性生产力与资产价格周期。'],
    age: ['YESTERDAY', '어제', '昨天'],
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
  },
  {
    source: 'BLOOMBERG',
    key: 'MACRO',
    embedId: '2qGajiA2J5k',
    targetSymbol: 'GOLD/USD',
    title: ['Warsh on Sticky Inflation & Global Commodity Geopolitics', '케빈 워시: 지속적 인플레이션과 글로벌 원자재 지정학', '凯文·沃什谈粘性通胀与全球大宗商品地缘政治'],
    description: ['Bloomberg This Weekend analysis on inflation dynamics, oil markets, and emerging market currency pressures.', '블룸버그 주간 스페셜: 인플레이션 추세, 원유 시장 및 신흥국 통화 리스크를 집중 조명합니다.', '彭博周末特刊：聚焦通胀粘性、原油地缘政治与新兴市场汇率压力。'],
    age: ['2 DAYS AGO', '2일 전', '2天前'],
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
    overline: '기관 및 가상자산 미디어 인텔리전스',
    title: <>노이즈 없는<br /><em>시장 콘텍스트.</em></>,
    intro: '공식 기관 및 크립토 채널의 금융 전문 영상 인텔리전스입니다. 터미널 안에서 바로 시청하고, AI 핵심 요약과 타임스탬프를 확인하여 차트와 즉시 연동하세요.',
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
  timestamp: string
  persona?: PersonaType
  toolCalls?: AgentToolCall[]
}

export interface AgentSession {
  id: string
  title: string
  symbol: string
  persona: PersonaType
  mode: 'INSIGHT' | 'GUIDE'
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
    desc: 'ta4j 프랙탈 패턴, 비대칭 손익비(1:3.4), 모멘텀 돌파 전문'
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

const initialAgentSessions: AgentSession[] = [
  {
    id: 'sess-btc-1',
    title: 'BTC 77K 지지선 및 하방 청산 리스크 분석',
    symbol: 'BTC/USD',
    persona: 'alex',
    mode: 'INSIGHT',
    updatedAt: '10분 전',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'BTC 77K 지지선 깨지면 다음 어디서 받아야 해? 온체인 고래랑 청산 맵 기준으로 봐줘.',
        timestamp: '23:18'
      },
      {
        id: 'm2',
        role: 'agent',
        persona: 'alex',
        timestamp: '23:18',
        toolCalls: [
          { name: 'ta4j.calculateSignals', detail: 'BTCUSDT (4H) · RSI 43.8 · SMA20 $76,245', status: 'DONE' },
          { name: 'brightdata.scrapeNews', detail: '3 hits · Spot ETF net inflow $320M', status: 'DONE' },
          { name: 'qwen2.5.synthesize', detail: 'Institutional 4-Engine Fusion memo generated', status: 'DONE' }
        ],
        content: `### 🏛️ [INSTITUTIONAL QUANT BRIEF: BTC/USD]
**분석 엔진:** Bloomberg Desk & ta4j 4-Engine Fusion

---

#### 📊 1. 청산 맵 & 핵심 지지선 진단
• **1차 지지선:** \`$76,245\` (20일 이동평균선 & 숏 레버리지 청산 클러스터)
• **2차 핵심 지지선:** \`$74,382\` (피보나치 0.618 & 기관 고래 누적 평단가)
• **하방 리스크:** $74,382 이탈 시 $72,100까지 롱 스퀴즈(Long Squeeze) 연쇄 청산 위험이 열립니다.

#### 🎯 2. 실전 분할 매수 액션 플랜
1. **1차 정찰 (30%):** $76,245 도달 시 지지력 확인 후 진입
2. **2차 주력 (40%):** $74,382 피보나치 0.618 눌림목에서 가중 진입
3. **손절(SL):** $73,600 (-5.2% 하방 이탈 시 즉시 비중 축소)`
      }
    ]
  },
  {
    id: 'sess-nvda-2',
    title: 'NVDA 빅테크 AI CAPEX 및 밸류에이션 점검',
    symbol: 'NVDA',
    persona: 'mina',
    mode: 'INSIGHT',
    updatedAt: '2시간 전',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'NVDA 다음 분기 실적 서프라이즈 가능성이랑 데이터센터 CAPEX 전망 어때?',
        timestamp: '21:04'
      },
      {
        id: 'm4',
        role: 'agent',
        persona: 'mina',
        timestamp: '21:04',
        toolCalls: [
          { name: 'brightdata.scrapeNews', detail: 'TheStreet: 5-star analyst price target upgrade', status: 'DONE' },
          { name: 'ta4j.calculateSignals', detail: 'NVDA · RSI 62.4 · Bullish Momentum', status: 'DONE' }
        ],
        content: `### 🏛️ [GLOBAL MACRO BRIEF: NVDA]
**분석 엔진:** Bloomberg Desk & ta4j 4-Engine Fusion

---

• **빅테크 CAPEX 사이클:** 마이크로소프트/구글/메타의 2026 AI 인프라 투자액이 전년 대비 +24% 증가 추세를 유지하고 있습니다.
• **밸류에이션:** 선행 P/E 32.4배로 역사적 밴드 중간값에 안착, $138 지지선 상회 시 1차 목표가 $165가 유효합니다.`
      }
    ]
  },
  {
    id: 'sess-sol-3',
    title: 'SOL 변동성 밴드 기반 자본 배분 전략',
    symbol: 'SOL/USD',
    persona: 'jhan',
    mode: 'GUIDE',
    updatedAt: '어제',
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'SOL 지금 비중 얼마나 실어야 해? 초보자 입장에서 쉽게 가이드해줘.',
        timestamp: '어제 16:40'
      },
      {
        id: 'm6',
        role: 'agent',
        persona: 'jhan',
        timestamp: '어제 16:40',
        toolCalls: [
          { name: 'ta4j.calculateSignals', detail: 'SOLUSDT · Volatility Band 0.38', status: 'DONE' }
        ],
        content: `### 💡 [PLAIN-LANGUAGE RISK GUIDE: SOL]
**분석 엔진:** Bloomberg Desk & ta4j 4-Engine Fusion

---

• **핵심 위험 요인:** 솔라나는 비트코인 대비 변동성이 1.8배 높습니다.
• **추천 비중:** 전체 자산의 **10~15% 이내**로 제한하시고, $178 지지선에서 1차 매수(50%), $165에서 2차 매수(50%)로 분할 접근하세요.`
      }
    ]
  }
]

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

  // AI Agent Studio (Multi-turn Sessions & Copilot) State
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>(initialAgentSessions)
  const [activeSessionId, setActiveSessionId] = useState<string>('sess-btc-1')
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('alex')
  const [agentInputPrompt, setAgentInputPrompt] = useState<string>('')
  const [agentThinking, setAgentThinking] = useState<boolean>(false)
  const [agentThinkingStep, setAgentThinkingStep] = useState<string>('ta4j 퀀트 지표 & 20/50 SMA 계산 중...')

  const currentSession = useMemo(() => {
    return agentSessions.find(s => s.id === activeSessionId) || agentSessions[0] || initialAgentSessions[0]
  }, [agentSessions, activeSessionId])

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
          content: `안녕하세요. **AETHER AI 리서치 데스크 (Bloomberg Desk & ta4j Multi-Fractal)**입니다.\n\n현재 **${sym}**의 실시간 시장 미시구조, 온체인 유동성, 그리고 Bright Data 실시간 뉴스 피드를 모니터링하고 있습니다.\n\n궁금하신 지지/저항 가격대, 숏/롱 청산 리스크, 또는 자본 배분 전략을 편하게 질문해 주세요.`
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
    if (!text || agentThinking) return
    setAgentInputPrompt('')
    setAgentThinking(true)
    setAgentThinkingStep('ta4j 퀀트 지표 & 20/50 SMA 계산 중...')

    const userMsg: AgentMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const curSess = agentSessions.find(s => s.id === activeSessionId) || agentSessions[0] || initialAgentSessions[0]
    const updatedMessages = [...curSess.messages, userMsg]
    
    // Dynamically update topic title based on user question
    const isGenericTitle = curSess.title.includes('신규 리서치') || curSess.title.includes('리서치 세션') || curSess.messages.filter(m => m.role === 'user').length === 0
    const dynamicTitle = isGenericTitle ? extractTopicTitle(text, curSess.symbol) : curSess.title

    setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
      ...s,
      title: dynamicTitle,
      messages: updatedMessages,
      updatedAt: '방금 전'
    } : s))

    setTimeout(() => {
      setAgentThinkingStep('Bright Data 글로벌 금융 뉴스 스크래핑 & 감성 분석 중...')
    }, 800)

    setTimeout(() => {
      setAgentThinkingStep('Qwen 2.5 14B + 골드만삭스 퀀트 모델 합성 중...')
    }, 1600)

    try {
      const resp = await sendResearchChat({
        prompt: text,
        symbol: extractAssetSymbol(`${text} ${curSess.symbol}`, curSess.symbol),
        mode: curSess.mode,
        language,
        history: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      })

      const replyContent = resp?.reply || resp?.answer || resp?.content || (typeof resp === 'string' ? resp : 'Analysis complete.')

      const agentMsg: AgentMessage = {
        id: 'agt-' + Date.now(),
        role: 'agent',
        persona: selectedPersona,
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: [
          { name: 'ta4j.calculateSignals', detail: `${curSess.symbol} RSI, SMA20/50, Volatility Bands calculated`, status: 'DONE' },
          { name: 'brightdata.scrapeNews', detail: `Bright Data real-time financial news stream & sentiment scoring`, status: 'DONE' },
          { name: 'qwen2.5.synthesize', detail: `Institutional 4-Engine Quantitative Fusion complete`, status: 'DONE' }
        ]
      }

      setAgentSessions(prev => prev.map(s => s.id === curSess.id ? {
        ...s,
        messages: [...updatedMessages, agentMsg],
        updatedAt: '방금 전'
      } : s))
    } catch (err) {
      console.error('[AgentStudio] Error generating research:', err)
    } finally {
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
          <a className="league-link" href="#trading-console" style={{ textDecoration: 'none' }}>
            <Diamond /> 24H BOT
          </a>
          <a className="league-link" href="#research-terminal" style={{ textDecoration: 'none' }}>
            <Diamond /> AI RESEARCH
          </a>
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
      <section className="trading-console panel" id="trading-console">
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
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    background: sandboxIsError ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    letterSpacing: '0.05em'
                  }}>
                    {sandboxIsError ? '● TERMINAL STDERR (FAILED)' : '● TERMINAL STDOUT (PASSED)'}
                  </span>
                  <span style={{ fontSize: '9px', color: sandboxIsError ? '#fca5a5' : '#a7f3d0' }}>
                    {sandboxIsError ? 'Python 3.12 AST Compiler raised an exception' : 'Sandbox AST validation & Backtest completed'}
                  </span>
                </div>
                <pre style={{
                  background: sandboxIsError ? '#180707' : '#041710',
                  border: sandboxIsError ? '1px solid #ef4444' : '1px solid #10b981',
                  color: sandboxIsError ? '#fca5a5' : '#6ee7b7',
                  padding: '12px 14px',
                  fontSize: '11px',
                  lineHeight: '1.6',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'IBM Plex Mono', monospace",
                  boxShadow: sandboxIsError ? '0 0 12px rgba(239, 68, 68, 0.2)' : '0 0 12px rgba(16, 185, 129, 0.15)'
                }}>
                  {sandboxLog}
                </pre>
              </div>
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

      {/* ── AI Agent Studio (3-Column Copilot Workstation) ── */}
      <section className="research-terminal panel" id="research-terminal">
        <div className="panel-heading">
          <span><Diamond /> AI AGENT WORKSPACE · {currentSession?.symbol || searched}</span>
          <span className="status-tag">
            AETHER AI COPILOT · {researchMode === 'INSIGHT' ? 'INSIGHT MODE' : 'GUIDE MODE'}
          </span>
        </div>

        <div className="agent-studio-layout">
          {/* 1. Left Column: Sessions & Topic Manager */}
          <aside className="agent-sidebar">
            <div className="agent-sidebar-top">
              <button className="new-session-btn" onClick={() => handleCreateNewSession()}>
                <span>+ NEW RESEARCH SESSION</span>
                <span>↗</span>
              </button>
            </div>

            <div className="session-list">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 4px' }}>
                <span className="session-group-label" style={{ padding: 0 }}>RESEARCH TOPICS</span>
                <span style={{ fontSize: '7px', color: 'var(--blue)', fontFamily: "'IBM Plex Mono', monospace" }}>{agentSessions.length} TOPICS</span>
              </div>
              {agentSessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`session-item ${activeSessionId === sess.id ? 'active' : ''}`}
                  onClick={() => setActiveSessionId(sess.id)}
                >
                  <div className="session-item-info">
                    <span className="session-item-title">{sess.title}</span>
                    <div className="session-item-meta">
                      <span className="session-badge">{sess.symbol}</span>
                      <span>{sess.updatedAt}</span>
                    </div>
                  </div>
                  <button
                    className="session-delete-btn"
                    title="세션 삭제"
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* 2. Center Column: Multi-turn Chat Stream */}
          <main className="agent-chat-main">
            <div className="agent-chat-header">
              <div className="agent-header-title">
                <h3>{currentSession?.title || `${searched} Research`}</h3>
                <span>
                  Bloomberg Desk & ta4j Multi-Fractal Fusion · Live Context
                </span>
              </div>
              <div className="research-mode-switch" role="tablist" style={{ margin: 0 }}>
                <button
                  role="tab"
                  aria-selected={researchMode === 'INSIGHT'}
                  className={researchMode === 'INSIGHT' ? 'selected' : ''}
                  onClick={() => setResearchMode('INSIGHT')}
                >
                  <strong>INSIGHT</strong>
                </button>
                <button
                  role="tab"
                  aria-selected={researchMode === 'GUIDE'}
                  className={researchMode === 'GUIDE' ? 'selected' : ''}
                  onClick={() => setResearchMode('GUIDE')}
                >
                  <strong>GUIDE</strong>
                </button>
              </div>
            </div>

            <div className="chat-messages-container">
              {currentSession?.messages?.map((msg) => (
                <div key={msg.id} className={msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-agent'}>
                  {msg.role === 'user' ? (
                    <>
                      <div className="chat-msg-user-header">
                        <span>YOU · PROMPT</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="chat-msg-user-body">{msg.content}</div>
                    </>
                  ) : (
                    <>
                      <div className="chat-msg-agent-header">
                        <div className="agent-persona-tag">
                          <Diamond />
                          <span>AETHER QUANT AI</span>
                          <span className="agent-persona-role">INSTITUTIONAL COPILOT</span>
                        </div>
                        <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {msg.timestamp} · AUDITED
                        </span>
                      </div>

                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="agent-tool-accordion">
                          <div className="tool-summary-row">
                            <span>🧠 AGENT TOOL CALLS ({msg.toolCalls.length} EXECUTED)</span>
                            <span style={{ color: '#10b981' }}>SUCCESS ✓</span>
                          </div>
                          <div className="tool-items-list">
                            {msg.toolCalls.map((tc, idx) => (
                              <div key={idx} className="tool-item-line">
                                <b>↳ {tc.name}:</b> {tc.detail}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="chat-msg-agent-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {agentThinking && (
                <div className="chat-thinking-box">
                  <span className="animate-spin">⚡</span>
                  <span><strong>AI AGENT REASONING:</strong> {agentThinkingStep}</span>
                </div>
              )}
            </div>

            {/* Bottom Input Area */}
            <div className="agent-chat-input-wrapper">
              <div className="chat-input-actions">
                <div className="quick-prompt-chips-bar">
                  <button className="quick-chip" onClick={() => handleSendAgentMessage(`현재 ${currentSession?.symbol || searched}의 핵심 지지선과 숏스퀴즈 가능성은?`)}>
                    🎯 지지선 & 숏스퀴즈 진단
                  </button>
                  <button className="quick-chip" onClick={() => handleSendAgentMessage(`현재 ${currentSession?.symbol || searched}의 3단계 분할 매수 비중 어떻게 조절해?`)}>
                    📊 3단계 분할 매수 비중
                  </button>
                  <button className="quick-chip" onClick={() => handleSendAgentMessage(`만약 50일 이동평균선 이탈 시 손절 및 헷징 플랜은?`)}>
                    🛡️ 손절 & 헷징 시나리오
                  </button>
                </div>
              </div>

              <textarea
                className="chat-input-textarea"
                placeholder={
                  researchMode === 'GUIDE'
                    ? `위험 요인과 자산 비중 조절법을 편하게 물어보세요... (Enter로 전송, Shift+Enter 줄바꿈)`
                    : `${currentSession?.symbol || searched}의 기관급 퀀트 시나리오 및 진입 지지선을 질의하세요... (Enter로 전송, Shift+Enter 줄바꿈)`
                }
                value={agentInputPrompt}
                onChange={(e) => setAgentInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendAgentMessage()
                  }
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ fontSize: '8px', color: 'var(--muted)' }}>
                  Active Engine: Qwen 2.5 14B + ta4j Multi-Fractal + Bright Data RAG
                </small>
                <button
                  className="primary-button"
                  onClick={() => handleSendAgentMessage()}
                  disabled={agentThinking || !agentInputPrompt.trim()}
                  style={{ padding: '8px 16px', fontSize: '9px' }}
                >
                  {agentThinking ? 'SYNTHESIZING…' : 'SEND PROMPT'} <span>↗</span>
                </button>
              </div>
            </div>
          </main>

          {/* 3. Right Column: Telemetry Context HUD */}
          <aside className="agent-hud">
            <div className="hud-widget">
              <div className="hud-widget-head">
                <span><Diamond /> ASSET TELEMETRY</span>
                <span>REALTIME</span>
              </div>
              <div className="hud-quote-row">
                <strong>{currentSession?.symbol || searched}</strong>
                <span style={{ color: '#2b866d' }}>
                  ${candles.length > 0 ? candles[candles.length - 1]?.close.toLocaleString() : '77,642.99'}
                </span>
              </div>
              <button
                className="secondary-button"
                style={{ fontSize: '8px', padding: '5px 8px', width: '100%', marginTop: '4px' }}
                onClick={() => handleSyncChart(currentSession?.symbol || searched)}
              >
                SYNC TO MAIN CHART ↗
              </button>
            </div>

            <div className="hud-widget">
              <div className="hud-widget-head">
                <span><Diamond /> TA4J QUANT SIGNALS</span>
                <span>4-ENGINE</span>
              </div>
              <div className="hud-quant-metrics">
                <div className="hud-metric-cell">
                  <span>RSI (14)</span>
                  <strong>43.8 <small style={{ color: 'var(--blue)' }}>(NEUTRAL)</small></strong>
                </div>
                <div className="hud-metric-cell">
                  <span>COMPOSITE SCORE</span>
                  <strong style={{ color: '#2b866d' }}>{decisionReport?.totalScore || '+0.82'}</strong>
                </div>
                <div className="hud-metric-cell">
                  <span>1ST SUPPORT (SMA20)</span>
                  <strong>$76,245</strong>
                </div>
                <div className="hud-metric-cell">
                  <span>1ST RESISTANCE</span>
                  <strong>$80,360</strong>
                </div>
              </div>
            </div>

            <div className="hud-widget">
              <div className="hud-widget-head">
                <span><Diamond /> LIVE NEWS WIRE</span>
                <span>BRIGHT DATA</span>
              </div>
              <div className="hud-news-feed">
                <div className="hud-news-item">
                  <a href="#media-intelligence" className="hud-news-title">
                    VUG vs. VOOG Is Not a Fee Fight | How Vanguard Growth ETF Leads
                  </a>
                  <div className="hud-news-meta">
                    <span>24/7 Wall St.</span>
                    <span style={{ color: 'var(--blue)' }}>SENTIMENT +0.15</span>
                  </div>
                </div>
                <div className="hud-news-item">
                  <a href="#media-intelligence" className="hud-news-title">
                    Spot Bitcoin ETF Net Inflows Accelerate Past $320M
                  </a>
                  <div className="hud-news-meta">
                    <span>Bloomberg News</span>
                    <span style={{ color: '#2b866d' }}>SENTIMENT +0.85</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
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
  )
}
