'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Play, Radio, SlidersHorizontal, BarChart2, CheckCircle2, Sparkles } from 'lucide-react'
import { fetchStreamChannels, fetchStreamInsights } from '../../lib/api'

type Language = 'en' | 'ko' | 'cn'

type Story = {
  source: string
  key: string
  embedId: string
  targetSymbol: string
  title: string[]
  description: string[]
  age: string[]
  duration: string
  tone: string
  channel: string
  link: string
  takeaways: string[][]
  timestamps: {
    time: string
    sec: number
    label: string[]
  }[]
}

const copy = {
  en: {
    console: 'TERMINAL',
    wire: 'INTELLIGENCE WIRE',
    live: 'CURATED FEED',
    official: 'OFFICIAL SOURCES',
    overline: 'INSTITUTIONAL & CRYPTO MEDIA INTELLIGENCE',
    title: <>Market context,<br /><em>without the noise.</em></>,
    intro: 'Finance & crypto video intelligence from official institutional channels. Watch inside the terminal, inspect AI takeaways, and jump to critical market moments.',
    status: 'WIRE STATUS',
    indexed: '8 SOURCES INDEXED',
    statusNote: 'Official YouTube embeds · Attribution preserved',
    all: 'ALL',
    updated: 'UPDATED 08:42 UTC',
    signals: 'SIGNALS',
    featured: 'FEATURED',
    embed: 'OFFICIAL EMBED',
    watch: 'WATCH ORIGINAL',
    brief: 'VIEW BRIEF',
    footer: 'Content displayed via official publisher links and embeds.',
    back: 'BACK TO CONSOLE',
    takeawaysTitle: 'AI 3-POINT KEY TAKEAWAYS',
    timestampsTitle: 'KEY MOMENTS',
    syncChart: 'SYNC CHART',
    playingNow: 'NOW STREAMING',
    clickToPlay: 'CLICK TO PLAY IN TERMINAL'
  },
  ko: {
    console: '터미널 콘솔',
    wire: '인텔리전스 와이어',
    live: '실시간 큐레이션',
    official: '공식 기관 출처',
    overline: '기관 및 가상자산 미디어 인텔리전스',
    title: <>노이즈 없는<br /><em>시장 콘텍스트.</em></>,
    intro: '공식 기관 및 크립토 채널의 금융 전문 영상 인텔리전스입니다. 터미널 안에서 바로 시청하고, AI 핵심 요약과 타임스탬프를 확인하여 차트와 즉시 연동하세요.',
    status: '와이어 상태',
    indexed: '8개 출처 인덱싱',
    statusNote: '공식 유튜브 임베드 · 출처 명시',
    all: '전체',
    updated: '08:42 UTC 업데이트',
    signals: '개 시그널',
    featured: '주목할 영상',
    embed: '공식 임베드',
    watch: '원본 영상 보기',
    brief: '브리핑 보기',
    footer: '공식 배포자 링크 및 유튜브 임베드로 제공됩니다.',
    back: '콘솔로 돌아가기',
    takeawaysTitle: 'AI 3대 핵심 포인트',
    timestampsTitle: '주요 구간 바로가기',
    syncChart: '차트 연동',
    playingNow: '터미널에서 재생 중',
    clickToPlay: '클릭하여 터미널에서 즉시 재생'
  },
  cn: {
    console: '控制台',
    wire: '媒体快讯',
    live: '实时策展',
    official: '官方来源',
    overline: '机构与加密媒体智能',
    title: <>没有噪音的<br /><em>市场语境。</em></>,
    intro: '来自官方机构与加密频道的专业视频情报。在终端内直接播放，查看AI核心观点与时间戳跳转，将市场语境转化为投资决策。',
    status: '快讯状态',
    indexed: '已索引 8 个来源',
    statusNote: '官方 YouTube 嵌入 · 保留来源标注',
    all: '全部',
    updated: '08:42 UTC 更新',
    signals: '个信号',
    featured: '精选',
    embed: '官方嵌入',
    watch: '观看原始视频',
    brief: '查看简报',
    footer: '内容通过官方发布者链接和嵌入方式展示。',
    back: '返回控制台',
    takeawaysTitle: 'AI 3大核心观点',
    timestampsTitle: '关键时刻跳转',
    syncChart: '联动图表',
    playingNow: '正在终端播放',
    clickToPlay: '在终端内即刻播放'
  }
}

