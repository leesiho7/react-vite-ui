'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { claimStreakReward } from '@/lib/api'

interface StreakClaimModalProps {
  open: boolean
  onClose: () => void
  userId: number | null
  /** 어느 게임의 10연승인지 — 보상 금액과 문구가 여기 따라 달라진다 (5분봉=$10, 1시간봉=$30). */
  gameType: 'DIRECTION_5M' | 'DIRECTION_1H'
  amount: number
  /** 클레임 성공 직후 호출 — 호출부(5분봉/1시간봉 등)가 자신의 연승 상태를 초기화한다. */
  onSuccess: () => void
}

const NETWORKS = [
  { key: 'polygon', label: 'POLYGON (수수료 10원)' },
  { key: 'bsc', label: 'BSC (바이낸스/바이비트)' },
  { key: 'tron', label: 'TRON (TRC20)' },
  { key: 'solana', label: 'SOLANA' }
]

/**
 * 10연승 보상 Claim 모달 — 원장+수동배치 모델(claim은 원장만 확정, 실제 송금은 관리자가
 * 지갑 앱에서 직접 보낸 뒤 처리)이라 성공 메시지도 "즉시 송금됨"이 아니라 "확정, 관리자가
 * 곧 송금"으로 안내한다. 5분봉($10)/1시간봉($30) 등 여러 게임 카드가 amount/gameType prop만
 * 다르게 넘겨 동일하게 재사용해서, 문구를 바꿀 때 한 곳만 고치면 되게 한다.
 */
export function StreakClaimModal({ open, onClose, userId, gameType, amount, onSuccess }: StreakClaimModalProps) {
  const [claimAddress, setClaimAddress] = useState('')
  const [claimNetwork, setClaimNetwork] = useState('polygon')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimSuccessData, setClaimSuccessData] = useState<any>(null)

  if (!open) return null

  const handleClaim = async () => {
    if (!userId) {
      alert('🔒 10연승 보상을 신청하려면 먼저 로그인해 주세요.')
      return
    }
    if (!claimAddress.trim()) {
      alert('출금받으실 지갑 주소를 입력해주세요.')
      return
    }
    setClaimLoading(true)
    try {
      const res = await claimStreakReward({
        userId,
        destinationAddress: claimAddress.trim(),
        network: claimNetwork,
        gameType
      })
      if (res && res.success) {
        setClaimSuccessData(res)
        onSuccess()
      } else {
        alert(res?.message || '출금 처리에 실패했습니다.')
      }
    } catch (err) {
      alert('출금 요청 중 오류가 발생했습니다.')
    } finally {
      setClaimLoading(false)
    }
  }

  const handleClose = () => {
    setClaimSuccessData(null)
    onClose()
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="panel" style={{ fontFamily: 'var(--font-sans)', width: '480px', maxWidth: '92vw', background: '#fff', padding: '24px', borderRadius: '4px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <strong style={{ fontSize: '15px' }}>🏆 10연승 챌린지 ${amount.toFixed(2)} USDT Claim</strong>
          <button type="button" className="text-button" onClick={handleClose}>닫기 ×</button>
        </div>

        {claimSuccessData ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={42} color="#2b866d" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{claimSuccessData.message}</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
              관리자가 확인 후 직접 지갑으로 송금해 드립니다. (보통 24시간 이내)
            </p>
            <div style={{ background: '#f5f7fa', padding: '12px', borderRadius: '4px', fontSize: '11px', textAlign: 'left', wordBreak: 'break-all' }}>
              <div><b>수신 지갑:</b> {claimSuccessData.destinationAddress}</div>
              <div><b>네트워크:</b> {claimSuccessData.network?.toUpperCase()}</div>
            </div>
            <button type="button" className="primary-button" style={{ width: '100%', marginTop: '16px' }} onClick={handleClose}>
              확인 완료
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
              10연승 미션 달성을 축하합니다! ${amount.toFixed(2)} USDT를 수신할 지갑 주소를 입력해 주세요. (가스비 상점 전액 지원)
            </p>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '10px 12px', marginBottom: '14px', fontSize: '10.5px', color: '#0369a1', lineHeight: 1.5 }}>
              💡 <b>메타마스크가 없으셔도 괜찮습니다!</b><br />
              <b>바이비트(Bybit)</b>, <b>바이낸스(Binance)</b>, <b>OKX / Bitget</b> 앱에서 복사한 <code>USDT 입금 주소 (Polygon / BSC / TRC20)</code>를 붙여넣으시면 됩니다. 확인 후 관리자가 직접 해당 주소로 송금해 드려요 (보통 24시간 이내).
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>출금 네트워크 선택</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {NETWORKS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      fontSize: '10px',
                      fontWeight: claimNetwork === item.key ? 700 : 500,
                      border: claimNetwork === item.key ? '2px solid #18334a' : '1px solid #ddd',
                      background: claimNetwork === item.key ? '#18334a' : '#f9f9f9',
                      color: claimNetwork === item.key ? '#fff' : '#333',
                      borderRadius: '3px'
                    }}
                    onClick={() => setClaimNetwork(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>수신 지갑 / 거래소 USDT 입금 주소</label>
              <input
                style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                placeholder="0x... (메타마스크 또는 바이비트/바이낸스 USDT 입금 주소)"
                value={claimAddress}
                onChange={(e) => setClaimAddress(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: 700, borderRadius: '4px' }}
              disabled={claimLoading}
              onClick={handleClaim}
            >
              {claimLoading ? '보상 확정 처리 중…' : `$${amount.toFixed(2)} USDT 보상 확정하기 ↗`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default StreakClaimModal
