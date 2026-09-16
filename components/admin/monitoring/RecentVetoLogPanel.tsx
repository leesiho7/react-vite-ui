'use client'

import { useEffect, useState } from 'react'
import { fetchRecentVetoes } from '@/lib/api'
import { RecentVetoEntry } from '@/lib/types'

/** 최근 채점 완료된 거부권 발동 원시 로그 — "언제, 어느 종목, 어느 방향, 몇 %확신으로
 *  막았고, 실제로 어떻게 됐는지"를 사람이 직접 훑어볼 수 있는 리스트. 집계된 정확도(%)만
 *  보여주던 것과 달리 개별 사례를 그대로 노출한다. */
export default function RecentVetoLogPanel() {
  const [entries, setEntries] = useState<RecentVetoEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentVetoes().then((d) => {
      setEntries(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-[10px] text-[#555555] pt-1">불러오는 중…</p>
  if (entries.length === 0) return <p className="text-[10px] text-[#555555] pt-1">아직 채점 완료된 거부권 기록이 없습니다.</p>

  return (
    <div className="max-h-[220px] overflow-y-auto">
      <table className="w-full text-[9px]">
        <thead className="sticky top-0 bg-[#0d0d0d]">
          <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
            <th className="py-1 font-normal">시각</th>
            <th className="py-1 font-normal">종목</th>
            <th className="py-1 font-normal">방향</th>
            <th className="py-1 font-normal">확신도</th>
            <th className="py-1 font-normal">결과</th>
            <th className="py-1 font-normal">실현손익</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-[#141414]">
              <td className="py-1 text-[#888888] font-mono">{formatTime(e.vetoedAt)}</td>
              <td className="py-1 text-white font-bold">{e.symbol}</td>
              <td className="py-1 text-[#aaaaaa]">{e.vetoedDirection}</td>
              <td className="py-1 text-[#aaaaaa]">{(e.riskProbability * 100).toFixed(0)}%</td>
              <td className={`py-1 font-bold ${outcomeColor(e.outcome)}`}>{outcomeLabel(e.outcome)}</td>
              <td className="py-1 text-[#aaaaaa]">
                {e.realizedReturnPct === null ? '—' : `${e.realizedReturnPct.toFixed(2)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function outcomeLabel(outcome: string): string {
  if (outcome === 'STOP_HIT') return '거부권 옳았음'
  if (outcome === 'TARGET_HIT') return '거부권 틀렸음'
  if (outcome === 'TIME_EXIT') return '중립'
  return outcome
}

function outcomeColor(outcome: string): string {
  if (outcome === 'STOP_HIT') return 'text-[#73bf69]'
  if (outcome === 'TARGET_HIT') return 'text-[#f2495c]'
  return 'text-[#888888]'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
