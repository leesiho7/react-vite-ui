'use client'

import { useEffect, useState } from 'react'
import { fetchVetoAccuracy } from '@/lib/api'
import { VetoAccuracyEntry } from '@/lib/types'

const WINDOW_OPTIONS = [7, 30, 90, 180] as const

/** ShadowVetoAuditService가 실전에서 채점한 거부권 정확도 — "거부권이 실제로 돈을 아껴줬는가"에
 *  대한 유일하게 신뢰할 수 있는 답이다(백테스트가 아니라 실측 라이브 판정 결과). */
export default function VetoAccuracyPanel() {
  const [windowDays, setWindowDays] = useState<number>(30)
  const [entries, setEntries] = useState<VetoAccuracyEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async (days: number) => {
    setLoading(true)
    const data = await fetchVetoAccuracy(days)
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => {
    load(windowDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays])

  return (
    <div className="rounded-lg border border-[#23262d] bg-[#0d1117] p-5 text-[#e6edf3]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold tracking-wide text-[#94a3b8] uppercase">실전 거부권 정확도</h2>
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setWindowDays(d)}
              className={`text-[10px] font-bold px-2 py-1 rounded border ${
                windowDays === d
                  ? 'border-[#f47a20] text-[#f47a20] bg-[#f47a2015]'
                  : 'border-[#2d333b] text-[#64748b] hover:text-white'
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[#64748b]">불러오는 중…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-[#64748b]">
          최근 {windowDays}일 내 표본이 부족합니다(방향당 최소 20건 필요). 거부권이 아직 충분히 발동하지
          않았거나 채점 대기 중일 수 있습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-[#64748b] uppercase border-b border-[#23262d]">
                <th className="py-2 pr-4">방향</th>
                <th className="py-2 pr-4">표본</th>
                <th className="py-2 pr-4">손실 회피 (STOP_HIT)</th>
                <th className="py-2 pr-4">기회 차단 (TARGET_HIT)</th>
                <th className="py-2 pr-4">정확도</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const resolved = e.correctVetoes + e.harmfulVetoes
                const accuracy = resolved === 0 ? null : e.correctVetoes / resolved
                return (
                  <tr key={e.direction} className="border-b border-[#161b22]">
                    <td className="py-2 pr-4 font-bold">
                      {e.direction} <span className="text-[#64748b] font-normal">({e.direction === 'BUY' ? 'DOWN_RISK' : 'UP_RISK'})</span>
                    </td>
                    <td className="py-2 pr-4">{e.samples}건</td>
                    <td className="py-2 pr-4 text-[#4ade80]">{e.correctVetoes}건</td>
                    <td className="py-2 pr-4 text-[#f87171]">{e.harmfulVetoes}건</td>
                    <td className="py-2 pr-4 font-bold">
                      {accuracy === null ? '—' : `${(accuracy * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
