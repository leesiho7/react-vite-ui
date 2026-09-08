'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Play, Radio, Search, SlidersHorizontal } from 'lucide-react'

type Language = 'en' | 'ko' | 'cn'

type Story = {
  source: string
  key: string
  title: string[]
  description: string[]
  age: string[]
  duration: string
  tone: string
  channel: string
  link: string
}

const copy = {
  en: {
    console: 'CONSOLE',
    wire: 'MEDIA WIRE',
    live: 'LIVE CURATION',
    official: 'OFFICIAL SOURCES',
    overline: 'MARKET INTELLIGENCE WIRE',
    title: (
      <>
        Market context,
        <br />
        <em>without the noise.</em>
      </>
    ),
    intro: 'Finance-specialized news and video intelligence from official sources.',
    status: 'WIRE STATUS',
    indexed: '6 SOURCES INDEXED',
    statusNote: 'Official publisher links · Attribution preserved',
    all: 'ALL',
    updated: 'UPDATED 08:42 UTC',
    signals: 'SIGNALS',
    featured: 'FEATURED',
    embed: 'OFFICIAL EMBED',
    watch: 'WATCH ORIGINAL',
    brief: 'VIEW BRIEF',
    back: 'BACK TO CONSOLE',
    stocks: 'STOCK SCORES',
    watchlist: 'WATCHLIST',
    summary: 'MARKET SUMMARY',
    search: 'Search stocks',
    create: 'CREATE WATCHLIST',
    latest: 'LATEST',
    popular: 'POPULAR'
  },
  ko: {
    console: '콘솔',
    wire: '와이어 뉴스',
    live: '실시간 큐레이션',
    official: '공식 출처',
    overline: '시장 인텔리전스 와이어',
    title: (
      <>
        시장의 핵심을
        <br />
        <em style={{ color: '#f47a20', fontStyle: 'normal' }}>1분 만에 꿰뚫다.</em>
      </>
    ),
    intro: '공식 출처의 금융 뉴스와 영상 인텔리전스를 한 화면에서 확인하세요.',
    status: '와이어 상태',
    indexed: '6개 출처 색인됨',
    statusNote: '공식 퍼블리셔 링크 · 출처 표시 유지',
    all: '전체',
    updated: '08:42 UTC 업데이트',
    signals: '개 신호',
    featured: '추천',
    embed: '공식 임베드',
    watch: '원본 시청',
    brief: '브리프 보기',
    back: '콘솔로 돌아가기',
    stocks: '주식 점수',
    watchlist: '관심 종목',
    summary: '시장 요약',
    search: '종목 검색',
    create: '관심 목록 만들기',
    latest: '최신',
    popular: '인기'
  },
  cn: {
    console: '控制台',
    wire: '媒体快讯',
    live: '实时策展',
    official: '官方来源',
    overline: '市场情报快讯',
    title: (
      <>
        没有噪音的
        <br />
        <em>市场语境。</em>
      </>
    ),
    intro: '在一个屏幕上查看来自官方来源的金融新闻和视频情报。',
    status: '快讯状态',
    indexed: '已索引 6 个来源',
    statusNote: '官方发布者链接 · 保留来源标注',
    all: '全部',
    updated: '08:42 UTC 更新',
    signals: '个信号',
    featured: '精选',
    embed: '官方嵌入',
    watch: '观看原始视频',
    brief: '查看简报',
    back: '返回控制台',
    stocks: '股票评分',
    watchlist: '关注列表',
    summary: '市场概览',
    search: '搜索股票',
    create: '创建关注列表',
    latest: '最新',
    popular: '热门'
  }
}

const categories = {
  en: ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'],
  ko: ['전체', '거시경제', '전략', '시장', '기업'],
  cn: ['全部', '宏观', '策略', '市场', '公司']
}

const categoryKeys = ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']