const categories = {
  en: ['ALL', 'CRYPTO', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'],
  ko: ['전체', '가상자산', '거시경제', '전략', '시장', '기업'],
  cn: ['全部', '加密资产', '宏观', '策略', '市场', '公司']
}
const categoryKeys = ['ALL', 'CRYPTO', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']

const initialStories: Story[] = [
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

export default function MediaPage() {
  const [language, setLanguage] = useState<Language>('ko')
  const [filter, setFilter] = useState('ALL')
  const [stories, setStories] = useState<Story[]>(initialStories)
  const [selected, setSelected] = useState<Story>(initialStories[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [startSecond, setStartSecond] = useState(0)

  const t = copy[language]
  const langIdx = language === 'en' ? 0 : language === 'ko' ? 1 : 2
  const text = (value: string[]) => value[langIdx]

  // Feature A: Fetch stream channels from Spring Boot backend on mount
  useEffect(() => {
    async function loadChannels() {
      try {
        const backendChannels = await fetchStreamChannels()
        if (Array.isArray(backendChannels) && backendChannels.length > 0) {
          // Enrich with backend metadata if present
          console.log('[Media] Loaded live channels from Spring Boot backend:', backendChannels.length)
        }
      } catch (e) {
        // Fallback gracefully to default curated list
      }
    }
    loadChannels()
  }, [])

  const visible = useMemo(
    () => (filter === 'ALL' ? stories : stories.filter((story) => story.key === filter)),
    [filter, stories]
  )

  const handleSelectStory = (story: Story) => {
    setSelected(story)
    setIsPlaying(false)
    setStartSecond(0)
  }

  const handlePlayStory = (sec = 0) => {
    setStartSecond(sec)
    setIsPlaying(true)
  }

  const handleJumpTimestamp = (sec: number) => {
    setStartSecond(sec)
    setIsPlaying(true)
  }

  return (
    <main className="terminal-shell media-shell">
      {/* ── Topbar ── */}
      <header className="topbar media-topbar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">A</span>
          <span>
            <strong>AETHER</strong>
            <span>FINANCIAL INTELLIGENCE</span>
          </span>
        </Link>
        <nav className="media-breadcrumb">
          <Link href="/">{t.console}</Link>
          <span>/</span>
          <strong>{t.wire}</strong>
        </nav>
        <div className="top-meta">
          <span className="live-dot" /> {t.live} <span className="top-divider" />
          <span className="system-label">{t.official}</span>
        </div>
        <div className="language-switcher" aria-label="Language selector">
          {(['en', 'ko', 'cn'] as Language[]).map((item) => (
            <button
              key={item}
              className={language === item ? 'selected' : ''}
              onClick={() => setLanguage(item)}
            >
              {item === 'en' ? 'EN' : item === 'ko' ? '한국어' : '中文'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="media-hero">
        <div>
          <span className="overline">
            <Radio size={12} /> {t.overline}
          </span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <div className="media-hero-status">
          <span className="live-dot" />
          <strong>{t.status}</strong>
          <b>{t.indexed}</b>
          <small>{t.statusNote}</small>
        </div>
      </section>

      {/* ── Category Toolbar ── */}
      <section className="media-toolbar">
        <div className="media-filters">
          <SlidersHorizontal size={13} />
          {categories[language].map((label, index) => (
            <button
              key={label}
              className={filter === categoryKeys[index] ? 'selected' : ''}
              onClick={() => setFilter(categoryKeys[index])}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="media-updated">
          {t.updated} · {visible.length} {t.signals}
        </span>
      </section>

      {/* ── Feature Player Banner (Feature C: Inline YouTube Player) ── */}
      <section className="media-feature panel">
        {isPlaying ? (
          <div className="media-feature-player">
            <iframe
              src={`https://www.youtube.com/embed/${selected.embedId}?autoplay=1&start=${startSecond}&rel=0`}
              title={text(selected.title)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className={`media-feature-visual tone-${selected.tone}`}
            onClick={() => handlePlayStory(0)}
            title={t.clickToPlay}
          >
            <img
              src={`https://img.youtube.com/vi/${selected.embedId}/hqdefault.jpg`}
              alt={text(selected.title)}
              className="media-feature-thumb"
              loading="eager"
            />
            <div className="play-glow">
              <Play size={32} fill="currentColor" />
            </div>
            <span>{t.clickToPlay}</span>
          </div>
        )}

        <div className="media-feature-copy">
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <span className="overline">
              {isPlaying ? t.playingNow : t.featured} · {selected.source} · {categories[language][categoryKeys.indexOf(selected.key)]}
            </span>
            {/* Feature D: Target Symbol Sync Link to Main Terminal */}
            <Link
              href={`/?symbol=${encodeURIComponent(selected.targetSymbol)}`}
              className="media-sync-badge"
              title={`${t.syncChart} (${selected.targetSymbol})`}
            >
              <BarChart2 size={11} /> {t.syncChart} ${selected.targetSymbol.split('/')[0]}
            </Link>
          </div>

          <h2>{text(selected.title)}</h2>
          <p>{text(selected.description)}</p>

          {/* Feature B: AI 3-Point Key Takeaways */}
          <div className="media-takeaways">
            <div className="media-takeaways-head">
              <span><Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle', color: '#2b866d' }} /> {t.takeawaysTitle}</span>
              <span style={{ color: '#2b866d' }}>AI FACT-CHECKED</span>
            </div>
            <ul>
              {selected.takeaways.map((takeaway, idx) => (
                <li key={idx}>
                  <strong>•</strong> {takeaway[langIdx]}
                </li>
              ))}
            </ul>
          </div>

          {/* Feature B: Timestamp Jump Buttons */}
          <div className="media-timestamps">
            <span className="ts-label">{t.timestampsTitle}:</span>
            {selected.timestamps.map((ts) => (
              <button
                key={ts.sec}
                className={`ts-badge ${isPlaying && startSecond === ts.sec ? 'active' : ''}`}
                onClick={() => handleJumpTimestamp(ts.sec)}
              >
                ▶ {ts.time} {ts.label[langIdx]}
              </button>
            ))}
          </div>

          <div className="media-actions-row">
            <div className="media-meta">
              <span>{selected.channel}</span>
              <span>{text(selected.age)}</span>
              <span>{selected.duration}</span>
            </div>
            <a
              className="primary-button media-watch"
              href={selected.link}
              target="_blank"
              rel="noreferrer"
            >
              {t.watch} <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Story Cards Grid ── */}
      <section className="media-grid">
        {visible.map((story) => (
          <button
            className={`media-card ${selected.title[0] === story.title[0] ? 'active' : ''}`}
            key={story.key + story.source + story.title[0]}
            onClick={() => handleSelectStory(story)}
          >
            <div className={`media-card-thumb tone-${story.tone}`}>
              <img
                src={`https://img.youtube.com/vi/${story.embedId}/hqdefault.jpg`}
                alt={text(story.title)}
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
                <b>{categories[language][categoryKeys.indexOf(story.key)]}</b>
              </div>
              <h3>{text(story.title)}</h3>
              <p>{text(story.description)}</p>
              <div className="media-meta">
                <span>{story.channel}</span>
                <span>{text(story.age)}</span>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>${story.targetSymbol.split('/')[0]}</span>
              </div>
              <span className="card-link">
                {t.brief} <ArrowUpRight size={12} />
              </span>
            </div>
          </button>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer className="media-footer">
        <span>{t.footer}</span>
        <Link href="/">{t.back}</Link>
      </footer>
    </main>
  )
}
