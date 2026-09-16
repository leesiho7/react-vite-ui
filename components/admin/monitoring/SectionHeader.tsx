'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/** "▾ Overview" 같은 작은 접이식 섹션 라벨. 얇은 구분선이 아래 붙는다. */
export default function SectionHeader({
  label,
  children,
  defaultOpen = true
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5 hover:text-[#aaaaaa]"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {label}
      </button>
      <div className="h-px bg-[#1a1a1a] mb-2.5" />
      {open && children}
    </div>
  )
}
