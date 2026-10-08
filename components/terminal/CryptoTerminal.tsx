'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import TopFilterBar from '@/components/admin/monitoring/TopFilterBar'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import LineChartPanel from '@/components/admin/monitoring/LineChartPanel'
import BarChartPanel from '@/components/admin/monitoring/BarChartPanel'
import HeatmapPanel from '@/components/admin/monitoring/HeatmapPanel'
import RiskGaugePanel from '@/components/admin/monitoring/RiskGaugePanel'
import WalkForwardPanel from '@/components/admin/monitoring/WalkForwardPanel'
import DecisionCalibrationPanel from '@/components/admin/monitoring/DecisionCalibrationPanel'
import RecentVetoLogPanel from '@/components/admin/monitoring/RecentVetoLogPanel'
import { fetchOnnxModelHealth, fetchVetoAccuracy, fetchOnnxVetoBacktest, fetchIntegratedDecision } from '@/lib/api'
import { OnnxModelHealth, VetoAccuracyEntry, OnnxVetoBacktestComparison, OnnxBacktestArchetypeKey, BacktestTrade, IntegratedDecisionReport } from '@/lib/types'
import {
  deriveEquitySeries,
  deriveDrawdownSeries,
  deriveTradeVolumeByDay,
  deriveSignalDistribution,
  deriveWinRateHeatmap
} from '@/lib/monitoringMath'
import { TerminalLang, TerminalLangProvider, useT, useTerminalLang } from '@/lib/terminalI18n'

const LIVE_REFRESH_MS = 15_000
const ACCURACY_WINDOW_DAYS = 30

/** 서버가 한글로 내려주는 백테스트 사유 문구를 영어로 바꾼다. 알 수 없는 문구는 그대로 둔다. */
const NOTE_EXACT_EN: Record<string, string> = {
  '정상 비교': 'Normal comparison',
  '합성 캔들이 섞여 있어 실전 검증으로 쓸 수 없습니다.': 'Synthetic candles are mixed in, so this cannot be used as live validation.',
  'DOWN_RISK ONNX 모델이 아직 배포되지 않았거나 캔들이 부족합니다.': 'The DOWN_RISK deep-learning model is not deployed yet or there are not enough candles.',
  'UP_RISK ONNX 모델이 아직 배포되지 않았거나 캔들이 부족합니다.': 'The UP_RISK deep-learning model is not deployed yet or there are not enough candles.'
}
function serverNote(text: string | undefined | null, ko: boolean): string {
  if (!text) return ''
  if (ko) return text.replace(/ONNX 모델/g, '딥러닝 모델')
  if (NOTE_EXACT_EN[text]) return NOTE_EXACT_EN[text]
  return text
    .replace(/캔들이 부족합니다 \((\d+)봉\)\./, 'Not enough candles ($1 bars).')
    .replace(/표본 부족으로 일부 지표 신뢰 불가/, 'Some metrics are unreliable due to insufficient samples')
    .replace(/표본 부족/g, 'insufficient sample')
    .replace(/표본 (\d+)건/g, '$1 samples')
}

/**
 * CRYPTO TERMINAL — ONNX 거부권(DOWN_RISK/UP_RISK) 검증 대시보드. Grafana 스타일 실시간 모니터링 그리드.
 * 예전 관리자 전용 화면(/admin/onnx-veto)을 공개 화면으로 분리한 것이다. 이 화면이 부르는 API 는 원래 인증이 없었고
 * 집계·모델 상태·종목별 거부권 로그뿐이라 개인 정보는 없다.
 *
 * 데이터 출처(전부 실제 백엔드, 지어낸 값 없음):
 *  - 모델 상태: GET /api/ml/veto-audit/model-health
 *  - 실전 거부권 정확도: GET /api/ml/veto-audit/accuracy (shadow_veto_audit 테이블 실측 채점)
 *  - 백테스트/자산곡선/낙폭/거래분포/히트맵: GET /api/ml/veto-backtest (BacktestReport.trades를
 *    그대로 써서 클라이언트에서 계산 — lib/monitoringMath.ts). 서버 부하가 커서 사용자가 RUN BACKTEST 를 눌렀을 때만 호출한다.
 */
