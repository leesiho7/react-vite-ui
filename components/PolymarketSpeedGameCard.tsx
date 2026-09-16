'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 1H 예측게임과 동일하게, 로그인(auth_session에 실제 userId가 있는 사용자)한 경우에만
  // 예측 제출을 허용한다. 비회원은 관전만 가능하고 제출 시 로그인 안내를 받는다.
  const getCurrentUserId = (): number | null => {
    try {
      const session = localStorage.getItem('auth_session')
      if (!session) return null
      const user = JSON.parse(session)
      return user?.userId ? Number(user.userId) : null
    } catch (e) {
      return null
    }
  }

  // Real-time WebSocket Ticker Integration
  // useMarketWebSocket이 내부에서 자체적으로 "/USD","/USDT" 접미사를 제거하므로
  // 여기서 미리 "/USDT"를 붙여 넘기면 "BTC/USDT" -> "BTCT" -> "btctusdt"로 이중 손상되어
  // 존재하지 않는 바이낸스 심볼을 구독하게 된다(소켓이 절대 연결되지 않음). 원본 심볼 그대로 전달한다.
  const { price: wsPrice, fiveMinOpenPrice, fiveMinKline } = useMarketWebSocket(symbol)
  const livePrice = wsPrice > 0 ? wsPrice : (currentPrice || 79422.77)

  // 라운드의 "TO BEAT" 기준가는 실제 바이낸스 5분봉(kline_5m) 시가에 고정한다.
  // 캔들이 실제로 바뀔 때만 갱신되며, 그 전까지는 이번 라운드 동안 고정된다.
  const [roundBasePrice, setRoundBasePrice] = useState<number>(0)
  useEffect(() => {
    if (fiveMinOpenPrice > 0 && roundBasePrice === 0) {
      setRoundBasePrice(fiveMinOpenPrice)
    }
  }, [fiveMinOpenPrice, roundBasePrice])
  const targetPrice = roundBasePrice > 0 ? roundBasePrice : (basePrice || livePrice || 79409.09)

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

  // 실시간 가격을 5초 간격으로 샘플링해 축적 — 실제 원인은 여기 있었다.
  // 바이낸스 @trade 스트림은 초당 여러 번 틱이 들어오는데, 그 매 틱마다 60칸 버퍼에
  // 쌓다 보니 "5분(00:00~05:00)"이라는 축 라벨과 달리 실제로는 최근 몇 초 치 가격만
  // 반복해서 보여주고 있었다. 몇 초 동안 BTC가 움직이는 폭은 차트의 최소 스프레드
  // 바닥값(livePrice*0.0006, 지금 시세 기준 약 $45)보다 작아서 선이 거의 평평하게
  // 눌린 것처럼 보였던 것 — 소켓은 죽지 않았고, 그래프가 보여주는 시간 창이 잘못됐었다.
  const livePriceRef = useRef(livePrice)
  useEffect(() => {
    livePriceRef.current = livePrice
  }, [livePrice])

  useEffect(() => {
    const sample = () => {
      const p = livePriceRef.current
      if (!p) return
      setHistory((current) => [...current.slice(-59), p])
    }
    sample()
    const interval = setInterval(sample, 5000)
    return () => clearInterval(interval)
  }, [])

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

  // Get current logged-in user key for user-isolated streak tracking
  const getUserStreakKey = () => {
    try {
      const session = localStorage.getItem('auth_session')
      if (session) {
        const user = JSON.parse(session)
        if (user.username) return `aether_5m_streak_${user.username}`
      }
    } catch (e) {}
    return 'aether_5m_streak_guest'
  }

  const handleSettle = (overridePrice?: number) => {
    const curr = stateRef.current
    const userChoice = curr.choice ?? choice
    const checkPrice = overridePrice ?? curr.animatedPrice ?? animatedPrice
    const baseTarget = curr.targetPrice ?? targetPrice
    const currentWins = curr.fiveMinWins ?? fiveMinWins
    const currentRound = curr.round ?? round

    if (!userChoice) return

    // 유저 선택(UP/DOWN)에 따른 베이스라인 가격 비교 정산
    const isWin = userChoice === 'up' ? checkPrice >= baseTarget : checkPrice < baseTarget
    const newWins = isWin ? Math.min(10, currentWins + 1) : 0
    const nextRound = isWin ? (currentWins + 1 >= 10 ? 1 : currentRound + 1) : 1

    setFiveMinWins(newWins)
    setRound(nextRound)
    setSubmitted(false)
    setChoice(null)

    try {
      const storageKey = getUserStreakKey()
      localStorage.setItem(storageKey, JSON.stringify({
        wins: newWins,
        round: nextRound,
        choice: null,
        submitted: false,
        lastSettledAt: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to save 5m streak:', e)
    }
  }

  useEffect(() => {
    setMounted(true)
    setIsLoggedIn(getCurrentUserId() !== null)
    try {
      const storageKey = getUserStreakKey()
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFiveMinWins(typeof parsed.wins === 'number' ? parsed.wins : 0)
        setRound(typeof parsed.round === 'number' ? parsed.round : 1)
        setChoice(parsed.choice === 'up' || parsed.choice === 'down' ? parsed.choice : null)
        setSubmitted(typeof parsed.submitted === 'boolean' ? parsed.submitted : false)
      } else {
        // 계정 변경 시 기존 승수 초기화
        setFiveMinWins(0)
        setRound(1)
        setChoice(null)
        setSubmitted(false)
      }
    } catch (e) {
      console.warn('Failed to load 5m streak:', e)
    }
  }, [])

  const stateRef = useRef({ submitted, choice, animatedPrice, targetPrice, fiveMinWins, round })
  useEffect(() => {
    stateRef.current = { submitted, choice, animatedPrice, targetPrice, fiveMinWins, round }
  }, [submitted, choice, animatedPrice, targetPrice, fiveMinWins, round])

  // 실제 바이낸스 5분봉 마감 시각(open + 300초) 기준 실시간 카운트다운 —
  // 클라이언트 마운트 시점과 무관하게 실제 거래소 5분봉 경계에 정확히 동기화된다.
  useEffect(() => {
    const computeRemaining = () => {
      if (fiveMinKline && fiveMinKline.time > 0) {
        const closeTimeSec = fiveMinKline.time + 300
        const nowSec = Math.floor(Date.now() / 1000)
        return Math.max(0, closeTimeSec - nowSec)
      }
      return 300
    }
    setRemainingSec(computeRemaining())
    const interval = setInterval(() => setRemainingSec(computeRemaining()), 1000)
    return () => clearInterval(interval)
  }, [fiveMinKline?.time])

  // 실제 5분봉이 새로 열릴 때(라운드 경계 통과) 이전 라운드를 정산하고,
  // 다음 라운드 기준가를 새 캔들의 실제 시가로 갱신한다.
  const prevCandleTimeRef = useRef<number | null>(null)
  useEffect(() => {
    const candleTime = fiveMinKline?.time
    if (candleTime == null) return
    if (prevCandleTimeRef.current === null) {
      prevCandleTimeRef.current = candleTime
      return
    }
    if (candleTime !== prevCandleTimeRef.current) {
      prevCandleTimeRef.current = candleTime
      const curr = stateRef.current
      if (curr.submitted) {
        handleSettle(curr.animatedPrice)
      }
      setRoundBasePrice(fiveMinOpenPrice)
    }
  }, [fiveMinKline?.time, fiveMinOpenPrice])

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

  if (!mounted) return null

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
              onClick={() => handleSettle()}
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
            onClick={() => {
              if (submitted || remainingSec <= 60) return
              if (!isLoggedIn) {
                alert('🔒 5분 예측을 제출하려면 로그인이 필요합니다. 회원가입 후 이용해주세요.')
                return
              }
              setChoice('up')
            }}
          >
            <span className="vote-icon">▲</span>
            <span>Predict Up (5M)</span>
          </button>

          <button
            type="button"
            className={`speed-vote ${choice === 'down' ? 'selected down' : ''}`}
            disabled={submitted || remainingSec <= 60}
            onClick={() => {
              if (submitted || remainingSec <= 60) return
              if (!isLoggedIn) {
                alert('🔒 5분 예측을 제출하려면 로그인이 필요합니다. 회원가입 후 이용해주세요.')
                return
              }
              setChoice('down')
            }}
          >
            <span className="vote-icon">▼</span>
            <span>Predict Down (5M)</span>
          </button>

          {!isLoggedIn && (
            <span style={{ fontSize: '9px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '4px 8px', textAlign: 'center' }}>
              🔒 로그인 후 예측 제출이 가능합니다 (관전은 로그인 없이 가능)
            </span>
          )}

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
          disabled={!choice || submitted || remainingSec <= 60}
          onClick={() => {
            if (!choice || submitted || remainingSec <= 60) return
            if (!isLoggedIn) {
              alert('🔒 5분 예측을 제출하려면 로그인이 필요합니다. 회원가입 후 이용해주세요.')
              return
            }
            setSubmitted(true)
            try {
              const storageKey = getUserStreakKey()
              localStorage.setItem(storageKey, JSON.stringify({
                wins: fiveMinWins,
                round,
                choice,
                submitted: true,
                remainingSec,
                savedAt: Date.now()
              }))
            } catch (e) {
              console.warn('Failed to save 5m streak:', e)
            }
          }}
        >
          {submitted
            ? `ROUND #${round} [${choice === 'up' ? '상승(UP)' : '하락(DOWN)'}] 5분 예측 제출 완료 (🔒 변경 불가 · 실시간 관전 중)`
            : (remainingSec <= 60)
            ? `ROUND #${round} 마감 1분 전 락아웃 (신규 예측 마감 · 실시간 관전 모드)`
            : !isLoggedIn
            ? '🔒 예측을 제출하려면 로그인이 필요합니다 (회원가입 후 이용해주세요)'
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
