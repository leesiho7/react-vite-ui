'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import {
  fetchIntegratedDecision,
  fetchHistoricalCandles,
  fetchPredictionLeaderboard,
  fetchHiveMindBattle,
  fetchArenaLeaderboard
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
]

const languageLabels = { en: 'EN', cn: 'CN', ko: 'KO' } as const
const newsItems = [
  { source: 'BLOOMBERG TERMINAL', tag: 'BTC', title: '比特币站稳 67,000 美元上方，机构资金流入加速', impact: '8.6', sentiment: '看涨', tone: 'positive', thumb: 'BTC' },
  { source: 'REUTERS TECH', tag: 'NVDA', title: '英伟达显示下一代人工智能基础设施需求持续强劲', impact: '9.1', sentiment: '看涨', tone: 'positive', thumb: 'NV' },
  { source: 'FINANCIAL TIMES', tag: 'ETH', title: '以太坊质押活动创季度新高', impact: '6.8', sentiment: '中性', tone: 'neutral', thumb: 'ETH' }
]

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
  const [language, setLanguage] = useState<Language>('ko')
  const [eventOpen, setEventOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [orderbookOpen, setOrderbookOpen] = useState(true)
  const [forkedStrategy, setForkedStrategy] = useState<string | null>(null)
  
  // Real Backend Data State
  const [decisionReport, setDecisionReport] = useState<IntegratedDecisionReport | null>(null)
  const [candles, setCandles] = useState<CandleData[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardItem[]>([])
  const [battle, setBattle] = useState<HiveMindBattle | null>(null)
  const [strategies, setStrategies] = useState<ArenaStrategyItem[]>([])

  // Prediction Interactive State
  const [round, setRound] = useState(3)
  const [streak, setStreak] = useState(2)
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [humanWins, setHumanWins] = useState(2)
  const [aiWins, setAiWins] = useState(1)
  const [claimed, setClaimed] = useState(false)
  const [activeNews, setActiveNews] = useState<NewsItem>(newsItems[0])

  // Live Low-Latency WebSocket Hook (Direct Exchange Connection)
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

  // Fetch Backend APIs on symbol or period change
  useEffect(() => {
    const rawSymbol = searched.replace('/USD', '').replace('/USDT', '') + 'USDT'
    
    // 1. Integrated Decision
    fetchIntegratedDecision(rawSymbol, period, 100).then((rep) => {
      setDecisionReport(rep)
      if (rep.finalAction.includes('BUY')) setStance('BUY')
      else if (rep.finalAction.includes('SELL')) setStance('SELL')
      else setStance('HOLD')
    })

    // 2. Historical Candles
    fetchHistoricalCandles(rawSymbol, period, 40).then(setCandles)

    // 3. Battle & Arena Data
    fetchHiveMindBattle(rawSymbol).then(setBattle)
    fetchPredictionLeaderboard(10).then(setLeaderboard)
    fetchArenaLeaderboard('SEASON_1', 10).then(setStrategies)
  }, [searched, period])

  // Live News Rotator
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveNews((current) => newsItems[(newsItems.indexOf(current) + 1) % newsItems.length])
    }, 4500)
    return () => window.clearInterval(timer)
  }, [])

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
      operations: 'OPERATIONS'
    },
    cn: {
      eyebrow: 'AI 事实核查与开源量化终端',
      title: <>迈出下一步<br /><em>明智之选。</em></>,
      description: <>为重视客观事实而非噪音的团队提供<br className="desktop-only" /> 企业级市场情报与可验证策略。</>,
      search: '搜索资产、市场或量化策略...',
      run: '运行分析',
      market: '实时市场脉搏',
      signals: '信号登记',
      decision: '综合决策',
      insights: 'AI 事实核查与推理',
      operations: '运营与导出'
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
      operations: '운영 및 내보내기'
    },
  }[language]

  const englishPersona = (value: string | undefined, fallback: string) => value && !/[가-힣]/.test(value) ? value : fallback

  const selectNews = (item: NewsItem) => {
    setActiveNews(item)
    setSearched(`${item.tag}/USD`)
    setNewsOpen(true)
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
              <p>Compete against the AI quant model on the next 24H market direction.<br className="desktop-only" /> Claim the 10,000 USDT reward pool after ten consecutive wins.</p>
            </div>
            <div className="pool-readout">
              <span>RESERVED POOL</span>
              <strong>10,000.00 <small>USDT</small></strong>
              <span className="status-tag">ESCROW READY</span>
            </div>
          </div>

          <div className="versus-board">
            <div className="versus-side">
              <span className="overline">AI QUANT MODEL</span>
              <strong>{battle?.aiDecision || 'BULLISH'}</strong>
              <small>CONFIDENCE: {Math.round((battle?.aiConfidenceScore || 0.68) * 100)}%</small>
            </div>
            <div className="versus-mark">VS</div>
            <div className="versus-side human">
              <span className="overline">HUMAN CONSENSUS</span>
              <strong>{battle?.humanBullPercentage || 71.5}% BULL</strong>
              <small>{battle?.totalHumanVotes || 1420} VOTERS PARTICIPATING</small>
            </div>
            <div className="scoreline">
              <span>HUMAN WINS <strong>{humanWins}</strong></span>
              <span>AI WINS <strong>{aiWins}</strong></span>
            </div>
          </div>

          <div className="league-progress">
            <div>
              <span>BEAT AI <strong>{humanWins} / 10</strong></span>
              <span>ROUND <strong>{round} / 10</strong></span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${Math.min(humanWins * 10, 100)}%` }} />
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

            <button
              className="primary-button submit-prediction"
              disabled={!prediction || submitted}
              onClick={() => {
                setSubmitted(true)
                setHumanWins((v) => Math.min(v + 1, 10))
                setStreak((v) => v + 1)
                setRound((v) => Math.min(v + 1, 10))
              }}
            >
              {submitted ? 'PREDICTION RECORDED (+0.5 AETHER)' : prediction ? 'SUBMIT PREDICTION ↗' : 'SELECT DIRECTION'}
            </button>
          </div>
        </section>
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

      {/* ── Live Newswire ── */}
      {newsOpen && (
        <section className="news-section">
          <div className="news-live-bar">
            <span className="live-dot pulse" /> LIVE NEWSWIRE
            <span className="news-timer">4.5S ROLLING · AI FACT-CHECKED</span>
            <button onClick={() => setNewsOpen(false)}>CLOSE ×</button>
          </div>
          <div className="news-layout">
            <button className="news-lead" onClick={() => selectNews(activeNews)}>
              <div className="news-thumb hero-thumb">{activeNews.thumb}</div>
              <div className="news-lead-copy">
                <span className="overline">{activeNews.source} · {activeNews.tag}</span>
                <h2>{activeNews.title}</h2>
                <div className="news-meta">
                  <span className={`sentiment ${activeNews.tone}`}>{activeNews.sentiment}</span>
                  <span>AI IMPACT <strong>{activeNews.impact}/10</strong></span>
                  <span>FACT-CHECK VERIFIED</span>
                </div>
              </div>
            </button>
            <div className="media-feed">
              {newsItems.map((item) => (
                <button
                  className={`feed-item ${item.title === activeNews.title ? 'active' : ''}`}
                  key={item.title}
                  onClick={() => selectNews(item)}
                >
                  <div className="news-thumb">{item.thumb}</div>
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
        <div className="eyebrow"><Diamond /> {copy.eyebrow} <span>SPRING AI + CHROMA 4-ENGINE</span></div>
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
                  setSearched(query.toUpperCase() || 'BTC/USD')
                  setQuery('')
                }
              }}
              placeholder="BTC, ETH, SOL, NVDA 검색..."
            />
            <kbd>⌘ K</kbd>
          </label>
          <button className="primary-button" onClick={() => setSearched(query.toUpperCase() || 'BTC/USD')}>
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
              const item = `${asset.symbol}/USD`
              return <button className={searched === item ? 'active' : ''} key={item} onClick={() => setSearched(item)}><img className="asset-logo" src={asset.logo} alt={`${asset.name} logo`} />{item}</button>
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
            {['1H', '4H', '1D', '1W'].map((item) => (
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
            <span className="status-tag">AI FACT-CHECK ACTIVE</span>
          </div>

          <div className="signal-list">
            {filteredAssets.map((asset) => (
              <button
                className="signal-item"
                key={asset.symbol}
                onClick={() => setSearched(`${asset.symbol}/USD`)}
              >
                <span className="asset-icon"><img src={asset.logo} alt={`${asset.name} logo`} /></span>
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
              <strong>{decisionReport?.totalScore ? `+${decisionReport.totalScore}` : '+0.68'}</strong>
            </div>
            <div className="confidence-bar">
              <i style={{ width: `${Math.round(((decisionReport?.totalScore || 0.68) + 1) * 50)}%` }} />
            </div>
            <small>
              {decisionReport?.divergenceRisk || 'NORMAL: Technical indicators and macro sentiment remain aligned.'}
            </small>
          </div>

          <div className="advisory-briefing">
            <span className="advisory-title">3 EXPERT AI ADVISORY BRIEFING</span>
            <div><b>BUFFETT</b><span>{englishPersona(decisionReport?.personaAdvice?.warrenBuffett, 'Stay focused on durable fundamentals and ignore short-term noise.')}</span></div>
            <div><b>SIMONS</b><span>{englishPersona(decisionReport?.personaAdvice?.jimSimons, 'Statistical edge detected as RSI and moving averages trend higher.')}</span></div>
            <div><b>DALIO</b><span>{englishPersona(decisionReport?.personaAdvice?.rayDalio, 'Respect the liquidity cycle and maintain a 20% cash buffer.')}</span></div>
          </div>
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
              {decisionReport?.decisionReason || 'Quant indicators, news sentiment, and historical fractal patterns support a strong uptrend.'}
            </p>
          </div>
        </div>

        <div className="decision-score">
          <span>MODEL SCORE</span>
          <strong>{decisionReport?.totalScore || '+0.68'} <small>/ 1.0</small></strong>
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
              <strong>MACRO & NEWS SENTIMENT ANALYSIS</strong>
              <p>{decisionReport?.qualInsight?.macroSummary || 'Fed signals a rate hold while Bitcoin spot ETFs see $480M in net inflows.'}</p>
            </div>
            <span className="level high">HIGH</span>
          </div>

          <div className="insight-row">
            <span className="insight-number">02</span>
            <div>
              <strong>HISTORICAL FRACTAL PATTERN MATCH (89%)</strong>
              <p>{decisionReport?.patternInsight?.patternSummary || '과거 유사 패턴 5건 중 4건(승률 80%)에서 5일 내 평균 +6.4% 추가 상승'}</p>
            </div>
            <span className="level high">80% WIN</span>
          </div>

          <div className="insight-row">
            <span className="insight-number">03</span>
            <div>
              <strong>KEY RISKS & INVALIDATION CONDITIONS</strong>
              <p>{decisionReport?.qualInsight?.riskFactors || '주요 저항선 돌파 실패 시 단기 차익 실현 조정 가능성 주시'}</p>
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
          <button className="export-button" onClick={() => alert('공공 팩트체크 리포트 PDF 다운로드가 큐에 등록되었습니다.')}>
            EXPORT REPORT <span>↓</span>
          </button>
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
