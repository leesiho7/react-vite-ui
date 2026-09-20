'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import {
  fetchEscrowPoolStatus,
  updateAdminEscrowConfig,
  sweepAdminEscrowFunds,
  fetchAdminEscrowAuditLogs,
  fetchPendingPayouts,
  completePendingPayout,
  EscrowPoolStatus,
  AdminEscrowAuditLog,
  PendingPayout
} from '@/lib/api'

type Tab = 'DEPOSIT' | 'SWEEP' | 'PENDING' | 'AUDIT'

interface EscrowConsoleModalProps {
  open: boolean
  onClose: () => void
  escrowPool: EscrowPoolStatus | null
  onEscrowPoolChange: (pool: EscrowPoolStatus) => void
  defaultSweepAddress?: string
  adminUserId?: number
}

/**
 * 10연승 리그 에스크로 풀 관리 및 자금 회수 콘솔 (관리자 전용).
 * 원장+수동배치 모델로 전환된 이후 열리는 즉시 자체적으로 풀 상태/감사 원장/수동 송금
 * 대기 목록을 가져와 채운다 — 호출부(page.tsx)는 열림 상태만 제어하면 된다.
 */
export function EscrowConsoleModal({
  open,
  onClose,
  escrowPool,
  onEscrowPoolChange,
  defaultSweepAddress,
  adminUserId
}: EscrowConsoleModalProps) {
  const [tab, setTab] = useState<Tab>('DEPOSIT')
  const [configCapacity, setConfigCapacity] = useState('100.0')
  const [configStatus, setConfigStatus] = useState('ACTIVE')
  const [sweepAddress, setSweepAddress] = useState('')
  const [sweepAmount, setSweepAmount] = useState('')
  const [sweepNetwork, setSweepNetwork] = useState('polygon')
  const [actionLoading, setActionLoading] = useState(false)
  const [sweepResult, setSweepResult] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<AdminEscrowAuditLog[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([])
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [completingTxHash, setCompletingTxHash] = useState('')

  useEffect(() => {
    if (!open) return
    setSweepResult(null)
    setCompletingId(null)
    setCompletingTxHash('')
    setSweepAddress((prev) => prev || defaultSweepAddress || '')
    fetchEscrowPoolStatus().then((pool) => {
      if (!pool) return
      onEscrowPoolChange(pool)
      setConfigCapacity(String(pool.initialCapacity))
      setConfigStatus(pool.status || 'ACTIVE')
      if (pool.currentBalance > 0) setSweepAmount(String(pool.currentBalance))
    })
    fetchAdminEscrowAuditLogs().then(setAuditLogs)
    fetchPendingPayouts().then(setPendingPayouts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleUpdateConfig = async () => {
    const cap = parseFloat(configCapacity)
    if (isNaN(cap) || cap < 0) {
      alert('올바른 예치금 용량을 입력해주세요 (0 이상).')
      return
    }
    setActionLoading(true)
    try {
      const updated = await updateAdminEscrowConfig({ initialCapacity: cap, status: configStatus })
      if (updated) {
        onEscrowPoolChange(updated)
        alert(`에스크로 풀 예치금이 ${cap.toFixed(2)} USDT (${configStatus})로 즉시 적용되었습니다.`)
        fetchAdminEscrowAuditLogs().then(setAuditLogs)
      } else {
        alert('설정 적용에 실패했습니다.')
      }
    } catch (e) {
      alert('설정 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExecuteSweep = async () => {
    if (!sweepAddress.trim()) {
      alert('회수받으실 대표님 지갑 주소를 입력해주세요.')
      return
    }
    const curBal = escrowPool?.currentBalance ?? 0
    if (curBal <= 0) {
      alert('회수 가능한 에스크로 잔액이 0.00 USDT입니다.')
      return
    }
    const reqAmount = sweepAmount.trim() ? parseFloat(sweepAmount) : curBal
    if (isNaN(reqAmount) || reqAmount <= 0) {
      alert('올바른 회수 금액을 입력해주세요.')
      return
    }
    if (reqAmount > curBal) {
      alert(`회수 가능 잔액(${curBal.toFixed(2)} USDT)보다 큰 금액은 회수할 수 없습니다.`)
      return
    }
    if (!confirm(`[관리자 회수 확인]\n\n에스크로 풀에서 ${reqAmount.toFixed(2)} USDT를 회수하여\n대표님 지갑(${sweepAddress})으로 즉시 송금하시겠습니까?`)) {
      return
    }

    setActionLoading(true)
    try {
      const res = await sweepAdminEscrowFunds({
        destinationAddress: sweepAddress.trim(),
        amount: reqAmount,
        network: sweepNetwork,
        adminUserId: adminUserId ?? 1
      })
      if (res && res.success) {
        setSweepResult(res)
        const updated = await fetchEscrowPoolStatus()
        if (updated) onEscrowPoolChange(updated)
        fetchAdminEscrowAuditLogs().then(setAuditLogs)
      } else {
        alert(res?.message || '회수 처리에 실패했습니다.')
      }
    } catch (e) {
      alert('회수 요청 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmComplete = async (withdrawalId: number) => {
    if (!completingTxHash.trim()) return
    const result = await completePendingPayout(withdrawalId, completingTxHash.trim())
    if (result) {
      setCompletingId(null)
      setCompletingTxHash('')
      fetchPendingPayouts().then(setPendingPayouts)
    } else {
      alert('완료 처리에 실패했습니다.')
    }
  }

  const tabDefs: { key: Tab; label: string; activeColor: string; activeBg: string }[] = [
    { key: 'DEPOSIT', label: '1. 풀 설정 & 예치', activeColor: '#0f766e', activeBg: '#f0fdfa' },
    { key: 'SWEEP', label: '2. 긴급 자금 회수', activeColor: '#dc2626', activeBg: '#fef2f2' },
    { key: 'PENDING', label: '3. 수동 송금 대기', activeColor: '#b45309', activeBg: '#fffbeb' },
    { key: 'AUDIT', label: '4. 감사 원장', activeColor: '#0284c7', activeBg: '#f0f9ff' }
  ]

  return (
    <div
      className="modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(11, 19, 30, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: '640px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf0f2', paddingBottom: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '15px', color: '#0f172a' }}>에스크로 풀 관리 및 자금 회수 콘솔</strong>
            <span style={{ fontSize: '9px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
              SUPER ADMIN: leesiho58@gmail.com
            </span>
          </div>
          <button className="text-button" onClick={onClose}>닫기 ×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          {tabDefs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 10px',
                border: '1px solid',
                borderColor: tab === t.key ? t.activeColor : '#e2e8f0',
                background: tab === t.key ? t.activeBg : '#f8fafc',
                color: tab === t.key ? t.activeColor : '#64748b',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DEPOSIT & CAPACITY CONFIG */}
        {tab === 'DEPOSIT' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafb', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>실시간 에스크로 잔액</span>
                <strong style={{ fontSize: '18px', color: '#0f766e', fontFamily: 'var(--font-mono)' }}>
                  {(escrowPool?.currentBalance ?? 0.0).toFixed(2)} <small style={{ fontSize: '10px', color: '#64748b' }}>USDT</small>
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>지급된 보상 누적</span>
                <strong style={{ fontSize: '18px', color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                  {(escrowPool?.claimedAmount ?? 0.0).toFixed(2)} <small style={{ fontSize: '10px', color: '#64748b' }}>USDT</small>
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>풀 상태 / 당첨자</span>
                <strong style={{ fontSize: '13px', color: '#0284c7' }}>
                  {escrowPool?.status || 'STANDBY'} ({escrowPool?.totalWinners || 0}명 수령)
                </strong>
              </div>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 700 }}>전용 온체인 에스크로 예치 지갑 주소 (Polygon / USDT)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(escrowPool?.escrowAddress || '0xb0390a087488E304cA32996532Ab9f40028511fE')
                    alert('에스크로 지갑 주소가 클립보드에 복사되었습니다.')
                  }}
                  style={{ fontSize: '9px', background: '#0284c7', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}
                >
                  주소 복사
                </button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#0c4a6e', wordBreak: 'break-all', background: '#fff', padding: '6px 8px', borderRadius: '3px', border: '1px solid #e0f2fe' }}>
                {escrowPool?.escrowAddress || '0xb0390a087488E304cA32996532Ab9f40028511fE'}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '9.5px', color: '#0369a1', lineHeight: 1.4 }}>
                ※ 대표님께서 메타마스크 또는 바이비트/바이낸스/OKX에서 이 주소로 USDT를 입금하신 후, 아래의 <b>예치금 설정</b>에 입금액을 입력하시면 화면에 실시간으로 즉시 반영됩니다.
              </p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                이벤트 에스크로 풀 용량 설정 (USDT)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="number"
                  value={configCapacity}
                  onChange={(e) => setConfigCapacity(e.target.value)}
                  placeholder="예: 100.0"
                  style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
                {['0', '50', '100', '200'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setConfigCapacity(v)}
                    style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {v === '0' ? '0 (대기)' : `${v} USDT`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                풀 운영 상태 (Status)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['ACTIVE', 'STANDBY', 'PAUSED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setConfigStatus(st)}
                    style={{
                      padding: '7px 10px',
                      border: '1px solid',
                      borderColor: configStatus === st ? '#0f766e' : '#cbd5e1',
                      background: configStatus === st ? '#0f766e' : '#ffffff',
                      color: configStatus === st ? '#ffffff' : '#475569',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {st === 'ACTIVE' ? '정상 운영 (ACTIVE)' : st === 'STANDBY' ? '입금 대기 (STANDBY)' : '일시 정지 (PAUSED)'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', background: '#0f766e', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', height: '42px' }}
              onClick={handleUpdateConfig}
              disabled={actionLoading}
            >
              {actionLoading ? '설정 적용 중...' : '에스크로 풀 설정 즉시 적용하기'}
            </button>
          </div>
        )}

        {/* TAB 2: EMERGENCY SWEEP / REFUND */}
        {tab === 'SWEEP' && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '11px', color: '#991b1b', display: 'block', marginBottom: '4px' }}>
                [긴급 자금 회수] 대표님 개인 지갑으로 전액/일부 환불
              </strong>
              <p style={{ margin: 0, fontSize: '10px', color: '#7f1d1d', lineHeight: 1.5 }}>
                에스크로 풀에 남아있는 USDT를 대표님의 콜드 월렛이나 거래소 지갑으로 즉시 안전하게 회수합니다.
                회수된 금액만큼 화면의 에스크로 풀 용량이 자동으로 차감됩니다.
              </p>
            </div>

            {sweepResult && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065f46', fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>
                  <CheckCircle2 size={16} /> {sweepResult.message}
                </div>
                <div style={{ fontSize: '10.5px', color: '#047857', lineHeight: 1.5 }}>
                  <div><b>회수 금액:</b> {sweepResult.sweptAmount?.toFixed(2)} USDT</div>
                  <div><b>남은 풀 잔액:</b> {sweepResult.remainingBalance?.toFixed(2)} USDT</div>
                  <div style={{ wordBreak: 'break-all' }}><b>트랜잭션 해시:</b> {sweepResult.txHash}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                회수받으실 대표님 지갑 주소 (Destination Address)
              </label>
              <input
                type="text"
                value={sweepAddress}
                onChange={(e) => setSweepAddress(e.target.value)}
                placeholder="0x... (메타마스크 또는 바이비트/바이낸스/OKX USDT 입금 주소)"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  회수 금액 (USDT)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    value={sweepAmount}
                    onChange={(e) => setSweepAmount(e.target.value)}
                    placeholder={`최대 ${(escrowPool?.currentBalance ?? 0.0).toFixed(2)}`}
                    style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSweepAmount(String(escrowPool?.currentBalance ?? 0))}
                    style={{ padding: '0 10px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    전액 (Max)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  출금 네트워크
                </label>
                <select
                  value={sweepNetwork}
                  onChange={(e) => setSweepNetwork(e.target.value)}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 8px', fontSize: '11px' }}
                >
                  <option value="polygon">Polygon (ERC20)</option>
                  <option value="tron">TRON (TRC20)</option>
                  <option value="bsc">BSC (BEP20)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: '12px', fontWeight: 700, borderRadius: '4px', height: '44px', marginTop: '10px' }}
              onClick={handleExecuteSweep}
              disabled={actionLoading || (escrowPool?.currentBalance ?? 0) <= 0}
            >
              {actionLoading ? '블록체인 회수 전송 중...' : `에스크로 잔액 대표님 지갑으로 즉시 회수하기 (${(escrowPool?.currentBalance ?? 0.0).toFixed(2)} USDT Max)`}
            </button>
          </div>
        )}

        {/* TAB 3: MANUAL PAYOUT QUEUE */}
        {tab === 'PENDING' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                수동 송금 대기 목록 — 지갑 앱에서 직접 보낸 뒤 완료 처리하세요
              </span>
              <button
                type="button"
                onClick={() => fetchPendingPayouts().then(setPendingPayouts)}
                style={{ fontSize: '9px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}
              >
                새로고침
              </button>
            </div>

            {pendingPayouts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                수동 송금 대기 중인 건이 없습니다.
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                {pendingPayouts.map((p) => (
                  <div key={p.withdrawalId} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '11px' }}>
                          {p.nickname} <span style={{ color: '#b45309' }}>${p.amount.toFixed(2)} USDT</span>
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                          {p.destinationAddress} ({p.network})
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>
                          확정: {new Date(p.requestedAt).toLocaleString()}
                        </div>
                      </div>
                      {completingId !== p.withdrawalId && (
                        <button
                          type="button"
                          onClick={() => { setCompletingId(p.withdrawalId); setCompletingTxHash('') }}
                          style={{ flexShrink: 0, fontSize: '9px', background: '#0f766e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          송금 완료 처리
                        </button>
                      )}
                    </div>

                    {completingId === p.withdrawalId && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <input
                          type="text"
                          autoFocus
                          value={completingTxHash}
                          onChange={(e) => setCompletingTxHash(e.target.value)}
                          placeholder="지갑 앱에서 보낸 뒤 나온 실제 트랜잭션 해시를 입력하세요"
                          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmComplete(p.withdrawalId)}
                          disabled={!completingTxHash.trim()}
                          style={{ fontSize: '9px', background: '#0f766e', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700, opacity: completingTxHash.trim() ? 1 : 0.5 }}
                        >
                          확인
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletingId(null)}
                          style={{ fontSize: '9px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0 12px', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {tab === 'AUDIT' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>에스크로 자금 변동 및 지급 감사 원장 (Audit Log)</span>
              <button
                type="button"
                onClick={() => fetchAdminEscrowAuditLogs().then(setAuditLogs)}
                style={{ fontSize: '9px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}
              >
                새로고침
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                아직 기록된 감사 원장 내역이 없습니다. (이벤트 오픈 후 자동 기록됩니다)
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '6px 8px' }}>구분</th>
                      <th style={{ padding: '6px 8px' }}>내용 / 주소</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>금액</th>
                      <th style={{ padding: '6px 8px' }}>TxHash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            fontSize: '8px',
                            padding: '1px 5px',
                            borderRadius: '2px',
                            fontWeight: 700,
                            background: item.type === 'ADMIN_SWEEP' ? '#fef2f2' : item.type === 'USER_CLAIM' ? '#ecfdf5' : '#f0f9ff',
                            color: item.type === 'ADMIN_SWEEP' ? '#dc2626' : item.type === 'USER_CLAIM' ? '#059669' : '#0284c7'
                          }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                          <div style={{ fontSize: '8.5px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{item.destinationAddress}</div>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: item.type === 'ADMIN_SWEEP' ? '#dc2626' : '#059669' }}>
                          {item.type === 'ADMIN_SWEEP' ? `-${item.amount?.toFixed(2)}` : `+${item.amount?.toFixed(2)}`} USDT
                        </td>
                        <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '8.5px', color: '#64748b' }}>
                          {item.txHash?.substring(0, 10)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EscrowConsoleModal
