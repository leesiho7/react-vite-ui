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
const newsItems = [{ source: 'BLOOMBERG TERMINAL', tag: 'BTC', title: 'Bitcoin holds above $67K as institutional flows accelerate', impact: '8.6', sentiment: 'BULLISH', tone: 'positive', thumb: 'BTC' }, { source: 'REUTERS TECH', tag: 'NVDA', title: 'NVIDIA signals sustained demand across next-gen AI infrastructure', impact: '9.1', sentiment: 'BULLISH', tone: 'positive', thumb: 'NV' }, { source: 'FINANCIAL TIMES', tag: 'ETH', title: 'Ethereum staking activity reaches a new quarterly high', impact: '6.8', sentiment: 'NEUTRAL', tone: 'neutral', thumb: 'ETH' }]

type NewsItem = typeof newsItems[number]

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
  const [eventOpen, setEventOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [forkedStrategy, setForkedStrategy] = useState<string | null>(null)
  const [round, setRound] = useState(3)
  const [streak, setStreak] = useState(2)
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [humanWins, setHumanWins] = useState(2)
  const [aiWins, setAiWins] = useState(1)
  const [aiDirection, setAiDirection] = useState<'UP' | 'DOWN'>('UP')
  const [claimed, setClaimed] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [activeNews, setActiveNews] = useState<NewsItem>(newsItems[0])

  const copy = {
    en: { eyebrow: 'DECISION SUPPORT TERMINAL', title: <>Make the next<br /><em>informed</em> move.</>, description: <>Institutional-grade market intelligence for teams that<br className="desktop-only" /> value signal over noise.</>, search: 'Search asset, market, or metric...', run: 'RUN ANALYSIS', market: 'MARKET PULSE', signals: 'SIGNAL REGISTER', decision: 'INTEGRATED DECISION', insights: 'MODEL INSIGHTS', operations: 'OPERATIONS' },
    cn: { eyebrow: '决策支持终端', title: <>Make the next<br /><em>informed</em> move.</>, description: <>为重视信号而非噪音的团队提供<br className="desktop-only" /> 企业级市场情报。</>, search: '搜索资产、市场或指标...', run: '运行分析', market: '市场脉搏', signals: '信号登记', decision: '综合决策', insights: '模型洞察', operations: '运营' },
    ko: { eyebrow: '의사결정 지원 터미널', title: <>Make the next<br /><em>informed</em> move.</>, description: <>노이즈보다 신호를 중시하는 팀을 위한<br className="desktop-only" /> 엔터프라이즈급 시장 인텔리전스.</>, search: '자산, 시장 또는 지표 검색...', run: '분석 실행', market: '시장 펄스', signals: '시그널 레지스터', decision: '통합 의사결정', insights: '모델 인사이트', operations: '운영' },
  }[language]

  useMemo(() => { const timer = window.setInterval(() => setActiveNews((current) => newsItems[(newsItems.indexOf(current) + 1) % newsItems.length]), 4500); return () => window.clearInterval(timer) }, [])

  const selectNews = (item: NewsItem) => { setActiveNews(item); setSearched(`${item.tag}/USD`); setNewsOpen(true) }

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
        <div className="top-meta"><span className="live-dot" /> LIVE DATA <span className="top-divider" /> UTC 14:32:08 <button className={`league-link ${eventOpen ? 'active' : ''}`} onClick={() => setEventOpen(!eventOpen)}><Diamond /> 10-WIN LEAGUE</button><button className={`league-link ${communityOpen ? 'active' : ''}`} onClick={() => setCommunityOpen(!communityOpen)}><Diamond /> STRATEGY COMMONS</button><button className={`league-link ${newsOpen ? 'active' : ''}`} onClick={() => setNewsOpen(!newsOpen)}><Diamond /> LIVE NEWSWIRE</button><span className="language-switcher" aria-label="Language selector">{(Object.keys(languageLabels) as Language[]).map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}>{languageLabels[item]}</button>)}</span></div>
        <div className="account-toggle"><a href="/login">SIGN IN / ACCESS</a></div>
      </header>

      {eventOpen && <section className="league-section"><div className="league-header"><div><div className="eyebrow"><Diamond /> 24H PREDICTION LEAGUE <span>EVENT / 001</span></div><h2>10 wins.<br /><em>One claim.</em></h2><p>Predict the next market move. Complete ten consecutive rounds<br className="desktop-only" /> to unlock the reserved USDT reward pool.</p></div><div className="pool-readout"><span>RESERVED POOL</span><strong>10,000.00 <small>USDT</small></strong><span className="status-tag">ESCROW READY</span></div></div><div className="versus-board"><div className="versus-side"><span className="overline">AI DECISION</span><strong>{aiDirection}</strong><small>MODEL CONSENSUS · 87.4%</small></div><div className="versus-mark">VS</div><div className="versus-side human"><span className="overline">HUMAN DECISION</span><strong>{prediction || '—'}</strong><small>YOUR CURRENT PICK</small></div><div className="scoreline"><span>HUMAN WINS <strong>{humanWins}</strong></span><span>AI WINS <strong>{aiWins}</strong></span></div></div><div className="league-progress"><div><span>BEAT AI <strong>{humanWins} / 10</strong></span><span>ROUND <strong>{round} / 10</strong></span></div><div className="progress-track"><i style={{ width: `${Math.min(humanWins * 10, 100)}%` }} /></div></div><div className="prediction-card panel"><div className="panel-heading"><span><Diamond /> ROUND {String(round).padStart(2, '0')} · BTC / USD</span><span className="muted">NEXT 24H CLOSE</span></div><div className="prediction-body"><div><span className="overline">CURRENT PRICE</span><strong>$67,842.10</strong><p>Select the direction you expect before the market window closes.</p></div><div className="prediction-actions"><button className={prediction === 'UP' ? 'prediction selected up' : 'prediction up'} onClick={() => setPrediction('UP')}>↑ <span>UP</span><small>ABOVE CURRENT</small></button><button className={prediction === 'DOWN' ? 'prediction selected down' : 'prediction down'} onClick={() => setPrediction('DOWN')}>↓ <span>DOWN</span><small>BELOW CURRENT</small></button></div></div><button className="primary-button submit-prediction" disabled={!prediction || submitted} onClick={() => { const humanBeatAi = prediction !== aiDirection; setSubmitted(true); setHumanWins((value) => Math.min(value + (humanBeatAi ? 1 : 0), 10)); setAiWins((value) => Math.min(value + (humanBeatAi ? 0 : 1), 10)); setStreak(Math.min(streak + (humanBeatAi ? 1 : 0), 10)); setRound(Math.min(round + 1, 10)); setAiDirection(aiDirection === 'UP' ? 'DOWN' : 'UP') }}>{submitted ? 'PREDICTION RECORDED' : prediction ? 'SUBMIT PREDICTION' : 'SELECT A DIRECTION'} <span>↗</span></button></div><div className="claim-strip"><span><Diamond /> CLAIM STATUS</span><strong>{claimed ? 'SIMULATED CLAIM COMPLETE' : humanWins >= 10 ? 'REWARD UNLOCKED · BEAT AI 10 TIMES' : `${10 - humanWins} AI wins remaining`}</strong><button className="export-button" disabled={humanWins < 10 || claimed} onClick={() => setClaimed(true)}>{claimed ? 'CLAIMED' : `CLAIM ${humanWins >= 10 ? '10,000.00' : 'USDT'}`} <span>↗</span></button></div></section>}

      {communityOpen && <section className="commons-section"><div className="commons-header"><div><div className="eyebrow"><Diamond /> STRATEGY COMMONS <span>PUBLIC / VERIFIED</span></div><h2>Proof over<br /><em>performance.</em></h2><p>Open strategies ranked by facts, backtests, and reproducible results.<br className="desktop-only" /> Fork any strategy and run it freely on your own chart.</p></div><div className="commons-stats"><span>OPEN STRATEGIES <strong>248</strong></span><span>VERIFIED BACKTESTS <strong>1,904</strong></span></div></div><div className="leaderboard panel"><div className="panel-heading"><span><Diamond /> TRANSPARENT LEADERBOARD</span><span className="status-tag">DATA VERIFIED</span></div><div className="strategy-head"><span>RANK / STRATEGY</span><span>AUTHOR</span><span>30D RETURN</span><span>MAX DD</span><span>ACTION</span></div>{[['01','Adaptive Trend Matrix','mina.k','+42.8%','-8.4%'],['02','Regime Switch Alpha','quant-lab','+36.1%','-11.2%'],['03','Volatility Carry Lite','open-hedge','+29.7%','-6.8%']].map(([rank, name, author, ret, dd]) => <div className="strategy-row" key={name}><span className="strategy-rank">{rank}</span><span className="strategy-name"><strong>{name}</strong><small>OPEN SOURCE · BACKTESTED 2019–2024</small></span><span>{author}</span><span className="return-value">{ret}</span><span className="drawdown">{dd}</span><button className="fork-button" onClick={() => setForkedStrategy(name)}>{forkedStrategy === name ? 'FORKED' : 'FORK & RUN'} <span>↗</span></button></div>)}</div><div className="commons-note"><span><Diamond /> PUBLIC-GOOD PROTOCOL</span><p>Every result includes source logic, data window, assumptions, and drawdown. No claims without a reproducible run.</p>{forkedStrategy && <strong>✓ {forkedStrategy} loaded into your chart workspace.</strong>}</div></section>}

      {newsOpen && <section className="news-section"><div className="news-live-bar"><span className="live-dot pulse" /> LIVE NEWSWIRE <span className="news-timer">ROLLING · 00:04.5</span><button onClick={() => setNewsOpen(false)}>CLOSE ×</button></div><div className="news-layout"><button className="news-lead" onClick={() => selectNews(activeNews)}><div className="news-thumb hero-thumb">{activeNews.thumb}</div><div className="news-lead-copy"><span className="overline">{activeNews.source} · {activeNews.tag}</span><h2>{activeNews.title}</h2><div className="news-meta"><span className={`sentiment ${activeNews.tone}`}>{activeNews.sentiment}</span><span>MARKET IMPACT <strong>{activeNews.impact}/10</strong></span><span>JUST NOW</span></div></div></button><div className="media-feed">{newsItems.map((item) => <button className={`feed-item ${item.title === activeNews.title ? 'active' : ''}`} key={item.title} onClick={() => selectNews(item)}><div className="news-thumb">{item.thumb}</div><div><span className="feed-source">{item.source} <b>{item.tag}</b></span><strong>{item.title}</strong><div><span className={`sentiment ${item.tone}`}>{item.sentiment}</span><span className="impact">IMPACT {item.impact}</span></div></div></button>)}</div></div><div className="news-route"><Diamond /> CLICK A HEADLINE TO ROUTE {activeNews.tag} INTO MARKET PULSE + AI DECISION <span>↗</span></div></section>}

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
