/**
 * 김치 프리미엄 통계 (순수 함수, 외부 의존 없음).
 *
 * 프리미엄(%) = Upbit KRW 가격 / (Binance USDT 가격 × Upbit KRW-USDT) − 1.
 * 환율을 USDT 시세로 잡기 때문에 테더 자체의 프리미엄은 포함되지 않는다(기존 김프 탭과 같은 기준).
 * 모든 계산은 1시간 봉 종가 기준이며, 미래 값을 쓰는 통계(전방 변화·도달 확률)는
 * 조건을 과거 값으로만 정의하고 결과 구간은 이후 값으로 본다.
 */

export const HOUR_MS = 3_600_000

export interface KimchiHistoryResponse {
  symbol: string
  days: number
  generatedAt: number
  times: number[]
  upbitKrw: number[]
  usdtKrw: number[]
  binanceUsdt: number[]
  upbitBars: number
  usdtBars: number
  binanceBars: number
  error: string | null
  /** 시각별 공식 USD/KRW (ECB 일별 기준환율, 직전 날짜 값). 수집 실패 시 빈 배열 */
  officialFx: number[]
  fxError: string | null
}

export type FxBasis = 'official' | 'usdt'

/**
 * 프리미엄 % 시리즈.
 * - official: Upbit KRW / (Binance USDT × 공식 USD/KRW) − 1. 흔히 말하는 김프이며 테더 프리미엄을 포함한다.
 * - usdt: 환율을 Upbit KRW-USDT 로 잡는다. 차익거래로 거의 0 에 눌려 있어 '코인 자체의 괴리'만 본다.
 * official 인데 환율이 없으면 빈 배열(채우지 않음).
 */
export function premiumSeries(
  r: Pick<KimchiHistoryResponse, 'upbitKrw' | 'usdtKrw' | 'binanceUsdt'> & Partial<Pick<KimchiHistoryResponse, 'officialFx'>>,
  basis: FxBasis = 'usdt'
): number[] {
  const fx = basis === 'official' ? r.officialFx ?? [] : r.usdtKrw
  const n = Math.min(r.upbitKrw.length, fx.length, r.binanceUsdt.length)
  // 길이가 맞지 않으면 시각이 어긋난 것이므로 계산하지 않는다
  if (fx.length !== r.upbitKrw.length || r.binanceUsdt.length !== r.upbitKrw.length) return []
  const out: number[] = new Array(n)
  for (let i = 0; i < n; i++) out[i] = (r.upbitKrw[i] / (r.binanceUsdt[i] * fx[i]) - 1) * 100
  return out
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / (v.length || 1)

export function stdev(v: number[]): number {
  if (v.length < 2) return 0
  const m = mean(v)
  let s = 0
  for (const x of v) s += (x - m) * (x - m)
  return Math.sqrt(s / (v.length - 1))
}

/** 선형 보간 분위수 (q: 0..1). 입력은 정렬 불필요. */
export function quantile(v: number[], q: number): number {
  if (v.length === 0) return NaN
  const s = [...v].sort((a, b) => a - b)
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q))
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export function rollingMean(values: number[], k: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= k) sum -= values[i - k]
    if (i >= k - 1) out[i] = sum / k
  }
  return out
}

export interface PremiumStats {
  n: number
  days: number
  mean: number
  median: number
  std: number
  min: number
  max: number
  p5: number
  p95: number
  current: number
  /** 현재값의 표본 내 백분위 (0..100) */
  currentPercentile: number
  /** 현재값이 직전 trailingHours 평균에서 몇 표준편차 떨어졌는지 (현재 봉은 평균·표준편차 계산에서 제외) */
  zTrailing: number
  /** 1-lag 자기회귀 계수 */
  phi: number
  /** 평균회귀 반감기(시간). phi 가 (0,1) 밖이면 Infinity */
  halfLifeHours: number
  /** Δp = a + γ·p(t-1) 에서 γ 의 t 값 (단위근 검정용 통계량; 임계값은 표준 t 분포와 다름) */
  tGamma: number
}

export function premiumStats(p: number[], trailingHours = 24 * 30): PremiumStats | null {
  const n = p.length
  if (n < 30) return null
  const m = mean(p)
  const cur = p[n - 1]
  const prior = p.slice(Math.max(0, n - 1 - trailingHours), n - 1)
  const pm = mean(prior)
  const ps = stdev(prior)

  // AR(1): p_t = c + phi p_{t-1}
  const x = p.slice(0, n - 1)
  const y = p.slice(1)
  const mx = mean(x)
  const my = mean(y)
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < x.length; i++) {
    sxx += (x[i] - mx) * (x[i] - mx)
    sxy += (x[i] - mx) * (y[i] - my)
  }
  const phi = sxx > 0 ? sxy / sxx : NaN
  const c = my - phi * mx
  let sse = 0
  for (let i = 0; i < x.length; i++) {
    const e = y[i] - (c + phi * x[i])
    sse += e * e
  }
  const se = sxx > 0 && x.length > 2 ? Math.sqrt(sse / (x.length - 2) / sxx) : NaN
  const tGamma = se > 0 ? (phi - 1) / se : NaN
  const halfLife = phi > 0 && phi < 1 ? -Math.log(2) / Math.log(phi) : Infinity

  const below = p.filter((v) => v <= cur).length
  return {
    n,
    days: n / 24,
    mean: m,
    median: quantile(p, 0.5),
    std: stdev(p),
    min: Math.min(...p),
    max: Math.max(...p),
    p5: quantile(p, 0.05),
    p95: quantile(p, 0.95),
    current: cur,
    currentPercentile: (below / n) * 100,
    zTrailing: ps > 0 ? (cur - pm) / ps : NaN,
    phi,
    halfLifeHours: halfLife,
    tGamma
  }
}

