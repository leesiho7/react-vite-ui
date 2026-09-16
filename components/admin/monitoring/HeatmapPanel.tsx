'use client'

import { useState } from 'react'
import { HeatmapCell } from '@/lib/monitoringMath'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const SCALE_STOPS: [number, string][] = [
  [0, '#3b82f6'], // blue
  [0.33, '#73bf69'], // green
  [0.66, '#e0b400'], // yellow
  [1, '#f2495c'] // red
]

function scaleColor(v: number): string {
  const clamped = Math.max(0, Math.min(1, v))
  for (let i = 0; i < SCALE_STOPS.length - 1; i++) {
    const [p0, c0] = SCALE_STOPS[i]
    const [p1, c1] = SCALE_STOPS[i + 1]
    if (clamped >= p0 && clamped <= p1) {
      const t = p1 === p0 ? 0 : (clamped - p0) / (p1 - p0)
      return lerpHex(c0, c1, t)
    }
  }
  return SCALE_STOPS[SCALE_STOPS.length - 1][1]
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const r = Math.round(pa.r + (pb.r - pa.r) * t)
  const g = Math.round(pa.g + (pb.g - pa.g) * t)
  const bch = Math.round(pa.b + (pb.b - pa.b) * t)
  return `rgb(${r},${g},${bch})`
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** 요일×시간대 승률 히트맵. 표본이 없는 칸(winRate=null)은 회색으로 비워두고, 색상 스케일
 *  범례(파랑→초록→노랑→빨강)를 아래 붙인다. 셀 사이 간격 없이 촘촘하게. */
export default function HeatmapPanel({ grid }: { grid: HeatmapCell[][] }) {
  const [hover, setHover] = useState<HeatmapCell | null>(null)
  const cellW = 11
  const cellH = 12
  const labelW = 16
  const width = labelW + cellW * 24

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${cellH * 7 + 4}`} width="100%" height={cellH * 7 + 4}>
        {grid.map((row, dow) =>
          row.map((cell, hour) => (
            <rect
              key={`${dow}-${hour}`}
              x={labelW + hour * cellW}
              y={dow * cellH}
              width={cellW}
              height={cellH}
              fill={cell.winRate === null ? '#161616' : scaleColor(cell.winRate)}
              stroke="#0d0d0d"
              strokeWidth={0.5}
              onMouseEnter={() => setHover(cell)}
              onMouseLeave={() => setHover(null)}
            />
          ))
        )}
        {DAY_LABELS.map((label, dow) => (
          <text key={label} x={labelW - 3} y={dow * cellH + cellH / 2 + 3} textAnchor="end" fontSize={7} fill="#666666" fontFamily="ui-monospace, monospace">
            {label}
          </text>
        ))}
      </svg>

      <div className="flex items-center justify-between mt-1.5">
        <div className="text-[9px] font-mono text-[#aaaaaa] h-3.5">
          {hover ? (
            hover.winRate === null ? (
              <span className="text-[#555555]">{DAY_LABELS[hover.dayOfWeek]}요일 {hover.hour}시 (UTC) — 표본 없음</span>
            ) : (
              <span>
                {DAY_LABELS[hover.dayOfWeek]}요일 {hover.hour}시(UTC) — 승률 <span className="text-white">{(hover.winRate * 100).toFixed(0)}%</span> ({hover.count}건)
              </span>
            )
          ) : (
            <span className="text-[#555555]">셀에 마우스를 올리면 값이 보입니다</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[8px] text-[#666666]">0%</span>
          <div className="w-16 h-2" style={{ background: 'linear-gradient(to right, #3b82f6, #73bf69, #e0b400, #f2495c)' }} />
          <span className="text-[8px] text-[#666666]">100%</span>
        </div>
      </div>
    </div>
  )
}
