'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type TerminalLang = 'ko' | 'en' | 'cn'

/**
 * 터미널 계열 화면(Pairs/Arbitrage/Kimchi/TrenchGuard)과 거기서 쓰는 공용 차트 컴포넌트의 문구 언어.
 * 기본값은 'ko' — Provider 밖(예: 관리자 페이지)에서는 기존 한글 그대로 나온다.
 * 중국어(cn)는 이 화면들에 번역이 없어 영어로 보여준다.
 */
const LangContext = createContext<TerminalLang>('ko')

export function TerminalLangProvider({ language, children }: { language: TerminalLang; children: ReactNode }) {
  return <LangContext.Provider value={language}>{children}</LangContext.Provider>
}

export function useTerminalLang(): TerminalLang {
  return useContext(LangContext)
}

/** t('한글', 'English') — 한국어면 앞, 그 외에는 뒤 */
export function useT(): (ko: string, en: string) => string {
  const lang = useContext(LangContext)
  return (ko, en) => (lang === 'ko' ? ko : en)
}
