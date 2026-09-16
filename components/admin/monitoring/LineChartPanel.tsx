'use client'

import { useMemo, useRef, useState } from 'react'

export interface LineSeries {
  name: string
  color: string
  points: { t: number; v: number }[] // t = epoch ms
}

const H = 130
const PAD = { top: 6, right: 6, bottom: 16, left: 34 }

/** 얇은 라인(1.5px), 아래 범례(색+이름), 거의 안 보이는 그리드라인, x축 시각 라벨.
 *  2개 이상 시리즈는 범례가 항상 있고(색만으로 구분하지 않는다), 단일 시리즈는 제목이
 *  이름을 대신하므로 범례를 생략한다. */
export default function LineChartPanel({
  series,
  width = 340,
  yFormat = (v: number) => v.toFixed(1),
  yLabel
}: {
  series: LineSeries[]
  width?: number
  yFormat?: (v: number) => string
  yLabel?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const allPoints = series.flatMap((s) => s.points)
  if (allPoints.length === 0) {
    return <EmptyState height={H} />
  }

  const minT = Math.min(...allPoints.map((p) => p.t))
  const maxT = Math.max(...allPoints.map((p) => p.t))
  const minV = Math.min(0, ...allPoints.map((p) => p.v))
  const maxV = Math.max(...allPoints.map((p) => p.v))
  const vSpan = maxV - minV || 1
  const tSpan = maxT - minT || 1

  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x = (t: number) => PAD.left + ((t - minT) / tSpan) * innerW
  const y = (v: number) => PAD.top + innerH - ((v - minV) / vSpan) * innerH

  const gridLines = useMemo(() => {
    const n = 3
    return Array.from({ length: n + 1 }, (_, i) => minV + (vSpan * i) / n)
  }, [minV, vSpan])

  const nearest = useMemo(() => {
    if (hoverX === null) return null
    const t = minT + ((hoverX - PAD.left) / innerW) * tSpan
    return series.map((s) => {
      let best = s.points[0]
      let bestDiff = Infinity
      for (const p of s.points) {
        const diff = Math.abs(p.t - t)
        if (diff < bestDiff) {
          bestDiff = diff
          best = p
        }
      }
      return { name: s.name, color: s.color, point: best }
    })
  }, [hoverX, series, minT, tSpan, innerW])

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoverX(((e.clientX - rect.left) / rect.width) * width)
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverX(null)}
        className="overflow-visible"
      >
        {/* gridlines */}
        {gridLines.map((v, i) => (
          <line key={i} x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="#1a1a1a" strokeWidth={1} />
        ))}
        {/* y axis labels */}
        {gridLines.map((v, i) => (
          <text key={i} x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize={8} fill="#666666" fontFamily="ui-monospace, monospace">
            {yFormat(v)}
          </text>
        ))}
        {/* zero line if in range */}
        {minV < 0 && maxV > 0 && (
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#333333" strokeWidth={1} />
        )}
        {/* series lines */}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.points.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* x axis: first/last time labels */}
        <text x={PAD.left} y={H - 3} fontSize={8} fill="#666666" fontFamily="ui-monospace, monospace">
          {formatAxisTime(minT)}
        </text>
        <text x={width - PAD.right} y={H - 3} textAnchor="end" fontSize={8} fill="#666666" fontFamily="ui-monospace, monospace">
          {formatAxisTime(maxT)}
        </text>
        {/* hover crosshair */}
        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom} stroke="#444444" strokeWidth={1} strokeDasharray="2,2" />
        )}
      </svg>

      {nearest && (
        <div className="text-[9px] font-mono text-[#aaaaaa] mt-0.5 flex flex-wrap gap-x-3">
          {nearest.map((n) => (
            <span key={n.name} className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />
              {n.name}: <span className="text-white">{yFormat(n.point.v)}</span>
            </span>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1 text-[9px] text-[#888888]">
              <span className="inline-block w-2 h-[2px]" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      {yLabel && <div className="text-[8px] text-[#555555] mt-0.5">{yLabel}</div>}
    </div>
  )
}

function formatAxisTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
}

function EmptyState({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center text-[10px] text-[#555555]" style={{ height }}>
      데이터 없음
    </div>
  )
}
