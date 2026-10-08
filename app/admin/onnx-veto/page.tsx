'use client'

import AdminOnlyGate from '@/components/admin/AdminOnlyGate'
import CryptoTerminal from '@/components/terminal/CryptoTerminal'

/**
 * 관리자용 진입 경로(/admin/onnx-veto). 화면 본문은 공개용 CRYPTO TERMINAL 과 같은 컴포넌트를 쓴다 —
 * 메인 사이트 상단 메뉴의 "Crypto Terminal" 탭에서도 로그인 없이 볼 수 있다. 이 주소는 기존 북마크 호환을 위해 유지하며
 * 관리자 게이트와 한국어 표시를 그대로 둔다.
 */
export default function OnnxVetoDashboardPage() {
  return (
    <AdminOnlyGate>
      <main className="min-h-screen bg-[#0d0d0d]">
        <CryptoTerminal language="ko" backLink />
      </main>
    </AdminOnlyGate>
  )
}
