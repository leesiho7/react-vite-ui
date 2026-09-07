'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMarketWebSocket } from '../lib/useMarketWebSocket'

interface SpeedGameProps {
  symbol?: string
  basePrice?: number
  currentPrice?: number
  priceDelta?: number
  priceDeltaPct?: number
}

export function PolymarketSpeedGameCard({
  symbol = 'BTC/USD',
  basePrice = 79409.09,
  currentPrice = 79422.77,
  priceDelta = 13.68,
  priceDeltaPct = 0.017
}: SpeedGameProps) {
  const [mounted, setMounted] = useState(false)
  const [choice, setChoice] = useState<'up' | 'down' | null>(null)
  const [fiveMinWins, setFiveMinWins] = useState<number>(0)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [round, setRound] = useState<number>(1)
  const [remainingSec, setRemainingSec] = useState<number>(300)

  // Real-time WebSocket Ticker Integration
  const pair = `${symbol.replace('/USD', '').replace('/USDT', '')}/USDT`
  const { price: wsPrice } = useMarketWebSocket(pair)
  const livePrice = wsPrice > 0 ? wsPrice : (currentPrice || 79422.77)
  const targetPrice = basePrice || 79409.09

  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 34 }, (_, index) => livePrice - (34 - index) * livePrice * 0.00012)
  )
  const [animatedPrice, setAnimatedPrice] = useState(livePrice)

  // Smooth Price Easing Animation
  useEffect(() => {
    let frame = 0
    const from = animatedPrice
    const started = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - started) / 650, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedPrice(from + (livePrice - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [livePrice])

  // Accumulate price history ticks
  useEffect(() => {
    if (!livePrice) return
    setHistory((current) => [...current.slice(-59), livePrice])
  }, [livePrice])

  // Chart Geometry Calculation
  const chartGeometry = useMemo(() => {
    const values = history.length ? history : [livePrice]
    const minimum = Math.min(...values, targetPrice)
    const maximum = Math.max(...values, targetPrice)
    const spread = Math.max(maximum - minimum, livePrice * 0.0006)
    const points = values.map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 700
      const y = 150 - ((value - minimum) / spread) * 115
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    const targetY = 150 - ((targetPrice - minimum) / spread) * 115
    const clampedTargetY = Math.max(12, Math.min(150, targetY))

    const linePointsStr = points.join(' ')
    const pathLinePoints = points.join(' L ')
    const linePath = `M ${pathLinePoints}`
    const areaPath = `M ${pathLinePoints} L 700 165 L 0 165 Z`

    return { line: linePointsStr, linePath, areaPath, targetY: clampedTargetY }
  }, [history, animatedPrice, targetPrice, livePrice])

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('aether_5m_streak')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.wins === 'number') setFiveMinWins(parsed.wins)
        if (typeof parsed.round === 'number') setRound(parsed.round)
      }
    } catch (e) {
      console.warn('Failed to load 5m streak:', e)
    }
  }, [])

  // 5분(300초) 실시간 카운트다운 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          return 300
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  const format5MCountdown = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const cleanSymbol = symbol.replace('/USD', '').replace('/USDT', '')
  const displayBase = targetPrice
  const displayCurrent = animatedPrice
  const displayDelta = displayCurrent - displayBase
  const displayDeltaPct = displayBase ? (displayDelta / displayBase) * 100 : 0
  const isUpWinning = displayDelta >= 0

  const handleSettle = () => {
    const isWin = true // 시뮬레이션 즉시 정산 승리
    const newWins = isWin ? Math.min(10, fiveMinWins + 1) : 0
    const nextRound = isWin && fiveMinWins + 1 >= 10 ? 1 : round + 1
    setFiveMinWins(newWins)
    setRound(nextRound)
    setSubmitted(false)
    setChoice(null)
    try {
      localStorage.setItem('aether_5m_streak', JSON.stringify({ wins: newWins, round: nextRound }))
    } catch (e) {
      console.warn('Failed to save 5m streak:', e)
    }
  }

  const strokeColor = '#f47a20'
  const gradientStopColor = '#f47a20'

  return (
    <div className="speed-card" style={{ maxWidth: '100%', margin: '0 0 24px' }} aria-label="5분 스피드게임">
      {/* Top Header Bar */}
      <div className="speed-topline">
        <div className="speed-asset">
          <span className="coin-icon">
            {cleanSymbol === 'BTC' ? '₿' : cleanSymbol === 'ETH' ? 'Ξ' : 'S'}
          </span>
          <strong>{symbol} · 5M FLASH STREAK ROUND #{round}</strong>
        </div>
        <div className="speed-pagination">
          <span style={{ fontSize: '11px', color: (remainingSec <= 60) ? '#b45309' : '#475569', fontWeight: 700 }}>
            {(remainingSec <= 60) ? '1M LOCKOUT' : '5M SUBMISSIONS OPEN'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 16px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          Will {symbol} close Green (Up) at 5M Candle Settlement?
        </h1>

        {/* 5-Min Streak Badge Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>5분봉 {fiveMinWins}/10연승</span>
          {submitted && (
            <button
              type="button"
              onClick={handleSettle}
              style={{ fontSize: '9px', background: '#059669', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 5분 라운드 즉시 정산
            </button>
          )}
        </div>
      </div>

      {/* 5-Min Streak Dot Matrix Tracker (1H 게임 트래커와 간격 및 규격 동일 연동) */}
      <div style={{ margin: '0 0 20px', padding: '14px 18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '12px', color: '#18334a' }}>5분봉 10연승 연승 트래커 (5M Flash Streak)</strong>
            <span style={{ fontSize: '9.5px', color: '#64748b' }}>
              현재 <b>{fiveMinWins} / 10</b> 승 달성 ({10 - fiveMinWins}승 남음)
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>
            {fiveMinWins >= 10 ? '🏆 10연승 전설 달성!' : `5분 실시간 정산 모드`}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
          {Array.from({ length: 10 }).map((_, idx) => {
            const stepNum = idx + 1
            const isWon = stepNum <= fiveMinWins
            const isCurrent = stepNum === round && !isWon
            const isPending = isCurrent && submitted
            const isFinal = stepNum === 10

            return (
              <div
                key={idx}
                style={{
                  border: isPending
                    ? '2px solid #f59e0b'
                    : isCurrent
                    ? '2px solid #0284c7'
                    : isWon
                    ? '1px solid #10b981'
                    : isFinal
                    ? '1px dashed #f59e0b'
                    : '1px solid #e2e8f0',
                  background: isWon
                    ? '#ecfdf5'
                    : isPending
                    ? '#fffbeb'
                    : isCurrent
                    ? '#f0f9ff'
                    : isFinal
                    ? '#fffbeb'
                    : '#f8fafb',
                  padding: '8px 4px',
                  borderRadius: '4px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '8px', color: isWon ? '#059669' : isPending ? '#b45309' : isCurrent ? '#0284c7' : '#94a3b8', fontWeight: 700 }}>
                  {isFinal ? '🏆 FINAL' : `R${stepNum}`}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: isWon ? '#059669' : isPending ? '#d97706' : isCurrent ? '#0369a1' : isFinal ? '#d97706' : '#94a3b8', marginTop: '2px' }}>
                  {isWon ? 'WIN' : isPending ? `${choice || 'PENDING'} ⏳` : isCurrent ? 'READY' : isFinal ? '$5' : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="speed-content">
        {/* Left Voting Panel */}
        <aside className="speed-vote-panel">
          <button
            type="button"
            className={`speed-vote ${choice === 'up' ? 'selected up' : ''}`}
            disabled={submitted || remainingSec <= 60}
            onClick={() => setChoice('up')}
          >
            <span className="vote-icon">▲</span>
            <span>Predict Up (5M)</span>
          </button>

          <button
            type="button"
            className={`speed-vote ${choice === 'down' ? 'selected down' : ''}`}
            disabled={submitted || remainingSec <= 60}
            onClick={() => setChoice('down')}
          >
            <span className="vote-icon">▼</span>
            <span>Predict Down (5M)</span>
          </button>

          <span className="speed-volume">
            5M ROUND #{round} CLOSES IN: <strong>{format5MCountdown(remainingSec)}</strong>
          </span>
        </aside>

        {/* Right Chart & Stats Area */}
        <div className="speed-chart-area">
          <div className="speed-stats">
            <div>
              <span>TO BEAT</span>
              <strong>${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <small>5 minute target</small>
            </div>
            <div>
              <span>LIVE</span>
              <strong>${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <small style={{ color: displayDeltaPct >= 0 ? '#09a576' : '#d91d24' }}>
                {displayDeltaPct >= 0 ? '+' : ''}{displayDeltaPct.toFixed(3)}% from target
              </small>
            </div>
            <div>
              <span>ROUND CLOSES IN</span>
              <strong style={{ color: '#f47a20' }}>{format5MCountdown(remainingSec)}</strong>
              <small>5M CANDLE</small>
            </div>
          </div>

          <div className="speed-chart">
            <svg viewBox="0 0 700 170" role="img" preserveAspectRatio="none">
              <defs>
                <linearGradient id="speedChartGradient5M" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientStopColor} stopOpacity="0.38" />
                  <stop offset="70%" stopColor={gradientStopColor} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path className="chart-grid" d="M0 20H700M0 58H700M0 96H700M0 134H700M0 165H700" />
              <polyline className="chart-area" points={`0,150 ${chartGeometry.line} 700,150`} fill="url(#speedChartGradient5M)" />
              <polyline className="chart-line" points={chartGeometry.line} style={{ stroke: strokeColor }} />
              <line className="chart-target" x1="0" y1={chartGeometry.targetY} x2="700" y2={chartGeometry.targetY} />
              <circle cx="700" cy={Number(chartGeometry.line.split(' ').at(-1)?.split(',')[1] ?? 43)} r="6" className="chart-dot" style={{ fill: strokeColor }} />
            </svg>

            <div className="chart-label target-label" style={{ top: `${Math.max(0, Math.min(130, chartGeometry.targetY - 20))}px`, transition: 'top 0.5s ease' }}>
              ${displayCurrent.toFixed(2)}
              <b style={{ color: displayDeltaPct >= 0 ? '#09a576' : '#d91d24' }}>
                {displayDeltaPct >= 0 ? `+${displayDeltaPct.toFixed(2)}%` : `${displayDeltaPct.toFixed(2)}%`}
              </b>
            </div>

            <div className="chart-axis">
              <span>00:00</span>
              <span>01:15</span>
              <span>02:30</span>
              <span>03:45</span>
              <span>05:00</span>
            </div>

            <div className="chart-baseline">
              ${displayBase.toFixed(2)} BASELINE ⌄
            </div>
          </div>
        </div>
      </div>

      {/* Real Submission Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          type="button"
          style={{
            width: '100%',
            height: '46px',
            background: submitted ? '#1e293b' : (remainingSec <= 60) ? '#475569' : choice ? (choice === 'up' ? '#059669' : '#dc2626') : '#94a3b8',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '.06em',
            borderRadius: '4px',
            border: 'none',
            cursor: (!choice || submitted || remainingSec <= 60) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
          disabled={!choice || submitted || (remainingSec <= 60 && !submitted)}
          onClick={() => {
            if (!choice || submitted || remainingSec <= 60) return
            setSubmitted(true)
            try {
              localStorage.setItem('aether_5m_streak', JSON.stringify({ wins: fiveMinWins, round, submitted: true }))
            } catch (e) {
              console.warn('Failed to save 5m streak:', e)
            }
          }}
        >
          {submitted
            ? `ROUND #${round} [${choice === 'up' ? '상승(UP)' : '하락(DOWN)'}] 5분 예측 제출 완료 (실시간 정산 관전 중)`
            : (remainingSec <= 60)
            ? `ROUND #${round} 마감 1분 전 락아웃 (신규 예측 마감 · 실시간 관전 모드)`
            : choice
            ? `ROUND #${round} [${choice === 'up' ? '상승(UP)' : '하락(DOWN)'}] 5분 예측 제출하기 (5분봉 10연승 도전)`
            : '위 카드에서 예측 방향(UP 또는 DOWN)을 먼저 선택해주세요'}
        </button>
      </div>

      <p className="speed-disclaimer" style={{ marginTop: '16px', marginBottom: 0 }}>
        AETHER SPEED GAME · 5 MINUTE FLASH STREAK LEAGUE · REAL-TIME MARKET DATA FEED
      </p>
    </div>
  )
}

export default PolymarketSpeedGameCard
