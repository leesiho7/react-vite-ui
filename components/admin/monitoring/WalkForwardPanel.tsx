'use client'

import { WalkForwardSummary } from '@/lib/types'

/**
 * 전체 이력을 시간순 4구간으로 나눠 같은 규칙을 각 구간에 재적용한 워크포워드 검증
 * (WalkForwardValidator, `/api/ml/veto-backtest` 응답에 이미 포함되어 있던 걸 화면에서
 * 빠뜨리고 있었다). 구간마다 순이익이면 초록, 손실이면 빨강 — 레짐이 바뀌어도 거부권이
 * 버텨주는지 한눈에 보여준다.
 */
export default function WalkForwardPanel({
  baseline,
  vetoFiltered
}: {
  baseline?: WalkForwardSummary
  vetoFiltered?: WalkForwardSummary
}) {
  if (!baseline || !vetoFiltered) {
    return <p className="text-[10px] text-[#555555] pt-1">백테스트를 실행하면 채워집니다.</p>
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <Row label="No Veto" summary={baseline} />
      <Row label="Veto Applied" summary={vetoFiltered} />
    </div>
  )
}

function Row({ label, summary }: { label: string; summary: WalkForwardSummary }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-[#888888]">{label}</span>
        <span className={`text-[9px] font-bold ${summary.consistent ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>
          {summary.consistent ? '레짐 일관됨' : '레짐 비일관'} ({summary.profitableSegments}/{summary.reliableSegments})
        </span>
      </div>
      <div className="flex gap-1">
        {summary.segmentReports.map((seg, i) => {
          const reliable = seg.metricsReliable
          const positive = seg.totalReturnPct >= 0
          return (
            <div
              key={i}
              className={`flex-1 h-8 rounded-[2px] flex items-center justify-center text-[8px] font-mono font-bold ${
                !reliable ? 'bg-[#1a1a1a] text-[#555555]' : positive ? 'bg-[#73bf6926] text-[#73bf69]' : 'bg-[#f2495c26] text-[#f2495c]'
              }`}
              title={!reliable ? `구간 ${i + 1}: 표본 부족 (${seg.reliabilityNote})` : `구간 ${i + 1}: ${seg.totalReturnPct.toFixed(1)}% (${seg.totalTrades}건)`}
            >
              {reliable ? `${seg.totalReturnPct.toFixed(0)}%` : '—'}
            </div>
          )
        })}
      </div>
    </div>
  )
}
