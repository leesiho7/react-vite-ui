'use client'

import { useState } from 'react'
import { fetchOnnxVetoBacktest } from '@/lib/api'
import { OnnxBacktestArchetypeKey, OnnxVetoBacktestComparison, BacktestReportSummary, WalkForwardSummary } from '@/lib/types'

const ARCHETYPES: OnnxBacktestArchetypeKey[] = [
  'TREND_FOLLOWING',
  'MEAN_REVERSION',
  'BREAKOUT',
  'RSI_STANDALONE',
  'VWAP_TREND',
  'MACD_CROSSOVER',
  'MA_RIBBON',
  'BOLLINGER_SQUEEZE_BREAKOUT',
  'ATR_VOLATILITY_BREAKOUT'
]

/** 같은 전략을 "ONNX 거부권 없이" vs "적용"으로 나란히 백테스트한다(수수료/슬리피지/MDD/워크포워드
 *  전부 포함, BacktestEngine·WalkForwardValidator 재사용). 실행마다 최근 8,000봉을 다시 받아
 *  백테스트하므로 결과가 시간이 지나면서 조금씩 바뀔 수 있다 — 그게 정상이다. */
export default function OnnxVetoBacktestPanel() {
  const [symbol, setSymbol] = useState('BTC')
  const [archetype, setArchetype] = useState<OnnxBacktestArchetypeKey>('TREND_FOLLOWING')
  const [result, setResult] = useState<OnnxVetoBacktestComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)

  const run = async () => {
    setLoading(true)
    setRan(true)
    const data = await fetchOnnxVetoBacktest(symbol.trim().toUpperCase() || 'BTC', archetype)
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="rounded-lg border border-[#23262d] bg-[#0d1117] p-5 text-[#e6edf3]">
      <h2 className="text-sm font-bold tracking-wide text-[#94a3b8] uppercase mb-4">
        거부권 적용 전/후 백테스트 비교
      </h2>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-[10px] text-[#64748b] uppercase mb-1">종목</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC"
            className="bg-[#161b22] border border-[#2d333b] rounded px-2 py-1.5 text-xs w-24 text-[#e6edf3]"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#64748b] uppercase mb-1">전략 아키타입</label>
          <select
            value={archetype}
            onChange={(e) => setArchetype(e.target.value as OnnxBacktestArchetypeKey)}
            className="bg-[#161b22] border border-[#2d333b] rounded px-2 py-1.5 text-xs text-[#e6edf3]"
          >
            {ARCHETYPES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="text-xs font-bold px-4 py-1.5 rounded bg-[#f47a20] text-white disabled:opacity-50"
        >
          {loading ? '백테스트 실행 중…' : '비교 실행'}
        </button>
      </div>

      {!ran ? (
        <p className="text-xs text-[#64748b]">
          8,000봉 실측 캔들을 받아 즉시 백테스트하므로 몇 초 정도 걸립니다.
        </p>
      ) : loading ? (
        <p className="text-xs text-[#64748b]">불러오는 중…</p>
      ) : !result ? (
        <p className="text-xs text-[#f87171]">비교를 불러오지 못했습니다. 백엔드 로그를 확인하세요.</p>
      ) : !result.reliable ? (
        <p className="text-xs text-[#facc15]">{result.note}</p>
      ) : (
        <ComparisonResult result={result} />
      )}
    </div>
  )
}

function ComparisonResult({ result }: { result: OnnxVetoBacktestComparison }) {
  return (
    <div>
      <div className="text-xs text-[#94a3b8] mb-4">
        {result.symbol} · {result.strategyName} · {result.direction} — 진입신호 {result.totalEntrySignals}건 중{' '}
        <span className="text-[#f47a20] font-bold">{result.vetoedEntrySignals}건 거부 ({result.vetoRatePct}%)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard title="거부권 없이 (Baseline)" report={result.baseline} walkForward={result.baselineWalkForward} />
        <ReportCard title="거부권 적용" report={result.vetoFiltered} walkForward={result.vetoFilteredWalkForward} highlight />
      </div>
    </div>
  )
}

function ReportCard({
  title,
  report,
  walkForward,
  highlight
}: {
  title: string
  report?: BacktestReportSummary
  walkForward?: WalkForwardSummary
  highlight?: boolean
}) {
  if (!report) return null
  return (
    <div className={`rounded border p-4 ${highlight ? 'border-[#f47a20]' : 'border-[#23262d]'}`}>
      <div className="text-xs font-bold mb-3">{title}</div>
      {!report.metricsReliable ? (
        <p className="text-[11px] text-[#facc15]">{report.reliabilityNote}</p>
      ) : (
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <Stat label="거래 수" value={`${report.totalTrades}건`} />
          <Stat label="승률" value={`${(report.winRate * 100).toFixed(1)}%`} />
          <Stat label="총수익률" value={`${report.totalReturnPct.toFixed(2)}%`} good={report.totalReturnPct > 0} />
          <Stat label="MDD" value={`${report.maxDrawdownPct.toFixed(2)}%`} good={report.maxDrawdownPct > -10} />
          <Stat label="샤프" value={report.sharpeRatio.toFixed(2)} good={report.sharpeRatio > 0} />
          <Stat label="비용(왕복)" value={`${report.totalCostPct.toFixed(2)}%`} />
          <Stat
            label="OOS 승률"
            value={report.outOfSampleTrades > 0 ? `${(report.outOfSampleWinRate * 100).toFixed(1)}%` : '표본부족'}
          />
          <Stat
            label="워크포워드"
            value={
              walkForward
                ? `${walkForward.profitableSegments}/${walkForward.reliableSegments}구간 순이익 ${walkForward.consistent ? '(일관)' : '(비일관)'}`
                : '—'
            }
          />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-[#64748b] uppercase">{label}</div>
      <div className={`font-bold ${good === undefined ? 'text-[#e6edf3]' : good ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        {value}
      </div>
    </div>
  )
}
