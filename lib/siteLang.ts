'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * 사이트 언어(한/영/중) 선택을 브라우저에 저장해서, 메인 페이지와 별도 주소의 화면(로그인·프로필 등)이 같은 언어를 따르게 한다.
 * 저장된 값이 없으면 영어(사이트 기본값). localStorage 를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 오류 없이 영어로 동작한다.
 */
export type SiteLang = 'ko' | 'en' | 'cn'

const KEY = 'aether_lang'
const CHANGE_EVENT = 'aether:lang-change'

export function readSiteLang(): SiteLang {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
    return v === 'ko' || v === 'en' || v === 'cn' ? v : 'en'
  } catch {
    return 'en'
  }
}

export function writeSiteLang(lang: SiteLang): void {
  try {
    window.localStorage.setItem(KEY, lang)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // 저장할 수 없어도 현재 화면의 언어 전환은 동작한다
  }
}

/** 현재 사이트 언어와 변경 함수. 서버 렌더링과 어긋나지 않게 첫 렌더는 'en' 이고, 마운트 직후 저장된 값으로 바뀐다. */
export function useSiteLang(): [SiteLang, (l: SiteLang) => void] {
  const [lang, setLang] = useState<SiteLang>('en')
  useEffect(() => {
    const sync = () => setLang(readSiteLang())
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const change = useCallback((l: SiteLang) => {
    setLang(l)
    writeSiteLang(l)
  }, [])
  return [lang, change]
}
