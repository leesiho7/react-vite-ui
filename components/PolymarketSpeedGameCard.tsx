'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useMarketWebSocket } from '../lib/useMarketWebSocket'
import { submitPredictionApi, settlePredictionApi, fetchUserPredictionStats, claimStreakReward } from '../lib/api'

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
  const predictionIdRef = useRef<number | null>(null)

  // 10연승 클레임 모달 상태 (1시간 게임의 클레임 플로우와 동일한 백엔드 API 재사용)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimAddress, setClaimAddress] = useState('')
  const [claimNetwork, setClaimNetwork] = useState('polygon')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimSuccessData, setClaimSuccessData] = useState<any>(null)

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

  // 실제 히스토리가 쌓이기 전(마운트 직후)엔 가짜 추세선을 지어내지 않고 현재가로 평평하게
  // 시작한다 — 실시간 틱이 들어오는 즉시 아래 useEffect가 실제 값으로 채워나간다.
  const [history, setHistory] = useState<number[]>(() => Array(120).fill(livePrice))
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

  // 바이낸스 @trade 스트림의 실제 틱마다(초당 여러 번) 바로바로 히스토리에 반영한다 —
  // 예전엔 5초 간격으로 샘플링해서 폴리마켓처럼 생생한 실시간 움직임 대신 거의 평평하게
  // 눌린 선을 그렸었는데, 그건 실제 틱 데이터를 임의로 솎아내서(mock이 아니라 데이터 손실)
  // 생긴 문제였다. 틱이 실제로 안 바뀌었을 때만 중복 추가를 건너뛴다.
  useEffect(() => {
    if (!livePrice) return
    setHistory((current) => {
      if (current[current.length - 1] === livePrice) return current
      return [...current.slice(-119), livePrice]
    })
  }, [livePrice])

  // Chart Geometry Calculation
  const chartGeometry = useMemo(() => {
    const values = history.length ? history : [livePrice]
    const minimum = Math.min(...values, targetPrice)
    const maximum = Math.max(...values, targetPrice)
    // 스프레드 하한을 너무 넉넉하게 잡으면 실제 변동폭이 축 전체 대비 작아 보여 선이
    // 눌린 것처럼(=폴리마켓과 달리 밋밋하게) 보인다 — 낮춰서 실제 움직임 그대로 화면을
    // 채우게 하고, 완전히 평평한 극단적 경우의 0-나눗셈만 막는다.
    const spread = Math.max(maximum - minimum, livePrice * 0.00015)
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

  const handleSettle = async (overridePrice?: number) => {
    const curr = stateRef.current
    const userChoice = curr.choice ?? choice
    const checkPrice = overridePrice ?? curr.animatedPrice ?? animatedPrice
    const baseTarget = curr.targetPrice ?? targetPrice
    const currentWins = curr.fiveMinWins ?? fiveMinWins
    const currentRound = curr.round ?? round

    if (!userChoice) return

    // 서버에 실제로 제출된 예측이 있으면(로그인 상태로 제출) 서버가 판정한 승패를 신뢰한다 —
    // 이 판정이 UserPredictionStatsEntity.currentStreak을 실제로 갱신하므로, 여기서 승리해야만
    // 아래 "10연승 클레임" 버튼이 실제로 동작하는 진짜 연승으로 이어진다.
    let isWin: boolean
    const predId = predictionIdRef.current
    if (predId) {
      const settleRes = await settlePredictionApi(predId, checkPrice)
      isWin = settleRes?.status === 'WON'
      predictionIdRef.current = null
    } else {
      // 비로그인 관전 등 서버에 기록된 예측이 없는 경우: 로컬 판정만 유지 (클레임 대상 아님)
      isWin = userChoice === 'up' ? checkPrice >= baseTarget : checkPrice < baseTarget
    }

    const newWins = isWin ? Math.min(10, currentWins + 1) : 0
    const nextRound = isWin ? (currentWins + 1 >= 10 ? 1 : currentRound + 1) : 1

    setFiveMinWins(newWins)
    setRound(nextRound)
    setSubmitted(false)
    setChoice(null)

    // 서버 원장 값으로 한 번 더 동기화 (로그인 상태인 경우)
    const uid = getCurrentUserId()
    if (uid) {
      fetchUserPredictionStats(uid).then((stats) => {
        if (stats && typeof stats.currentStreak === 'number') {
          setFiveMinWins((prev) => Math.max(prev, stats.currentStreak))
        }
      }).catch(() => {})
    }

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
    const uid = getCurrentUserId()
    setIsLoggedIn(uid !== null)
    if (uid) {
      fetchUserPredictionStats(uid).then((stats) => {
        if (stats && typeof stats.currentStreak === 'number' && stats.currentStreak > 0) {
          setFiveMinWins((prev) => Math.max(prev, stats.currentStreak))
        }
      }).catch(() => {})
    }
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

  const handleClaimPayout = async () => {
    const uid = getCurrentUserId()
    if (!uid) {
      alert('🔒 10연승 보상을 신청하려면 먼저 로그인해 주세요.')
      return
    }
    if (!claimAddress.trim()) {
      alert('출금받으실 지갑 주소를 입력해주세요.')
      return
    }
    setClaimLoading(true)
    try {
      const res = await claimStreakReward({
        userId: uid,
        destinationAddress: claimAddress.trim(),
        network: claimNetwork
      })
      if (res && res.success) {
        setClaimSuccessData(res)
        setFiveMinWins(0)
        setRound(1)
        setSubmitted(false)
        setChoice(null)
        const storageKey = getUserStreakKey()
        localStorage.removeItem(storageKey)
      } else {
        alert(res?.message || '출금 처리에 실패했습니다.')
      }
    } catch (e) {
      alert('출금 요청 중 오류가 발생했습니다.')
    } finally {
      setClaimLoading(false)
    }
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
    <>
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
          {fiveMinWins >= 10 ? (
            <button
              type="button"
              onClick={() => setClaimModalOpen(true)}
              style={{ fontSize: '10px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: '1px solid #34d399', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
            >
              🏆 10연승 달성! $10.00 USDT 즉시 수령하기 ↗
            </button>
          ) : (
            <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>5분 실시간 정산 모드</span>
          )}
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
          onClick={async () => {
            if (!choice || submitted || remainingSec <= 60) return
            const uid = getCurrentUserId()
            if (!uid) {
              alert('🔒 5분 예측을 제출하려면 로그인이 필요합니다. 회원가입 후 이용해주세요.')
              return
            }
            const rawSymbol = cleanSymbol + 'USDT'
            const res = await submitPredictionApi({
              userId: uid,
              symbol: rawSymbol,
              predictionType: 'DIRECTION_5M',
              predictedDirection: choice === 'up' ? 'UP' : 'DOWN'
            })
            if (!res || !res.success) {
              alert(res?.message || '예측 제출에 실패했습니다.')
              return
            }
            predictionIdRef.current = typeof res.predictionId === 'number' ? res.predictionId : null
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

    {claimModalOpen && (
      <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div className="panel" style={{ fontFamily: 'var(--font-sans)', width: '480px', maxWidth: '92vw', background: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <strong style={{ fontSize: '15px' }}>🏆 5분봉 10연승 챌린지 $10.00 USDT Claim</strong>
            <button type="button" className="text-button" onClick={() => setClaimModalOpen(false)}>닫기 ×</button>
          </div>

          {claimSuccessData ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{claimSuccessData.message}</h3>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                관리자가 확인 후 직접 지갑으로 송금해 드립니다. (보통 24시간 이내)
              </p>
              <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', fontSize: '11px', textAlign: 'left', wordBreak: 'break-all' }}>
                <div><b>수신 지갑:</b> {claimSuccessData.destinationAddress}</div>
                <div><b>네트워크:</b> {claimSuccessData.network?.toUpperCase()}</div>
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => { setClaimModalOpen(false); setClaimSuccessData(null) }}
              >
                확인 완료
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
                5분봉 10연승 미션 달성을 축하합니다! $10.00 USDT를 수신할 지갑 주소를 입력해 주세요.
              </p>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '10px 12px', marginBottom: '14px', fontSize: '10.5px', color: '#0369a1', lineHeight: 1.5 }}>
                💡 메타마스크가 없으셔도 괜찮습니다! 바이비트/바이낸스/OKX/Bitget 앱의 USDT 입금 주소(Polygon/BSC/TRC20)를 붙여넣으셔도 됩니다.
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>출금 네트워크 선택</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { key: 'polygon', label: 'POLYGON' },
                    { key: 'bsc', label: 'BSC' },
                    { key: 'tron', label: 'TRON (TRC20)' },
                    { key: 'solana', label: 'SOLANA' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      style={{ flex: 1, padding: '7px 4px', fontSize: '10px', fontWeight: claimNetwork === item.key ? 700 : 500, border: claimNetwork === item.key ? '2px solid #18334a' : '1px solid #ddd', background: claimNetwork === item.key ? '#18334a' : '#f9f9f9', color: claimNetwork === item.key ? '#fff' : '#333', borderRadius: '3px' }}
                      onClick={() => setClaimNetwork(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>수신 지갑 / 거래소 USDT 입금 주소</label>
                <input
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                  placeholder="0x... (메타마스크 또는 거래소 USDT 입금 주소)"
                  value={claimAddress}
                  onChange={(e) => setClaimAddress(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 700, borderRadius: '4px' }}
                disabled={claimLoading}
                onClick={handleClaimPayout}
              >
                {claimLoading ? '보상 확정 처리 중…' : '$10.00 USDT 보상 확정하기 ↗'}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

export default PolymarketSpeedGameCard