export default function CryptoTerminal({ language = 'en', backLink = false }: { language?: TerminalLang; backLink?: boolean }) {
  return (
    <TerminalLangProvider language={language}>
      <CryptoTerminalInner backLink={backLink} />
    </TerminalLangProvider>
  )
}

function CryptoTerminalInner({ backLink }: { backLink: boolean }) {
  const tr = useT()
  const ko = useTerminalLang() === 'ko'
  const [symbol, setSymbol] = useState('BTC')
  const [archetype, setArchetype] = useState<OnnxBacktestArchetypeKey>('TREND_FOLLOWING')
  const [liveRefresh, setLiveRefresh] = useState(true)

  const [health, setHealth] = useState<OnnxModelHealth | null>(null)
  const [accuracy, setAccuracy] = useState<VetoAccuracyEntry[]>([])
  const [backtest, setBacktest] = useState<OnnxVetoBacktestComparison | null>(null)
  const [running, setRunning] = useState(false)
  const [backtestFailed, setBacktestFailed] = useState(false)
  const [liveDecision, setLiveDecision] = useState<IntegratedDecisionReport | null>(null)

  // /api/trading/decision은 심볼을 "BTCUSDT" 식 전체 티커로 받는다 — 대시보드 필터는 "BTC"처럼
  // 짧게 입력받으므로 여기서만 맞춰준다(다른 곳은 서버가 알아서 정규화한다).
  const decisionSymbol = (s: string) => {
    const up = s.trim().toUpperCase()
    return up.endsWith('USDT') ? up : `${up}USDT`
  }

  const loadLight = async () => {
    const [h, a, d] = await Promise.all([
      fetchOnnxModelHealth(),
      fetchVetoAccuracy(ACCURACY_WINDOW_DAYS),
      fetchIntegratedDecision(decisionSymbol(symbol), 'H1', 150).catch((err) => {
        console.warn('[CryptoTerminal] fetchIntegratedDecision failed:', err)
        return null
      })
    ])
    setHealth(h)
    setAccuracy(a)
    setLiveDecision(d)
  }

  useEffect(() => {
    loadLight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  useEffect(() => {
    if (!liveRefresh) return
    // 공개 화면이라 탭이 숨겨져 있으면 갱신하지 않는다 (서버 부하 절감)
    const id = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) loadLight()
    }, LIVE_REFRESH_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRefresh, symbol])

  const runBacktest = async () => {
    setRunning(true)
    setBacktestFailed(false)
    const data = await fetchOnnxVetoBacktest(symbol.trim().toUpperCase() || 'BTC', archetype)
    setBacktest(data)
    setBacktestFailed(data === null) // 요청 제한(429)이나 서버 오류일 때 빈 화면 대신 안내를 보여준다
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
    <div className="bg-[#0d0d0d] px-4 py-4 font-mono">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <div>
            {backLink && (
              <Link href="/" className="text-[9px] text-[#555555] hover:text-[#f47a20] block">← AETHER TERMINAL</Link>
            )}
            <h1 className="text-[13px] font-bold text-white mt-0.5">AETHER · CRYPTO TERMINAL</h1>
            <p className="text-[9px] text-[#555555] mt-0.5">
              {tr('딥러닝 모델 학습·검증(DOWN_RISK / UP_RISK) · 실시간 모니터링 · 자동 새로고침 ', 'Deep-learning model training & validation (DOWN_RISK / UP_RISK) · live monitoring · ')}
              {liveRefresh ? tr(`${LIVE_REFRESH_MS / 1000}초`, `auto-refresh ${LIVE_REFRESH_MS / 1000}s`) : tr('꺼짐', 'auto-refresh off')}
            </p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1 max-w-[560px]">
            {tr('연구·교육용 · 투자 권유 아님 · 모델 출력과 백테스트 결과이며 과거 성과는 미래를 보장하지 않음', 'For research & education only · Not investment advice · Model outputs and backtest results; past performance does not guarantee future results')}
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
            <StatTile
              label="OOS Win Rate"
              value={vf ? `${(vf.outOfSampleWinRate * 100).toFixed(1)}%` : '—'}
              tone={vf ? (vf.outOfSampleWinRate >= 0.5 ? 'good' : 'bad') : 'neutral'}
              hint={vf ? tr(`학습에 안 쓰인 구간 ${vf.outOfSampleTrades}건 — 표본이 적으면(20건 미만) 신뢰도 낮음`, `${vf.outOfSampleTrades} trades in the segment not used for training — low reliability if the sample is small (under 20)`) : undefined}
            />
            <StatTile label="Sharpe" value={vf ? vf.sharpeRatio.toFixed(2) : '—'} tone={vf ? (vf.sharpeRatio >= 0 ? 'good' : 'bad') : 'neutral'} />
            <StatTile label="Trades" value={vf ? String(vf.totalTrades) : '—'} />
            <StatTile label="Signal Rejects" value={backtest?.reliable ? String(backtest.vetoedEntrySignals) : '—'} hint={tr('이 백테스트 구간에서 딥러닝 모델이 거부한 진입 신호 수', 'Entry signals rejected by the deep-learning model in this backtest range')} />
            <StatTile
              label="Model Health"
              value={modelHealthPct === null ? '—' : `${modelHealthPct.toFixed(0)}%`}
              tone={modelHealthPct === null ? 'neutral' : modelHealthPct >= 100 ? 'good' : modelHealthPct === 0 ? 'bad' : 'neutral'}
              fill
            />
            <StatTile label="Veto Accuracy" value={accuracyPct === null ? '—' : `${accuracyPct.toFixed(1)}%`} tone={accuracyPct === null ? 'neutral' : accuracyPct >= 50 ? 'good' : 'bad'} hint={tr(`최근 ${ACCURACY_WINDOW_DAYS}일 실전 채점`, `Live-scored over the last ${ACCURACY_WINDOW_DAYS} days`)} />
            <StatTile label="MDD" value={vf ? `${vf.maxDrawdownPct.toFixed(1)}%` : '—'} tone={vf ? (vf.maxDrawdownPct > -10 ? 'good' : 'bad') : 'neutral'} />
          </div>
        </SectionHeader>

        <SectionHeader label="Model Validation">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 mb-4">
            <PanelFrame title="DOWN_RISK / UP_RISK STATUS">
              <div className="flex flex-col gap-1.5 pt-1">
                <HealthRow label={tr('DOWN_RISK (BUY 거부권)', 'DOWN_RISK (BUY veto)')} ok={health?.downRiskInitialized} />
                <HealthRow label={tr('UP_RISK (SELL 거부권)', 'UP_RISK (SELL veto)')} ok={health?.upRiskInitialized} />
                <div className="text-[9px] text-[#666666] mt-1">
                  {tr('게이트 ', 'Gate ')}{health ? health.ensembleGate.toFixed(2) : '—'} · {tr('캔들 부족 폴백률 ', 'insufficient-candle fallback rate ')}{health ? `${health.insufficientCandleFallbackRatePct.toFixed(1)}%` : '—'}
                </div>
              </div>
            </PanelFrame>

            <PanelFrame title="LIVE RISK GAUGE" subtitle={decisionSymbol(symbol)}>
              <RiskGaugePanel
                downRiskProb={liveDecision?.onnxDownRiskProb ?? null}
                upRiskProb={liveDecision?.onnxUpRiskProb ?? null}
                gate={health?.ensembleGate ?? 0.4}
                vetoed={liveDecision?.onnxVetoed ?? null}
                finalAction={liveDecision?.finalAction ?? null}
              />
            </PanelFrame>

            <PanelFrame title="VETO ACCURACY BY DIRECTION" className="lg:col-span-2">
              {accuracy.length === 0 ? (
                <p className="text-[10px] text-[#555555] pt-1">{tr(`최근 ${ACCURACY_WINDOW_DAYS}일 내 표본 부족 (방향당 최소 20건)`, `Not enough samples in the last ${ACCURACY_WINDOW_DAYS} days (at least 20 per direction)`)}</p>
              ) : (
                <table className="w-full text-[10px] mt-1">
                  <thead>
                    <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                      <th className="py-1 font-normal">{tr('방향', 'Direction')}</th>
                      <th className="py-1 font-normal">{tr('표본', 'Samples')}</th>
                      <th className="py-1 font-normal">{tr('손실회피', 'Losses avoided')}</th>
                      <th className="py-1 font-normal">{tr('기회차단', 'Opportunities blocked')}</th>
                      <th className="py-1 font-normal">{tr('정확도', 'Accuracy')}</th>
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
          {backtestFailed && (
            <p className="text-[10px] text-[#f2495c] mb-2">
              {tr('백테스트를 불러오지 못했습니다. 요청이 너무 잦거나 서버가 바쁠 수 있으니 잠시 후 다시 눌러 주세요.', 'The backtest could not be loaded. Requests may be too frequent or the server busy — please try again in a few seconds.')}
            </p>
          )}
          {!backtest ? (
            <p className="text-[10px] text-[#555555] mb-4">{tr('상단 RUN BACKTEST를 눌러 종목/전략을 백테스트하면 아래 패널이 채워집니다.', 'Press RUN BACKTEST above to backtest the asset/strategy and the panels below will fill in.')}</p>
          ) : !backtest.reliable ? (
            <p className="text-[10px] text-[#e0b400] mb-4">{serverNote(backtest.note, ko)}</p>
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

              <PanelFrame title="SIGNAL DISTRIBUTION" subtitle={tr('청산 사유별 건수', 'Trades by exit reason')}>
                <BarChartPanel data={distributionData} defaultColor="#73bf69" valueFormat={(v) => String(Math.round(v))} />
              </PanelFrame>

              <PanelFrame title="TRADE VOLUME BY DAY">
                <BarChartPanel data={volumeData} defaultColor="#b877d9" valueFormat={(v) => String(Math.round(v))} />
              </PanelFrame>

              <PanelFrame title="WIN-RATE HEATMAP" subtitle={tr('진입 요일 × 시간(UTC)', 'Entry weekday × hour (UTC)')} className="lg:col-span-2">
                <HeatmapPanel grid={heatmapGrid} />
              </PanelFrame>

              <PanelFrame title="WALK-FORWARD CONSISTENCY" subtitle={tr('시간순 4구간 재검증', 'Re-validation over 4 chronological segments')} className="lg:col-span-2">
                <WalkForwardPanel baseline={backtest.baselineWalkForward} vetoFiltered={backtest.vetoFilteredWalkForward} />
              </PanelFrame>
            </div>
          )}
        </SectionHeader>

        <SectionHeader label={tr('Decision Journal (딥러닝 모델 외 — AI 리서치 판정 전체)', 'Decision Journal (beyond the deep-learning model — all AI research verdicts)')}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
            <PanelFrame title="VERDICT CALIBRATION" subtitle={tr('7일 뒤 실측 채점', 'Scored against actual prices 7 days later')}>
              <DecisionCalibrationPanel />
            </PanelFrame>

            <PanelFrame title="RECENT VETO LOG" subtitle={tr('최신순, 최대 50건', 'Newest first, up to 50')}>
              <RecentVetoLogPanel />
            </PanelFrame>
          </div>
        </SectionHeader>
      </div>
    </div>
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
