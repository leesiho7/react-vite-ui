'use client'

import { useEffect, useState } from 'react'
import { fetchOnnxModelHealth } from '@/lib/api'
import { OnnxModelHealth } from '@/lib/types'

/** ONNX DOWN_RISK/UP_RISK 모델이 정상 로딩됐는지, 캔들 부족 폴백률이 얼마인지 보여준다.
 *  이 카드가 빨간불이면 아래 정확도/백테스트 수치는 실제 모델이 아니라 폴백값을 보고 있는 것이다. */
export default function OnnxModelHealthCard() {
  const [health, setHealth] = useState<OnnxModelHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await fetchOnnxModelHealth()
    setHealth(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="rounded-lg border border-[#23262d] bg-[#0d1117] p-5 text-[#e6edf3]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold tracking-wide text-[#94a3b8] uppercase">ONNX 모델 상태</h2>
        <button
          type="button"
          onClick={load}
          className="text-[10px] font-bold px-2 py-1 rounded border border-[#2d333b] text-[#94a3b8] hover:text-white"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-[#64748b]">불러오는 중…</p>
      ) : !health ? (
        <p className="text-xs text-[#f87171]">상태를 불러오지 못했습니다. 백엔드가 떠 있는지 확인하세요.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatusRow label="DOWN_RISK (BUY 거부권)" ok={health.downRiskInitialized} />
          <StatusRow label="UP_RISK (SELL 거부권)" ok={health.upRiskInitialized} />
          <Metric label="게이트 임계값" value={health.ensembleGate.toFixed(2)} />
          <Metric
            label="캔들 부족 폴백률"
            value={`${health.insufficientCandleFallbackRatePct.toFixed(1)}%`}
            warn={health.insufficientCandleFallbackRatePct > 5}
          />
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-[#22c55e]' : 'bg-[#f87171]'}`} />
      <span className="text-xs text-[#cbd5e1]">{label}</span>
      <span className={`text-xs font-bold ${ok ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        {ok ? '정상' : '미배포'}
      </span>
    </div>
  )
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-[#64748b] uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-bold ${warn ? 'text-[#facc15]' : 'text-[#e6edf3]'}`}>{value}</div>
    </div>
  )
}
