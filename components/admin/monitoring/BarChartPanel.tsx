'use client'

import { useState } from 'react'

export interface BarDatum {
  label: string
  value: number
  color?: string // 개별 막대 색을 지정하지 않으면 defaultColor 사용
}

const H = 130
const PAD = { top: 6, right: 4, bottom: 16, left: 28 }

/** 촘촘한 세로 막대, 기본은 단색(muted), 막대 테두리 없음. 항목이 많으면 라벨을 45도로
 *  기울이지 않고 그냥 생략(호버로만 확인) — 라벨 겹침보다는 깨끗한 편이 낫다. */
export default function BarChartPanel({
  data,
  defaultColor = '#b877d9',
  width = 340,
  valueFormat = (v: number) => String(v)
}: {
  data: BarDatum[]
  defaultColor?: string
  width?: number
  valueFormat?: (v: number) => string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[10px] text-[#555555]" style={{ height: H }}>
        데이터 없음
      </div>
    )
  }

  const maxV = Math.max(1, ...data.map((d) => d.value))
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const barGap = 2
  const barW = Math.max(2, innerW / data.length - barGap)

  const gridLines = [0, 0.5, 1].map((f) => maxV * f)

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${H}`} width="100%" height={H} className="overflow-visible">
        {gridLines.map((v, i) => {
          const yy = PAD.top + innerH - (v / maxV) * innerH
          return <line key={i} x1={PAD.left} x2={width - PAD.right} y1={yy} y2={yy} stroke="#1a1a1a" strokeWidth={1} />
        })}
        {gridLines.map((v, i) => {
          const yy = PAD.top + innerH - (v / maxV) * innerH
          return (
            <text key={i} x={PAD.left - 4} y={yy + 3} textAnchor="end" fontSize={8} fill="#666666" fontFamily="ui-monospace, monospace">
              {valueFormat(v)}
            </text>
          )
        })}
        {data.map((d, i) => {
          const barH = (d.value / maxV) * innerH
          const bx = PAD.left + i * (barW + barGap)
          const by = PAD.top + innerH - barH
          return (
            <rect
              key={i}
              x={bx}
              y={by}
              width={barW}
              height={Math.max(0, barH)}
              fill={d.color ?? defaultColor}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.45}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          )
        })}
      </svg>
      <div className="text-[9px] font-mono text-[#aaaaaa] mt-0.5 h-3.5">
        {hoverIdx !== null ? (
          <span>
            {data[hoverIdx].label}: <span className="text-white">{valueFormat(data[hoverIdx].value)}</span>
          </span>
        ) : (
          <span className="text-[#555555]">막대에 마우스를 올리면 값이 보입니다</span>
        )}
      </div>
    </div>
  )
}
