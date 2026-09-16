'use client'

import { CheckCircle2, RefreshCw } from 'lucide-react'

export interface ThinkingStep {
  thought: string
  progress: number
}

/**
 * AI 리서치가 응답을 스트리밍하기 전, 백엔드 SSE `onProgress` 이벤트(단계별 실제 사고 과정
 * 문구)를 받은 순서대로 누적해서 보여주는 트레이스. 예전에는 마지막 문구 하나만 스피너와 함께
 * 덮어썼는데(칸 안에 텍스트 하나 + 화살표만 뱅글뱅글), 그러면 이미 지나간 단계들이 다 사라져서
 * 실제로 여러 단계를 거치고 있다는 게 안 보였다.
 *
 * 지금은 받은 순서대로 쌓아서 지나간 단계는 체크 표시 + 흐린 색으로, 가장 최근(진행 중) 단계만
 * 밝은 색 + 스피너로 보여준다 — 실제 백엔드가 보낸 진짜 진행 이벤트를 그대로 반영하는 것이지
 * 가짜로 지어낸 애니메이션이 아니다.
 */
export default function ResearchThinkingTrace({
  steps,
  fallbackLabel
}: {
  steps: ThinkingStep[]
  fallbackLabel: string
}) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-3 text-[13px] text-[#f47a20] font-semibold">
        <ThinkingOrb />
        <span className="animate-pulse">{fallbackLabel}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, idx) => {
        const isCurrent = idx === steps.length - 1
        return (
          <div
            key={idx}
            className={`flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 ${
              isCurrent ? 'text-[13px] text-[#f47a20] font-semibold' : 'text-[11px] text-[#94a3b8] font-medium opacity-70'
            }`}
          >
            {isCurrent ? (
              <ThinkingOrb />
            ) : (
              <CheckCircle2 size={12} className="text-[#94a3b8] flex-shrink-0" />
            )}
            <span className={isCurrent ? 'animate-pulse' : ''}>{step.thought}</span>
            {step.progress > 0 && (
              <span className="text-[9px] font-mono text-[#64748b] flex-shrink-0">{step.progress}%</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** 진행 중인 단계 앞에 붙는 작은 "구슬" — 뒤에 흐릿하게 번지는 글로우를 깔고 그 위에
 *  스피너를 얹어서 그냥 화살표가 뱅글뱅글 도는 것보다 살아있는 느낌을 준다. */
function ThinkingOrb() {
  return (
    <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
      <span className="absolute inset-0 rounded-full bg-[#f47a20] blur-[6px] opacity-50 animate-pulse" />
      <RefreshCw size={14} className="relative animate-spin text-[#f47a20]" />
    </span>
  )
}