const stories: Story[] = [
  {
    source: 'BLOOMBERG',
    key: 'MACRO',
    title: ['Rates, liquidity and the next risk regime', '금리·유동성과 다음 리스크 국면', '利率、流动性与下一个风险周期'],
    description: [
      'Institutional perspective on central-bank policy, liquidity and cross-asset positioning.',
      '중앙은행 정책, 유동성, 크로스에셋 포지셔닝에 대한 기관 관점입니다.',
      '关于央行政策、流动性和跨资产配置的机构观点。'
    ],
    age: ['12 MIN AGO', '12분 전', '12分钟前'],
    duration: '18:42',
    tone: 'blue',
    channel: 'Bloomberg Markets',
    link: 'https://www.youtube.com/@BloombergTV'
  },
  {
    source: 'GOLDMAN SACHS',
    key: 'STRATEGY',
    title: ['What investors are watching across the global cycle', '글로벌 경기 사이클에서 투자자가 주목할 점', '全球周期中投资者关注的焦点'],
    description: [
      'A research-led view on growth, earnings breadth and portfolio construction.',
      '성장률, 이익 확산과 포트폴리오 구성에 대한 리서치 기반 관점입니다.',
      '关于增长、盈利广度和投资组合构建的研究观点。'
    ],
    age: ['1 HOUR AGO', '1시간 전', '1小时前'],
    duration: '24:16',
    tone: 'green',
    channel: 'Goldman Sachs',
    link: 'https://www.youtube.com/@GoldmanSachs'
  },
  {
    source: 'BLOOMBERG',
    key: 'MARKET',
    title: ['Digital assets move from narrative to liquidity', '디지털 자산, 내러티브에서 유동성으로', '数字资产从叙事走向流动性'],
    description: [
      'Market structure, ETF flows and the signals shaping the next crypto regime.',
      '시장 구조, ETF 자금 흐름과 다음 크립토 국면을 만드는 신호입니다.',
      '市场结构、ETF资金流和塑造下一个加密周期的信号。'
    ],
    age: ['3 HOURS AGO', '3시간 전', '3小时前'],
    duration: '11:08',
    tone: 'amber',
    channel: 'Bloomberg Technology',
    link: 'https://www.youtube.com/@BloombergTechnology'
  },
  {
    source: 'GOLDMAN SACHS',
    key: 'COMPANY',
    title: ['AI infrastructure: the investment map', 'AI 인프라: 투자 지형도', '人工智能基础设施：投资地图'],
    description: [
      'Enterprise demand, semiconductor supply chains and the capex cycle.',
      '기업 수요, 반도체 공급망과 자본지출 사이클을 분석합니다.',
      '企业需求、半导体供应链和资本支出周期。'
    ],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '29:04',
    tone: 'navy',
    channel: 'Goldman Sachs Talks',
    link: 'https://www.youtube.com/@GoldmanSachs'
  },
  {
    source: 'BLOOMBERG',
    key: 'STRATEGY',
    title: ['The portfolio playbook for a divided market', '분열된 시장을 위한 포트폴리오 전략', '分化市场的投资组合策略'],
    description: [
      'A cross-asset conversation about concentration, volatility and downside protection.',
      '집중도, 변동성과 하방 방어에 대한 크로스에셋 대화입니다.',
      '关于集中度、波动率和下行保护的跨资产讨论。'
    ],
    age: ['YESTERDAY', '어제', '昨天'],
    duration: '16:35',
    tone: 'red',
    channel: 'Bloomberg Markets',
    link: 'https://www.youtube.com/@BloombergTV'
  }
]

const stocks = [
  ['Dell Technologies Inc', 'DELL', '7.04', '+13.62%'],
  ['NVIDIA Corp', 'NVDA', '6.97', '+3.19%'],
  ['Meta Platforms Inc', 'META', '7.12', '+2.84%'],
  ['Micron Technology Inc', 'MU', '7.05', '+2.28%'],
  ['SanDisk Corporation', 'SNDK', '6.82', '+5.50%']
]

