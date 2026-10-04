// 통계적 페어 트레이딩(평균회귀) 분석용 순수 함수 모음. UI·네트워크 의존 없음.
//
// 설계 원칙 (이 모듈이 지키는 것):
//  1. 미래 데이터를 쓰지 않는다 — 봉 i의 z-score는 i 이전 window개 봉만으로 계산한다.
//  2. 신호는 봉 마감(i)에 확인하고, 체결은 다음 봉 시가(i+1)로 가정한다.
//  3. 수익률은 "총 명목(두 다리 합)" 기준으로 기록하고, 수수료·슬리피지는 4번의 체결 전부에 반영한다.
//  4. 펀딩비는 반영하지 않는다(과거 펀딩 이력이 없으므로) — 화면에 반드시 명시한다.
//  5. 청산 위험은 봉 안의 불리한 극값(고가/저가)으로 보수적으로 추정한다.

export interface Bar {
  t: number // epoch ms
  o: number
  h: number
  l: number
  c: number
}

export interface AlignedPair {
  t: number[]
  a: Bar[]
  b: Bar[]
}

/** 두 시리즈를 같은 시각의 봉끼리만 남겨 정렬한다. 가격이 0 이하이거나 NaN인 봉은 버린다. */
export function alignBars(a: Bar[], b: Bar[]): AlignedPair {
  const valid = (x: Bar) =>
    Number.isFinite(x.t) && [x.o, x.h, x.l, x.c].every((v) => Number.isFinite(v) && v > 0)
  const mapB = new Map<number, Bar>()
  for (const x of b) if (valid(x)) mapB.set(x.t, x)
  const rows: { t: number; a: Bar; b: Bar }[] = []
  for (const x of a) {
    if (!valid(x)) continue
    const y = mapB.get(x.t)
    if (y) rows.push({ t: x.t, a: x, b: y })
  }
  rows.sort((p, q) => p.t - q.t)
  return { t: rows.map((r) => r.t), a: rows.map((r) => r.a), b: rows.map((r) => r.b) }
}

export interface OlsResult {
  alpha: number
  beta: number
  sigma: number // 잔차 표준오차 (n-2 보정)
  sxx: number
  n: number
}

/** y = alpha + beta*x 최소제곱. */
export function olsFit(x: number[], y: number[]): OlsResult {
  const n = x.length
  if (n < 3) return { alpha: 0, beta: 0, sigma: 0, sxx: 0, n }
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += x[i]
    sy += y[i]
  }
  const mx = sx / n
  const my = sy / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxx += dx * dx
    sxy += dx * dy
    syy += dy * dy
  }
  const beta = sxx > 0 ? sxy / sxx : 0
  const alpha = my - beta * mx
  const sse = Math.max(0, syy - beta * sxy)
  return { alpha, beta, sigma: Math.sqrt(sse / (n - 2)), sxx, n }
}

export interface RollingResult {
  beta: number[] // 봉 i까지의 window 회귀 기울기 (워밍업 구간은 NaN)
  z: number[] // 봉 i 잔차 / window 잔차 표준오차 (워밍업 구간은 NaN)
}

/**
 * ln(A) = alpha + beta*ln(B) 를 window 길이로 굴리며 맞추고, 현재 봉의 잔차를 z-score로 만든다.
 * 누적합으로 O(N)에 계산한다. 봉 i의 값은 i-window+1..i 구간만 사용한다(미래 데이터 없음).
 */
