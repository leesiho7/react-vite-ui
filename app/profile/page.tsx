'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthResponse } from '../../lib/types'
import { updateNicknameApi } from '../../lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null)
  const [wallet, setWallet] = useState('')
  const [saved, setSaved] = useState(false)

  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSaved, setNicknameSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      if (stored) {
        const user: AuthResponse = JSON.parse(stored)
        setCurrentUser(user)
        if (user.walletAddress) setWallet(user.walletAddress)
        setNicknameInput(user.nickname || '')
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

  // 활동 닉네임 변경 — 서버가 유니크 제약(다른 유저와 중복 불가)을 최종 판정하므로
  // 로컬에서 바로 반영하지 않고 응답을 받은 뒤에만 화면/세션을 갱신한다.
  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed || !currentUser?.userId) return
    if (trimmed === currentUser.nickname) return

    setNicknameSaving(true)
    setNicknameError('')
    setNicknameSaved(false)
    try {
      const res = await updateNicknameApi(currentUser.userId, trimmed)
      if (res.success) {
        const updated = { ...currentUser, nickname: res.nickname || trimmed }
        localStorage.setItem('auth_session', JSON.stringify(updated))
        setCurrentUser(updated)
        setNicknameInput(updated.nickname || trimmed)
        setNicknameSaved(true)
        setTimeout(() => setNicknameSaved(false), 2500)
      } else {
        setNicknameError(res.message || '닉네임 변경에 실패했습니다.')
      }
    } finally {
      setNicknameSaving(false)
    }
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

            {currentUser && (
              <>
                <label>
                  활동 닉네임 (다른 유저에게 표시되는 이름)
                  <input
                    value={nicknameInput}
                    onChange={(event) => { setNicknameInput(event.target.value); setNicknameError(''); setNicknameSaved(false) }}
                    placeholder="다른 유저와 겹치지 않는 닉네임을 입력하세요"
                    aria-label="활동 닉네임"
                    maxLength={50}
                  />
                </label>

                <div className="profile-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', marginBottom: '18px' }}>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!nicknameInput.trim() || nicknameSaving || nicknameInput.trim() === currentUser.nickname}
                    onClick={handleSaveNickname}
                    style={{ background: '#f47a20', color: '#ffffff' }}
                  >
                    {nicknameSaving ? 'SAVING…' : nicknameSaved ? 'NICKNAME SAVED ✓' : 'SAVE NICKNAME'} <span>↗</span>
                  </button>
                </div>
                {nicknameError && (
                  <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '-10px', marginBottom: '18px' }}>{nicknameError}</p>
                )}
              </>
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

            <div className="profile-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
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
