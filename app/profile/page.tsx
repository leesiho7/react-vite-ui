'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthResponse } from '../../lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null)
  const [wallet, setWallet] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      if (stored) {
        const user: AuthResponse = JSON.parse(stored)
        setCurrentUser(user)
        if (user.walletAddress) setWallet(user.walletAddress)
      }
    } catch (e) {}
  }, [])

  const handleSaveWallet = () => {
    if (!wallet.trim() || !currentUser) return
    const updated = { ...currentUser, walletAddress: wallet.trim() }
    localStorage.setItem('auth_session', JSON.stringify(updated))
    setCurrentUser(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_session')
    router.push('/login')
  }

  return (
    <main className="auth-shell">
      <div className="profile-shell">
        <header className="profile-header">
          <Link href="/" className="auth-back">← AETHER TERMINAL</Link>
          <div className="profile-identity">
            <span className="member-avatar">♙</span>
            <div>
              <span className="overline">MEMBER PROFILE</span>
              <strong>{currentUser ? currentUser.nickname || currentUser.username : 'GUEST ACCESS'}</strong>
            </div>
          </div>
          <span className="status-tag">
            {currentUser ? 'SESSION ACTIVE' : 'UNAUTHENTICATED'}
          </span>
        </header>

        <section className="profile-content">
          <div>
            <span className="eyebrow"><span className="diamond">◆</span> USER ACCOUNT INFORMATION</span>
            <h1>Member<br /><em style={{ color: '#f47a20', fontStyle: 'normal' }}>Profile & Settings.</em></h1>
            <p>회원 계정 정보 및 10-Win League 에스크로 출금용 TRC-20 지갑 주소를 관리합니다.</p>
          </div>

          <div className="profile-form">
            {currentUser ? (
              <div style={{ background: '#f8fafb', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '6px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', fontSize: '11.5px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>계정 ID</span>
                    <strong style={{ color: '#18334a', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.username}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>활동 닉네임</span>
                    <strong style={{ color: '#f47a20', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.nickname || '-'}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>회원 권한</span>
                    <strong style={{ color: '#0f766e', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.role || 'ROLE_USER'}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>평판 점수</span>
                    <strong style={{ color: '#b45309', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.reputationScore || 100} PTS</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '4px', marginBottom: '18px', color: '#b45309', fontSize: '11.5px' }}>
                로그인되어 있지 않습니다. <Link href="/login" style={{ color: '#f47a20', fontWeight: 700, textDecoration: 'underline' }}>로그인</Link> 또는 <Link href="/signup" style={{ color: '#f47a20', fontWeight: 700, textDecoration: 'underline' }}>회원가입</Link>을 진행해 주세요.
              </div>
            )}

            <label>
              REWARD DESTINATION WALLET ADDRESS (TRC-20 USDT 수령 지갑 주소)
              <input
                value={wallet}
                onChange={(event) => { setWallet(event.target.value); setSaved(false) }}
                placeholder="본인의 TRC-20 (Tron 네트워크) USDT 지갑 주소를 입력하세요 (T...)"
                aria-label="TRC-20 Wallet address"
              />
            </label>

            <div className="profile-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className="primary-button"
                disabled={!wallet.trim() || !currentUser}
                onClick={handleSaveWallet}
                style={{ background: '#f47a20', color: '#ffffff' }}
              >
                {saved ? 'ADDRESS SAVED ✓' : 'SAVE TRC-20 WALLET'} <span>↗</span>
              </button>
              {currentUser && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleLogout}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  LOGOUT (로그아웃)
                </button>
              )}
            </div>

            <p className="privacy-note" style={{ marginTop: '16px' }}>
              본 서비스는 개인정보 최소수집 원칙을 준수하며, 비밀번호나 민감정보를 절대 외부에 노출하지 않습니다.
            </p>
            <p className="profile-warning">
              본인의 TRC-20 (Tron 네트워크) 지갑 주소가 맞는지 오타를 반드시 확인해 주세요. 블록체인 전송은 취소할 수 없습니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
