'use client'

import { ExternalLink } from 'lucide-react'

export interface NewsSource {
  title: string
  url: string
}

/**
 * 검색 중 단계에서 실제로 찾은 기사 링크를 보여준다. `AiResearchChatService`가 SSE `sources`
 * 이벤트로 보낸, 이번 요청에서 실측으로 수집된 기사(제목+URL)만 그린다 — 지어낸 링크나
 * 이전 요청에서 남은 캐시가 아니라, 지금 이 리서치가 실제로 참고 중인 근거다.
 */
export default function ResearchSourceChips({ sources }: { sources: NewsSource[] }) {
  if (sources.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((s, idx) => (
        <a
          key={idx}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 max-w-[220px] px-2 py-1 rounded-full border border-[#e4e6ed] bg-white text-[10px] text-[#475569] hover:border-[#f47a20] hover:text-[#f47a20] transition-colors animate-in fade-in zoom-in-95 duration-300"
          style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
          title={s.title}
        >
          <ExternalLink size={10} className="flex-shrink-0" />
          <span className="truncate">{s.title}</span>
        </a>
      ))}
    </div>
  )
}
