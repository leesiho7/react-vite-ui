// 거래소 간 펀딩 차익(델타중립 캐리) 통계용 순수 함수 모음. UI·네트워크 의존 없음.
//
// 용어: 거래소 A 에서 숏, 거래소 B 에서 롱을 잡으면 A 의 펀딩을 받고 B 의 펀딩을 낸다.
// 펀딩률이 양수면 롱이 숏에게 지급하므로, 한 정산 창의 캐리 = rate_A - rate_B (분수, 한 다리 명목 대비).
// diff > 0 이면 "A 숏 / B 롱"이 유리하다.
//
// 이 모듈이 지키는 것:
//  1. 정산 주기가 다른 거래소(8h, 1h)는 시간당 환산 후 같은 창(기본 8h)으로 합산해 맞춘다.
//  2. 창의 모든 시간이 두 거래소 모두에 존재할 때만 쓴다 (빈 구간을 채우지 않는다).
//  3. 방향 전환 시뮬레이션의 신호는 직전 구간들의 평균만 쓴다(미래 데이터 없음).
//  4. 거래소 간 가격 괴리·증거금·청산·출금 한도는 모델링하지 않는다 — 화면에 명시한다.

export const HOUR_MS = 3_600_000

export interface FundingSeries {
  exchange: string
  intervalHours: number
  times: number[] // epoch ms, 정시, 오름차순
  rates: number[] // 한 정산 주기의 펀딩률(분수)
  error: string | null
}

export interface FundingHistoryResponse {
  symbol: string
  days: number
  generatedAt: number
  exchanges: FundingSeries[]
}

/** 시간당 환산: 시각 t 의 펀딩(주기 I시간)은 직전 I시간(t-(I-1)h .. t)에 균등 배분한다. 키는 시간 끝 시각. */
export function hourlyRates(s: FundingSeries): Map<number, number> {
  const m = new Map<number, number>()
  const I = Math.max(1, Math.round(s.intervalHours))
  for (let i = 0; i < s.times.length; i++) {
    const r = s.rates[i]
    if (!Number.isFinite(r)) continue
    for (let k = 0; k < I; k++) m.set(s.times[i] - k * HOUR_MS, r / I)
  }
  return m
}

export interface AlignedWindows {
  t: number[] // 창 끝 시각 (windowHours 의 배수 UTC)
  a: number[] // A 의 창 합 펀딩률
  b: number[] // B 의 창 합 펀딩률
  diff: number[] // a - b
}

/** 두 시리즈를 windowHours(기본 8) 창으로 맞춘다. 창 안 모든 시간이 양쪽에 있어야 포함한다. */
export function alignWindows(sa: FundingSeries, sb: FundingSeries, windowHours = 8): AlignedWindows {
  const ha = hourlyRates(sa)
  const hb = hourlyRates(sb)
  const out: AlignedWindows = { t: [], a: [], b: [], diff: [] }
  if (ha.size === 0 || hb.size === 0) return out
  const W = windowHours * HOUR_MS
  const lo = Math.max(Math.min(...ha.keys()), Math.min(...hb.keys()))
  const hi = Math.min(Math.max(...ha.keys()), Math.max(...hb.keys()))
  for (let end = Math.ceil((lo + (windowHours - 1) * HOUR_MS) / W) * W; end <= hi; end += W) {
    let ra = 0
    let rb = 0
    let ok = true
    for (let k = 0; k < windowHours; k++) {
      const h = end - k * HOUR_MS
      const va = ha.get(h)
      const vb = hb.get(h)
      if (va === undefined || vb === undefined) {
        ok = false
        break
      }
      ra += va
      rb += vb
    }
    if (ok) {
      out.t.push(end)
      out.a.push(ra)
      out.b.push(rb)
      out.diff.push(ra - rb)
    }
  }
  return out
}

export const windowsPerDay = (windowHours: number) => 24 / windowHours
/** 창 하나의 분수 값을 연환산 % 로 */
export const annualPct = (perWindow: number, windowHours: number) => perWindow * windowsPerDay(windowHours) * 365 * 100

/** 왕복(4체결: 양 거래소 진입 2 + 청산 2) 비용, 한 다리 명목 대비 분수. 체결당 bp 입력. */
export const roundTripCost = (feeBps: number, slipBps: number) => (4 * (feeBps + slipBps)) / 1e4

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const std = (a: number[]) => {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length)
}
const median = (a: number[]) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const k = s.length >> 1
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2
}
const percentile = (sortedAsc: number[], p: number) => {
  if (!sortedAsc.length) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(p * (sortedAsc.length - 1))))
  return sortedAsc[idx]
}

export interface DiffStats {
  n: number
  days: number
  meanAnnual: number // 연환산 %
  medianAnnual: number
  stdAnnual: number
  fracPositive: number // diff > 0 인 창의 비율
  lag1: number // 1-lag 자기상관 (분산 0 이면 0)
  meanPerDay: number // 분수/일
}

export function diffStats(diff: number[], windowHours = 8): DiffStats {
  const n = diff.length
  if (n === 0) return { n: 0, days: 0, meanAnnual: 0, medianAnnual: 0, stdAnnual: 0, fracPositive: 0, lag1: 0, meanPerDay: 0 }
  const m = mean(diff)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    den += (diff[i] - m) * (diff[i] - m)
    if (i > 0) num += (diff[i] - m) * (diff[i - 1] - m)
  }
  return {
    n,
    days: (n * windowHours) / 24,
    meanAnnual: annualPct(m, windowHours),
    medianAnnual: annualPct(median(diff), windowHours),
    stdAnnual: annualPct(std(diff), windowHours),
    fracPositive: diff.filter((d) => d > 0).length / n,
    lag1: den > 1e-30 ? num / den : 0,
    meanPerDay: m * windowsPerDay(windowHours)
  }
}

