'use client'

import Link from 'next/link'
import AdminOnlyGate from '@/components/admin/AdminOnlyGate'
import OnnxModelHealthCard from '@/components/admin/OnnxModelHealthCard'
import VetoAccuracyPanel from '@/components/admin/VetoAccuracyPanel'
import OnnxVetoBacktestPanel from '@/components/admin/OnnxVetoBacktestPanel'

/**
 * ONNX 거부권(DOWN_RISK/UP_RISK) 검증 대시보드.
 *
 * 매번 개발자에게 "거부권이 실제로 도움이 되고 있냐"고 물어보지 않아도, 이 페이지 하나로
 * 1) 모델이 정상 로딩됐는지, 2) 실전에서 거부권이 실제로 손실을 막아줬는지(ShadowVetoAuditService),
 * 3) 특정 전략에 거부권을 걸면 비용 포함 백테스트 상 MDD/수익률이 어떻게 바뀌는지(OnnxVetoBacktestService)
 * 를 바로 확인할 수 있다.
 */
export default function OnnxVetoDashboardPage() {
  return (
    <AdminOnlyGate>
      <main className="min-h-screen bg-[#05070a] px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/" className="text-[10px] text-[#64748b] hover:text-[#f47a20]">← AETHER TERMINAL</Link>
              <h1 className="text-xl font-bold text-[#e6edf3] mt-1">ONNX 거부권 검증 대시보드</h1>
              <p className="text-xs text-[#64748b] mt-1">
                DOWN_RISK(BUY 거부권) / UP_RISK(SELL 거부권) 모델 상태와 실전·백테스트 성과를 한눈에 확인합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <OnnxModelHealthCard />
            <VetoAccuracyPanel />
            <OnnxVetoBacktestPanel />
          </div>
        </div>
      </main>
    </AdminOnlyGate>
  )
}