export function rollingZScores(closeA: number[], closeB: number[], window: number): RollingResult {
  const N = closeA.length
  const beta = new Array<number>(N).fill(NaN)
  const z = new Array<number>(N).fill(NaN)
  if (N === 0 || window < 10 || N < window) return { beta, z }

  // 수치 안정을 위해 평균을 빼서 중심화한다 (회귀 기울기·잔차는 평행이동에 불변).
  // 전체 평균을 쓰면 미래 봉이 섞이므로, 가장 먼저 확정되는 첫 window 구간의 평균만 쓴다.
  const lnA = closeA.map((v) => Math.log(v))
  const lnB = closeB.map((v) => Math.log(v))
  const mA = lnA.slice(0, window).reduce((s, v) => s + v, 0) / window
  const mB = lnB.slice(0, window).reduce((s, v) => s + v, 0) / window
  const y = lnA.map((v) => v - mA)
  const x = lnB.map((v) => v - mB)

  const Px = new Array<number>(N + 1).fill(0)
  const Py = new Array<number>(N + 1).fill(0)
  const Pxx = new Array<number>(N + 1).fill(0)
  const Pxy = new Array<number>(N + 1).fill(0)
  const Pyy = new Array<number>(N + 1).fill(0)
  for (let i = 0; i < N; i++) {
    Px[i + 1] = Px[i] + x[i]
    Py[i + 1] = Py[i] + y[i]
    Pxx[i + 1] = Pxx[i] + x[i] * x[i]
    Pxy[i + 1] = Pxy[i] + x[i] * y[i]
    Pyy[i + 1] = Pyy[i] + y[i] * y[i]
  }

  const n = window
  for (let i = window - 1; i < N; i++) {
    const lo = i - window + 1
    const sx = Px[i + 1] - Px[lo]
    const sy = Py[i + 1] - Py[lo]
    const mx = sx / n
    const my = sy / n
    const sxx = Pxx[i + 1] - Pxx[lo] - n * mx * mx
    const sxy = Pxy[i + 1] - Pxy[lo] - n * mx * my
    const syy = Pyy[i + 1] - Pyy[lo] - n * my * my
    if (sxx <= 1e-12) continue
    const b = sxy / sxx
    const a = my - b * mx
    const sse = Math.max(0, syy - b * sxy)
    const sigma = Math.sqrt(sse / (n - 2))
    if (sigma <= 1e-12) continue
    beta[i] = b
    z[i] = (y[i] - a - b * x[i]) / sigma
  }
  return { beta, z }
}

export interface MeanReversionStats {
  halfLifeBars: number | null // 평균회귀 반감기 (봉 단위). 회귀 성향이 없으면 null
  b: number // Δe = c + b*e(-1) 의 b
  tStat: number // b의 t값 (ADF 유사 통계량)
}

/** 전체 구간 정적 회귀 잔차에 대한 AR(1) 평균회귀 지표. */
export function meanReversionStats(closeA: number[], closeB: number[]): MeanReversionStats | null {
  const N = closeA.length
  if (N < 50) return null
  const lnA = closeA.map((v) => Math.log(v))
  const lnB = closeB.map((v) => Math.log(v))
  const fit = olsFit(lnB, lnA)
  const resid = lnA.map((v, i) => v - fit.alpha - fit.beta * lnB[i])
  const lag = resid.slice(0, -1)
  const diff = resid.slice(1).map((v, i) => v - resid[i])
  const ar = olsFit(lag, diff)
  if (ar.sxx <= 0 || ar.sigma <= 0) return null
  const tStat = ar.beta / (ar.sigma / Math.sqrt(ar.sxx))
  const halfLifeBars = ar.beta < 0 && ar.beta > -1 ? -Math.LN2 / Math.log(1 + ar.beta) : null
  return { halfLifeBars, b: ar.beta, tStat }
}

export type CointegrationVerdict = 'STRONG' | 'LIKELY' | 'WEAK' | 'NONE'

/** Engle-Granger 잔차 ADF 임계값(점근, 상수항 포함, 변수 2개): 1% -3.90, 5% -3.34, 10% -3.04. 근사치다. */
export function cointegrationVerdict(tStat: number): CointegrationVerdict {
  if (tStat <= -3.9) return 'STRONG'
  if (tStat <= -3.34) return 'LIKELY'
  if (tStat <= -3.04) return 'WEAK'
  return 'NONE'
}

// ───────────────────────── 백테스트 ─────────────────────────

export interface BacktestParams {
  window: number // 롤링 회귀 길이(봉)
  zEntry: number // |z| >= zEntry 면 진입
  zExit: number // 반대로 |z| 가 zExit 안으로 돌아오면 청산(평균회귀 완료)
  zStop: number // 진입 방향으로 |z| >= zStop 까지 더 벌어지면 손절
  maxHold: number // 최대 보유 봉 수 (시간 손절)
  feeBps: number // 체결당 수수료 (bps, 한 다리·한 번 체결 기준)
  slipBps: number // 체결당 슬리피지 (bps)
}

export type ExitReason = 'REVERT' | 'STOP' | 'TIME'

export interface Trade {
  entryIdx: number
  exitIdx: number
  dir: 1 | -1 // 1 = 스프레드 롱(A 매수, B 매도), -1 = 스프레드 숏(A 매도, B 매수)
  beta: number
  gross: number // 총 명목(두 다리 합) 대비 비용 반영 전 수익률
  net: number // 비용 반영 후 수익률
  mae: number // 보유 중 총 명목 대비 최대 평가손실(양수, 봉 안 불리한 극값 기준)
  hold: number // 보유 봉 수
  reason: ExitReason
}

