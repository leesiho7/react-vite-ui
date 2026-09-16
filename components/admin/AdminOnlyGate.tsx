'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * 관리자 전용 페이지 게이트. `localStorage`의 `auth_session`(로그인 시 저장되는 AuthResponse)에서
 * `role === 'ROLE_ADMIN'`인지 확인한다 — 백엔드 `AuthService.socialLogin`이 leesiho58@gmail.com
 * 계정에 자동으로 `ROLE_ADMIN`을 부여하므로(신규 이메일 하드코딩 없이) 그 role 값만 신뢰하면 된다.
 *
 * <p>UI 단 가드일 뿐이다 — 실제 데이터를 보호하려면 백엔드 `/api/ml/veto-audit/*`,
 * `/api/ml/veto-backtest` 쪽에도 별도의 서버사이드 인가가 필요하다(지금은 없음).
 */
export default function AdminOnlyGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      const user = stored ? JSON.parse(stored) : null
      setStatus(user?.role === 'ROLE_ADMIN' ? 'allowed' : 'denied')
    } catch {
      setStatus('denied')
    }
  }, [])

  if (status === 'checking') {
    return (
      <main className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <p className="text-xs text-[#64748b]">확인 중…</p>
      </main>
    )
  }

  if (status === 'denied') {
    return (
      <main className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-sm font-bold text-[#f87171]">관리자 전용 페이지입니다.</p>
        <p className="text-xs text-[#64748b]">이 계정으로는 접근할 수 없습니다.</p>
        <Link href="/" className="text-xs text-[#f47a20] hover:underline mt-2">← AETHER TERMINAL로 돌아가기</Link>
      </main>
    )
  }

  return <>{children}</>
}
