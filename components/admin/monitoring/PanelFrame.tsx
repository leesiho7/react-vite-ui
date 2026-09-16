'use client'

/** Grafana 스타일 패널 공용 틀 — 얇은 1px 테두리, 좌상단 작은 제목, 그림자/둥근 모서리 없음.
 *  모든 모니터링 패널이 이걸로 감싼다. */
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
      <div className="flex items-baseline justify-between px-2.5 pt-2 pb-1.5 flex-shrink-0">
        <span className="text-[10px] font-semibold text-[#aaaaaa] tracking-wide truncate">{title}</span>
        {subtitle && <span className="text-[9px] text-[#666666] flex-shrink-0 ml-2">{subtitle}</span>}
      </div>
      <div className="flex-1 min-h-0 px-2.5 pb-2.5">{children}</div>
    </div>
  )
}
