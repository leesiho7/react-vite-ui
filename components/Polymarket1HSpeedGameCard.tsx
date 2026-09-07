'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMarketWebSocket } from '../lib/useMarketWebSocket'
import { fetchActivePrediction } from '../lib/api'

interface SpeedGame1HProps {
  searched?: string
  numericBasePrice?: number
  latestHistoryPrice?: number
  priceDelta?: number
  priceDeltaPct?: number
  round?: number
  prediction?: 'UP' | 'DOWN' | null
  submitted?: boolean
  hourlyRemainingSec?: number
  effectiveBullPct?: number
  effectiveBearPct?: number
  userId?: number
  onSelectPrediction?: (direction: 'UP' | 'DOWN') => void
  onSubmitPrediction?: () => void
}

export function Polymarket1HSpeedGameCard({
  searched = 'BTC/USD',
  numericBasePrice = 79409.09,
  latestHistoryPrice = 79422.77,
  priceDelta = 13.68,
  priceDeltaPct = 0.017,
  round = 1,
  prediction = null,
  submitted = false,
  hourlyRemainingSec = 2430,
  effectiveBullPct = 50,
  effectiveBearPct = 50,
  userId = 1,
  onSelectPrediction,
  onSubmitPrediction
}: SpeedGame1HProps) {
  const [mounted, setMounted] = useState(false)

  // Real-time WebSocket Ticker Integration
  const symbol = searched || 'BTC/USD'
  const pair = `${symbol.replace('/USD', '').replace('/USDT', '')}/USDT`
  const { price: wsPrice } = useMarketWebSocket(pair)
  const livePrice = wsPrice > 0 ? wsPrice : (latestHistoryPrice || 79422.77)
  const targetPrice = numericBasePrice || 79409.09

  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 34 }, (_, index) => livePrice - (34 - index) * livePrice * 0.00012)
  )
  const [animatedPrice, setAnimatedPrice] = useState(livePrice)

  // 페이지/배포 리로드 시 백엔드 DB에서 현재 활성화된 예측 상태 자동 조회 및 복원
  useEffect(() => {
    setMounted(true)
    const rawSymbol = symbol.replace('/USD', '').replace('/USDT', '') + 'USDT'
    fetchActivePrediction(userId, rawSymbol).then((active) => {
      if (active && active.status === 'PENDING') {
        const dir = (active.predictedDirection === 'BULL' || active.predictedDirection === 'UP') ? 'UP' : 'DOWN'
        onSelectPrediction?.(dir)
      }
    }).catch((err) => {
      console.warn('Failed to restore active prediction from DB:', err)
    })
  }, [userId, symbol])

  // Smooth Price Easing Animation (650ms Cubic Easing)
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

  // 5초 간격 1H 차트 다운샘플링 축적 (1H 차트선 찌그러짐/잡음 방지)
  useEffect(() => {
    if (!livePrice) return
    const timer = setInterval(() => {
      setHistory((current) => [...current.slice(-35), livePrice])
    }, 5000)
    return () => clearInterval(timer)
  }, [livePrice])

  // SVG Chart Geometry Calculation (1H 고유의 안정적 Y축 스케일 및 라이브 이징 연동)
  const chartGeometry = useMemo(() => {
    // 히스토리 배열 마지막 지점에 실시간 보간 가격(animatedPrice)을 반영하여 스무스 연동
    const baseValues = history.length ? history : [livePrice]
    const values = [...baseValues.slice(0, -1), animatedPrice]
    
    const minimum = Math.min(...values, targetPrice)
    const maximum = Math.max(...values, targetPrice)
    // 1시간 차트에 적합한 0.25% 미니멈 변동폭 스프레드로 미세 틱 잡음 억제
    const spread = Math.max(maximum - minimum, livePrice * 0.0025)
    
    const points = values.map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 700
      const y = 150 - ((value - minimum) / spread) * 115
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    const targetY = 150 - ((targetPrice - minimum) / spread) * 115
    const clampedTargetY = Math.max(12, Math.min(150, targetY))

    const linePointsStr = points.join(' ')
    return { line: linePointsStr, targetY: clampedTargetY }
  }, [history, animatedPrice, targetPrice, livePrice])

  if (!mounted) return null

  const format1HCountdown = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const cleanSymbol = symbol.replace('/USD', '').replace('/USDT', '')
  const displayBase = targetPrice
  const displayCurrent = animatedPrice
  const displayDelta = displayCurrent - displayBase
  const displayDeltaPct = displayBase ? (displayDelta / displayBase) * 100 : 0

  const strokeColor = '#f47a20'
  const gradientStopColor = '#f47a20'
  const currentY = Number(chartGeometry.line.split(' ').at(-1)?.split(',')[1] ?? 43)

  return (
    <div className="speed-card" style={{ maxWidth: '100%', margin: '24px 0 0' }} aria-label="1시간 스피드게임">
      {/* Top Header Bar */}
      <div className="speed-topline">
        <div className="speed-asset">
          <span className="coin-icon">
            {cleanSymbol === 'BTC' ? '₿' : cleanSymbol === 'ETH' ? 'Ξ' : 'S'}
          </span>
          <strong>{symbol} · 1H ROUND #{round}</strong>
        </div>
        <div className="speed-pagination">
          <span style={{ fontSize: '11px', color: (hourlyRemainingSec <= 900) ? '#b45309' : '#475569', fontWeight: 700 }}>
            {(hourlyRemainingSec <= 900) ? '15M LOCKOUT' : '1H SUBMISSIONS OPEN'}
          </span>
        </div>
      </div>

      <h1 style={{ fontSize: '24px', margin: '18px 0 16px' }}>
        Will {symbol} close Green (Up) at 1H Round Settlement?
      </h1>

      <div className="speed-content">
        {/* Left Voting Panel */}
        <aside className="speed-vote-panel">
          <button
            type="button"
            className={`speed-vote ${prediction === 'UP' ? 'selected up' : ''}`}
            disabled={submitted || hourlyRemainingSec <= 900}
            onClick={() => onSelectPrediction?.('UP')}
          >
            <span className="vote-icon">▲</span>
            <span>Predict Up ({effectiveBullPct}%)</span>
          </button>

          <button
            type="button"
            className={`speed-vote ${prediction === 'DOWN' ? 'selected down' : ''}`}
            disabled={submitted || hourlyRemainingSec <= 900}
            onClick={() => onSelectPrediction?.('DOWN')}
          >
            <span className="vote-icon">▼</span>
            <span>Predict Down ({effectiveBearPct}%)</span>
          </button>

          <span className="speed-volume">
            ROUND #{round} CLOSES IN: <strong>{format1HCountdown(hourlyRemainingSec)}</strong>
          </span>
        </aside>

        {/* Right Chart & Stats Area */}
        <div className="speed-chart-area">
          <div className="speed-stats">
            <div>
              <span>TO BEAT</span>
              <strong>${displayBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <small>1 hour target</small>
            </div>
            <div>
              <span>LIVE</span>
              <strong>${displayCurrent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <small style={{ color: displayDeltaPct >= 0 ? '#09a576' : '#d91d24' }}>
                {displayDeltaPct >= 0 ? '+' : ''}{displayDeltaPct.toFixed(3)}% from target
              </small>
            </div>
            <div>
              <span>ROUND CLOSES IN</span>
              <strong style={{ color: '#f47a20' }}>{format1HCountdown(hourlyRemainingSec)}</strong>
              <small>1H CANDLE</small>
            </div>
          </div>

          {/* SVG Polyline & Area Chart */}
          <div className="speed-chart">
            <svg viewBox="0 0 700 170" role="img" preserveAspectRatio="none">
              <defs>
                <linearGradient id="speedChartGradient1H" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradientStopColor} stopOpacity="0.38" />
                  <stop offset="70%" stopColor={gradientStopColor} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path className="chart-grid" d="M0 20H700M0 58H700M0 96H700M0 134H700M0 165H700" />
              <polyline className="chart-area" points={`0,150 ${chartGeometry.line} 700,150`} fill="url(#speedChartGradient1H)" />
              <polyline className="chart-line" points={chartGeometry.line} style={{ stroke: strokeColor }} />
              <line className="chart-target" x1="0" y1={chartGeometry.targetY} x2="700" y2={chartGeometry.targetY} />
              <circle cx="700" cy={currentY} r="6" className="chart-dot" style={{ fill: strokeColor }} />
            </svg>

            <div className="chart-label target-label" style={{ top: `${Math.max(0, Math.min(130, currentY - 20))}px`, transition: 'top 0.5s ease' }}>
              ${displayCurrent.toFixed(2)}
              <b style={{ color: displayDeltaPct >= 0 ? '#09a576' : '#d91d24' }}>
                {displayDeltaPct >= 0 ? `+${displayDeltaPct.toFixed(2)}%` : `${displayDeltaPct.toFixed(2)}%`}
              </b>
            </div>

            <div className="chart-axis">
              <span>ROUND START</span>
              <span>15M</span>
              <span>30M</span>
              <span>45M</span>
              <span>SETTLEMENT</span>
            </div>

            <div className="chart-baseline">
              ${displayBase.toFixed(2)} BASELINE ⌄
            </div>
          </div>
        </div>
      </div>

      {/* Submission Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          type="button"
          className="primary-button"
          style={{
            width: '100%',
            height: '46px',
            background: submitted ? '#1e293b' : (hourlyRemainingSec <= 900) ? '#475569' : prediction ? (prediction === 'UP' ? '#059669' : '#dc2626') : '#94a3b8',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '.06em',
            cursor: (!prediction || submitted || hourlyRemainingSec <= 900) ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          disabled={!prediction || submitted || (hourlyRemainingSec <= 900 && !submitted)}
          onClick={onSubmitPrediction}
        >
          {submitted
            ? `ROUND #${round} [${prediction === 'UP' ? '상승(UP)' : '하락(DOWN)'}] 예측 제출 완료 (실시간 정산 관전 중)`
            : (hourlyRemainingSec <= 900)
            ? `ROUND #${round} 마감 15분 전 락아웃 (신규 예측 마감 · 실시간 관전 모드 · 다음 정각 라운드 대기)`
            : prediction
            ? `ROUND #${round} [${prediction === 'UP' ? '상승(UP)' : '하락(DOWN)'}] 1시간 예측 제출하기 (10연승 도전)`
            : '위 카드에서 예측 방향(UP 또는 DOWN)을 먼저 선택해주세요'}
        </button>
      </div>
    </div>
  )
}

export default Polymarket1HSpeedGameCard