export interface BacktestResult {
  trades: Trade[]
  z: number[]
  beta: number[]
  openAtEnd: boolean
}

/** 한 다리 명목 1 기준 손익: 스프레드 롱 = A 수익률 - beta*B 수익률. 스프레드 숏은 부호 반대. */
export function tradePnl(dir: 1 | -1, beta: number, ea: number, eb: number, xa: number, xb: number): number {
  const pnl = (xa / ea - 1) - beta * (xb / eb - 1)
  return dir === 1 ? pnl : -pnl
}

/** 한 봉 안에서 포지션에 가장 불리한 시나리오(양 다리 동시 극값)의 평가손익. 총 명목 대비. */
export function barWorstPnl(
  dir: 1 | -1,
  beta: number,
  ea: number,
  eb: number,
  ha: number,
  la: number,
  hb: number,
  lb: number
): number {
  const worst =
    dir === 1
      ? (la / ea - 1) - beta * (hb / eb - 1) // A 저가, B 고가
      : -(ha / ea - 1) + beta * (lb / eb - 1) // A 고가, B 저가
  return worst / (1 + beta)
}

export function backtestPairs(p: AlignedPair, prm: BacktestParams): BacktestResult {
  const N = p.t.length
  const closeA = p.a.map((x) => x.c)
  const closeB = p.b.map((x) => x.c)
  const { beta, z } = rollingZScores(closeA, closeB, prm.window)
  const costPerGross = (2 * (prm.feeBps + prm.slipBps)) / 1e4 // 4번 체결 = 총 명목 기준 왕복 2회분

  const trades: Trade[] = []
  let pos: { dir: 1 | -1; e: number; beta: number; ea: number; eb: number; mae: number } | null = null

  for (let i = prm.window - 1; i < N; i++) {
    if (pos) {
      const a = p.a[i]
      const b = p.b[i]
      const worst = barWorstPnl(pos.dir, pos.beta, pos.ea, pos.eb, a.h, a.l, b.h, b.l)
      pos.mae = Math.max(pos.mae, -worst)

      const zi = z[i]
      let reason: ExitReason | null = null
      if (Number.isFinite(zi)) {
        if (pos.dir === 1 ? zi <= -prm.zStop : zi >= prm.zStop) reason = 'STOP'
        else if (pos.dir === 1 ? zi >= -prm.zExit : zi <= prm.zExit) reason = 'REVERT'
      }
      if (!reason && i - pos.e + 1 >= prm.maxHold) reason = 'TIME'

      if (reason && i + 1 < N) {
        const xa = p.a[i + 1].o
        const xb = p.b[i + 1].o
        const gross = tradePnl(pos.dir, pos.beta, pos.ea, pos.eb, xa, xb) / (1 + pos.beta)
        trades.push({
          entryIdx: pos.e,
          exitIdx: i + 1,
          dir: pos.dir,
          beta: pos.beta,
          gross,
          net: gross - costPerGross,
          mae: Math.max(pos.mae, -gross),
          hold: i + 1 - pos.e,
          reason
        })
        pos = null
      }
    } else if (i + 1 < N && Number.isFinite(z[i]) && beta[i] > 0) {
      let dir: 1 | -1 | 0 = 0
      if (z[i] >= prm.zEntry) dir = -1
      else if (z[i] <= -prm.zEntry) dir = 1
      if (dir !== 0) {
        pos = { dir, e: i + 1, beta: beta[i], ea: p.a[i + 1].o, eb: p.b[i + 1].o, mae: 0 }
      }
    }
  }
  return { trades, z, beta, openAtEnd: pos !== null }
}

// ───────────────────────── 요약 / 레버리지 ─────────────────────────

export interface TradeStats {
  n: number
  winRate: number
  avgNet: number // 거래당 평균 순수익률 (총 명목 기준)
  avgWin: number
  avgLoss: number
  profitFactor: number // 총이익 / 총손실. 손실이 없으면 Infinity
  avgHold: number
  maxMae: number
  maxLosingStreak: number
  stopRate: number
  timeRate: number
}

