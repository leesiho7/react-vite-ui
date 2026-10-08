'use client'

import { SiteLang } from '@/lib/siteLang'

const OPTIONS: { value: SiteLang; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'cn', label: '中文' }
]

/** 로그인·프로필처럼 메인 페이지 밖의 화면에서 쓰는 작은 언어 전환 버튼. 스타일은 인라인이라 어느 화면에도 붙는다. */
export default function LangSwitch({ lang, onChange }: { lang: SiteLang; onChange: (l: SiteLang) => void }) {
  return (
    <div role="group" aria-label="Language" style={{ display: 'inline-flex', gap: '4px', fontSize: '11px' }}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={lang === o.value}
          style={{
            padding: '3px 9px',
            borderRadius: '999px',
            border: `1px solid ${lang === o.value ? '#f47a20' : '#d1d5db'}`,
            background: lang === o.value ? '#fff7ed' : '#ffffff',
            color: lang === o.value ? '#c2410c' : '#6b7280',
            fontWeight: lang === o.value ? 700 : 500,
            cursor: 'pointer'
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
