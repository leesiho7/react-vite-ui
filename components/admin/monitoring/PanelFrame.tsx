'use client'

/** Grafana 스타일 패널 공용 틀 — 얇은 1px 테두리, 좌상단 작은 제목, 그림자/둥근 모서리 없음.
 *  모든 모니터링 패널이 이걸로 감싼다.
 *  좁은 화면(모바일)에서는 제목 아래에 부제를 쌓아서 제목이 잘리지 않게 하고,
 *  sm 이상에서는 예전처럼 한 줄(제목 왼쪽, 부제 오른쪽)로 보인다. */
export default function PanelFrame({
  title,
  subtitle,
  children,
  className = ''
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`border border-[#222222] bg-[#0d0d0d] rounded-[2px] flex flex-col min-w-0 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between px-2.5 pt-2 pb-1.5 flex-shrink-0 gap-0.5">
        <span className="text-[10px] font-semibold text-[#aaaaaa] tracking-wide sm:truncate">{title}</span>
        {subtitle && <span className="text-[9px] text-[#666666] sm:flex-shrink-0 sm:ml-2">{subtitle}</span>}
      </div>
      <div className="flex-1 min-h-0 px-2.5 pb-2.5">{children}</div>
    </div>
  )
}
