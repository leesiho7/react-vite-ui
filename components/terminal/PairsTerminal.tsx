'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel, { LineSeries } from '@/components/admin/monitoring/LineChartPanel'
import BarChartPanel, { BarDatum } from '@/components/admin/monitoring/BarChartPanel'
import { fetchPairBars, PairBarsResult } from '@/lib/api'
import { useT } from '@/lib/terminalI18n'
import {
  alignBars,
  backtestPairs,
  cointegrationVerdict,
  costSensitivity,
  equityAndDrawdown,
  leverageRow,
  meanReversionStats,
  safeLeverage,
  summarize,
  BacktestParams,
  Trade
} from '@/lib/pairMath'

const PAIRS: { key: string; a: string; b: string; label: string }[] = [
  { key: 'BTC-ETH', a: 'BTCUSDT', b: 'ETHUSDT', label: 'BTC / ETH' },
  { key: 'ETH-SOL', a: 'ETHUSDT', b: 'SOLUSDT', label: 'ETH / SOL' },
  { key: 'BTC-SOL', a: 'BTCUSDT', b: 'SOLUSDT', label: 'BTC / SOL' }
]

const DEFAULT_PARAMS: BacktestParams = {
  window: 240,
  zEntry: 2,
  zExit: 0.5,
  zStop: 4,
  maxHold: 168,
  feeBps: 4.5,
  slipBps: 1
}

const LEVERAGES = [1, 2, 3, 5, 10, 20]
const COST_LEVELS = [0, 2.5, 5.5, 11, 22]
const OOS_FRACTION = 0.4 // 시간순 뒤쪽 40%는 파라미터 확인에 쓰지 않은 구간으로 따로 본다
const MIN_RELIABLE_TRADES = 30
const MAX_CHART_POINTS = 1200

type Sample = 'OOS' | 'ALL'

function decimate<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)])
  out.push(arr[arr.length - 1])
  return out
}

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`
const signed = (v: number, d = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`

/**
 * PAIRS TERMINAL — 통계적 페어 트레이딩(평균회귀) 연구 터미널. Grafana 스타일 그리드.
 *
 * 데이터는 전부 실제 거래소 H1 봉(백엔드 /api/market/historical[/backfill])이며, 합성 봉이 섞이면
 * 분석 자체를 거부한다. 계산은 lib/pairMath.ts (미래 데이터 미사용, 다음 봉 시가 체결, 4회 체결 비용).
 * 이 화면은 연구·교육용 도구이며 투자 권유가 아니다. 펀딩비는 반영하지 않는다.
 */
