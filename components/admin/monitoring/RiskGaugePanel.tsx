'use client'

/**
 * ONNX DOWN_RISK/UP_RISK의 실시간 확률 게이지. `/api/trading/decision`이 이미 메인 TRADE
 * 화면에서 쓰고 있는 실제 판정 엔드포인트에서 그대로 가져온 값이다 — "오를 확률"이 아니라
 * "지금 그 방향(BUY/SELL)으로 진입하면 20봉 내 손절당할 위험 확률"이다. 게이트(기본 40%)를
 * 넘으면 실제로 거부권이 발동하는 그 임계선을 막대에 그대로 표시한다.
 */
export default function RiskGaugePanel({
  downRiskProb,
  upRiskProb,
  gate,
  vetoed,
  finalAction
}: {
  downRiskProb: number | null
  upRiskProb: number | null
  gate: number
  vetoed: boolean | null
  finalAction: string | null
}) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <Gauge label="DOWN_RISK (BUY 거부권)" value={downRiskProb} gate={gate} />
      <Gauge label="UP_RISK (SELL 거부권)" value={upRiskProb} gate={gate} />
      <div className="text-[9px] text-[#666666] flex items-center gap-2 mt-0.5">
        <span>최종 판정: <span className="text-white font-bold">{finalAction ?? '—'}</span></span>
        {vetoed !== null && (
          <span className={vetoed ? 'text-[#f2495c] font-bold' : 'text-[#555555]'}>
            {vetoed ? '● 거부권 발동됨' : '○ 거부권 미발동'}
          </span>
        )}
      </div>
    </div>
  )
}

function Gauge({ label, value, gate }: { label: string; value: number | null; gate: number }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100
  const gatePct = Math.max(0, Math.min(1, gate)) * 100
  const overGate = value !== null && value >= gate
  const fillColor = value === null ? '#333333' : overGate ? '#f2495c' : '#73bf69'

  return (
    <div>
      <div className="flex items-center justify-between text-[9px] text-[#888888] mb-1">
        <span>{label}</span>
        <span className={`font-mono font-bold ${value === null ? 'text-[#555555]' : overGate ? 'text-[#f2495c]' : 'text-[#73bf69]'}`}>
          {value === null ? '—' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-3 bg-[#1a1a1a] rounded-[2px] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{ width: `${pct}%`, background: fillColor }}
        />
        {/* 게이트 임계선 — 이 선을 넘으면 실제로 거부권이 발동한다 */}
        <div className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${gatePct}%` }} />
      </div>
      <div className="text-[8px] text-[#555555] mt-0.5">게이트 {(gate * 100).toFixed(0)}% (흰 선) 넘으면 거부권 발동</div>
    </div>
  )
}
