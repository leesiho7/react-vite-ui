'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Play, Radio, SlidersHorizontal } from 'lucide-react'

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
  en: { console: 'CONSOLE', wire: 'MEDIA WIRE', live: 'LIVE CURATION', official: 'OFFICIAL SOURCES', overline: 'INSTITUTIONAL MEDIA INTELLIGENCE', title: <>Market context,<br /><em>without the noise.</em></>, intro: 'Finance-specialized video intelligence from official institutional channels. Watch the original source, then turn context into a decision.', status: 'WIRE STATUS', indexed: '6 SOURCES INDEXED', statusNote: 'Official YouTube embeds · Attribution preserved', all: 'ALL', updated: 'UPDATED 08:42 UTC', signals: 'SIGNALS', featured: 'FEATURED', embed: 'OFFICIAL EMBED', watch: 'WATCH ORIGINAL', brief: 'VIEW BRIEF', footer: 'CONTENT IS DISPLAYED VIA OFFICIAL PUBLISHER LINKS AND EMBEDS.', back: 'BACK TO CONSOLE' },
  ko: { console: '콘솔', wire: '미디어 와이어', live: '실시간 큐레이션', official: '공식 출처', overline: '기관 금융 미디어 인텔리전스', title: <>소음 없는<br /><em>시장 맥락.</em></>, intro: '공식 기관 채널의 금융 특화 영상 인텔리전스입니다. 원본을 시청하고 시장 맥락을 투자 판단으로 연결하세요.', status: '와이어 상태', indexed: '6개 출처 색인됨', statusNote: '공식 YouTube 임베드 · 출처 표시 유지', all: '전체', updated: '08:42 UTC 업데이트', signals: '개 신호', featured: '추천', embed: '공식 임베드', watch: '원본 시청', brief: '브리프 보기', footer: '콘텐츠는 공식 퍼블리셔 링크와 임베드를 통해 표시됩니다.', back: '콘솔로 돌아가기' },
  cn: { console: '控制台', wire: '媒体快讯', live: '实时策展', official: '官方来源', overline: '机构金融媒体智能', title: <>没有噪音的<br /><em>市场语境。</em></>, intro: '来自官方机构频道的金融专业视频情报。观看原始来源，将市场语境转化为投资决策。', status: '快讯状态', indexed: '已索引 6 个来源', statusNote: '官方 YouTube 嵌入 · 保留来源标注', all: '全部', updated: '08:42 UTC 更新', signals: '个信号', featured: '精选', embed: '官方嵌入', watch: '观看原始视频', brief: '查看简报', footer: '内容通过官方发布者链接和嵌入方式展示。', back: '返回控制台' },
}

