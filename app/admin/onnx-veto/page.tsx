'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AdminOnlyGate from '@/components/admin/AdminOnlyGate'
import TopFilterBar from '@/components/admin/monitoring/TopFilterBar'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel from '@/components/admin/monitoring/LineChartPanel'
import BarChartPanel from '@/components/admin/monitoring/BarChartPanel'
import HeatmapPanel from '@/components/admin/monitoring/HeatmapPanel'
import { fetchOnnxModelHealth, fetchVetoAccuracy, fetchOnnxVetoBacktest } from '@/lib/api'
import { OnnxModelHealth, VetoAccuracyEntry, OnnxVetoBacktestComparison, OnnxBacktestArchetypeKey, BacktestTrade } from '@/lib/types'
import {
  deriveEquitySeries,
  deriveDrawdownSeries,
  deriveTradeVolumeByDay,
  deriveSignalDistribution,
  deriveWinRateHeatmap
} from '@/lib/monitoringMath'

const LIVE_REFRESH_MS = 15_000
const ACCURACY_WINDOW_DAYS = 30

/**
 * ONNX 거부권(DOWN_RISK/UP_RISK) 검증 대시보드 — Grafana 스타일 실시간 모니터링 그리드.
 *
 * 데이터 출처(전부 실제 백엔드, 지어낸 값 없음):
 *  - 모델 상태: GET /api/ml/veto-audit/model-health
 *  - 실전 거부권 정확도: GET /api/ml/veto-audit/accuracy (shadow_veto_audit 테이블 실측 채점)
 *  - 백테스트/자산곡선/낙폭/거래분포/히트맵: GET /api/ml/veto-backtest (BacktestReport.trades를
 *    그대로 써서 클라이언트에서 계산 — lib/monitoringMath.ts)
 */
