'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthResponse } from '../../lib/types'
import { updateNicknameApi, isSessionExpired } from '../../lib/api'
import { useSiteLang, SiteLang } from '../../lib/siteLang'
import LangSwitch from '../../components/LangSwitch'

/** 프로필 화면 문구 (한국어 / English / 中文) */
interface ProfileMsgs {
  intro: string
  accountId: string
  nickname: string
  role: string
  reputation: string
  notLoggedIn1: string
  login: string
  or: string
  signup: string
  notLoggedIn2: string
  nicknameLabel: string
  nicknamePlaceholder: string
  nicknameAria: string
  saving: string
  nicknameSaved: string
  saveNickname: string
  nicknameFail: string
  walletLabel: string
  walletPlaceholder: string
  walletAria: string
  addressSaved: string
  saveWallet: string
  logout: string
  privacy: string
  warning: string
}

const PROFILE_MSGS: Record<SiteLang, ProfileMsgs> = {
  ko: {
    intro: '회원 계정 정보 및 10-Win League 에스크로 출금용 TRC-20 지갑 주소를 관리합니다.',
    accountId: '계정 ID',
    nickname: '활동 닉네임',
    role: '회원 권한',
    reputation: '평판 점수',
    notLoggedIn1: '로그인되어 있지 않습니다. ',
    login: '로그인',
    or: ' 또는 ',
    signup: '회원가입',
    notLoggedIn2: '을 진행해 주세요.',
    nicknameLabel: '활동 닉네임 (다른 유저에게 표시되는 이름)',
    nicknamePlaceholder: '다른 유저와 겹치지 않는 닉네임을 입력하세요',
    nicknameAria: '활동 닉네임',
    saving: '저장 중…',
    nicknameSaved: '닉네임 저장됨 ✓',
    saveNickname: '닉네임 저장',
    nicknameFail: '닉네임 변경에 실패했습니다.',
    walletLabel: 'REWARD DESTINATION WALLET ADDRESS (TRC-20 USDT 수령 지갑 주소)',
    walletPlaceholder: '본인의 TRC-20 (Tron 네트워크) USDT 지갑 주소를 입력하세요 (T...)',
    walletAria: 'TRC-20 지갑 주소',
    addressSaved: '주소 저장됨 ✓',
    saveWallet: 'TRC-20 지갑 저장',
    logout: '로그아웃',
    privacy: '본 서비스는 개인정보 최소수집 원칙을 준수하며, 비밀번호나 민감정보를 절대 외부에 노출하지 않습니다.',
    warning: '본인의 TRC-20 (Tron 네트워크) 지갑 주소가 맞는지 오타를 반드시 확인해 주세요. 블록체인 전송은 취소할 수 없습니다.'
  },
  en: {
    intro: 'Manage your account information and the TRC-20 wallet address used for 10-Win League escrow payouts.',
    accountId: 'Account ID',
    nickname: 'Display name',
    role: 'Role',
    reputation: 'Reputation score',
    notLoggedIn1: 'You are not logged in. Please ',
    login: 'log in',
    or: ' or ',
    signup: 'sign up',
    notLoggedIn2: '.',
    nicknameLabel: 'Display name (shown to other users)',
    nicknamePlaceholder: "Enter a nickname no one else is using",
    nicknameAria: 'Display name',
    saving: 'SAVING…',
    nicknameSaved: 'NICKNAME SAVED ✓',
    saveNickname: 'SAVE NICKNAME',
    nicknameFail: 'Could not change your nickname.',
    walletLabel: 'REWARD DESTINATION WALLET ADDRESS (TRC-20 USDT receiving address)',
    walletPlaceholder: 'Enter your own TRC-20 (Tron network) USDT wallet address (T...)',
    walletAria: 'TRC-20 wallet address',
    addressSaved: 'ADDRESS SAVED ✓',
    saveWallet: 'SAVE TRC-20 WALLET',
    logout: 'LOGOUT',
    privacy: 'We follow the principle of minimal data collection and never expose your password or sensitive information.',
    warning: 'Double-check that your TRC-20 (Tron network) wallet address is correct and has no typos. Blockchain transfers cannot be reversed.'
  },
  cn: {
    intro: '管理您的账户信息，以及用于 10-Win League 托管提现的 TRC-20 钱包地址。',
    accountId: '账号 ID',
    nickname: '活动昵称',
    role: '会员权限',
    reputation: '信誉分',
    notLoggedIn1: '您尚未登录。请先',
    login: '登录',
    or: '或',
    signup: '注册',
    notLoggedIn2: '。',
    nicknameLabel: '活动昵称（向其他用户显示的名称）',
    nicknamePlaceholder: '请输入不与其他用户重复的昵称',
    nicknameAria: '活动昵称',
    saving: '保存中…',
    nicknameSaved: '昵称已保存 ✓',
    saveNickname: '保存昵称',
    nicknameFail: '昵称修改失败。',
    walletLabel: 'REWARD DESTINATION WALLET ADDRESS（TRC-20 USDT 收款钱包地址）',
    walletPlaceholder: '请输入您本人的 TRC-20（Tron 网络）USDT 钱包地址（T...）',
    walletAria: 'TRC-20 钱包地址',
    addressSaved: '地址已保存 ✓',
    saveWallet: '保存 TRC-20 钱包',
    logout: '退出登录',
    privacy: '本服务遵循最小化收集个人信息的原则，绝不向外部泄露您的密码或敏感信息。',
    warning: '请务必确认您的 TRC-20（Tron 网络）钱包地址无误、没有拼写错误。区块链转账无法撤销。'
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [lang, setLang] = useSiteLang()
  const m = PROFILE_MSGS[lang]
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
        if (isSessionExpired(user)) {
          localStorage.removeItem('auth_session')
          return
        }
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
        setNicknameError(res.message || m.nicknameFail)
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
          <LangSwitch lang={lang} onChange={setLang} />
        </header>

        <section className="profile-content">
          <div>
            <span className="eyebrow"><span className="diamond">◆</span> USER ACCOUNT INFORMATION</span>
            <h1>Member<br /><em style={{ color: '#f47a20', fontStyle: 'normal' }}>Profile & Settings.</em></h1>
            <p>{m.intro}</p>
          </div>

          <div className="profile-form">
            {currentUser ? (
              <div style={{ background: '#f8fafb', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '6px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', fontSize: '11.5px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>{m.accountId}</span>
                    <strong style={{ color: '#18334a', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.username}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>{m.nickname}</span>
                    <strong style={{ color: '#f47a20', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.nickname || '-'}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>{m.role}</span>
                    <strong style={{ color: '#0f766e', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.role || 'ROLE_USER'}</strong>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px', marginBottom: '3px' }}>{m.reputation}</span>
                    <strong style={{ color: '#b45309', display: 'block', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.reputationScore || 100} PTS</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '4px', marginBottom: '18px', color: '#b45309', fontSize: '11.5px' }}>
                {m.notLoggedIn1}<Link href="/login" style={{ color: '#f47a20', fontWeight: 700, textDecoration: 'underline' }}>{m.login}</Link>{m.or}<Link href="/signup" style={{ color: '#f47a20', fontWeight: 700, textDecoration: 'underline' }}>{m.signup}</Link>{m.notLoggedIn2}
              </div>
            )}

            {currentUser && (
              <>
                <label>
                  {m.nicknameLabel}
                  <input
                    value={nicknameInput}
                    onChange={(event) => { setNicknameInput(event.target.value); setNicknameError(''); setNicknameSaved(false) }}
                    placeholder={m.nicknamePlaceholder}
                    aria-label={m.nicknameAria}
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
                    {nicknameSaving ? m.saving : nicknameSaved ? m.nicknameSaved : m.saveNickname} <span>↗</span>
                  </button>
                </div>
                {nicknameError && (
                  <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '-10px', marginBottom: '18px' }}>{nicknameError}</p>
                )}
              </>
            )}

            <label>
              {m.walletLabel}
              <input
                value={wallet}
                onChange={(event) => { setWallet(event.target.value); setSaved(false) }}
                placeholder={m.walletPlaceholder}
                aria-label={m.walletAria}
              />
            </label>

            <div className="profile-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              <button
                className="primary-button"
                disabled={!wallet.trim() || !currentUser}
                onClick={handleSaveWallet}
                style={{ background: '#f47a20', color: '#ffffff' }}
              >
                {saved ? m.addressSaved : m.saveWallet} <span>↗</span>
              </button>
              {currentUser && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleLogout}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  {m.logout}
                </button>
              )}
            </div>

            <p className="privacy-note" style={{ marginTop: '16px' }}>
              {m.privacy}
            </p>
            <p className="profile-warning">
              {m.warning}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
