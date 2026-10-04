'use client'

import { useMemo, useRef, useState } from 'react'
import { useContainerWidth } from './useContainerWidth'

export interface LineSeries {
  name: string
  color: string
  points: { t: number; v: number }[] // t = epoch ms
}

const H = 130
const PAD = { top: 6, right: 6, bottom: 16, left: 34 }
const MIN_AUTO_WIDTH = 220

/** 얇은 라인(1.5px), 아래 범례(색+이름), 거의 안 보이는 그리드라인, x축 시각 라벨.
 *  2개 이상 시리즈는 범례가 항상 있고(색만으로 구분하지 않는다), 단일 시리즈는 제목이
 *  이름을 대신하므로 범례를 생략한다.
 *
 *  autoWidth: 컨테이너 폭에 맞춰 그린다(기본은 예전처럼 고정 width). 모바일에서는 손가락으로
 *  차트를 누르거나 끌면 마우스 호버와 같은 값 표시가 뜬다. */
export default function LineChartPanel({
  series,
  width = 340,
  yFormat = (v: number) => v.toFixed(1),
  yLabel,
  autoWidth = false
}: {
  series: LineSeries[]
  width?: number
  yFormat?: (v: number) => string
  yLabel?: string
  autoWidth?: boolean
}) {
  // 훅은 데이터 유무와 상관없이 항상 같은 순서로 호출한다 (비었다가 채워질 때 React 훅 개수가 달라지면 화면이 깨진다).
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const { ref: wrapRef, width: measured } = useContainerWidth(autoWidth)

  const W = autoWidth && measured ? Math.max(MIN_AUTO_WIDTH, measured) : width
  const fontSize = autoWidth ? 9 : 8

  const allPoints = series.flatMap((s) => s.points)
  const empty = allPoints.length === 0

  let minT = 0
  let maxT = 1
  let minV = 0
  let maxV = 1
  if (!empty) {
    minT = Math.min(...allPoints.map((p) => p.t))
    maxT = Math.max(...allPoints.map((p) => p.t))
    minV = Math.min(0, ...allPoints.map((p) => p.v))
    maxV = Math.max(...allPoints.map((p) => p.v))
  }
  const vSpan = maxV - minV || 1
  const tSpan = maxT - minT || 1

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x = (t: number) => PAD.left + ((t - minT) / tSpan) * innerW
  const y = (v: number) => PAD.top + innerH - ((v - minV) / vSpan) * innerH

  const gridLines = useMemo(() => {
    const n = 3
    return Array.from({ length: n + 1 }, (_, i) => minV + (vSpan * i) / n)
  }, [minV, vSpan])

  const nearest = useMemo(() => {
    if (hoverX === null || empty) return null
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
  }, [hoverX, series, minT, tSpan, innerW, empty])

  const setFromClientX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    setHoverX(((clientX - rect.left) / rect.width) * W)
  }

  if (empty) {
    return (
      <div ref={wrapRef}>
        <EmptyState height={H} />
      </div>
    )
  }

  return (
    <div ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        onMouseMove={(e) => setFromClientX(e.clientX)}
        onMouseLeave={() => setHoverX(null)}
        onTouchStart={(e) => setFromClientX(e.touches[0].clientX)}
        onTouchMove={(e) => setFromClientX(e.touches[0].clientX)}
        className="overflow-visible"
        style={{ touchAction: 'pan-y' }}
      >
        {/* gridlines */}
        {gridLines.map((v, i) => (
          <line key={i} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#1a1a1a" strokeWidth={1} />
        ))}
        {/* y axis labels */}
        {gridLines.map((v, i) => (
          <text key={i} x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize={fontSize} fill="#666666" fontFamily="ui-monospace, monospace">
            {yFormat(v)}
          </text>
        ))}
        {/* zero line if in range */}
        {minV < 0 && maxV > 0 && (
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="#333333" strokeWidth={1} />
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
        <text x={PAD.left} y={H - 3} fontSize={fontSize} fill="#666666" fontFamily="ui-monospace, monospace">
          {formatAxisTime(minT)}
        </text>
        <text x={W - PAD.right} y={H - 3} textAnchor="end" fontSize={fontSize} fill="#666666" fontFamily="ui-monospace, monospace">
          {formatAxisTime(maxT)}
        </text>
        {/* hover crosshair */}
        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom} stroke="#444444" strokeWidth={1} strokeDasharray="2,2" />
        )}
      </svg>

      {nearest && (
        <div className="text-[9px] font-mono text-[#aaaaaa] mt-0.5 flex flex-wrap gap-x-3">
          <span className="text-[#666666]">{formatTooltipTime(nearest[0].point.t)}</span>
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

function formatTooltipTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}

function EmptyState({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center text-[10px] text-[#555555]" style={{ height }}>
      데이터 없음
    </div>
  )
}
