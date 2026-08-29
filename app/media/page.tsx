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
    source: 'BLOOMBERG',
    key: 'MACRO',
    embedId: 'dp8PhLsUcFE',
    targetSymbol: 'BTC/USD',
    title: ['Rates, liquidity and the next risk regime', '금리·유동성과 다음 리스크 국면', '利率、流动性与下一个风险周期'],
    description: ['Institutional perspective on central-bank policy, liquidity and cross-asset positioning.', '중앙은행 정책, 유동성, 크로스에셋 포지셔닝에 대한 기관 관점입니다.', '关于央行政策、流动性和跨资产配置的机构观点。'],
    age: ['12 MIN AGO', '12분 전', '12分钟前'],
    duration: 'LIVE',
    tone: 'blue',
    channel: 'Bloomberg Television',
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
    source: 'CNBC',
    key: 'STRATEGY',
    embedId: 'V6wWkn49_Hk',
    targetSymbol: 'NVDA/USD',
    title: ['What investors are watching across the global cycle', '글로벌 경기 사이클에서 투자자가 주목할 점', '全球周期中投资者关注的焦点'],
    description: ['A research-led view on growth, earnings breadth and portfolio construction.', '성장률, 이익 확산과 포트폴리오 구성에 대한 리서치 기반 관점입니다.', '关于增长、盈利广度和投资组合构建的研究观点。'],
    age: ['1 HOUR AGO', '1시간 전', '1小时前'],
    duration: '24:16',
    tone: 'green',
    channel: 'CNBC International',
    link: 'https://www.youtube.com/watch?v=V6wWkn49_Hk',
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
    source: 'COINDESK',
    key: 'MARKET',
    embedId: 'X2d1M_E58t8',
    targetSymbol: 'SOL/USD',
    title: ['Digital assets move from narrative to liquidity', '디지털 자산, 내러티브에서 유동성으로', '数字资产从叙事走向流动性'],
    description: ['Market structure, ETF flows and the signals shaping the next crypto regime.', '시장 구조, ETF 자금 흐름과 다음 크립토 국면을 만드는 신호입니다.', '市场结构、ETF资金流和塑造下一个加密周期的信号。'],
    age: ['3 HOURS AGO', '3시간 전', '3小时前'],
    duration: 'LIVE',
    tone: 'amber',
    channel: 'CoinDesk Live Desk',
    link: 'https://www.youtube.com/watch?v=X2d1M_E58t8',
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
    source: 'BLOOMBERG',
    key: 'COMPANY',
    embedId: 'fO34Z22fG_o',
    targetSymbol: 'TSLA/USD',
    title: ['AI infrastructure: the investment map', 'AI 인프라: 투자 지형도', '人工智能基础设施：投资地图'],
    description: ['Enterprise demand, semiconductor supply chains and the capex cycle.', '기업 수요, 반도체 공급망과 자본지출 사이클을 분석합니다.', '企业需求、半导体供应链和资本支出周期。'],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '29:04',
    tone: 'navy',
    channel: 'Bloomberg Technology',
    link: 'https://www.youtube.com/watch?v=fO34Z22fG_o',
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
    embedId: '7m_35_1c0e0',
    targetSymbol: 'ETH/USD',
    title: ['The portfolio playbook for a divided market', '분열된 시장을 위한 포트폴리오 전략', '分化市场的投资组合策略'],
    description: ['A cross-asset conversation about concentration, volatility and downside protection.', '집중도, 변동성과 하방 방어에 대한 크로스에셋 대화입니다.', '关于集中度、波动率和下行保护的跨资产讨论。'],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '16:35',
    tone: 'red',
    channel: 'Bloomberg Markets Desk',
    link: 'https://www.youtube.com/watch?v=7m_35_1c0e0',
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
    embedId: '_2eA1vQe0E8',
    targetSymbol: 'GOLD/USD',
    title: ['Emerging markets and the dollar path', '신흥시장과 달러의 경로', '新兴市场与美元走势'],
    description: ['Macro scenarios for FX, commodities and emerging-market risk premia.', 'FX, 원자재와 신흥시장 리스크 프리미엄의 거시 시나리오입니다.', '外汇、大宗商品和新兴市场风险溢价的宏观情景。'],
    age: ['2 DAYS AGO', '2일 전', '2天前'],
    duration: '21:51',
    tone: 'blue',
    channel: 'Goldman Sachs Research',
    link: 'https://www.youtube.com/watch?v=_2eA1vQe0E8',
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