export interface HistBin {
  lo: number
  hi: number
  count: number
  frac: number
}

/** 고정 폭 히스토그램. 폭 단위(%p)로 내림 정렬해 막대 경계가 깔끔하다. */
export function histogram(p: number[], width = 0.25): HistBin[] {
  if (p.length === 0 || !(width > 0)) return []
  const lo = Math.floor(Math.min(...p) / width) * width
  const hi = Math.ceil(Math.max(...p) / width) * width
  const nb = Math.max(1, Math.round((hi - lo) / width))
  const bins: HistBin[] = Array.from({ length: nb }, (_, i) => ({ lo: lo + i * width, hi: lo + (i + 1) * width, count: 0, frac: 0 }))
  for (const v of p) {
    const i = Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / width)))
    bins[i].count++
  }
  for (const b of bins) b.frac = b.count / p.length
  return bins
}

/** 프리미엄이 임계값 이상이던 시간의 비율 */
export function shareAbove(p: number[], thresholds: number[]): { threshold: number; frac: number }[] {
  return thresholds.map((t) => ({ threshold: t, frac: p.length ? p.filter((v) => v >= t).length / p.length : NaN }))
}

export interface QuintileRow {
  q: number // 1..5 (1 = 프리미엄 낮은 구간)
  lo: number
  hi: number
  n: number
  meanChange: number
  medianChange: number
  fracDown: number
}

/**
 * 현재 프리미엄 수준(표본 분위 5구간)별로 horizonHours 뒤 프리미엄 변화(%p)를 본다.
 * 조건(구간)은 시점 t 의 값으로만 정하고 결과는 p[t+h]-p[t]. 구간 경계는 표본 전체 분위수이므로
 * 경계 자체가 미래 정보를 약간 포함한다 — 규칙으로 쓸 수 있는 신호가 아니라 기술 통계다.
 */
export function forwardByQuintile(p: number[], horizonHours: number): QuintileRow[] {
  const h = Math.round(horizonHours)
  if (h < 1 || p.length <= h + 5) return []
  const cuts = [0.2, 0.4, 0.6, 0.8].map((q) => quantile(p, q))
  const buckets: number[][] = [[], [], [], [], []]
  const los = [Infinity, Infinity, Infinity, Infinity, Infinity]
  const his = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity]
  for (let t = 0; t + h < p.length; t++) {
    let k = 0
    while (k < 4 && p[t] > cuts[k]) k++
    buckets[k].push(p[t + h] - p[t])
    los[k] = Math.min(los[k], p[t])
    his[k] = Math.max(his[k], p[t])
  }
  return buckets.map((b, k) => ({
    q: k + 1,
    lo: los[k],
    hi: his[k],
    n: b.length,
    meanChange: b.length ? mean(b) : NaN,
    medianChange: b.length ? quantile(b, 0.5) : NaN,
    fracDown: b.length ? b.filter((v) => v < 0).length / b.length : NaN
  }))
}

export interface HitResult {
  /** 조건(프리미엄 ≥ level)을 만족한 시점 수 */
  n: number
  /** 이후 horizon 안에 프리미엄이 (시작값 − drop)%p 이하로 내려간 시점 수 */
  hits: number
  prob: number
  /** 서로 horizon 이상 떨어진 시점만 센 근사 독립 표본 수 */
  nIndependent: number
  hitsIndependent: number
}

/**
 * "프리미엄이 level% 이상일 때, horizonHours 안에 시작값보다 dropPp 이상 내려갈 확률"의 경험적 비율.
 * 같은 사건이 연속 시점에서 중복되므로 서로 horizon 이상 떨어진 시점만 센 값도 함께 낸다.
 */
export function dropHitProbability(p: number[], level: number, horizonHours: number, dropPp: number): HitResult {
  const h = Math.max(1, Math.round(horizonHours))
  let n = 0
  let hits = 0
  let nInd = 0
  let hitsInd = 0
  let nextFree = -1
  for (let t = 0; t + h < p.length; t++) {
    if (!(p[t] >= level)) continue
    let hit = false
    const target = p[t] - dropPp
    for (let j = 1; j <= h; j++) {
      if (p[t + j] <= target) {
        hit = true
        break
      }
    }
    n++
    if (hit) hits++
    if (t >= nextFree) {
      nInd++
      if (hit) hitsInd++
      nextFree = t + h
    }
  }
  return { n, hits, prob: n ? hits / n : NaN, nIndependent: nInd, hitsIndependent: hitsInd }
}

/** 시간대(UTC 0~23시)별 평균 프리미엄 — 한국 시간대 패턴을 보기 위한 기술 통계 */
export function byHourOfDay(times: number[], p: number[]): { hourUtc: number; mean: number; n: number }[] {
  const sum = new Array(24).fill(0)
  const cnt = new Array(24).fill(0)
  for (let i = 0; i < p.length; i++) {
    const hr = new Date(times[i]).getUTCHours()
    sum[hr] += p[i]
    cnt[hr]++
  }
  return sum.map((s, hr) => ({ hourUtc: hr, mean: cnt[hr] ? s / cnt[hr] : NaN, n: cnt[hr] }))
}