export default function PairsTerminal() {
  const tr = useT()
  const [pairKey, setPairKey] = useState('BTC-ETH')
  const [params, setParams] = useState<BacktestParams>(DEFAULT_PARAMS)
  const [lev, setLev] = useState(2)
  const [sample, setSample] = useState<Sample>('OOS')
  const [tries, setTries] = useState(0)

  const [dataA, setDataA] = useState<PairBarsResult | null>(null)
  const [dataB, setDataB] = useState<PairBarsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pair = PAIRS.find((p) => p.key === pairKey) ?? PAIRS[0]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, b] = await Promise.all([fetchPairBars(pair.a), fetchPairBars(pair.b)])
      if (a.bars.length === 0 || b.bars.length === 0) {
        setDataA(null)
        setDataB(null)
        setError('full')
      } else {
        setDataA(a)
        setDataB(b)
      }
    } catch (e) {
      setError('short')
    } finally {
      setLoading(false)
    }
  }, [pair.a, pair.b])

  useEffect(() => {
    load()
  }, [load])

  const changeParam = <K extends keyof BacktestParams>(k: K, v: number) => {
    if (!Number.isFinite(v)) return
    setParams((p) => ({ ...p, [k]: v }))
    setTries((n) => n + 1)
  }

  const syntheticDetected = !!(dataA?.synthetic || dataB?.synthetic)
  const source: 'backfill' | 'limited' | null = dataA && dataB ? (dataA.source === 'backfill' && dataB.source === 'backfill' ? 'backfill' : 'limited') : null

  const analysis = useMemo(() => {
    if (!dataA || !dataB || syntheticDetected) return null
    const aligned = alignBars(dataA.bars, dataB.bars)
    const N = aligned.t.length
    if (N < params.window + 50) return { aligned, N, tooShort: true as const }

    const closeA = aligned.a.map((x) => x.c)
    const closeB = aligned.b.map((x) => x.c)
    const bt = backtestPairs(aligned, params)
    const mr = meanReversionStats(closeA, closeB)
    const splitIdx = Math.floor(N * (1 - OOS_FRACTION))
    const oos = bt.trades.filter((t) => t.entryIdx >= splitIdx)
    const ins = bt.trades.filter((t) => t.entryIdx < splitIdx)
    const lastZ = [...bt.z].reverse().find((v) => Number.isFinite(v))
    const lastBeta = [...bt.beta].reverse().find((v) => Number.isFinite(v))
    const costs = costSensitivity(aligned, params, COST_LEVELS)
    return { aligned, N, tooShort: false as const, bt, mr, splitIdx, oos, ins, lastZ, lastBeta, costs }
  }, [dataA, dataB, syntheticDetected, params])

  // ── 화면에 쓰는 파생값 ──
  const view = useMemo(() => {
    if (!analysis || analysis.tooShort) return null
    const { aligned, bt, oos } = analysis
    const trades: Trade[] = sample === 'OOS' ? oos : bt.trades
    const stats = summarize(trades)
    const row = leverageRow(trades, lev)
    const safe = safeLeverage(trades)
    const curves = equityAndDrawdown(trades, (idx) => aligned.t[idx], lev)

    const ratio0 = aligned.a[0].c / aligned.b[0].c
    const ratioPts = decimate(
      aligned.t.map((t, i) => ({ t, v: (aligned.a[i].c / aligned.b[i].c / ratio0 - 1) * 100 })),
      MAX_CHART_POINTS
    )
    const zStart = Math.max(0, aligned.t.length - 1500)
    const zPts = decimate(
      aligned.t.slice(zStart).map((t, k) => ({ t, v: bt.z[zStart + k] })).filter((p) => Number.isFinite(p.v)),
      MAX_CHART_POINTS
    )
    const zLines: LineSeries[] =
      zPts.length > 1
        ? [
            { name: `+${params.zEntry}σ`, color: '#555555', points: [{ t: zPts[0].t, v: params.zEntry }, { t: zPts[zPts.length - 1].t, v: params.zEntry }] },
            { name: `-${params.zEntry}σ`, color: '#555555', points: [{ t: zPts[0].t, v: -params.zEntry }, { t: zPts[zPts.length - 1].t, v: -params.zEntry }] }
          ]
        : []

    const maeBins = [0.5, 1, 2, 3, 5, 8]
    const hist: BarDatum[] = maeBins.map((hi, i) => {
      const lo = i === 0 ? 0 : maeBins[i - 1]
      return { label: `${lo}-${hi}%`, value: trades.filter((t) => t.mae * 100 >= lo && t.mae * 100 < hi).length, color: i >= 4 ? '#f2495c' : '#b877d9' }
    })
    hist.push({ label: '8%+', value: trades.filter((t) => t.mae * 100 >= 8).length, color: '#f2495c' })

    return { trades, stats, row, safe, curves, ratioPts, zPts, zLines, hist }
  }, [analysis, sample, lev, params.zEntry])

  const days = analysis ? Math.round((analysis.aligned.t[analysis.N - 1] - analysis.aligned.t[0]) / 86_400_000) : 0
  const verdict = analysis && !analysis.tooShort && analysis.mr ? cointegrationVerdict(analysis.mr.tStat) : null
  const verdictLabel: Record<string, string> = { STRONG: tr('강함(1%)', 'Strong (1%)'), LIKELY: tr('가능(5%)', 'Likely (5%)'), WEAK: tr('약함(10%)', 'Weak (10%)'), NONE: tr('증거 없음', 'No evidence') }

  return (
    <div className="bg-[#0d0d0d] px-4 py-4 font-mono">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-[13px] font-bold text-white">AETHER · PAIRS TERMINAL</h2>
            <p className="text-[9px] text-[#555555] mt-0.5">{tr('통계적 페어 트레이딩(평균회귀) 연구 도구 · 실제 H1 봉 기반 · 다음 봉 시가 체결 · 4회 체결 비용 반영', 'Statistical pairs-trading (mean reversion) research tool · real H1 bars · fills at next bar open · 4-fill round-trip costs included')}</p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1">
            {tr('연구·교육용 · 투자 권유 아님 · 펀딩비 미반영 · 과거 성과는 미래를 보장하지 않음', 'For research & education only · Not investment advice · Funding fees not included · Past performance does not guarantee future results')}
          </span>
        </div>

        <FilterBar
          pairKey={pairKey}
          onPair={(k) => {
            setPairKey(k)
            setTries((n) => n + 1)
          }}
          params={params}
          onParam={changeParam}
          lev={lev}
          onLev={setLev}
          sample={sample}
          onSample={setSample}
          onRun={load}
          loading={loading}
        />

        {error && (
          <p className="text-[10px] text-[#f2495c] mb-3">
            {error === 'full'
              ? tr('시세 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. (지어낸 값으로 대체하지 않습니다)', 'Failed to load price data. Please try again shortly. (We never substitute made-up values.)')
              : tr('시세 데이터를 불러오지 못했습니다.', 'Failed to load price data.')}
          </p>
        )}
        {syntheticDetected && (
          <p className="text-[10px] text-[#f2495c] mb-3">
            {tr('합성(시뮬레이션) 봉이 섞여 있어 분석을 중단했습니다. 실측 데이터만 사용합니다.', 'Analysis stopped because synthetic (simulated) bars were detected. Only real market data is used.')}
          </p>
        )}
        {source === 'limited' && !syntheticDetected && (
          <p className="text-[10px] text-[#e0b400] mb-3">
            {tr('이 서버는 장기 백필을 아직 지원하지 않아 최근 약 1,000봉(41일)만 사용합니다. 표본이 매우 적으니 결과를 믿지 마세요.', 'This server does not support long backfill yet, so only the latest ~1,000 bars (41 days) are used. The sample is very small — do not trust the results.')}
          </p>
        )}
        {analysis?.tooShort && (
          <p className="text-[10px] text-[#e0b400] mb-3">{tr(`정렬된 봉이 ${analysis.N}개뿐이라 window(${params.window}) 대비 분석하기 부족합니다.`, `Only ${analysis.N} aligned bars — not enough for a window of ${params.window}.`)}</p>
        )}

        <SectionHeader label="Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-2">
            <StatTile label="Sample" value={analysis ? `${analysis.N.toLocaleString()}${tr('봉', ' bars')}` : '—'} hint={analysis ? tr(`${days}일 구간 · 뒤쪽 ${OOS_FRACTION * 100}%는 OOS`, `${days}-day span · last ${OOS_FRACTION * 100}% is OOS`) : undefined} />
            <StatTile label="Current z" value={analysis && !analysis.tooShort && analysis.lastZ !== undefined ? signed(analysis.lastZ) : '—'} hint={tr('롤링 회귀 잔차 / 표준오차. 현재 봉 마감 기준', 'Rolling regression residual / standard error, as of the latest closed bar')} />
            <StatTile label="Hedge β" value={analysis && !analysis.tooShort && analysis.lastBeta !== undefined ? analysis.lastBeta.toFixed(2) : '—'} hint={tr('ln(A) = α + β·ln(B) 롤링 기울기', 'Rolling slope of ln(A) = α + β·ln(B)')} />
            <StatTile
              label="Half-life"
              value={analysis && !analysis.tooShort && analysis.mr ? (analysis.mr.halfLifeBars === null ? tr('회귀 없음', 'No reversion') : `${analysis.mr.halfLifeBars.toFixed(1)}h`) : '—'}
              hint={tr('전체 구간 정적 회귀 잔차의 평균회귀 반감기(H1이라 1봉=1시간)', 'Mean-reversion half-life of the static-regression residual over the whole span (H1: 1 bar = 1 hour)')}
            />
            <StatTile
              label="Coint. t-stat"
              value={analysis && !analysis.tooShort && analysis.mr ? analysis.mr.tStat.toFixed(2) : '—'}
              tone={verdict === 'STRONG' || verdict === 'LIKELY' ? 'good' : verdict === 'NONE' ? 'bad' : 'neutral'}
              hint={verdict ? tr(`공적분 증거: ${verdictLabel[verdict]} (Engle-Granger 근사 임계값 -3.90/-3.34/-3.04)`, `Cointegration evidence: ${verdictLabel[verdict]} (approx. Engle-Granger critical values -3.90/-3.34/-3.04)`) : undefined}
            />
            <StatTile label="Cointegration" value={verdict ? verdictLabel[verdict] : '—'} tone={verdict === 'STRONG' || verdict === 'LIKELY' ? 'good' : verdict === 'NONE' ? 'bad' : 'neutral'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1">
            <StatTile label={`Trades (${sample})`} value={view ? String(view.stats.n) : '—'} tone={view && view.stats.n < MIN_RELIABLE_TRADES ? 'bad' : 'neutral'} hint={tr(`${MIN_RELIABLE_TRADES}건 미만이면 통계적으로 의미 없음`, `Fewer than ${MIN_RELIABLE_TRADES} trades is not statistically meaningful`)} />
            <StatTile label="Win Rate" value={view && view.stats.n ? pct(view.stats.winRate, 1) : '—'} />
            <StatTile
              label="Expectancy / trade"
              value={view && view.stats.n ? `${signed(view.stats.avgNet * 1e4, 1)}bp` : '—'}
              tone={view && view.stats.n ? (view.stats.avgNet > 0 ? 'good' : 'bad') : 'neutral'}
              fill
              hint={tr('비용 반영 후 거래당 평균 수익(총 명목 기준, 1bp=0.01%)', 'Average profit per trade after costs (on gross notional, 1bp = 0.01%)')}
            />
            <StatTile
              label={`Max DD @${lev}x`}
              value={view && view.stats.n ? `-${pct(view.row.maxDD, 1)}` : '—'}
              tone={view && view.stats.n ? (view.row.maxDD < 0.1 ? 'good' : 'bad') : 'neutral'}
              hint={tr('거래 종료 시점 기준(보유 중 평가손실은 포함하지 않음)', 'Measured at trade close (unrealized loss while holding is not included)')}
            />
            <StatTile
              label={`Liquidations @${lev}x`}
              value={view && view.stats.n ? String(view.row.liquidations) : '—'}
              tone={view && view.stats.n ? (view.row.liquidations === 0 ? 'good' : 'bad') : 'neutral'}
              hint={tr('보유 중 불리한 극값 * 레버리지가 증거금의 90%에 닿은 거래 수', 'Number of trades where the adverse extreme × leverage reached 90% of margin while holding')}
            />
            <StatTile
              label="Safe leverage"
              value={view?.safe ? `${view.safe.sampleMax.toFixed(1)}x / ${view.safe.recommended.toFixed(1)}x` : '—'}
              hint={tr('앞: 이 표본에서 한 번도 청산되지 않는 최대치. 뒤: 표본에 없던 더 나쁜 사건을 감안해 절반으로 줄인 값', 'First: the highest leverage never liquidated in this sample. Second: halved to allow for worse events not in the sample')}
            />
          </div>
          <p className="text-[8px] text-[#555555] mb-4">
            {tr(`이번 세션에서 pair·파라미터를 바꾼 횟수: ${tries}회 — 여러 값을 바꿔 보며 가장 좋은 결과를 고르면 과최적화입니다. 기본값을 먼저 고정해 두고 OOS 구간을 보세요.`, `Times you changed the pair/parameters this session: ${tries} — trying many values and picking the best result is overfitting. Fix the defaults first and look at the OOS segment.`)}
          </p>
        </SectionHeader>

        {view && analysis && !analysis.tooShort && (
          <>
            {view.stats.n < MIN_RELIABLE_TRADES && (
              <p className="text-[10px] text-[#e0b400] mb-3">
                {tr(`현재 표본(${sample}) 거래가 ${view.stats.n}건입니다. ${MIN_RELIABLE_TRADES}건 미만이라 승률·기대값이 우연일 가능성이 큽니다.`, `The current sample (${sample}) has only ${view.stats.n} trades. With fewer than ${MIN_RELIABLE_TRADES}, the win rate and expectancy are likely due to chance.`)}
              </p>
            )}

            <SectionHeader label="Spread">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title={`PRICE RATIO ${pair.label}`} subtitle={tr('시작 대비 %', '% vs start')}>
                  <LineChartPanel autoWidth series={[{ name: 'Ratio', color: '#ff9830', points: view.ratioPts }]} yFormat={(v) => `${v.toFixed(0)}%`} />
                </PanelFrame>
                <PanelFrame title="Z-SCORE" subtitle={tr(`롤링 ${params.window}봉 · 최근 ${view.zPts.length ? Math.min(1500, analysis.N) : 0}봉`, `Rolling ${params.window} bars · latest ${view.zPts.length ? Math.min(1500, analysis.N) : 0} bars`)}>
                  <LineChartPanel autoWidth
                    series={[{ name: 'z', color: '#5794f2', points: view.zPts }, ...view.zLines]}
                    yFormat={(v) => v.toFixed(1)}
                  />
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label={`Backtest — ${sample === 'OOS' ? tr('Out-of-Sample (뒤쪽 40%)', 'Out-of-Sample (last 40%)') : 'All Sample'} @${lev}x`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="EQUITY CURVE" subtitle={tr(`거래 종료 시점 · ${lev}x`, `At trade close · ${lev}x`)}>
                  <LineChartPanel autoWidth series={[{ name: 'Equity', color: '#73bf69', points: view.curves.equity }]} yFormat={(v) => `${v.toFixed(0)}%`} />
                </PanelFrame>
                <PanelFrame title="DRAWDOWN" subtitle={tr('거래 종료 시점 기준', 'At trade close')}>
                  <LineChartPanel autoWidth series={[{ name: 'Drawdown', color: '#f2495c', points: view.curves.drawdown }]} yFormat={(v) => `${v.toFixed(0)}%`} />
                </PanelFrame>

                <PanelFrame title="WORST ADVERSE EXCURSION" subtitle={tr('보유 중 최대 평가손실 분포 (총 명목 대비)', 'Distribution of max unrealized loss while holding (vs gross notional)')}>
                  <BarChartPanel autoWidth data={view.hist} valueFormat={(v) => String(Math.round(v))} />
                </PanelFrame>

                <PanelFrame title="LEVERAGE TABLE" subtitle={tr(`표본 ${sample} · ${view.stats.n}건`, `Sample ${sample} · ${view.stats.n} trades`)}>
                  <LeverageTable trades={view.trades} />
                </PanelFrame>

                <PanelFrame title="COST SENSITIVITY" subtitle={tr('체결당 비용(수수료+슬리피지)을 바꿨을 때 거래당 평균 순수익 · 전체 표본', 'Average net profit per trade when per-fill cost (fee + slippage) changes · full sample')}>
                  <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('체결당 비용', 'Cost per fill')}</th>
                        <th className="py-1 font-normal">{tr('거래당 평균 순수익', 'Avg net profit per trade')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.costs.map((c) => (
                        <tr key={c.perFillBps} className="border-b border-[#141414]">
                          <td className="py-1 text-[#aaaaaa]">{c.perFillBps}bp</td>
                          <td className={`py-1 font-bold ${c.avgNetBps === null ? 'text-[#555555]' : c.avgNetBps > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>
                            {c.avgNetBps === null ? '—' : `${signed(c.avgNetBps, 1)}bp`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  <p className="text-[8px] text-[#555555] mt-1">
                    {tr(`왕복 4회 체결 기준입니다. 현재 설정은 체결당 ${(params.feeBps + params.slipBps).toFixed(1)}bp(수수료 ${params.feeBps} + 슬리피지 ${params.slipBps}).`, `Based on 4 fills per round trip. Current setting: ${(params.feeBps + params.slipBps).toFixed(1)}bp per fill (fee ${params.feeBps} + slippage ${params.slipBps}).`)}
                  </p>
                </PanelFrame>

                <PanelFrame title="IN-SAMPLE vs OUT-OF-SAMPLE" subtitle={tr('같은 규칙, 시간순 앞쪽 60% / 뒤쪽 40%', 'Same rules, chronological first 60% / last 40%')}>
                  <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">{tr('구간', 'Segment')}</th>
                        <th className="py-1 font-normal">{tr('거래', 'Trades')}</th>
                        <th className="py-1 font-normal">{tr('승률', 'Win rate')}</th>
                        <th className="py-1 font-normal">{tr('거래당 순수익', 'Net / trade')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'In-sample', s: summarize(analysis.ins) },
                        { name: 'Out-of-sample', s: summarize(analysis.oos) }
                      ].map(({ name, s }) => (
                        <tr key={name} className="border-b border-[#141414]">
                          <td className="py-1 text-white font-bold">{name}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.n}</td>
                          <td className="py-1 text-[#aaaaaa]">{s.n ? pct(s.winRate, 1) : '—'}</td>
                          <td className={`py-1 font-bold ${s.n === 0 ? 'text-[#555555]' : s.avgNet > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>
                            {s.n ? `${signed(s.avgNet * 1e4, 1)}bp` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
                  <p className="text-[8px] text-[#555555] mt-1">{tr('두 구간 성과가 크게 다르면 우연이거나 시장 국면이 바뀐 것입니다.', 'If the two segments differ a lot, it is either chance or a market regime change.')}</p>
                </PanelFrame>
              </div>
            </SectionHeader>

            <SectionHeader label="Trade Log" defaultOpen={false}>
              <PanelFrame title="RECENT TRADES" subtitle={tr(`표본 ${sample} · 최근 25건`, `Sample ${sample} · latest 25`)} className="mb-4">
                <TradeLog trades={view.trades} tOf={(i) => analysis.aligned.t[i]} />
              </PanelFrame>
            </SectionHeader>
          </>
        )}

        <p className="text-[8px] text-[#555555] pb-2">
          {tr(`방법: ln(A)=α+β·ln(B)를 ${params.window}봉 롤링으로 맞춘 잔차의 z-score. |z|≥${params.zEntry} 진입(다음 봉 시가), |z|≤${params.zExit} 청산, |z|≥${params.zStop} 손절, 최대 ${params.maxHold}봉 보유. 레버리지 청산은 봉 안의 불리한 극값 기준 증거금 90% 소진으로 보수적으로 추정. 펀딩비·호가 깊이·체결 지연은 반영하지 않습니다.`,
            `Method: z-score of the residual from a ${params.window}-bar rolling fit of ln(A)=α+β·ln(B). Enter at |z|≥${params.zEntry} (next bar open), exit at |z|≤${params.zExit}, stop at |z|≥${params.zStop}, hold at most ${params.maxHold} bars. Liquidation is estimated conservatively as 90% margin used at the bar's adverse extreme. Funding fees, order-book depth and execution latency are not modeled.`)}
        </p>
      </div>
    </div>
  )
}

function LeverageTable({ trades }: { trades: Trade[] }) {
  const tr = useT()
  if (trades.length === 0) return <p className="text-[10px] text-[#555555] pt-1">{tr('거래가 없어 계산할 수 없습니다.', 'No trades, so nothing to calculate.')}</p>
  return (
    <><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[10px] mt-1">
      <thead>
        <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
          <th className="py-1 font-normal">Lev</th>
          <th className="py-1 font-normal">{tr('누적수익', 'Total return')}</th>
          <th className="py-1 font-normal">{tr('최대낙폭', 'Max DD')}</th>
          <th className="py-1 font-normal">{tr('청산', 'Liquidations')}</th>
          <th className="py-1 font-normal">{tr('최악 거래', 'Worst trade')}</th>
        </tr>
      </thead>
      <tbody>
        {LEVERAGES.map((L) => {
          const r = leverageRow(trades, L)
          return (
            <tr key={L} className="border-b border-[#141414]">
              <td className="py-1 text-white font-bold">{L}x</td>
              <td className={`py-1 font-bold ${r.totalReturn >= 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{pct(r.totalReturn, 1)}</td>
              <td className="py-1 text-[#aaaaaa]">-{pct(r.maxDD, 1)}</td>
              <td className={`py-1 font-bold ${r.liquidations === 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{r.liquidations}</td>
              <td className="py-1 text-[#aaaaaa]">{pct(r.worstTrade, 1)}</td>
            </tr>
          )
        })}
      </tbody>
    </table></div><p className="sm:hidden text-[8px] text-[#555555] mt-0.5">{tr('← 좌우로 밀어서 전체 열 보기', '← Swipe to see all columns')}</p></>
  )
}

function TradeLog({ trades, tOf }: { trades: Trade[]; tOf: (idx: number) => number }) {
  const tr = useT()
  if (trades.length === 0) return <p className="text-[10px] text-[#555555] pt-1">{tr('거래가 없습니다.', 'No trades.')}</p>
  const rows = trades.slice(-25).reverse()
  const reasonLabel: Record<string, string> = { REVERT: tr('회귀 청산', 'Reversion exit'), STOP: tr('손절', 'Stop-loss'), TIME: tr('시간 청산', 'Time exit') }
  return (
    <div className="max-h-[220px] overflow-auto">
      <table className="w-full min-w-[460px] text-[9px]">
        <thead className="sticky top-0 bg-[#0d0d0d]">
          <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
            <th className="py-1 font-normal">{tr('진입', 'Entry')}</th>
            <th className="py-1 font-normal">{tr('방향', 'Side')}</th>
            <th className="py-1 font-normal">{tr('보유', 'Hold')}</th>
            <th className="py-1 font-normal">{tr('사유', 'Reason')}</th>
            <th className="py-1 font-normal">{tr('순수익', 'Net')}</th>
            <th className="py-1 font-normal">{tr('최대 평가손실', 'Max unrealized loss')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={`${t.entryIdx}-${t.exitIdx}`} className="border-b border-[#141414]">
              <td className="py-1 text-[#888888] font-mono">{new Date(tOf(t.entryIdx)).toISOString().slice(5, 16).replace('T', ' ')}</td>
              <td className="py-1 text-[#aaaaaa]">{t.dir === 1 ? tr('스프레드 롱', 'Spread long') : tr('스프레드 숏', 'Spread short')}</td>
              <td className="py-1 text-[#aaaaaa]">{t.hold}h</td>
              <td className="py-1 text-[#aaaaaa]">{reasonLabel[t.reason]}</td>
              <td className={`py-1 font-bold ${t.net > 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{signed(t.net * 100, 2)}%</td>
              <td className="py-1 text-[#aaaaaa]">-{(t.mae * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FilterBar({
  pairKey,
  onPair,
  params,
  onParam,
  lev,
  onLev,
  sample,
  onSample,
  onRun,
  loading
}: {
  pairKey: string
  onPair: (k: string) => void
  params: BacktestParams
  onParam: <K extends keyof BacktestParams>(k: K, v: number) => void
  lev: number
  onLev: (v: number) => void
  sample: Sample
  onSample: (s: Sample) => void
  onRun: () => void
  loading: boolean
}) {
  const tr = useT()
  return (
    <div className="mb-3">
      <div className="flex items-center flex-wrap gap-2 bg-[#111111] border border-[#222222] rounded-[2px] px-2.5 py-1.5">
        <Select label="Pair" value={pairKey} onChange={onPair}>
          {PAIRS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select label="Timeframe" value="H1" onChange={() => {}}>
          <option value="H1">H1</option>
          <option value="M15" disabled className="text-[#555555]">M15 {tr('(미구현)', '(not implemented)')}</option>
          <option value="H4" disabled className="text-[#555555]">H4 {tr('(미구현)', '(not implemented)')}</option>
          <option value="D1" disabled className="text-[#555555]">D1 {tr('(미구현)', '(not implemented)')}</option>
        </Select>
        <Num label="Window" value={params.window} step={20} min={60} max={1000} onChange={(v) => onParam('window', v)} />
        <Num label="Entry z" value={params.zEntry} step={0.25} min={1} max={4} onChange={(v) => onParam('zEntry', v)} />
        <Num label="Exit z" value={params.zExit} step={0.25} min={0} max={2} onChange={(v) => onParam('zExit', v)} />
        <Num label="Stop z" value={params.zStop} step={0.5} min={2} max={8} onChange={(v) => onParam('zStop', v)} />
        <Num label="Max hold" value={params.maxHold} step={24} min={12} max={720} onChange={(v) => onParam('maxHold', v)} />
        <Num label="Fee bp" value={params.feeBps} step={0.5} min={0} max={20} onChange={(v) => onParam('feeBps', v)} />
        <Num label="Slip bp" value={params.slipBps} step={0.5} min={0} max={20} onChange={(v) => onParam('slipBps', v)} />
        <Select label="Leverage" value={String(lev)} onChange={(v) => onLev(Number(v))}>
          {LEVERAGES.map((L) => (
            <option key={L} value={L}>
              {L}x
            </option>
          ))}
        </Select>
        <Select label="Sample" value={sample} onChange={(v) => onSample(v as Sample)}>
          <option value="OOS">Out-of-sample</option>
          <option value="ALL">All</option>
        </Select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="text-[11px] sm:text-[10px] font-bold px-3 py-2 sm:py-1 rounded-[2px] bg-[#f47a20] text-black disabled:opacity-50"
        >
          {loading ? 'LOADING…' : 'REFRESH DATA'}
        </button>
      </div>
      <p className="text-[8px] text-[#555555] mt-1">{tr('회색으로 흐리게 표시된 항목은 아직 구현되지 않아 선택할 수 없습니다. 값을 바꾸면 즉시 다시 계산됩니다.', 'Greyed-out items are not implemented yet and cannot be selected. Changing a value recalculates immediately.')}</p>
    </div>
  )
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] sm:text-[9px] text-[#888888]">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[11px] sm:text-[9px] text-[#dddddd] px-1.5 sm:px-1 py-1.5 sm:py-1"
      >
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
