'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel from '@/components/admin/monitoring/LineChartPanel'
import { fetchFundingHistory } from '@/lib/api'
import { useT } from '@/lib/terminalI18n'
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
const fmtDays = (tr: (ko: string, en: string) => string, d: number) =>
  Number.isFinite(d) ? (d >= 100 ? `${Math.round(d)}${tr('일', ' days')}` : `${d.toFixed(1)}${tr('일', ' days')}`) : tr('회수 불가', 'Not recoverable')

/**
 * ARBITRAGE STATS — 거래소 간 펀딩 차익(델타중립 캐리)을 확률·통계로 보는 연구 화면. Grafana 스타일.
 *
 * 데이터: 백엔드 /api/market/funding-history (Binance · Bybit · OKX · Hyperliquid 공개 이력).
 * 계산: lib/arbMath.ts — 정산 주기가 다른 거래소를 8시간 창으로 맞추고, 빈 구간은 버린다(채우지 않음).
 * 가격 괴리·증거금·청산·출금 한도는 모델링하지 않는다. 연구·교육용이며 투자 권유가 아니다.
 */
export default function ArbitrageTerminal() {
  const tr = useT()
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
      setError('full')
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
            <p className="text-[9px] text-[#555555] mt-0.5">{tr('거래소 간 펀딩 차익(델타중립) 확률·통계 · 실제 거래소 공개 이력 · 8시간 창 정렬 · 4회 체결 비용 반영', 'Cross-exchange funding arbitrage (delta-neutral) probabilities & stats · real public exchange history · aligned to 8h windows · 4-fill round-trip costs included')}</p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1">
            {tr('연구·교육용 · 투자 권유 아님 · 가격 괴리/증거금/청산 위험 미반영 · 과거 성과는 미래를 보장하지 않음', 'For research & education only · Not investment advice · Price gaps / margin / liquidation risk not modeled · Past performance does not guarantee future results')}
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

        {error && <p className="text-[10px] text-[#f2495c] mb-3">{tr('펀딩 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. (지어낸 값으로 대체하지 않습니다)', 'Failed to load funding history. Please try again shortly. (We never substitute made-up values.)')}</p>}
        {errored.length > 0 && (
          <p className="text-[10px] text-[#e0b400] mb-3">
            {tr('일부 거래소 이력을 받지 못했습니다: ', 'Could not load history for some exchanges: ')}{errored.map((e) => `${venueLabel[e.exchange] ?? e.exchange}(${e.error})`).join(', ')}{tr('. 받지 못한 구간은 채우지 않고 제외합니다.', '. Missing ranges are excluded, not filled in.')}
          </p>
        )}
        {sa && sb && sa.exchange === sb.exchange && <p className="text-[10px] text-[#e0b400] mb-3">{tr('숏/롱 거래소는 서로 달라야 합니다.', 'The short and long exchanges must be different.')}</p>}
        {data && (!sa || !sb) && <p className="text-[10px] text-[#e0b400] mb-3">{tr('선택한 거래소의 이력이 없습니다. 다른 거래소를 선택해 주세요.', 'No history for the selected exchange. Please choose another.')}</p>}
        {calc?.tooShort && <p className="text-[10px] text-[#e0b400] mb-3">{tr(`두 거래소의 겹치는 이력이 너무 짧아(8시간 창 ${calc.w.diff.length}개) 통계를 계산하지 않습니다.`, `The overlapping history of the two exchanges is too short (${calc.w.diff.length} eight-hour windows) — stats are not computed.`)}</p>}

        <SectionHeader label="Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1.5">
            <StatTile label="Windows (8h)" value={calc && !calc.tooShort ? `${calc.st.n.toLocaleString()}` : '—'} hint={calc && !calc.tooShort ? `${calc.st.days.toFixed(0)}${tr('일', ' days')} · ${fmtDate(calc.w.t[0])} ~ ${fmtDate(calc.w.t[calc.w.t.length - 1])}` : undefined} tone={calc && !calc.tooShort && calc.st.days < MIN_RELIABLE_DAYS ? 'bad' : 'neutral'} />
            <StatTile label="Mean diff (annual)" value={calc && !calc.tooShort ? `${signed(calc.st.meanAnnual)}%` : '—'} tone={calc && !calc.tooShort ? (calc.st.meanAnnual > 0 ? 'good' : 'bad') : 'neutral'} fill hint={tr('숏 거래소 펀딩 - 롱 거래소 펀딩의 평균을 연환산. 양수면 선택한 방향이 유리', 'Annualized mean of (short-exchange funding − long-exchange funding). Positive means the chosen direction is favorable')} />
            <StatTile label="Median diff" value={calc && !calc.tooShort ? `${signed(calc.st.medianAnnual)}%` : '—'} />
            <StatTile label="Std (annual)" value={calc && !calc.tooShort ? `${calc.st.stdAnnual.toFixed(2)}%` : '—'} hint={tr('창 단위 차이의 변동성 — 클수록 캐리가 들쭉날쭉', 'Volatility of the per-window difference — higher means choppier carry')} />
            <StatTile label="Favorable windows" value={calc && !calc.tooShort ? `${(calc.st.fracPositive * 100).toFixed(1)}%` : '—'} hint={tr('선택한 방향이 이득이던 8시간 창의 비율', 'Share of 8-hour windows in which the chosen direction was profitable')} />
            <StatTile label="Persistence (lag-1)" value={calc && !calc.tooShort ? calc.st.lag1.toFixed(2) : '—'} hint={tr('1-lag 자기상관. 높을수록 유리/불리한 상태가 이어짐', 'Lag-1 autocorrelation. Higher means favorable/unfavorable regimes persist')} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1">
            <StatTile label="Current diff" value={calc && !calc.tooShort ? `${signed(calc.curDiff)}%` : '—'} hint={tr('가장 최근 8시간 창의 차이(연환산)', 'Difference in the latest 8-hour window (annualized)')} />
            <StatTile label="7d avg diff" value={calc && !calc.tooShort && calc.cur7 !== null ? `${signed(calc.cur7)}%` : '—'} />
            <StatTile label="Round-trip cost" value={`${(cost * 100).toFixed(3)}%`} hint={tr('양 거래소 진입 2 + 청산 2 = 4체결 (체결당 수수료+슬리피지), 한 다리 명목 대비', 'Entry 2 + exit 2 across both exchanges = 4 fills (fee + slippage each), relative to one leg\'s notional')} />
            <StatTile label="Break-even" value={calc && !calc.tooShort ? fmtDays(tr, breakEvenDays(calc.st.meanPerDay, cost)) : '—'} tone={calc && !calc.tooShort ? (Number.isFinite(breakEvenDays(calc.st.meanPerDay, cost)) ? 'neutral' : 'bad') : 'neutral'} hint={tr('평균 일 캐리로 왕복 비용을 회수하는 데 걸리는 기간', 'Time for the average daily carry to recover the round-trip cost')} />
            <StatTile label="Fixed direction net" value={calc && !calc.tooShort ? `${signed(calc.fixed.net * 100)}%` : '—'} tone={calc && !calc.tooShort ? (calc.fixed.net > 0 ? 'good' : 'bad') : 'neutral'} fill hint={calc && !calc.tooShort ? tr(`표본 전체 보유 시 비용 후 누적 캐리. 연환산 ${signed((calc.fixed.net / (calc.yrs || 1)) * 100)}%`, `Cumulative carry after costs when held over the whole sample. Annualized ${signed((calc.fixed.net / (calc.yrs || 1)) * 100)}%`) : undefined} />
            <StatTile label={`Follow rule net`} value={calc && !calc.tooShort ? `${signed(calc.follow.net * 100)}%` : '—'} tone={calc && !calc.tooShort ? (calc.follow.net > 0 ? 'good' : 'bad') : 'neutral'} fill hint={calc && !calc.tooShort ? tr(`직전 ${signalDays}일 평균 부호를 따라 방향 전환 · 전환 ${calc.follow.flips}회 · 비용 포함`, `Flips direction following the sign of the prior ${signalDays}-day average · ${calc.follow.flips} flips · costs included`) : undefined} />
          </div>
          <p className="text-[8px] text-[#555555] mb-4">
            {tr('거래소 쌍을 여러 개 보고 가장 좋은 것을 고르면 낙관 편향이 생깁니다. 보유 기간별 분포의 창은 서로 겹치므로 독립 표본이 아닙니다.', 'Looking at many exchange pairs and picking the best one creates optimism bias. The windows in the holding-period distribution overlap, so they are not independent samples.')}
          </p>
        </SectionHeader>

        {calc && !calc.tooShort && (
          <>
            {calc.st.days < MIN_RELIABLE_DAYS && (
              <p className="text-[10px] text-[#e0b400] mb-3">{tr(`겹치는 이력이 ${calc.st.days.toFixed(0)}일뿐입니다. ${MIN_RELIABLE_DAYS}일 미만이면 통계가 의미 없습니다.`, `Only ${calc.st.days.toFixed(0)} days of overlapping history. With fewer than ${MIN_RELIABLE_DAYS} days the stats are meaningless.`)}</p>
            )}

            <SectionHeader label="Funding Differential">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title={`FUNDING RATE · ${base}`} subtitle={tr('연환산 %, 7일 이동평균', 'Annualized %, 7-day moving average')}>
                  <LineChartPanel autoWidth
                    series={[
                      { name: `${venueLabel[shortV] ?? shortV} (${tr('숏', 'short')})`, color: '#ff9830', points: calc.aPts },
                      { name: `${venueLabel[longV] ?? longV} (${tr('롱', 'long')})`, color: '#5794f2', points: calc.bPts }
                    ]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>
                <PanelFrame title={tr('DIFFERENTIAL (숏 - 롱)', 'DIFFERENTIAL (short − long)')} subtitle={tr('연환산 %, 양수면 선택한 방향이 유리', 'Annualized %, positive = chosen direction is favorable')}>
                  <LineChartPanel autoWidth
                    series={[
                      { name: tr('8h 창', '8h window'), color: '#555555', points: calc.diffPts },
                      { name: tr('7일 평균', '7-day avg'), color: '#73bf69', points: calc.diffRoll }
                    ]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Probability — Holding Period">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="CUMULATIVE CARRY BY HOLDING PERIOD" subtitle={tr('방향 고정 · 겹치는 창의 경험적 분포', 'Fixed direction · empirical distribution of overlapping windows')}>
                  <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('보유', 'Hold')}</th>
                        <th className="py-1 font-normal">{tr('창 수', 'Windows')}</th>
                        <th className="py-1 font-normal">{tr('하위 5%', 'Bottom 5%')}</th>
                        <th className="py-1 font-normal">{tr('중앙값', 'Median')}</th>
                        <th className="py-1 font-normal">{tr('상위 5%', 'Top 5%')}</th>
                        <th className="py-1 font-normal">{tr('P(캐리 > 비용)', 'P(carry > cost)')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.hold.map((r) => (
                        <tr key={r.days} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{r.days}{tr('일', 'd')}</td>
                          <td className="py-1 text-[#888888]">{r.n}</td>
                          <td className={`py-1 ${r.p5 < 0 ? 'text-[#f2495c]' : 'text-[#aaaaaa]'}`}>{signed(r.p5 * 100, 3)}%</td>
                          <td className={`py-1 font-bold ${r.median > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{signed(r.median * 100, 3)}%</td>
                          <td className="py-1 text-[#aaaaaa]">{signed(r.p95 * 100, 3)}%</td>
                          <td className={`py-1 font-bold ${r.pAboveCost >= 0.5 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{(r.pAboveCost * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                  <p className="text-[8px] text-[#555555] mt-1">
                    {tr(`왕복 비용 ${(cost * 100).toFixed(3)}%를 넘는 누적 캐리가 나온 창의 비율입니다. 창이 길수록 서로 겹쳐서 실제 독립 표본은 훨씬 적습니다.`, `Share of windows whose cumulative carry exceeded the ${(cost * 100).toFixed(3)}% round-trip cost. Longer windows overlap more, so the real number of independent samples is much smaller.`)}
                  </p>
                </PanelFrame>

                <PanelFrame title="CUMULATIVE NET CARRY" subtitle={tr('표본 전체 · 진입 비용 반영 · % (한 다리 명목)', 'Full sample · entry costs included · % (one leg notional)')}>
                  <LineChartPanel autoWidth
                    series={[
                      { name: tr('방향 고정', 'Fixed direction'), color: '#73bf69', points: calc.fixedCurve },
                      { name: tr(`${signalDays}일 신호 추종`, `Follow ${signalDays}d signal`), color: '#b877d9', points: calc.followCurve }
                    ]}
                    yFormat={(v) => `${v.toFixed(2)}%`}
                  />
                  <p className="text-[8px] text-[#555555] mt-1">
                    {tr('방향 전환(추종) 규칙은 전환마다 청산+재진입 비용이 들어 보통 고정 방향보다 나쁩니다. 신호는 직전 구간만 사용합니다.', 'The direction-following rule pays exit + re-entry costs on every flip, so it is usually worse than a fixed direction. The signal uses only the prior window.')}
                  </p>
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Cost & Venues">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="COST SENSITIVITY" subtitle={tr('체결당 비용(bp)을 바꿨을 때 손익분기와 순캐리', 'Break-even and net carry as the per-fill cost (bp) changes')}>
                  <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('체결당 비용', 'Cost per fill')}</th>
                        <th className="py-1 font-normal">{tr('왕복 비용', 'Round-trip cost')}</th>
                        <th className="py-1 font-normal">{tr('손익분기', 'Break-even')}</th>
                        <th className="py-1 font-normal">{tr('연환산 순캐리', 'Annualized net carry')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.costSens.map((c) => (
                        <tr key={c.perFill} className="border-b border-[#141414]">
                          <td className="py-1 text-[#aaaaaa]">{c.perFill}bp</td>
                          <td className="py-1 text-[#888888]">{(roundTripCost(c.perFill, 0) * 100).toFixed(3)}%</td>
                          <td className="py-1 text-white">{fmtDays(tr, c.be)}</td>
                          <td className={`py-1 font-bold ${c.net > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{signed(c.net)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                </PanelFrame>

                <PanelFrame title="ALL VENUE PAIRS" subtitle={tr(`${base} · 유리한 방향 기준 · 겹치는 이력`, `${base} · favorable direction · overlapping history`)}>
                  {pairs.length === 0 ? (
                    <p className="text-[10px] text-[#555555] pt-1">{tr('비교 가능한 거래소 쌍이 없습니다.', 'No comparable exchange pairs.')}</p>
                  ) : (
                    <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                      <thead>
                        <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                          <th className="py-1 font-normal">{tr('숏 → 롱', 'Short → Long')}</th>
                          <th className="py-1 font-normal">{tr('일수', 'Days')}</th>
                          <th className="py-1 font-normal">{tr('평균(연)', 'Mean (ann.)')}</th>
                          <th className="py-1 font-normal">{tr('유리 비율', 'Favorable %')}</th>
                          <th className="py-1 font-normal">{tr('손익분기', 'Break-even')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pairs.map((p) => (
                          <tr key={`${p.a}-${p.b}`} className="border-b border-[#141414]">
                            <td className="py-1 text-white font-bold">{venueLabel[p.shortVenue] ?? p.shortVenue} → {venueLabel[p.longVenue] ?? p.longVenue}</td>
                            <td className={`py-1 ${p.days < MIN_RELIABLE_DAYS ? 'text-[#f2495c]' : 'text-[#888888]'}`}>{p.days.toFixed(0)}</td>
                            <td className="py-1 text-[#73bf69] font-bold">{p.meanAnnualFavorable.toFixed(2)}%</td>
                            <td className="py-1 text-[#aaaaaa]">{(p.fracFavorable * 100).toFixed(0)}%</td>
                            <td className="py-1 text-white">{fmtDays(tr, p.breakEvenDays)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                  )}
                </PanelFrame>

                <PanelFrame title="DATA COVERAGE" subtitle={tr('거래소별 보유 이력 (OKX는 약 3개월만 제공)', 'History available per exchange (OKX provides only ~3 months)')} className="lg:col-span-2">
                  <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('거래소', 'Exchange')}</th>
                        <th className="py-1 font-normal">{tr('정산 주기', 'Settlement')}</th>
                        <th className="py-1 font-normal">{tr('건수', 'Count')}</th>
                        <th className="py-1 font-normal">{tr('기간', 'Period')}</th>
                        <th className="py-1 font-normal">{tr('상태', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((s) => (
                        <tr key={s.exchange} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{venueLabel[s.exchange] ?? s.exchange}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.times.length ? `${s.intervalHours}h` : '—'}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.times.length.toLocaleString()}</td>
                          <td className="py-1 text-[#888888]">{s.times.length ? `${fmtDate(s.times[0])} ~ ${fmtDate(s.times[s.times.length - 1])}` : '—'}</td>
                          <td className={`py-1 ${s.error ? 'text-[#e0b400]' : 'text-[#73bf69]'}`}>{s.error ?? tr('정상', 'OK')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                </PanelFrame>
              </div>
            </SectionHeader>
          </>
        )}

        <p className="text-[8px] text-[#555555] pb-2">
          {tr('방법: 숏 거래소 펀딩 − 롱 거래소 펀딩을 8시간 창으로 합산(정산 주기가 다른 거래소는 시간당 환산 후 합산, 창 안 모든 시간이 양쪽에 있을 때만 사용). 캐리는 한 다리 명목 대비 분수이며 왕복 비용은 4체결(체결당 수수료+슬리피지)입니다. 거래소 간 가격 괴리, 각 거래소의 증거금·청산, 출금·이체 한도와 시간, 거래소 지급불능 위험은 반영하지 않습니다.',
            'Method: short-exchange funding − long-exchange funding summed over 8-hour windows (exchanges with different settlement intervals are converted to hourly first; a window is used only when every hour is present on both sides). Carry is a fraction of one leg\'s notional; round-trip cost is 4 fills (fee + slippage each). Cross-exchange price gaps, each exchange\'s margin/liquidation, withdrawal/transfer limits and time, and exchange insolvency risk are not modeled.')}
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
  const tr = useT()
  const venueOptions = props.venues.length ? props.venues : ['BINANCE', 'BYBIT', 'OKX', 'HYPERLIQUID']
  const opt = (v: string) => (
    <option key={v} value={v} disabled={props.venues.length > 0 && !props.withData.includes(v)} className={props.venues.length > 0 && !props.withData.includes(v) ? 'text-[#555555]' : ''}>
      {venueLabel[v] ?? v}
      {props.venues.length > 0 && !props.withData.includes(v) ? tr(' (이력 없음)', ' (no history)') : ''}
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
            <option key={d} value={d}>{d}{tr('일', ' days')}</option>
          ))}
        </Sel>
        <Sel label="Short" value={props.shortV} onChange={props.onShort}>{venueOptions.map(opt)}</Sel>
        <button type="button" onClick={props.onSwap} title={tr('숏/롱 거래소 맞바꾸기', 'Swap short/long exchanges')} className="text-[12px] sm:text-[10px] px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-[2px] border border-[#222222] text-[#aaaaaa] hover:text-white">⇄</button>
        <Sel label="Long" value={props.longV} onChange={props.onLong}>{venueOptions.map(opt)}</Sel>
        <Num label="Fee bp" value={props.feeBps} step={0.5} min={0} max={20} onChange={props.onFee} />
        <Num label="Slip bp" value={props.slipBps} step={0.5} min={0} max={20} onChange={props.onSlip} />
        <Sel label="Signal" value={String(props.signalDays)} onChange={(v) => props.onSignalDays(Number(v))}>
          {[3, 7, 14].map((d) => (
            <option key={d} value={d}>{d}{tr('일 평균', '-day avg')}</option>
          ))}
        </Sel>
        <div className="flex-1" />
        <button type="button" onClick={props.onRun} disabled={props.loading} className="text-[11px] sm:text-[10px] font-bold px-3 py-2 sm:py-1 rounded-[2px] bg-[#f47a20] text-black disabled:opacity-50">
          {props.loading ? 'LOADING…' : 'REFRESH DATA'}
        </button>
      </div>
      <p className="text-[8px] text-[#555555] mt-1">{tr('자산·기간을 바꾸면 거래소 이력을 새로 받아 오고(첫 호출은 수 초), 나머지 값은 즉시 다시 계산됩니다. 회색 항목은 해당 기간 이력이 없는 거래소입니다.', 'Changing the asset or period fetches exchange history again (the first call takes a few seconds); other values recalculate instantly. Greyed-out items are exchanges with no history for that period.')}</p>
    </div>
  )
}

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] sm:text-[9px] text-[#888888]">
      {label}:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[11px] sm:text-[9px] text-[#dddddd] px-1.5 sm:px-1 py-1.5 sm:py-1">
        {children}
      </select>
    </label>
  )
}

function Num({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] sm:text-[9px] text-[#888888]">
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
        className="w-16 sm:w-14 bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[11px] sm:text-[9px] text-[#dddddd] px-1.5 sm:px-1 py-1.5 sm:py-1"
      />
    </label>
  )
}