export default function MediaPage() {
  const [language, setLanguage] = useState<Language>('ko')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(stories[0])
  const [query, setQuery] = useState('')

  const t = copy[language]
  const text = (v: string[]) => v[language === 'en' ? 0 : language === 'ko' ? 1 : 2]
  const visible = useMemo(
    () => (filter === 'ALL' ? stories : stories.filter((s) => s.key === filter)),
    [filter]
  )

  return (
    <main className="terminal-shell media-shell wire-news-shell">
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
          <span className="live-dot" /> {t.live}
          <span className="top-divider" />
          <span className="system-label">{t.official}</span>
        </div>
        <div className="language-switcher">
          {(['en', 'ko', 'cn'] as Language[]).map((x) => (
            <button
              key={x}
              className={language === x ? 'selected' : ''}
              onClick={() => setLanguage(x)}
            >
              {x === 'en' ? 'EN' : x === 'ko' ? '한국어' : '中文'}
            </button>
          ))}
        </div>
      </header>

      <section className="wire-news-heading">
        <div>
          <span className="overline">
            <Radio size={12} /> {t.overline}
          </span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </section>

      <div className="wire-layout">
        <aside className="wire-sidebar">
          <div className="wire-section-title">
            <h2>{t.stocks}</h2>
            <span>5 / 4224</span>
          </div>
          <label className="wire-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
            />
          </label>
          {stocks
            .filter(
              (s) =>
                s[0].toLowerCase().includes(query.toLowerCase()) ||
                s[1].includes(query.toUpperCase())
            )
            .map((s, i) => (
              <button
                key={s[1]}
                className={`wire-stock ${i === 0 ? 'active' : ''}`}
              >
                <span className="wire-stock-icon">{s[1].slice(0, 2)}</span>
                <span>
                  <strong>{s[0]}</strong>
                  <small>{s[1]}</small>
                </span>
                <b>{s[3]}</b>
              </button>
            ))}
          <div className="wire-sidebar-divider" />
          <h2>{t.watchlist}</h2>
          <p className="wire-muted">
            {language === 'ko'
              ? '주식 점수 변동 및 시장 동향을 추적하세요.'
              : 'Track score changes and market momentum.'}
          </p>
          <button className="wire-create">+ {t.create}</button>
        </aside>

        <section className="wire-center">
          <div className="media-toolbar">
            <div className="media-filters">
              <SlidersHorizontal size={13} />
              {categories[language].map((x, i) => (
                <button
                  key={x}
                  className={filter === categoryKeys[i] ? 'selected' : ''}
                  onClick={() => setFilter(categoryKeys[i])}
                >
                  {x}
                </button>
              ))}
            </div>
            <span className="media-updated">
              {t.updated} · {visible.length} {t.signals}
            </span>
          </div>

          <section className="media-feature panel">
            <div className={`media-feature-visual tone-${selected.tone}`}>
              <Play size={30} fill="currentColor" />
              <span>{t.embed}</span>
            </div>
            <div className="media-feature-copy">
              <span className="overline">
                {t.featured} · {selected.source}
              </span>
              <h2>{text(selected.title)}</h2>
              <p>{text(selected.description)}</p>
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
                {t.watch}
                <ExternalLink size={13} />
              </a>
            </div>
          </section>

          <section className="media-grid">
            {visible.map((story) => (
              <button
                className={`media-card ${selected === story ? 'active' : ''}`}
                key={story.key + story.source + story.title[0]}
                onClick={() => setSelected(story)}
              >
                <div className={`media-card-thumb tone-${story.tone}`}>
                  <Play size={18} fill="currentColor" />
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
                    <span>{text(story.age)}</span>
                  </div>
                  <span className="card-link">
                    {t.brief}
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </button>
            ))}
          </section>
        </section>

        <aside className="wire-right">
          <div className="wire-section-title">
            <h2>{t.latest}</h2>
            <span>{t.popular}</span>
          </div>
          {visible.slice(0, 4).map((s) => (
            <button
              className="wire-feed"
              key={s.title[0]}
              onClick={() => setSelected(s)}
            >
              <strong>{text(s.title)}</strong>
              <div>
                <b>{s.source}</b>
                <span>{text(s.age)}</span>
              </div>
            </button>
          ))}
          <div className="wire-sidebar-divider" />
          <h2>{t.summary}</h2>
          <div className="wire-summary-tabs">
            <b>{categories[language][4]}</b>
            <span>{categories[language][1]}</span>
            <span>{categories[language][3]}</span>
          </div>
          {stocks.slice(0, 3).map((s) => (
            <div className="wire-summary-row" key={s[1]}>
              <span>
                {s[0]}
                <small>{s[1]}</small>
              </span>
              <b>{s[2]}</b>
              <strong>{s[3]}</strong>
            </div>
          ))}
        </aside>
      </div>

      <footer className="media-footer" style={{ width: '100%', display: 'block', borderTop: '1px solid #1e293b', paddingTop: '16px', marginTop: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textAlign: 'center' }}>
          ⚠️ DISCLAIMER: AETHER 터미널이 제공하는 차익거래 및 펀딩비 데이터는 정보 제공 목적으로만 사용되며, 금융 투자 조언이 아닙니다. 모든 트레이딩의 최종 책임은 본인에게 있습니다.
        </p>
      </footer>
    </main>
  )
}
