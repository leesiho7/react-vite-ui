'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel from '@/components/admin/monitoring/LineChartPanel'
import BarChartPanel from '@/components/admin/monitoring/BarChartPanel'
import { fetchKimchiHistory } from '@/lib/api'
import { useT } from '@/lib/terminalI18n'
import {
  FxBasis,
  KimchiHistoryResponse,
  byHourOfDay,
  dropHitProbability,
  forwardByQuintile,
  histogram,
  premiumSeries,
  premiumStats,
  rollingMean,
  shareAbove
} from '@/lib/kimchiMath'

const BASES = ['BTC', 'ETH', 'SOL']
const DAYS_OPTIONS = [30, 90, 180]
const HORIZONS = [24, 72]
const THRESHOLDS = [0, 1, 2, 3, 5]
const MIN_RELIABLE_DAYS = 30

const signed = (v: number, d = 2) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(d)}` : '—')
const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const fmtHours = (tr: (ko: string, en: string) => string, h: number) =>
  Number.isFinite(h) ? (h >= 48 ? `${(h / 24).toFixed(1)}${tr('일', ' days')}` : `${h.toFixed(1)}${tr('시간', ' h')}`) : tr('회귀 안 함', 'No reversion')
const pct = (v: number, d = 0) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '—')

/**
 * KIMCHI STATS — 김치 프리미엄의 분포·평균회귀·조건부 확률을 보는 연구 화면. Grafana 스타일.
 *
 * 데이터: 백엔드 /api/market/kimchi-history (Upbit KRW-자산, Upbit KRW-USDT, Binance 현물 1시간 봉).
 * 프리미엄 = Upbit KRW / (Binance USDT × KRW-USDT) − 1. 환율을 USDT 로 잡아 테더 프리미엄은 포함되지 않는다.
 * 계산: lib/kimchiMath.ts. 세 시세가 모두 있는 시각만 사용하고 빈 구간은 채우지 않는다.
 * 실제 차익 실행(원화 입출금·송금 한도·KYC·거래소 규정·전송 시간)은 모델링하지 않는다. 연구·교육용이며 투자 권유가 아니다.
 */
export default function KimchiTerminal() {
  const tr = useT()
  const [base, setBase] = useState('BTC')
  const [days, setDays] = useState(90)
  const [horizon, setHorizon] = useState(24)
  const [basis, setBasis] = useState<FxBasis>('official')
  const [level, setLevel] = useState(0.5)
  const [drop, setDrop] = useState(1)

  const [data, setData] = useState<KimchiHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const r = await fetchKimchiHistory(base, days)
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

  const calc = useMemo(() => {
    if (!data || data.times.length < 48) return null
    const p = premiumSeries(data, basis)
    const st = premiumStats(p)
    if (!st) return null
    const t = data.times
    const roll = rollingMean(p, 24 * 7)
    const hist = histogram(p, st.max - st.min > 8 ? 0.5 : 0.25)
    const above = shareAbove(p, THRESHOLDS)
    const quint = HORIZONS.map((h) => ({ h, rows: forwardByQuintile(p, h) }))
    const hod = byHourOfDay(t, p)
    return {
      p,
      st,
      premPts: t.map((x, i) => ({ t: x, v: p[i] })),
      rollPts: t.map((x, i) => ({ t: x, v: roll[i] })).filter((q) => Number.isFinite(q.v)),
      hist,
      above,
      quint,
      hod
    }
  }, [data, basis])

  const hit = useMemo(() => (calc ? dropHitProbability(calc.p, level, horizon, drop) : null), [calc, level, drop, horizon])
  const presets = useMemo(() => {
    if (!calc) return []
    const rows: { h: number; d: number; r: ReturnType<typeof dropHitProbability> }[] = []
    for (const h of HORIZONS) for (const d of [0.5, 1, 2]) rows.push({ h, d, r: dropHitProbability(calc.p, level, h, d) })
    return rows
  }, [calc, level])

  const tooShort = data && !data.error && !calc
  const hodMin = calc ? Math.min(...calc.hod.filter((x) => Number.isFinite(x.mean)).map((x) => x.mean)) : 0
  const histMax = calc ? Math.max(...calc.hist.map((b) => b.frac)) : 1

  return (
    <div className="bg-[#0d0d0d] px-4 py-4 font-mono">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-[13px] font-bold text-white">AETHER · KIMCHI PREMIUM STATS</h2>
            <p className="text-[9px] text-[#555555] mt-0.5">{tr('Upbit(KRW) 대 Binance(USDT) 1시간 봉 · 환율은 공식 USD/KRW(ECB 일별, 직전 영업일 값) 또는 Upbit KRW-USDT 선택 · 세 시세가 모두 있는 시각만 사용', 'Upbit (KRW) vs Binance (USDT) 1-hour bars · FX is the official USD/KRW (ECB daily, previous business day) or Upbit KRW-USDT · only hours where all three prices exist')}</p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1">
            {tr('연구·교육용 · 투자 권유 아님 · 원화 입출금/송금 한도/KYC/전송 시간 미반영 · 과거 성과는 미래를 보장하지 않음', 'For research & education only · Not investment advice · KRW deposits/withdrawals, transfer limits, KYC and transfer time not modeled · Past performance does not guarantee future results')}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex items-center flex-wrap gap-2 bg-[#111111] border border-[#222222] rounded-[2px] px-2.5 py-1.5">
            <Sel label="Asset" value={base} onChange={setBase}>
              {BASES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Sel>
            <Sel label="FX" value={basis} onChange={(v) => setBasis(v as FxBasis)}>
              <option value="official">{tr('공식 환율 (김프)', 'Official FX (Kimchi premium)')}</option>
              <option value="usdt">{tr('USDT 환율', 'USDT FX')}</option>
            </Sel>
            <Sel label="Period" value={String(days)} onChange={(v) => setDays(Number(v))}>
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}{tr('일', ' days')}</option>
              ))}
            </Sel>
            <Sel label="Horizon" value={String(horizon)} onChange={(v) => setHorizon(Number(v))}>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>{h}{tr('시간', ' h')}</option>
              ))}
            </Sel>
            <Num label="Level %" value={level} step={0.5} min={-5} max={15} onChange={setLevel} />
            <Num label="Drop %p" value={drop} step={0.25} min={0.25} max={10} onChange={setDrop} />
            <div className="flex-1" />
            <button type="button" onClick={load} disabled={loading} className="text-[11px] sm:text-[10px] font-bold px-3 py-2 sm:py-1 rounded-[2px] bg-[#f47a20] text-black disabled:opacity-50">
              {loading ? 'LOADING…' : 'REFRESH DATA'}
            </button>
          </div>
          <p className="text-[8px] text-[#555555] mt-1">
            {tr('자산·기간을 바꾸면 이력을 새로 받아 오고(첫 호출은 수십 초 걸릴 수 있음), Horizon·Level·Drop 은 즉시 다시 계산됩니다.', 'Changing the asset or period fetches history again (the first call can take tens of seconds); Horizon, Level and Drop recalculate instantly.')}
          </p>
        </div>

        {error && <p className="text-[10px] text-[#f2495c] mb-3">{tr('김치 프리미엄 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. (지어낸 값으로 대체하지 않습니다)', 'Failed to load Kimchi-premium history. Please try again shortly. (We never substitute made-up values.)')}</p>}
        {data?.error && <p className="text-[10px] text-[#e0b400] mb-3">{tr('일부 시세를 받지 못했습니다: ', 'Some prices could not be loaded: ')}{data.error}{tr('. 받지 못한 구간은 채우지 않습니다.', '. Missing ranges are not filled in.')}</p>}
        {data?.fxError && <p className="text-[10px] text-[#e0b400] mb-3">{tr(`공식 환율을 받지 못했습니다(${data.fxError}). 공식 환율 기준 통계는 계산하지 않습니다.`, `Could not load the official FX rate (${data.fxError}). Stats based on official FX are not computed.`)}{basis === 'official' ? tr(' FX 를 USDT 환율로 바꾸면 USDT 기준으로 볼 수 있습니다.', ' Switch FX to USDT to view it on a USDT basis.') : ''}</p>}
        {tooShort && <p className="text-[10px] text-[#e0b400] mb-3">{tr(`세 시세가 겹치는 이력이 너무 짧아(1시간 봉 ${data.times.length}개) 통계를 계산하지 않습니다.`, `The overlapping history of the three prices is too short (${data.times.length} hourly bars) — stats are not computed.`)}</p>}

        <SectionHeader label="Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1.5">
            <StatTile label="Current premium" value={calc ? `${signed(calc.st.current)}%` : '—'} tone={calc ? (calc.st.current > 0 ? 'good' : 'bad') : 'neutral'} fill hint={calc ? tr(`표본 내 ${calc.st.currentPercentile.toFixed(0)} 백분위 · 마지막 봉 ${new Date(data!.times[data!.times.length - 1]).toISOString().slice(0, 16).replace('T', ' ')} UTC`, `${calc.st.currentPercentile.toFixed(0)}th percentile in sample · last bar ${new Date(data!.times[data!.times.length - 1]).toISOString().slice(0, 16).replace('T', ' ')} UTC`) : undefined} />
            <StatTile label="Mean" value={calc ? `${signed(calc.st.mean)}%` : '—'} />
            <StatTile label="Median" value={calc ? `${signed(calc.st.median)}%` : '—'} />
            <StatTile label="Std" value={calc ? `${calc.st.std.toFixed(2)}%p` : '—'} hint={tr('1시간 봉 프리미엄 수준의 표준편차', 'Standard deviation of the hourly premium level')} />
            <StatTile label="5% ~ 95%" value={calc ? `${signed(calc.st.p5, 1)} ~ ${signed(calc.st.p95, 1)}%` : '—'} hint={tr('표본 분포의 양끝 5%를 제외한 범위', 'Range excluding the outer 5% on each side of the sample')} />
            <StatTile label="Min / Max" value={calc ? `${signed(calc.st.min, 1)} / ${signed(calc.st.max, 1)}%` : '—'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1">
            <StatTile label="Z vs 30d" value={calc ? signed(calc.st.zTrailing) : '—'} tone={calc && Number.isFinite(calc.st.zTrailing) ? (Math.abs(calc.st.zTrailing) >= 2 ? 'bad' : 'neutral') : 'neutral'} hint={tr('현재값이 직전 30일(현재 봉 제외) 평균에서 몇 표준편차 떨어졌는지', 'How many standard deviations the current value is from the prior 30-day mean (current bar excluded)')} />
            <StatTile label="Half-life" value={calc ? fmtHours(tr, calc.st.halfLifeHours) : '—'} hint={tr('AR(1) 추정. 프리미엄 이탈이 절반으로 줄어드는 데 걸리는 시간', 'AR(1) estimate. Time for a premium deviation to shrink by half')} />
            <StatTile label="AR(1) φ" value={calc ? calc.st.phi.toFixed(3) : '—'} hint={tr('1시간 자기회귀 계수. 1에 가까울수록 오래 머무름', '1-hour autoregressive coefficient. Closer to 1 means deviations persist longer')} />
            <StatTile label="t(φ−1)" value={calc ? signed(calc.st.tGamma, 1) : '—'} hint={tr('단위근 검정용 통계량. 음수로 클수록 평균회귀 증거가 강함(임계값은 일반 t 분포와 다름)', 'Unit-root test statistic. More negative means stronger evidence of mean reversion (critical values differ from the normal t distribution)')} />
            <StatTile label="Hours" value={calc ? `${calc.st.n.toLocaleString()}` : '—'} tone={calc && calc.st.days < MIN_RELIABLE_DAYS ? 'bad' : 'neutral'} hint={calc ? `${calc.st.days.toFixed(0)}${tr('일', ' days')} · ${fmtDate(data!.times[0])} ~ ${fmtDate(data!.times[data!.times.length - 1])}` : undefined} />
            <StatTile label="Premium ≥ 0" value={calc ? pct(calc.above[0].frac) : '—'} hint={tr('프리미엄이 0 이상이던 시간의 비율', 'Share of hours with a premium of 0 or more')} />
          </div>
          <p className="text-[8px] text-[#555555] mb-4">
            {basis === 'official'
              ? tr('공식 환율 기준이라 테더(USDT) 자체의 프리미엄이 포함됩니다. 공식 환율은 일 1회 값이라 장중 환율 변동은 반영되지 않습니다. ', 'On the official-FX basis the premium of Tether (USDT) itself is included. The official rate is a once-a-day value, so intraday FX moves are not reflected. ')
              : tr('USDT 환율 기준은 차익거래로 거의 0에 눌려 있어 코인 자체의 괴리만 보여 줍니다(우리가 흔히 말하는 김프와 다름). ', 'On the USDT basis the premium is pinned near zero by arbitrage and shows only the coin-specific gap (not the "Kimchi premium" people usually mean). ')}
            {tr('1시간 봉이 서로 강하게 이어져 있어 독립 표본 수는 봉 수보다 훨씬 적습니다.', 'Hourly bars are strongly autocorrelated, so the number of independent samples is far smaller than the number of bars.')}
          </p>
        </SectionHeader>

        {calc && (
          <>
            {calc.st.days < MIN_RELIABLE_DAYS && (
              <p className="text-[10px] text-[#e0b400] mb-3">{tr(`겹치는 이력이 ${calc.st.days.toFixed(0)}일뿐입니다. ${MIN_RELIABLE_DAYS}일 미만이면 통계가 의미 없습니다.`, `Only ${calc.st.days.toFixed(0)} days of overlapping history. With fewer than ${MIN_RELIABLE_DAYS} days the stats are meaningless.`)}</p>
            )}

            <SectionHeader label="Premium Over Time">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title={`KIMCHI PREMIUM · ${base}`} subtitle={tr('% · 1시간 봉과 7일 이동평균', '% · hourly bars and 7-day moving average')}>
                  <LineChartPanel autoWidth
                    series={[
                      { name: tr('1시간 봉', 'Hourly bar'), color: '#555555', points: calc.premPts },
                      { name: tr('7일 평균', '7-day avg'), color: '#73bf69', points: calc.rollPts }
                    ]}
                    yFormat={(v) => `${v.toFixed(1)}%`}
                  />
                </PanelFrame>

                <PanelFrame title="DISTRIBUTION" subtitle={tr('프리미엄 수준별 시간 비율 (%) · 막대를 누르면 값', 'Share of time by premium level (%) · tap a bar for its value')}>
                  <BarChartPanel autoWidth
                    data={calc.hist.map((b) => ({
                      label: `${b.lo.toFixed(1)}~${b.hi.toFixed(1)}%`,
                      value: Number((b.frac * 100).toFixed(2)),
                      color: b.hi <= 0 ? '#f2495c' : b.frac === histMax ? '#f47a20' : '#5794f2'
                    }))}
                    valueFormat={(v) => `${v.toFixed(1)}%`}
                  />
                  <><div className="overflow-x-auto"><table className="w-full min-w-[300px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        {calc.above.map((a) => (
                          <th key={a.threshold} className="py-1 font-normal">≥ {a.threshold}%</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#141414]">
                        {calc.above.map((a) => (
                          <td key={a.threshold} className="py-1 text-white font-bold">{pct(a.frac, 1)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table></div></>
                  <p className="text-[8px] text-[#555555] mt-1">{tr('빨강: 역프리미엄(0% 미만) 구간 · 주황: 가장 흔한 구간. 표는 해당 수준 이상이던 시간의 비율입니다.', 'Red: reverse premium (below 0%) · Orange: most common range. The table shows the share of time at or above each level.')}</p>
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Probability — Mean Reversion">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="HIT PROBABILITY" subtitle={tr(`프리미엄 ≥ ${level}%일 때 ${horizon}시간 안에 ${drop}%p 이상 하락할 경험적 비율`, `Empirical share of times the premium fell by ${drop}%p or more within ${horizon}h when it was ≥ ${level}%`)}>
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <StatTile label={tr('P(하락 도달)', 'P(drop reached)')} value={hit && hit.n > 0 ? pct(hit.prob) : '—'} tone={hit && hit.n > 0 ? (hit.prob >= 0.5 ? 'good' : 'neutral') : 'neutral'} fill hint={hit ? tr(`조건 충족 ${hit.n}시간 중 ${hit.hits}회 (겹치는 구간 포함)`, `${hit.hits} of ${hit.n} qualifying hours (overlapping windows included)`) : undefined} />
                    <StatTile label={tr('독립 근사 표본', 'Independent sample')} value={hit && hit.nIndependent > 0 ? `${hitsText(hit.hitsIndependent, hit.nIndependent)}` : '—'} tone={hit && hit.nIndependent < 10 ? 'bad' : 'neutral'} hint={tr(`서로 ${horizon}시간 이상 떨어진 시점만 센 값. 10건 미만이면 신뢰하기 어렵습니다`, `Counts only points at least ${horizon}h apart. Fewer than 10 is hard to trust`)} />
                  </div>
                  <><div className="overflow-x-auto"><table className="w-full min-w-[320px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('기간', 'Horizon')}</th>
                        <th className="py-1 font-normal">{tr('하락폭', 'Drop')}</th>
                        <th className="py-1 font-normal">{tr('조건 시간', 'Qualifying hours')}</th>
                        <th className="py-1 font-normal">{tr('확률', 'Probability')}</th>
                        <th className="py-1 font-normal">{tr('독립 근사', 'Independent')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presets.map((x) => (
                        <tr key={`${x.h}-${x.d}`} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{x.h}h</td>
                          <td className="py-1 text-[#aaaaaa]">{x.d}%p</td>
                          <td className="py-1 text-[#888888]">{x.r.n}</td>
                          <td className={`py-1 font-bold ${x.r.n === 0 ? 'text-[#555555]' : x.r.prob >= 0.5 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{x.r.n ? pct(x.r.prob) : '—'}</td>
                          <td className={`py-1 ${x.r.nIndependent < 10 ? 'text-[#f2495c]' : 'text-[#888888]'}`}>{x.r.nIndependent ? hitsText(x.r.hitsIndependent, x.r.nIndependent) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                  <p className="text-[8px] text-[#555555] mt-1">
                    {tr('프리미엄이 높게 유지되는 구간에서는 같은 사건이 연속 시간에 중복해서 잡힙니다. 하락이 "도달"해도 실제로는 원화 입출금·송금 지연으로 그 가격에 청산하지 못할 수 있습니다.', 'While the premium stays high, the same event is counted repeatedly across consecutive hours. Even if the drop is "reached", KRW deposit/withdrawal and transfer delays may keep you from closing at that price.')}
                  </p>
                </PanelFrame>

                {calc.quint.map(({ h, rows }) => (
                  <PanelFrame key={h} title={`FORWARD CHANGE · ${h}H`} subtitle={tr('프리미엄 수준(표본 5분위)별 이후 변화, %p', 'Subsequent change by premium level (sample quintiles), %p')}>
                    {rows.length === 0 ? (
                      <p className="text-[10px] text-[#555555] pt-1">{tr('표본이 짧아 계산하지 않습니다.', 'Sample too short — not calculated.')}</p>
                    ) : (
                      <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                        <thead>
                          <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                            <th className="py-1 font-normal">{tr('구간', 'Bucket')}</th>
                            <th className="py-1 font-normal">{tr('프리미엄 범위', 'Premium range')}</th>
                            <th className="py-1 font-normal">{tr('표본', 'Sample')}</th>
                            <th className="py-1 font-normal">{tr('평균 변화', 'Mean change')}</th>
                            <th className="py-1 font-normal">{tr('중앙값', 'Median')}</th>
                            <th className="py-1 font-normal">{tr('하락 비율', 'Share down')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.q} className="border-b border-[#141414]">
                              <td className="py-1 text-white font-bold">Q{r.q}</td>
                              <td className="py-1 text-[#888888]">{signed(r.lo, 1)} ~ {signed(r.hi, 1)}%</td>
                              <td className="py-1 text-[#888888]">{r.n}</td>
                              <td className={`py-1 font-bold ${r.meanChange < 0 ? 'text-[#f2495c]' : 'text-[#73bf69]'}`}>{signed(r.meanChange, 3)}</td>
                              <td className="py-1 text-[#aaaaaa]">{signed(r.medianChange, 3)}</td>
                              <td className="py-1 text-[#aaaaaa]">{pct(r.fracDown)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                    )}
                    <p className="text-[8px] text-[#555555] mt-1">
                      {tr('Q5(프리미엄 높은 구간)에서 평균 변화가 음수이고 Q1에서 양수면 평균회귀 경향입니다. 구간 경계는 표본 전체로 잡아 규칙으로 쓸 수 있는 신호가 아닌 기술 통계입니다.', 'If the mean change is negative in Q5 (high premium) and positive in Q1, there is a mean-reversion tendency. Bucket edges use the whole sample, so this is descriptive statistics, not a tradable signal.')}
                    </p>
                  </PanelFrame>
                ))}

                <PanelFrame title="BY HOUR OF DAY" subtitle={tr('최저 시간대 대비 평균 프리미엄 차이(%p) · 한국시간 · 막대를 누르면 실제 평균', 'Mean premium vs the lowest hour (%p) · Korea time (KST) · tap a bar for the actual mean')}>
                  <BarChartPanel autoWidth
                    data={calc.hod.map((x) => ({
                      label: tr(`${(x.hourUtc + 9) % 24}시 (평균 ${signed(x.mean, 2)}%)`, `${(x.hourUtc + 9) % 24}:00 KST (mean ${signed(x.mean, 2)}%)`),
                      value: Number.isFinite(x.mean) ? Number((x.mean - hodMin).toFixed(3)) : 0,
                      color: x.mean < calc.st.mean ? '#5794f2' : '#ff9830'
                    }))}
                    valueFormat={(v) => `+${v.toFixed(2)}%p`}
                  />
                  <p className="text-[8px] text-[#555555] mt-1">{tr('주황: 전체 평균 이상인 시간대 · 파랑: 평균 미만. 시간대 차이는 작고 표본 변동에 흔들리므로 참고용입니다.', 'Orange: hours at or above the overall mean · Blue: below. Differences between hours are small and noisy, so treat them as a rough guide only.')}</p>
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Data Coverage">
              <div className="grid grid-cols-1 gap-2 mb-4">
                <PanelFrame title="SERIES" subtitle={tr('받은 1시간 봉 수와 사용한 정렬 구간', 'Hourly bars received and the aligned range used')}>
                  <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('시세', 'Price series')}</th>
                        <th className="py-1 font-normal">{tr('받은 봉 수', 'Bars received')}</th>
                        <th className="py-1 font-normal">{tr('사용한 봉 수', 'Bars used')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [`Upbit KRW-${base}`, data!.upbitBars],
                        ['Upbit KRW-USDT', data!.usdtBars],
                        [`Binance ${base}USDT`, data!.binanceBars]
                      ].map(([name, n]) => (
                        <tr key={String(name)} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{name}</td>
                          <td className="py-1 text-[#aaaaaa]">{Number(n).toLocaleString()}</td>
                          <td className="py-1 text-[#888888]">{calc.st.n.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div></>
                </PanelFrame>
              </div>
            </SectionHeader>
          </>
        )}

        <p className="text-[8px] text-[#555555] pb-2">
          {tr('방법: 프리미엄 = Upbit KRW 종가 / (Binance 현물 USDT 종가 × 환율) − 1 (환율: 공식 USD/KRW는 ECB 일별 기준환율의 직전 날짜 값, 또는 Upbit KRW-USDT 종가; USDT=1달러로 가정), 세 시세가 모두 있는 1시간 봉만 사용(빈 시간은 채우지 않음). 반감기는 AR(1)로 추정하고, 조건부 확률은 과거 실제 경로에서 센 경험적 비율입니다. 실제 차익에는 원화·코인 입출금과 송금 한도, KYC, 거래소 규정, 전송 시간, 수수료와 가격 변동 위험이 따르며 이 화면은 이를 반영하지 않습니다.',
            'Method: premium = Upbit KRW close / (Binance spot USDT close × FX) − 1 (FX: the official USD/KRW is the ECB daily reference rate from the previous date, or the Upbit KRW-USDT close; USDT is assumed to be $1). Only hourly bars where all three prices exist are used (gaps are not filled). The half-life is estimated with AR(1), and conditional probabilities are empirical frequencies counted on the actual historical path. Real arbitrage involves KRW/coin deposits and withdrawals, transfer limits, KYC, exchange rules, transfer time, fees and price risk, none of which this screen models.')}
        </p>
      </div>
    </div>
  )
}

const hitsText = (hits: number, n: number) => `${hits}/${n}`

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
