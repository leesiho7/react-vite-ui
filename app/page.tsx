'use client'

import { useMemo, useState } from 'react'

const assets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$67,842.10', change: '+2.84%', signal: 'BUY', tone: 'positive' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,482.66', change: '+1.17%', signal: 'HOLD', tone: 'neutral' },
  { symbol: 'SOL', name: 'Solana', price: '$184.28', change: '-0.42%', signal: 'WATCH', tone: 'negative' },
]

const insights = [
  ['01', 'Order flow', 'Accumulation detected across 4H and daily windows.', 'HIGH'],
  ['02', 'Momentum', 'Relative strength remains above the 20D baseline.', 'MED'],
  ['03', 'Risk', 'Funding divergence suggests elevated short squeeze risk.', 'MED'],
]

const languageLabels = { en: 'EN', cn: 'CN', ko: 'KO' } as const

type Language = keyof typeof languageLabels

function Diamond() {
  return <span className="diamond" aria-hidden="true">◆</span>
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('4H')
  const [stance, setStance] = useState('BUY')
  const [watching, setWatching] = useState(false)
  const [searched, setSearched] = useState('BTC/USD')
  const [language, setLanguage] = useState<Language>('en')

  const copy = {
    en: { eyebrow: 'DECISION SUPPORT TERMINAL', title: <>Make the next<br /><em>informed</em> move.</>, description: <>Institutional-grade market intelligence for teams that<br className="desktop-only" /> value signal over noise.</>, search: 'Search asset, market, or metric...', run: 'RUN ANALYSIS', market: 'MARKET PULSE', signals: 'SIGNAL REGISTER', decision: 'INTEGRATED DECISION', insights: 'MODEL INSIGHTS', operations: 'OPERATIONS' },
    cn: { eyebrow: '决策支持终端', title: <>Make the next<br /><em>informed</em> move.</>, description: <>为重视信号而非噪音的团队提供<br className="desktop-only" /> 企业级市场情报。</>, search: '搜索资产、市场或指标...', run: '运行分析', market: '市场脉搏', signals: '信号登记', decision: '综合决策', insights: '模型洞察', operations: '运营' },
    ko: { eyebrow: '의사결정 지원 터미널', title: <>Make the next<br /><em>informed</em> move.</>, description: <>노이즈보다 신호를 중시하는 팀을 위한<br className="desktop-only" /> 엔터프라이즈급 시장 인텔리전스.</>, search: '자산, 시장 또는 지표 검색...', run: '분석 실행', market: '시장 펄스', signals: '시그널 레지스터', decision: '통합 의사결정', insights: '모델 인사이트', operations: '운영' },
  }[language]

  const filteredAssets = useMemo(() => assets.filter((asset) =>
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(query.toLowerCase())
  ), [query])

  return (
    <main className="terminal-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div><strong>AETHER</strong><span>MARKET INTELLIGENCE</span></div>
        </div>
        <div className="top-meta"><span className="live-dot" /> LIVE DATA <span className="top-divider" /> UTC 14:32:08 <span className="language-switcher" aria-label="Language selector">{(Object.keys(languageLabels) as Language[]).map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}>{languageLabels[item]}</button>)}</span></div>
        <button className="account-button">ACCOUNT <span>JD</span></button>
      </header>

      <section className="hero-section">
        <div className="eyebrow"><Diamond /> {copy.eyebrow} <span>v2.4.1</span></div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.description}</p>
        <div className="search-row">
          <label className="search-box"><span>/</span><input aria-label="Search market" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setSearched(query.toUpperCase() || 'BTC/USD'); setQuery('') } }} placeholder="Search asset, market, or metric..." /><kbd>⌘ K</kbd></label>
          <button className="primary-button" onClick={() => setSearched(query.toUpperCase() || 'BTC/USD')}>{copy.run} <span>↗</span></button>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="market-panel panel">
          <div className="panel-heading"><span><Diamond /> MARKET PULSE</span><span className="muted">{searched} / {period}</span></div>
          <div className="asset-tabs">{['BTC/USD', 'ETH/USD', 'SOL/USD'].map((item) => <button className={searched === item ? 'active' : ''} key={item} onClick={() => setSearched(item)}>{item}</button>)}</div>
          <div className="price-row"><div><span className="overline">{searched} · SPOT</span><strong>{searched === 'ETH/USD' ? '$3,482.66' : searched === 'SOL/USD' ? '$184.28' : '$67,842.10'}</strong></div><span className="gain">+2.84% <small>24H</small></span></div>
          <div className="chart-wrap"><div className="chart-labels"><span>72K</span><span>68K</span><span>64K</span></div><div className="chart"><div className="chart-line" /><div className="chart-fill" /><span className="chart-point" /></div><div className="chart-time">00:00 <span>08:00</span><span>16:00</span><span>NOW</span></div></div>
          <div className="period-row">{['1H', '4H', '1D', '1W'].map((item) => <button className={period === item ? 'selected' : ''} key={item} onClick={() => setPeriod(item)}>{item}</button>)}</div>
        </div>

        <div className="signals-panel panel">
          <div className="panel-heading"><span><Diamond /> SIGNAL REGISTER</span><span className="status-tag">SYNCED</span></div>
          <div className="signal-list">{filteredAssets.map((asset) => <button className="signal-item" key={asset.symbol} onClick={() => setSearched(`${asset.symbol}/USD`)}><span className="asset-icon">{asset.symbol.slice(0, 1)}</span><span className="asset-name"><strong>{asset.symbol}/USD</strong><small>{asset.name}</small></span><span className="asset-price"><strong>{asset.price}</strong><small className={asset.tone}>{asset.change}</small></span><span className={`signal-badge ${asset.tone}`}>{asset.signal}</span><span className="chevron">›</span></button>)}</div>
          <div className="confidence"><div><span>AGGREGATE CONFIDENCE</span><strong>87.4%</strong></div><div className="confidence-bar"><i /></div><small>Based on 32 weighted indicators</small></div>
        </div>
      </section>

      <section className="decision-banner"><div className="decision-title"><span className="decision-icon">↗</span><div><span className="overline">INTEGRATED DECISION</span><strong>{stance} / {searched}</strong></div></div><div className="decision-score"><span>MODEL SCORE</span><strong>{stance === 'BUY' ? '8.7' : '5.4'} <small>/ 10</small></strong></div><div className="stance-toggle">{['BUY', 'SELL'].map((item) => <button className={stance === item ? 'active' : ''} key={item} onClick={() => setStance(item)}>{item}</button>)}</div></section>

      <section className="lower-grid"><div className="insights-panel panel"><div className="panel-heading"><span><Diamond /> MODEL INSIGHTS</span><button className="text-button">VIEW ALL ↗</button></div>{insights.map(([number, title, copy, level]) => <div className="insight-row" key={number}><span className="insight-number">{number}</span><div><strong>{title}</strong><p>{copy}</p></div><span className={`level ${level.toLowerCase()}`}>{level}</span></div>)}</div><div className="watch-panel panel"><div className="panel-heading"><span><Diamond /> OPERATIONS</span></div><div className="op-row"><span>WATCHLIST</span><strong>12 assets tracked</strong><button aria-label="Toggle watchlist" className={watching ? 'star active' : 'star'} onClick={() => setWatching(!watching)}>☆</button></div><div className="op-row"><span>LAST REFRESH</span><strong>14:31:55 UTC</strong><span className="refresh">↻</span></div><button className="export-button" onClick={() => alert('Report export queued.')}>EXPORT REPORT <span>↓</span></button></div></section>
      <footer><span>AETHER TERMINAL</span><span>DATA FOR DECISION MAKERS · NOT FINANCIAL ADVICE</span><span>STATUS: OPERATIONAL</span></footer>
    </main>
  )
}
