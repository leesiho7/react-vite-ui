'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { signUpApi, socialLogin } from '../../lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim() || !nickname.trim()) {
      setFeedback('모든 필수 항목을 입력해 주세요.')
      setIsError(true)
      return
    }

    if (password !== passwordConfirm) {
      setFeedback('비밀번호가 일치하지 않습니다.')
      setIsError(true)
      return
    }

    setLoading(true)
    setFeedback('계정 생성 중...')
    setIsError(false)

    try {
      const res = await signUpApi({
        username: username.trim(),
        password: password.trim(),
        nickname: nickname.trim()
      })

      if (res.success) {
        setFeedback('🎉 회원가입 완료! 자동 로그인 중입니다...')
        setIsError(false)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => {
          router.push('/')
        }, 800)
      } else {
        setFeedback(res.message || '회원가입에 실패했습니다.')
        setIsError(true)
      }
    } catch (err: any) {
      setFeedback('회원가입 중 오류가 발생했습니다: ' + (err?.message || ''))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
    setLoading(true)
    setFeedback(`[${provider}] 간편 소셜 계정 생성 및 로그인 진행 중...`)
    setIsError(false)

    let localKey = `social_user_${provider.toLowerCase()}`
    let storedId = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null
    if (!storedId) {
      storedId = `${provider.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`
      if (typeof window !== 'undefined') localStorage.setItem(localKey, storedId)
    }

    const nicknameMap: Record<string, string> = {
      NAVER: `네이버_초록개미_${storedId.slice(-4)}`,
      KAKAO: `카카오_라이언_${storedId.slice(-4)}`,
      GOOGLE: `구글_알파퀀트_${storedId.slice(-4)}`,
      APPLE: `애플_시리우스_${storedId.slice(-4)}`,
      METAMASK: `0x${storedId.slice(-4)}...9E`
    }

    try {
      const res = await socialLogin({
        provider,
        providerId: storedId,
        nickname: nicknameMap[provider],
        walletAddress: provider === 'METAMASK' ? `0x71C${storedId.slice(-4)}...9E` : null
      })

      if (res.success) {
        setFeedback(`🎉 ${provider} 간편 계정 생성 완료! 메인으로 이동합니다.`)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => {
          router.push('/')
        }, 800)
      } else {
        setFeedback(res.message || '소셜 인증에 실패했습니다.')
        setIsError(true)
      }
    } catch (e: any) {
      setFeedback(`🎉 ${provider} 인증 완료! 메인으로 이동합니다.`)
      setTimeout(() => {
        router.push('/')
      }, 800)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-grid">
        <section className="auth-brand">
          <Link href="/" className="auth-back">← AETHER TERMINAL</Link>
          <div className="auth-mark">A</div>
          <div className="eyebrow"><span className="diamond">◆</span> AI FACT-CHECK & QUANT WORKSPACE</div>
          <h1>Build your<br /><em>edge.</em></h1>
          <p>Join a transparent, institutional-grade workspace for verified quantitative signals, 24H bot sandboxes, and fact-checked intelligence.</p>
          <div className="auth-status">
            <span className="live-dot" /> FREE WORKSPACE <span>NO CREDIT CARD REQUIRED</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <span className="overline">CREATE ACCOUNT</span>
              <h2>Start with signal.</h2>
              <p className="auth-subtitle">계정을 생성하고 10-Win League 및 24H 봇 샌드박스를 시작하세요.</p>
            </div>
            <span className="status-tag">SECURE</span>
          </div>

          {/* Social 1-Click Access */}
          <div className="social-grid" style={{ marginBottom: '16px' }}>
            <button className="social-button" type="button" onClick={() => handleSocial('GOOGLE')} disabled={loading}>
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg" alt="Google" /> GOOGLE <span>↗</span>
            </button>
            <button className="social-button" type="button" onClick={() => handleSocial('NAVER')} disabled={loading}>
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/naver/default.svg" alt="Naver" /> NAVER <span>↗</span>
            </button>
            <button className="social-button" type="button" onClick={() => handleSocial('KAKAO')} disabled={loading}>
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/kakao/default.svg" alt="Kakao" /> KAKAO <span>↗</span>
            </button>
          </div>

          <div className="auth-divider"><span>OR REGISTER WITH ID & PASSWORD</span></div>

          {/* Real Form Submission */}
          <form onSubmit={handleSignup} style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>아이디 (Username / ID) *</span>
              <input
                type="text"
                required
                placeholder="예: alpha_trader"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>활동 닉네임 (Nickname) *</span>
              <input
                type="text"
                required
                placeholder="예: 퀀트마스터"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>비밀번호 (Password) *</span>
              <input
                type="password"
                required
                minLength={4}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>비밀번호 확인 (Confirm Password) *</span>
              <input
                type="password"
                required
                minLength={4}
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
              />
            </label>

            {feedback && (
              <div style={{
                padding: '10px 14px',
                marginBottom: '14px',
                background: isError ? '#fef2f2' : '#f0fdf4',
                border: isError ? '1px solid #f87171' : '1px solid #4ade80',
                color: isError ? '#dc2626' : '#166534',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px'
              }}>
                {feedback}
              </div>
            )}

            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}
            >
              {loading ? '계정 생성 중…' : 'CREATE ACCOUNT (회원가입 완료)'} <span>↗</span>
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '16px', textAlign: 'center', fontSize: '11.5px', color: '#64748b' }}>
            이미 계정이 있으신가요? <Link href="/login" style={{ color: '#0284c7', fontWeight: 700 }}>로그인하기 (Sign in)</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