const categories = { en: ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY'], ko: ['전체', '거시경제', '전략', '시장', '기업'], cn: ['全部', '宏观', '策略', '市场', '公司'] }
const categoryKeys = ['ALL', 'MACRO', 'STRATEGY', 'MARKET', 'COMPANY']
const langIndex: Record<Language, number> = { en: 0, ko: 1, cn: 2 }

const stories: Story[] = [
  { source: 'BLOOMBERG', key: 'MACRO', title: ['Rates, liquidity and the next risk regime', '금리·유동성과 다음 리스크 국면', '利率、流动性与下一个风险周期'], description: ['Institutional perspective on central-bank policy, liquidity and cross-asset positioning.', '중앙은행 정책, 유동성, 크로스에셋 포지셔닝에 대한 기관 관점입니다.', '关于央行政策、流动性和跨资产配置的机构观点。'], age: ['12 MIN AGO', '12분 전', '12分钟前'], duration: '18:42', tone: 'blue', channel: 'Bloomberg Markets', link: 'https://www.youtube.com/@BloombergTV' },
  { source: 'GOLDMAN SACHS', key: 'STRATEGY', title: ['What investors are watching across the global cycle', '글로벌 경기 사이클에서 투자자가 주목할 점', '全球周期中投资者关注的焦点'], description: ['A research-led view on growth, earnings breadth and portfolio construction.', '성장률, 이익 확산과 포트폴리오 구성에 대한 리서치 기반 관점입니다.', '关于增长、盈利广度和投资组合构建的研究观点。'], age: ['1 HOUR AGO', '1시간 전', '1小时前'], duration: '24:16', tone: 'green', channel: 'Goldman Sachs', link: 'https://www.youtube.com/@GoldmanSachs' },
  { source: 'BLOOMBERG', key: 'MARKET', title: ['Digital assets move from narrative to liquidity', '디지털 자산, 내러티브에서 유동성으로', '数字资产从叙事走向流动性'], description: ['Market structure, ETF flows and the signals shaping the next crypto regime.', '시장 구조, ETF 자금 흐름과 다음 크립토 국면을 만드는 신호입니다.', '市场结构、ETF资金流和塑造下一个加密周期的信号。'], age: ['3 HOURS AGO', '3시간 전', '3小时前'], duration: '11:08', tone: 'amber', channel: 'Bloomberg Technology', link: 'https://www.youtube.com/@BloombergTechnology' },
  { source: 'GOLDMAN SACHS', key: 'COMPANY', title: ['AI infrastructure: the investment map', 'AI 인프라: 투자 지형도', '人工智能基础设施：投资地图'], description: ['Enterprise demand, semiconductor supply chains and the capex cycle.', '기업 수요, 반도체 공급망과 자본지출 사이클을 분석합니다.', '企业需求、半导体供应链和资本支出周期。'], age: ['YESTERDAY', '어제', '昨天'], duration: '29:04', tone: 'navy', channel: 'Goldman Sachs Talks', link: 'https://www.youtube.com/@GoldmanSachs' },
  { source: 'BLOOMBERG', key: 'STRATEGY', title: ['The portfolio playbook for a divided market', '분열된 시장을 위한 포트폴리오 전략', '分化市场的投资组合策略'], description: ['A cross-asset conversation about concentration, volatility and downside protection.', '집중도, 변동성과 하방 방어에 대한 크로스에셋 대화입니다.', '关于集中度、波动率和下行保护的跨资产讨论。'], age: ['YESTERDAY', '어제', '昨天'], duration: '16:35', tone: 'red', channel: 'Bloomberg Markets', link: 'https://www.youtube.com/@BloombergTV' },
  { source: 'GOLDMAN SACHS', key: 'MACRO', title: ['Emerging markets and the dollar path', '신흥시장과 달러의 경로', '新兴市场与美元走势'], description: ['Macro scenarios for FX, commodities and emerging-market risk premia.', 'FX, 원자재와 신흥시장 리스크 프리미엄의 거시 시나리오입니다.', '外汇、大宗商品和新兴市场风险溢价的宏观情景。'], age: ['2 DAYS AGO', '2일 전', '2天前'], duration: '21:51', tone: 'blue', channel: 'Goldman Sachs', link: 'https://www.youtube.com/@GoldmanSachs' },
]

export default function MediaPage() {
  const [language, setLanguage] = useState<Language>('ko')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(stories[0])
  const t = copy[language]
  const visible = useMemo(() => filter === 'ALL' ? stories : stories.filter((story) => story.key === filter), [filter])
  const text = (value: string[]) => value[language === 'en' ? 0 : language === 'ko' ? 1 : 2]

  return (
    <main className="terminal-shell media-shell">
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

      <section className="media-feature panel">
        <div className={`media-feature-visual tone-${selected.tone}`}>
          <Play size={30} fill="currentColor" />
          <span>{t.embed}</span>
        </div>
        <div className="media-feature-copy">
          <span className="overline">
            {t.featured} · {selected.source} · {categories[language][categoryKeys.indexOf(selected.key)]}
          </span>
          <h2>{text(selected.title)}</h2>
          <p>{text(selected.description)}</p>
          <div className="media-meta">
            <span>{selected.channel}</span>
            <span>{text(selected.age)}</span>
            <span>{selected.duration}</span>
          </div>
          <a className="primary-button media-watch" href={selected.link} target="_blank" rel="noreferrer">
            {t.watch} <ExternalLink size={13} />
          </a>
        </div>
      </section>

      <section className="media-grid">
        {visible.map((story) => (
          <button
            className={`media-card ${selected.title === story.title ? 'active' : ''}`}
            key={story.key + story.source}
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
                <span>{story.channel}</span>
                <span>{text(story.age)}</span>
              </div>
              <span className="card-link">
                {t.brief} <ArrowUpRight size={12} />
              </span>
            </div>
          </button>
        ))}
      </section>

      <footer className="media-footer">
        <span>{t.footer}</span>
        <Link href="/">{t.back}</Link>
      </footer>
    </main>
  )
}
