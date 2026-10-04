'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel from '@/components/admin/monitoring/LineChartPanel'
import { fetchFundingHistory } from '@/lib/api'
import {
  FundingHistoryResponse,
  alignWindows,
  annualPct,
  breakEvenDays,
  diffStats,
  fixedDirectionSim,
  followRuleSim,
  holdingDistribution,
  pairSummaries,
  rollingMean,
  roundTripCost
} from '@/lib/arbMath'

const BASES = ['BTC', 'ETH', 'SOL']
const DAYS_OPTIONS = [90, 180, 365]
const HOLD_DAYS = [1, 3, 7, 14, 30]
const COST_LEVELS = [0, 2.5, 5.5, 11, 22] // 체결당 비용(bp)
const WINDOW_H = 8
const MIN_RELIABLE_DAYS = 30
const venueLabel: Record<string, string> = { BINANCE: 'Binance', BYBIT: 'Bybit', OKX: 'OKX', HYPERLIQUID: 'Hyperliquid' }

const signed = (v: number, d = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`
const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const fmtDays = (d: number) => (Number.isFinite(d) ? (d >= 100 ? `${Math.round(d)}일` : `${d.toFixed(1)}일`) : '회수 불가')

/**
 * ARBITRAGE STATS — 거래소 간 펀딩 차익(델타중립 캐리)을 확률·통계로 보는 연구 화면. Grafana 스타일.
 *
 * 데이터: 백엔드 /api/market/funding-history (Binance · Bybit · OKX · Hyperliquid 공개 이력).
 * 계산: lib/arbMath.ts — 정산 주기가 다른 거래소를 8시간 창으로 맞추고, 빈 구간은 버린다(채우지 않음).
 * 가격 괴리·증거금·청산·출금 한도는 모델링하지 않는다. 연구·교육용이며 투자 권유가 아니다.
 */
export default function ArbitrageTerminal() {
  const [base, setBase] = useState('BTC')
  const [days, setDays] = useState(180)
  const [shortV, setShortV] = useState('HYPERLIQUID')
  const [longV, setLongV] = useState('BINANCE')
  const [feeBps, setFeeBps] = useState(4.5)
  const [slipBps, setSlipBps] = useState(1)
  const [signalDays, setSignalDays] = useState(7)

  const [data, setData] = useState<FundingHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const r = await fetchFundingHistory(base, days)
    if (!r) {
      setData(null)
      setError('펀딩 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. (지어낸 값으로 대체하지 않습니다)')
    } else {
      setData(r)
    }
    setLoading(false)
  }, [base, days])

  useEffect(() => {
    load()
  }, [load])

  const cost = roundTripCost(feeBps, slipBps)
  const series = data?.exchanges ?? []
  const withData = series.filter((s) => s.times.length > 0)
  const sa = withData.find((s) => s.exchange === shortV)
  const sb = withData.find((s) => s.exchange === longV)

  const calc = useMemo(() => {
    if (!sa || !sb || sa.exchange === sb.exchange) return null
    const w = alignWindows(sa, sb, WINDOW_H)
    if (w.diff.length < 10) return { w, tooShort: true as const }
    const st = diffStats(w.diff, WINDOW_H)
    const hold = holdingDistribution(w.diff, WINDOW_H, HOLD_DAYS, cost)
    const fixed = fixedDirectionSim(w.diff, 1, cost)
    const follow = followRuleSim(w.diff, Math.round(signalDays * (24 / WINDOW_H)), cost)
    const yrs = st.days / 365
    const roll = rollingMean(w.diff, 21) // 7일 이동평균
    const t = w.t
    const diffPts = t.map((x, i) => ({ t: x, v: annualPct(w.diff[i], WINDOW_H) }))
    const diffRoll = t.map((x, i) => ({ t: x, v: annualPct(roll[i], WINDOW_H) })).filter((p) => Number.isFinite(p.v))
    const aRoll = rollingMean(w.a, 21)
    const bRoll = rollingMean(w.b, 21)
    const aPts = t.map((x, i) => ({ t: x, v: annualPct(aRoll[i], WINDOW_H) })).filter((p) => Number.isFinite(p.v))
    const bPts = t.map((x, i) => ({ t: x, v: annualPct(bRoll[i], WINDOW_H) })).filter((p) => Number.isFinite(p.v))
    const costSens = COST_LEVELS.map((c) => {
      const cc = roundTripCost(c, 0)
      return { perFill: c, be: breakEvenDays(st.meanPerDay, cc), net: (fixedDirectionSim(w.diff, 1, cc).net / (yrs || 1)) * 100 }
    })
    return {
      w,
      tooShort: false as const,
      st,
      hold,
      fixed,
      follow,
      yrs,
      diffPts,
      diffRoll,
      aPts,
      bPts,
      costSens,
      fixedCurve: w.t.map((x, i) => ({ t: x, v: fixed.curve[i] * 100 })),
      followCurve: w.t.map((x, i) => ({ t: x, v: follow.curve[i] * 100 })),
      curDiff: annualPct(w.diff[w.diff.length - 1], WINDOW_H),
      cur7: Number.isFinite(roll[roll.length - 1]) ? annualPct(roll[roll.length - 1], WINDOW_H) : null
    }
  }, [sa, sb, cost, signalDays])

  const pairs = useMemo(() => pairSummaries(withData, WINDOW_H, cost), [withData, cost])
  const errored = series.filter((s) => s.error)

  const swap = () => {
    setShortV(longV)
    setLongV(shortV)
  }

  return (
    <div className="bg-[#0d0d0d] px-4 py-4 font-mono">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-[13px] font-bold text-white">AETHER · ARBITRAGE STATS</h2>
            <p className="text-[9px] text-[#555555] mt-0.5">거래소 간 펀딩 차익(델타중립) 확률·통계 · 실제 거래소 공개 이력 · 8시간 창 정렬 · 4회 체결 비용 반영</p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1">
            연구·교육용 · 투자 권유 아님 · 가격 괴리/증거금/청산 위험 미반영 · 과거 성과는 미래를 보장하지 않음
          </span>
        </div>

        <FilterBar
          base={base}
          onBase={setBase}
          days={days}
          onDays={setDays}
          venues={series.map((s) => s.exchange)}
          withData={withData.map((s) => s.exchange)}
          shortV={shortV}
          longV={longV}
          onShort={setShortV}
          onLong={setLongV}
          onSwap={swap}
          feeBps={feeBps}
          slipBps={slipBps}
          onFee={setFeeBps}
          onSlip={setSlipBps}
          signalDays={signalDays}
          onSignalDays={setSignalDays}
          onRun={load}
          loading={loading}
        />

        {error && <p className="text-[10px] text-[#f2495c] mb-3">{error}</p>}
        {errored.length > 0 && (
          <p className="text-[10px] text-[#e0b400] mb-3">
            일부 거래소 이력을 받지 못했습니다: {errored.map((e) => `${venueLabel[e.exchange] ?? e.exchange}(${e.error})`).join(', ')}. 받지 못한 구간은 채우지 않고 제외합니다.
          </p>
        )}
        {sa && sb && sa.exchange === sb.exchange && <p className="text-[10px] text-[#e0b400] mb-3">숏/롱 거래소는 서로 달라야 합니다.</p>}
        {data && (!sa || !sb) && <p className="text-[10px] text-[#e0b400] mb-3">선택한 거래소의 이력이 없습니다. 다른 거래소를 선택해 주세요.</p>}
        {calc?.tooShort && <p className="text-[10px] text-[#e0b400] mb-3">두 거래소의 겹치는 이력이 너무 짧아(8시간 창 {calc.w.diff.length}개) 통계를 계산하지 않습니다.</p>}

        <SectionHeader label="Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1.5">
            <StatTile label="Windows (8h)" value={calc && !calc.tooShort ? `${calc.st.n.toLocaleString()}개` : '—'} hint={calc && !calc.tooShort ? `${calc.st.days.toFixed(0)}일 · ${fmtDate(calc.w.t[0])} ~ ${fmtDate(calc.w.t[calc.w.t.length - 1])}` : undefined} tone={calc && !calc.tooShort && calc.st.days < MIN_RELIABLE_DAYS ? 'bad' : 'neutral'} />
            <StatTile label="Mean diff (annual)" value={calc && !calc.tooShort ? `${signed(calc.st.meanAnnual)}%` : '—'} tone={calc && !calc.tooShort ? (calc.st.meanAnnual > 0 ? 'good' : 'bad') : 'neutral'} fill hint="숏 거래소 펀딩 - 롱 거래소 펀딩의 평균을 연환산. 양수면 선택한 방향이 유리" />
            <StatTile label="Median diff" value={calc && !calc.tooShort ? `${signed(calc.st.medianAnnual)}%` : '—'} />
            <StatTile label="Std (annual)" value={calc && !calc.tooShort ? `${calc.st.stdAnnual.toFixed(2)}%` : '—'} hint="창 단위 차이의 변동성 — 클수록 캐리가 들쭉날쭉" />
            <StatTile label="Favorable windows" value={calc && !calc.tooShort ? `${(calc.st.fracPositive * 100).toFixed(1)}%` : '—'} hint="선택한 방향이 이득이던 8시간 창의 비율" />
            <StatTile label="Persistence (lag-1)" value={calc && !calc.tooShort ? calc.st.lag1.toFixed(2) : '—'} hint="1-lag 자기상관. 높을수록 유리/불리한 상태가 이어짐" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1">
            <StatTile label="Current diff" value={calc && !calc.tooShort ? `${signed(calc.curDiff)}%` : '—'} hint="가장 최근 8시간 창의 차이(연환산)" />
            <StatTile label="7d avg diff" value={calc && !calc.tooShort && calc.cur7 !== null ? `${signed(calc.cur7)}%` : '—'} />
            <StatTile label="Round-trip cost" value={`${(cost * 100).toFixed(3)}%`} hint="양 거래소 진입 2 + 청산 2 = 4체결 (체결당 수수료+슬리피지), 한 다리 명목 대비" />
            <StatTile label="Break-even" value={calc && !calc.tooShort ? fmtDays(breakEvenDays(calc.st.meanPerDay, cost)) : '—'} tone={calc && !calc.tooShort ? (Number.isFinite(breakEvenDays(calc.st.meanPerDay, cost)) ? 'neutral' : 'bad') : 'neutral'} hint="평균 일 캐리로 왕복 비용을 회수하는 데 걸리는 기간" />
            <StatTile label="Fixed direction net" value={calc && !calc.tooShort ? `${signed(calc.fixed.net * 100)}%` : '—'} tone={calc && !calc.tooShort ? (calc.fixed.net > 0 ? 'good' : 'bad') : 'neutral'} fill hint={calc && !calc.tooShort ? `표본 전체 보유 시 비용 후 누적 캐리. 연환산 ${signed((calc.fixed.net / (calc.yrs || 1)) * 100)}%` : undefined} />
            <StatTile label={`Follow rule net`} value={calc && !calc.tooShort ? `${signed(calc.follow.net * 100)}%` : '—'} tone={calc && !calc.tooShort ? (calc.follow.net > 0 ? 'good' : 'bad') : 'neutral'} fill hint={calc && !calc.tooShort ? `직전 ${signalDays}일 평균 부호를 따라 방향 전환 · 전환 ${calc.follow.flips}회 · 비용 포함` : undefined} />
          </div>
          <p className="text-[8px] text-[#555555] mb-4">
            거래소 쌍을 여러 개 보고 가장 좋은 것을 고르면 낙관 편향이 생깁니다. 보유 기간별 분포의 창은 서로 겹치므로 독립 표본이 아닙니다.
          </p>
        </SectionHeader>

        {calc && !calc.tooShort && (
          <>
            {calc.st.days < MIN_RELIABLE_DAYS && (
              <p className="text-[10px] text-[#e0b400] mb-3">겹치는 이력이 {calc.st.days.toFixed(0)}일뿐입니다. {MIN_RELIABLE_DAYS}일 미만이면 통계가 의미 없습니다.</p>
            )}

            <SectionHeader label="Funding Differential">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title={`FUNDING RATE · ${base}`} subtitle="연환산 %, 7일 이동평균">
                  <LineChartPanel
                    series={[
                      { name: `${venueLabel[shortV] ?? shortV} (숏)`, color: '#ff9830', points: calc.aPts },
                      { name: `${venueLabel[longV] ?? longV} (롱)`, color: '#5794f2', points: calc.bPts }
                    ]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>
                <PanelFrame title="DIFFERENTIAL (숏 - 롱)" subtitle="연환산 %, 양수면 선택한 방향이 유리">
                  <LineChartPanel
                    series={[
                      { name: '8h 창', color: '#555555', points: calc.diffPts },
                      { name: '7일 평균', color: '#73bf69', points: calc.diffRoll }
                    ]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Probability — Holding Period">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="CUMULATIVE CARRY BY HOLDING PERIOD" subtitle="방향 고정 · 겹치는 창의 경험적 분포">
                  <table className="w-full text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">보유</th>
                        <th className="py-1 font-normal">창 수</th>
                        <th className="py-1 font-normal">하위 5%</th>
                        <th className="py-1 font-normal">중앙값</th>
                        <th className="py-1 font-normal">상위 5%</th>
                        <th className="py-1 font-normal">P(캐리 &gt; 비용)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.hold.map((r) => (
                        <tr key={r.days} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{r.days}일</td>
                          <td className="py-1 text-[#888888]">{r.n}</td>
                          <td className={`py-1 ${r.p5 < 0 ? 'text-[#f2495c]' : 'text-[#aaaaaa]'}`}>{signed(r.p5 * 100, 3)}%</td>
                          <td className={`py-1 font-bold ${r.median > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{signed(r.median * 100, 3)}%</td>
                          <td className="py-1 text-[#aaaaaa]">{signed(r.p95 * 100, 3)}%</td>
                          <td className={`py-1 font-bold ${r.pAboveCost >= 0.5 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{(r.pAboveCost * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[8px] text-[#555555] mt-1">
                    왕복 비용 {(cost * 100).toFixed(3)}%를 넘는 누적 캐리가 나온 창의 비율입니다. 창이 길수록 서로 겹쳐서 실제 독립 표본은 훨씬 적습니다.
                  </p>
                </PanelFrame>

                <PanelFrame title="CUMULATIVE NET CARRY" subtitle="표본 전체 · 진입 비용 반영 · % (한 다리 명목)">
                  <LineChartPanel
                    series={[
                      { name: '방향 고정', color: '#73bf69', points: calc.fixedCurve },
                      { name: `${signalDays}일 신호 추종`, color: '#b877d9', points: calc.followCurve }
                    ]}
                    yFormat={(v) => `${v.toFixed(2)}%`}
                  />
                  <p className="text-[8px] text-[#555555] mt-1">
                    방향 전환(추종) 규칙은 전환마다 청산+재진입 비용이 들어 보통 고정 방향보다 나쁩니다. 신호는 직전 구간만 사용합니다.
                  </p>
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Cost & Venues">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="COST SENSITIVITY" subtitle="체결당 비용(bp)을 바꿨을 때 손익분기와 순캐리">
                  <table className="w-full text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">체결당 비용</th>
                        <th className="py-1 font-normal">왕복 비용</th>
                        <th className="py-1 font-normal">손익분기</th>
                        <th className="py-1 font-normal">연환산 순캐리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.costSens.map((c) => (
                        <tr key={c.perFill} className="border-b border-[#141414]">
                          <td className="py-1 text-[#aaaaaa]">{c.perFill}bp</td>
                          <td className="py-1 text-[#888888]">{(roundTripCost(c.perFill, 0) * 100).toFixed(3)}%</td>
                          <td className="py-1 text-white">{fmtDays(c.be)}</td>
                          <td className={`py-1 font-bold ${c.net > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{signed(c.net)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PanelFrame>

                <PanelFrame title="ALL VENUE PAIRS" subtitle={`${base} · 유리한 방향 기준 · 겹치는 이력`}>
                  {pairs.length === 0 ? (
                    <p className="text-[10px] text-[#555555] pt-1">비교 가능한 거래소 쌍이 없습니다.</p>
                  ) : (
                    <table className="w-full text-[10px] mt-1">
                      <thead>
                        <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                          <th className="py-1 font-normal">숏 → 롱</th>
                          <th className="py-1 font-normal">일수</th>
                          <th className="py-1 font-normal">평균(연)</th>
                          <th className="py-1 font-normal">유리 비율</th>
                          <th className="py-1 font-normal">손익분기</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pairs.map((p) => (
                          <tr key={`${p.a}-${p.b}`} className="border-b border-[#141414]">
                            <td className="py-1 text-white font-bold">{venueLabel[p.shortVenue] ?? p.shortVenue} → {venueLabel[p.longVenue] ?? p.longVenue}</td>
                            <td className={`py-1 ${p.days < MIN_RELIABLE_DAYS ? 'text-[#f2495c]' : 'text-[#888888]'}`}>{p.days.toFixed(0)}</td>
                            <td className="py-1 text-[#73bf69] font-bold">{p.meanAnnualFavorable.toFixed(2)}%</td>
                            <td className="py-1 text-[#aaaaaa]">{(p.fracFavorable * 100).toFixed(0)}%</td>
                            <td className="py-1 text-white">{fmtDays(p.breakEvenDays)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </PanelFrame>

                <PanelFrame title="DATA COVERAGE" subtitle="거래소별 보유 이력 (OKX는 약 3개월만 제공)" className="lg:col-span-2">
                  <table className="w-full text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">거래소</th>
                        <th className="py-1 font-normal">정산 주기</th>
                        <th className="py-1 font-normal">건수</th>
                        <th className="py-1 font-normal">기간</th>
                        <th className="py-1 font-normal">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((s) => (
                        <tr key={s.exchange} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{venueLabel[s.exchange] ?? s.exchange}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.times.length ? `${s.intervalHours}h` : '—'}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.times.length.toLocaleString()}</td>
                          <td className="py-1 text-[#888888]">{s.times.length ? `${fmtDate(s.times[0])} ~ ${fmtDate(s.times[s.times.length - 1])}` : '—'}</td>
                          <td className={`py-1 ${s.error ? 'text-[#e0b400]' : 'text-[#73bf69]'}`}>{s.error ?? '정상'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PanelFrame>
              </div>
            </SectionHeader>
          </>
        )}

        <p className="text-[8px] text-[#555555] pb-2">
          방법: 숏 거래소 펀딩 − 롱 거래소 펀딩을 8시간 창으로 합산(정산 주기가 다른 거래소는 시간당 환산 후 합산, 창 안 모든 시간이 양쪽에 있을 때만 사용). 캐리는 한 다리 명목 대비 분수이며
          왕복 비용은 4체결(체결당 수수료+슬리피지)입니다. 거래소 간 가격 괴리, 각 거래소의 증거금·청산, 출금·이체 한도와 시간, 거래소 지급불능 위험은 반영하지 않습니다.
        </p>
      </div>
    </div>
  )
}

function FilterBar(props: {
  base: string
  onBase: (v: string) => void
  days: number
  onDays: (v: number) => void
  venues: string[]
  withData: string[]
  shortV: string
  longV: string
  onShort: (v: string) => void
  onLong: (v: string) => void
  onSwap: () => void
  feeBps: number
  slipBps: number
  onFee: (v: number) => void
  onSlip: (v: number) => void
  signalDays: number
  onSignalDays: (v: number) => void
  onRun: () => void
  loading: boolean
}) {
  const venueOptions = props.venues.length ? props.venues : ['BINANCE', 'BYBIT', 'OKX', 'HYPERLIQUID']
  const opt = (v: string) => (
    <option key={v} value={v} disabled={props.venues.length > 0 && !props.withData.includes(v)} className={props.venues.length > 0 && !props.withData.includes(v) ? 'text-[#555555]' : ''}>
      {venueLabel[v] ?? v}
      {props.venues.length > 0 && !props.withData.includes(v) ? ' (이력 없음)' : ''}
    </option>
  )
  return (
    <div className="mb-3">
      <div className="flex items-center flex-wrap gap-2 bg-[#111111] border border-[#222222] rounded-[2px] px-2.5 py-1.5">
        <Sel label="Asset" value={props.base} onChange={props.onBase}>
          {BASES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Sel>
        <Sel label="Period" value={String(props.days)} onChange={(v) => props.onDays(Number(v))}>
          {DAYS_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}일</option>
          ))}
        </Sel>
        <Sel label="Short" value={props.shortV} onChange={props.onShort}>{venueOptions.map(opt)}</Sel>
        <button type="button" onClick={props.onSwap} title="숏/롱 거래소 맞바꾸기" className="text-[10px] px-2 py-1 rounded-[2px] border border-[#222222] text-[#aaaaaa] hover:text-white">⇄</button>
        <Sel label="Long" value={props.longV} onChange={props.onLong}>{venueOptions.map(opt)}</Sel>
        <Num label="Fee bp" value={props.feeBps} step={0.5} min={0} max={20} onChange={props.onFee} />
        <Num label="Slip bp" value={props.slipBps} step={0.5} min={0} max={20} onChange={props.onSlip} />
        <Sel label="Signal" value={String(props.signalDays)} onChange={(v) => props.onSignalDays(Number(v))}>
          {[3, 7, 14].map((d) => (
            <option key={d} value={d}>{d}일 평균</option>
          ))}
        </Sel>
        <div className="flex-1" />
        <button type="button" onClick={props.onRun} disabled={props.loading} className="text-[10px] font-bold px-3 py-1 rounded-[2px] bg-[#f47a20] text-black disabled:opacity-50">
          {props.loading ? 'LOADING…' : 'REFRESH DATA'}
        </button>
      </div>
      <p className="text-[8px] text-[#555555] mt-1">자산·기간을 바꾸면 거래소 이력을 새로 받아 오고(첫 호출은 수 초), 나머지 값은 즉시 다시 계산됩니다. 회색 항목은 해당 기간 이력이 없는 거래소입니다.</p>
    </div>
  )
}

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-[#888888]">
      {label}:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[9px] text-[#dddddd] px-1 py-1">
        {children}
      </select>
    </label>
  )
}

function Num({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-[#888888]">
      {label}:
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="w-14 bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[9px] text-[#dddddd] px-1 py-1"
      />
    </label>
  )
}