export default function OnnxVetoDashboardPage() {
  const [symbol, setSymbol] = useState('BTC')
  const [archetype, setArchetype] = useState<OnnxBacktestArchetypeKey>('TREND_FOLLOWING')
  const [liveRefresh, setLiveRefresh] = useState(true)

  const [health, setHealth] = useState<OnnxModelHealth | null>(null)
  const [accuracy, setAccuracy] = useState<VetoAccuracyEntry[]>([])
  const [backtest, setBacktest] = useState<OnnxVetoBacktestComparison | null>(null)
  const [running, setRunning] = useState(false)

  const loadLight = async () => {
    const [h, a] = await Promise.all([fetchOnnxModelHealth(), fetchVetoAccuracy(ACCURACY_WINDOW_DAYS)])
    setHealth(h)
    setAccuracy(a)
  }

  useEffect(() => {
    loadLight()
  }, [])

  useEffect(() => {
    if (!liveRefresh) return
    const id = setInterval(loadLight, LIVE_REFRESH_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRefresh])

  const runBacktest = async () => {
    setRunning(true)
    const data = await fetchOnnxVetoBacktest(symbol.trim().toUpperCase() || 'BTC', archetype)
    setBacktest(data)
    setRunning(false)
  }

  // ── 오버뷰 타일에 쓰는 파생값 ──
  const vf = backtest?.reliable ? backtest.vetoFiltered : undefined
  const totalAccuracySamples = accuracy.reduce((s, a) => s + a.correctVetoes + a.harmfulVetoes, 0)
  const totalAccuracyCorrect = accuracy.reduce((s, a) => s + a.correctVetoes, 0)
  const accuracyPct = totalAccuracySamples > 0 ? (totalAccuracyCorrect / totalAccuracySamples) * 100 : null
  const modelHealthPct = health ? ((Number(health.downRiskInitialized) + Number(health.upRiskInitialized)) / 2) * 100 : null

  // ── 백테스트 trades에서 파생되는 차트 데이터 ──
  const equitySeries = useMemo(() => {
    if (!backtest?.reliable) return { baseline: [], vetoFiltered: [] }
    const toPoints = (trades: BacktestTrade[]) =>
      deriveEquitySeries(trades).map((p) => ({ t: new Date(p.t).getTime(), v: (p.equity - 1) * 100 }))
    return {
      baseline: toPoints(backtest.baseline?.trades ?? []),
      vetoFiltered: toPoints(backtest.vetoFiltered?.trades ?? [])
    }
  }, [backtest])

  const drawdownSeries = useMemo(() => {
    if (!backtest?.reliable) return []
    const eq = deriveEquitySeries(backtest.vetoFiltered?.trades ?? [])
    return deriveDrawdownSeries(eq).map((p) => ({ t: new Date(p.t).getTime(), v: p.drawdownPct }))
  }, [backtest])

  const volumeData = useMemo(() => {
    if (!backtest?.reliable) return []
    return deriveTradeVolumeByDay(backtest.vetoFiltered?.trades ?? []).map((d) => ({ label: d.day, value: d.count }))
  }, [backtest])

  const distributionData = useMemo(() => {
    if (!backtest?.reliable) return []
    const OUTCOME_COLOR: Record<string, string> = {
      TARGET_HIT: '#73bf69',
      STOP_HIT: '#f2495c',
      TIME_EXIT: '#888888'
    }
    return deriveSignalDistribution(backtest.vetoFiltered?.trades ?? []).map((d) => ({
      label: d.outcome,
      value: d.count,
      color: OUTCOME_COLOR[d.outcome]
    }))
  }, [backtest])

  const heatmapGrid = useMemo(() => {
    if (!backtest?.reliable) return deriveWinRateHeatmap([])
    return deriveWinRateHeatmap(backtest.vetoFiltered?.trades ?? [])
  }, [backtest])

  return (
    <AdminOnlyGate>
      <main className="min-h-screen bg-[#0d0d0d] px-4 py-4 font-mono">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link href="/" className="text-[9px] text-[#555555] hover:text-[#f47a20]">← AETHER TERMINAL</Link>
              <h1 className="text-[13px] font-bold text-white mt-0.5">AETHER · ONNX VETO MONITORING</h1>
            </div>
            <span className="text-[9px] text-[#555555]">
              {liveRefresh ? `자동 새로고침 ${LIVE_REFRESH_MS / 1000}초` : '자동 새로고침 꺼짐'}
            </span>
          </div>

          <TopFilterBar
            symbol={symbol}
            onSymbolChange={setSymbol}
            archetype={archetype}
            onArchetypeChange={setArchetype}
            liveRefresh={liveRefresh}
            onLiveRefreshChange={setLiveRefresh}
            onRun={runBacktest}
            running={running}
          />

          <SectionHeader label="Overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 mb-4">
              <StatTile label="Net Return" value={vf ? `${vf.totalReturnPct.toFixed(1)}%` : '—'} tone={vf ? (vf.totalReturnPct >= 0 ? 'good' : 'bad') : 'neutral'} />
              <StatTile label="Win Rate" value={vf ? `${(vf.winRate * 100).toFixed(1)}%` : '—'} tone={vf ? (vf.winRate >= 0.5 ? 'good' : 'bad') : 'neutral'} />
              <StatTile label="Sharpe" value={vf ? vf.sharpeRatio.toFixed(2) : '—'} tone={vf ? (vf.sharpeRatio >= 0 ? 'good' : 'bad') : 'neutral'} />
              <StatTile label="Trades" value={vf ? String(vf.totalTrades) : '—'} />
              <StatTile label="Signal Rejects" value={backtest?.reliable ? String(backtest.vetoedEntrySignals) : '—'} hint="이 백테스트 구간에서 ONNX가 거부한 진입 신호 수" />
              <StatTile
                label="Model Health"
                value={modelHealthPct === null ? '—' : `${modelHealthPct.toFixed(0)}%`}
                tone={modelHealthPct === null ? 'neutral' : modelHealthPct >= 100 ? 'good' : modelHealthPct === 0 ? 'bad' : 'neutral'}
                fill
              />
              <StatTile label="Veto Accuracy" value={accuracyPct === null ? '—' : `${accuracyPct.toFixed(1)}%`} tone={accuracyPct === null ? 'neutral' : accuracyPct >= 50 ? 'good' : 'bad'} hint={`최근 ${ACCURACY_WINDOW_DAYS}일 실전 채점`} />
              <StatTile label="MDD" value={vf ? `${vf.maxDrawdownPct.toFixed(1)}%` : '—'} tone={vf ? (vf.maxDrawdownPct > -10 ? 'good' : 'bad') : 'neutral'} />
            </div>
          </SectionHeader>

          <SectionHeader label="Model Validation">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-4">
              <PanelFrame title="DOWN_RISK / UP_RISK STATUS">
                <div className="flex flex-col gap-1.5 pt-1">
                  <HealthRow label="DOWN_RISK (BUY 거부권)" ok={health?.downRiskInitialized} />
                  <HealthRow label="UP_RISK (SELL 거부권)" ok={health?.upRiskInitialized} />
                  <div className="text-[9px] text-[#666666] mt-1">
                    게이트 {health ? health.ensembleGate.toFixed(2) : '—'} · 캔들 부족 폴백률 {health ? `${health.insufficientCandleFallbackRatePct.toFixed(1)}%` : '—'}
                  </div>
                </div>
              </PanelFrame>

              <PanelFrame title="VETO ACCURACY BY DIRECTION" className="lg:col-span-2">
                {accuracy.length === 0 ? (
                  <p className="text-[10px] text-[#555555] pt-1">최근 {ACCURACY_WINDOW_DAYS}일 내 표본 부족 (방향당 최소 20건)</p>
                ) : (
                  <table className="w-full text-[10px] mt-1">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                        <th className="py-1 font-normal">방향</th>
                        <th className="py-1 font-normal">표본</th>
                        <th className="py-1 font-normal">손실회피</th>
                        <th className="py-1 font-normal">기회차단</th>
                        <th className="py-1 font-normal">정확도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accuracy.map((a) => {
                        const resolved = a.correctVetoes + a.harmfulVetoes
                        const acc = resolved === 0 ? null : (a.correctVetoes / resolved) * 100
                        return (
                          <tr key={a.direction} className="border-b border-[#141414]">
                            <td className="py-1 text-white font-bold">{a.direction}</td>
                            <td className="py-1 text-[#aaaaaa]">{a.samples}</td>
                            <td className="py-1 text-[#73bf69]">{a.correctVetoes}</td>
                            <td className="py-1 text-[#f2495c]">{a.harmfulVetoes}</td>
                            <td className="py-1 text-white font-bold">{acc === null ? '—' : `${acc.toFixed(1)}%`}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </PanelFrame>
            </div>
          </SectionHeader>

          <SectionHeader label="Backtest — Veto Applied">
            {!backtest ? (
              <p className="text-[10px] text-[#555555] mb-4">상단 RUN BACKTEST를 눌러 종목/전략을 백테스트하면 아래 패널이 채워집니다.</p>
            ) : !backtest.reliable ? (
              <p className="text-[10px] text-[#e0b400] mb-4">{backtest.note}</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
                <PanelFrame title="EQUITY CURVE" subtitle="baseline vs veto-filtered">
                  <LineChartPanel
                    series={[
                      { name: 'No Veto', color: '#b877d9', points: equitySeries.baseline },
                      { name: 'Veto Applied', color: '#73bf69', points: equitySeries.vetoFiltered }
                    ]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>

                <PanelFrame title="DRAWDOWN" subtitle="veto-filtered">
                  <LineChartPanel
                    series={[{ name: 'Drawdown', color: '#f2495c', points: drawdownSeries }]}
                    yFormat={(v) => `${v.toFixed(0)}%`}
                  />
                </PanelFrame>

                <PanelFrame title="SIGNAL DISTRIBUTION" subtitle="청산 사유별 건수">
                  <BarChartPanel data={distributionData} defaultColor="#73bf69" valueFormat={(v) => String(Math.round(v))} />
                </PanelFrame>

                <PanelFrame title="TRADE VOLUME BY DAY">
                  <BarChartPanel data={volumeData} defaultColor="#b877d9" valueFormat={(v) => String(Math.round(v))} />
                </PanelFrame>

                <PanelFrame title="WIN-RATE HEATMAP" subtitle="진입 요일 × 시간(UTC)" className="lg:col-span-2">
                  <HeatmapPanel grid={heatmapGrid} />
                </PanelFrame>
              </div>
            )}
          </SectionHeader>
        </div>
      </main>
    </AdminOnlyGate>
  )
}

function HealthRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-[#73bf69]' : 'bg-[#f2495c]'}`} />
      <span className="text-[10px] text-[#aaaaaa]">{label}</span>
      <span className={`text-[10px] font-bold ml-auto ${ok ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{ok ? 'OK' : 'DOWN'}</span>
    </div>
  )
}