/** 평균 일 캐리로 왕복 비용을 회수하는 데 걸리는 일수. 평균 캐리가 0 이하면 Infinity. */
export function breakEvenDays(meanPerDay: number, cost: number): number {
  return meanPerDay > 0 ? cost / meanPerDay : Infinity
}

export interface HoldingRow {
  days: number
  n: number // 겹치는 창의 개수 (독립 표본이 아니다)
  median: number
  p5: number
  p95: number
  pAboveCost: number // 누적 캐리가 왕복 비용을 넘은 창의 비율
}

/** 방향 고정(A 숏/B 롱) 시 보유 기간별 누적 캐리의 경험적 분포. dir=-1 이면 반대 방향. */
export function holdingDistribution(diff: number[], windowHours: number, daysList: number[], cost: number, dir: 1 | -1 = 1): HoldingRow[] {
  const prefix = [0]
  for (const d of diff) prefix.push(prefix[prefix.length - 1] + dir * d)
  return daysList.map((days) => {
    const k = Math.round(days * windowsPerDay(windowHours))
    const sums: number[] = []
    for (let i = 0; i + k <= diff.length; i++) sums.push(prefix[i + k] - prefix[i])
    sums.sort((x, y) => x - y)
    return {
      days,
      n: sums.length,
      median: percentile(sums, 0.5),
      p5: percentile(sums, 0.05),
      p95: percentile(sums, 0.95),
      pAboveCost: sums.length ? sums.filter((s) => s > cost).length / sums.length : 0
    }
  })
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

export interface CarrySim {
  gross: number // 비용 전 누적 캐리
  net: number // 진입·청산 비용 포함(마지막 청산 포함)
  flips: number
  maxDD: number // 누적 순캐리 곡선 기준 최대 낙폭(분수)
  curve: number[] // 창별 누적 순캐리 (진입 비용 반영, 마지막 청산 비용은 제외한 진행 곡선)
}

/** 항상 한 방향(dir)으로 고정 보유. 진입 cost/2, 마지막 청산 cost/2. */
export function fixedDirectionSim(diff: number[], dir: 1 | -1, cost: number): CarrySim {
  const curve: number[] = []
  let gross = 0
  let peak = -Infinity
  let maxDD = 0
  for (let i = 0; i < diff.length; i++) {
    gross += dir * diff[i]
    const v = gross - cost / 2
    curve.push(v)
    peak = Math.max(peak, v)
    maxDD = Math.max(maxDD, peak - v)
  }
  return { gross, net: diff.length ? gross - cost : 0, flips: 0, maxDD, curve }
}

/**
 * 직전 signalWindows 개 창의 평균 부호를 따라 방향을 정하고, 방향이 바뀔 때마다 청산+재진입(cost)을 낸다.
 * 구간 i 의 신호는 i 이전 값만 사용한다(미래 데이터 없음).
 */
export function followRuleSim(diff: number[], signalWindows: number, cost: number): CarrySim {
  const curve: number[] = []
  let pos: 1 | -1 | 0 = 0
  let gross = 0
  let net = 0
  let flips = 0
  let peak = -Infinity
  let maxDD = 0
  for (let i = 0; i < diff.length; i++) {
    if (i >= signalWindows) {
      const sig = mean(diff.slice(i - signalWindows, i))
      const want: 1 | -1 = sig > 0 ? 1 : -1
      if (want !== pos) {
        net -= pos === 0 ? cost / 2 : cost // 최초 진입 2체결, 전환은 청산 2 + 진입 2
        if (pos !== 0) flips++
        pos = want
      }
    }
    if (pos !== 0) {
      gross += pos * diff[i]
      net += pos * diff[i]
    }
    curve.push(net)
    peak = Math.max(peak, net)
    maxDD = Math.max(maxDD, peak - net)
  }
  const finalNet = pos === 0 ? net : net - cost / 2 // 마지막 포지션 청산 비용
  return { gross, net: finalNet, flips, maxDD, curve }
}

export interface PairSummary {
  a: string
  b: string
  shortVenue: string // 평균적으로 유리했던 숏 쪽 거래소
  longVenue: string
  n: number
  days: number
  meanAnnualFavorable: number // 유리한 방향 기준 연환산 % (항상 >= 0)
  fracFavorable: number
  breakEvenDays: number
}

/** 모든 거래소 쌍의 요약. 유리한 방향(평균 부호)으로 정규화한다. */
export function pairSummaries(series: FundingSeries[], windowHours: number, cost: number): PairSummary[] {
  const out: PairSummary[] = []
  const usable = series.filter((s) => s.times.length > 0)
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const w = alignWindows(usable[i], usable[j], windowHours)
      if (w.diff.length === 0) continue
      const st = diffStats(w.diff, windowHours)
      const flip = st.meanPerDay < 0
      const perDay = Math.abs(st.meanPerDay)
      out.push({
        a: usable[i].exchange,
        b: usable[j].exchange,
        shortVenue: flip ? usable[j].exchange : usable[i].exchange,
        longVenue: flip ? usable[i].exchange : usable[j].exchange,
        n: st.n,
        days: st.days,
        meanAnnualFavorable: Math.abs(st.meanAnnual),
        fracFavorable: flip ? 1 - st.fracPositive - w.diff.filter((d) => d === 0).length / w.diff.length : st.fracPositive,
        breakEvenDays: breakEvenDays(perDay, cost)
      })
    }
  }
  return out.sort((x, y) => y.meanAnnualFavorable - x.meanAnnualFavorable)
}