export function summarize(trades: Trade[]): TradeStats {
  const n = trades.length
  if (n === 0) {
    return { n: 0, winRate: 0, avgNet: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, avgHold: 0, maxMae: 0, maxLosingStreak: 0, stopRate: 0, timeRate: 0 }
  }
  const wins = trades.filter((t) => t.net > 0)
  const losses = trades.filter((t) => t.net <= 0)
  const sum = (a: Trade[]) => a.reduce((s, t) => s + t.net, 0)
  const grossWin = sum(wins)
  const grossLoss = -sum(losses)
  let streak = 0
  let maxStreak = 0
  for (const t of trades) {
    streak = t.net <= 0 ? streak + 1 : 0
    maxStreak = Math.max(maxStreak, streak)
  }
  return {
    n,
    winRate: wins.length / n,
    avgNet: sum(trades) / n,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? -grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    avgHold: trades.reduce((s, t) => s + t.hold, 0) / n,
    maxMae: Math.max(...trades.map((t) => t.mae)),
    maxLosingStreak: maxStreak,
    stopRate: trades.filter((t) => t.reason === 'STOP').length / n,
    timeRate: trades.filter((t) => t.reason === 'TIME').length / n
  }
}

/** 청산 판정: 총 명목 대비 평가손실 * 레버리지 가 증거금의 이 비율에 닿으면 청산으로 본다. */
export const DEFAULT_LIQ_THRESHOLD = 0.9

export interface LeverageRow {
  lev: number
  totalReturn: number // 복리 누적 수익률 (1 = +100%)
  maxDD: number // 거래 종료 시점 기준 최대 낙폭 (양수 비율)
  liquidations: number
  worstTrade: number // 최악 거래의 자기자본 대비 수익률 (음수)
}

export function leverageRow(trades: Trade[], lev: number, liqThreshold = DEFAULT_LIQ_THRESHOLD): LeverageRow {
  let eq = 1
  let peak = 1
  let maxDD = 0
  let liq = 0
  let worst = 0
  for (const t of trades) {
    let m: number
    if (lev * t.mae >= liqThreshold) {
      liq++
      m = 1 - liqThreshold
    } else {
      m = Math.max(0, 1 + lev * t.net)
    }
    worst = Math.min(worst, m - 1)
    eq *= m
    peak = Math.max(peak, eq)
    maxDD = Math.max(maxDD, (peak - eq) / peak)
  }
  return { lev, totalReturn: eq - 1, maxDD, liquidations: liq, worstTrade: worst }
}

export interface SafeLeverage {
  sampleMax: number // 이 표본에서 한 번도 청산되지 않는 최대 레버리지
  recommended: number // 표본에 없던 더 나쁜 사건을 감안해 절반으로 줄인 값
}

export function safeLeverage(trades: Trade[], liqThreshold = DEFAULT_LIQ_THRESHOLD): SafeLeverage | null {
  if (trades.length === 0) return null
  const maxMae = Math.max(...trades.map((t) => t.mae))
  if (!(maxMae > 0)) return null
  const sampleMax = Math.min(50, liqThreshold / maxMae)
  return { sampleMax, recommended: sampleMax / 2 }
}

export interface CurvePoint {
  t: number
  v: number
}

/** 거래 종료 시점마다 찍은 자기자본 곡선(%)과 낙폭(%). 청산 규칙은 leverageRow와 같다. */
export function equityAndDrawdown(
  trades: Trade[],
  tOf: (idx: number) => number,
  lev: number,
  liqThreshold = DEFAULT_LIQ_THRESHOLD
): { equity: CurvePoint[]; drawdown: CurvePoint[] } {
  const equity: CurvePoint[] = []
  const drawdown: CurvePoint[] = []
  let eq = 1
  let peak = 1
  for (const tr of trades) {
    const m = lev * tr.mae >= liqThreshold ? 1 - liqThreshold : Math.max(0, 1 + lev * tr.net)
    eq *= m
    peak = Math.max(peak, eq)
    const t = tOf(tr.exitIdx)
    equity.push({ t, v: (eq - 1) * 100 })
    drawdown.push({ t, v: -((peak - eq) / peak) * 100 })
  }
  return { equity, drawdown }
}

/** 체결 비용 가정을 바꿔 가며 같은 신호의 거래당 평균 순수익(bps)을 본다. 거래 목록은 비용과 무관하다. */
export function costSensitivity(
  p: AlignedPair,
  prm: BacktestParams,
  perFillBpsLevels: number[]
): { perFillBps: number; avgNetBps: number | null }[] {
  return perFillBpsLevels.map((lv) => {
    const { trades } = backtestPairs(p, { ...prm, feeBps: lv, slipBps: 0 })
    return { perFillBps: lv, avgNetBps: trades.length ? summarize(trades).avgNet * 1e4 : null }
  })
}
