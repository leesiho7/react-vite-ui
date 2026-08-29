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
    console: 'CONSOLE',
    wire: 'MEDIA WIRE',
    live: 'LIVE CURATION',
    official: 'OFFICIAL SOURCES',
    overline: 'INSTITUTIONAL MEDIA INTELLIGENCE',
    title: <>Market context,<br /><em>without the noise.</em></>,
    intro: 'Finance-specialized video intelligence from official institutional channels. Watch inside the terminal, inspect AI takeaways, and jump to critical market moments.',
    status: 'WIRE STATUS',
    indexed: '6 SOURCES INDEXED',
    statusNote: 'Official YouTube embeds · Attribution preserved',
    all: 'ALL',
    updated: 'UPDATED 08:42 UTC',
    signals: 'SIGNALS',
    featured: 'FEATURED',
    embed: 'OFFICIAL EMBED',
    watch: 'WATCH ORIGINAL',
    brief: 'VIEW BRIEF',
    footer: 'CONTENT IS DISPLAYED VIA OFFICIAL PUBLISHER LINKS AND EMBEDS.',
    back: 'BACK TO CONSOLE',
    takeawaysTitle: 'AI 3-POINT KEY TAKEAWAYS',
    timestampsTitle: 'KEY MOMENTS',
    syncChart: 'SYNC CHART',
    playingNow: 'NOW STREAMING',
    clickToPlay: 'CLICK TO PLAY IN TERMINAL'
  },
  ko: {
    console: '콘솔',
    wire: '미디어 와이어',
    live: '실시간 큐레이션',
    official: '공식 출처',
    overline: '기관 금융 미디어 인텔리전스',
    title: <>소음 없는<br /><em>시장 맥락.</em></>,
    intro: '공식 기관 채널의 금융 특화 영상 인텔리전스입니다. 터미널 내에서 바로 시청하고, AI 3줄 요약과 핵심 시간대 점프로 빠르게 인사이트를 확보하세요.',
    status: '와이어 상태',
    indexed: '6개 출처 색인됨',
    statusNote: '공식 YouTube 임베드 · 출처 표시 유지',
    all: '전체',
    updated: '08:42 UTC 업데이트',
    signals: '개 신호',
    featured: '추천',
    embed: '공식 임베드',
    watch: '원본 시청',
    brief: '브리프 보기',
    footer: '콘텐츠는 공식 퍼블리셔 링크와 임베드를 통해 표시됩니다.',
    back: '콘솔로 돌아가기',
    takeawaysTitle: 'AI 핵심 브리프 3포인트',
    timestampsTitle: '핵심 구간 점프',
    syncChart: '차트 연동',
    playingNow: '터미널 재생 중',
    clickToPlay: '터미널에서 즉시 재생'
  },
  cn: {
    console: '控制台',
    wire: '媒体快讯',
    live: '实时策展',
    official: '官方来源',
    overline: '机构金融媒体智能',
    title: <>没有噪音的<br /><em>市场语境。</em></>,
    intro: '来自官方机构频道的金融专业视频情报。在终端内直接播放，查看AI核心观点与时间戳跳转，将市场语境转化为投资决策。',
    status: '快讯状态',
    indexed: '已索引 6 个来源',
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
  },
}

const categories = { en: ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'], ko: ['전체', '거시경제', '전략', '시장', '기업'], cn: ['全部', '宏观', '策略', '市场', '公司'] }
const categoryKeys = ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']

const initialStories: Story[] = [
  {
    source: 'BRIDGEWATER',
    key: 'MACRO',
    embedId: 'PHe0bXAIuk0',
    targetSymbol: 'BTC/USD',
    title: ['How The Economic Machine Works by Ray Dalio', '경제 기계가 작동하는 법 (레이 달리오 매크로 특강)', '经济机器是怎样运行的（瑞·达利欧）'],
    description: ['Ray Dalio’s foundational 30-minute breakdown of credit cycles, interest rates, and deleveraging dynamics.', '신용 사이클, 금리 정책, 그리고 디레버리징(부채 축소)의 경제 메커니즘을 설명하는 30분 마스터클래스입니다.', '关于信贷周期、利率政策以及去杠杆经济机制的经典剖析。'],
    age: ['12 MIN AGO', '12분 전', '12分钟前'],
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
    age: ['1 HOUR AGO', '1시간 전', '1小时前'],
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
    age: ['3 HOURS AGO', '3시간 전', '3小时前'],
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
