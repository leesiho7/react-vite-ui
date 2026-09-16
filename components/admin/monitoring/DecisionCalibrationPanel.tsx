'use client'

import { useEffect, useState } from 'react'
import { fetchDecisionCalibration } from '@/lib/api'
import { DecisionCalibrationEntry } from '@/lib/types'

/**
 * ONNX 거부권과는 별개로, AI 리서치 판정(BUY/SELL/HOLD 등) 자체가 실제로 얼마나 맞았는지
 * — `DecisionOutcomeService`가 7일 뒤 실측 시세로 채점해 쌓은 캘리브레이션. 표본이
 * 부족한 판정은 흐리게 표시하고 "표본부족"이라고 명시한다(숨기지 않고, 신뢰할 수 있는
 * 척도 안 하는 것).
 */
export default function DecisionCalibrationPanel() {
  const [entries, setEntries] = useState<DecisionCalibrationEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDecisionCalibration().then((d) => {
      setEntries(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-[10px] text-[#555555] pt-1">불러오는 중…</p>
  if (entries.length === 0) return <p className="text-[10px] text-[#555555] pt-1">아직 채점된 판정 기록이 없습니다.</p>

  return (
    <table className="w-full text-[10px] mt-1">
      <thead>
        <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
          <th className="py-1 font-normal">판정</th>
          <th className="py-1 font-normal">표본</th>
          <th className="py-1 font-normal">승수</th>
          <th className="py-1 font-normal">승률</th>
          <th className="py-1 font-normal">평균수익</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.verdict} className={`border-b border-[#141414] ${!e.reliable ? 'opacity-40' : ''}`}>
            <td className="py-1 text-white font-bold">{e.verdict}</td>
            <td className="py-1 text-[#aaaaaa]">{e.samples}{!e.reliable && <span className="text-[#666666]"> (표본부족)</span>}</td>
            <td className="py-1 text-[#aaaaaa]">{e.wins}</td>
            <td className={`py-1 font-bold ${e.winRate >= 0.5 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>
              {(e.winRate * 100).toFixed(1)}%
            </td>
            <td className={`py-1 font-bold ${e.avgReturnPct >= 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>
              {e.avgReturnPct.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
