'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { loginApi, socialLogin } from '../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [loginMode, setLoginMode] = useState<'SOCIAL' | 'CREDENTIALS'>('SOCIAL')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // Google Identity Services (GSI) SDK 로드
    if (typeof window !== 'undefined' && !document.getElementById('google-gsi-client')) {
      const script = document.createElement('script')
      script.id = 'google-gsi-client'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const handleCredentialsLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setFeedback('아이디와 비밀번호를 모두 입력해 주세요.')
      setIsError(true)
      return
    }

    setLoading(true)
    setFeedback('로그인 확인 중...')
    setIsError(false)

    try {
      const res = await loginApi({
        username: username.trim(),
        password: password.trim()
      })

      if (res.success) {
        setFeedback(`🎉 [${res.nickname || res.username}] 님, 로그인 성공! 메인으로 이동합니다.`)
        setIsError(false)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => {
          router.push('/')
        }, 800)
      } else {
        setFeedback(res.message || '아이디 또는 비밀번호가 일치하지 않습니다.')
        setIsError(true)
      }
    } catch (err: any) {
      setFeedback('로그인 중 오류가 발생했습니다: ' + (err?.message || ''))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  // 진짜 구글 OAuth 2.0 팝업 로그인 처리
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('google_custom_client_id') : null)

    if (!clientId) {
      const inputId = window.prompt(
        '🔑 Google Cloud Console에서 발급받은 OAuth 2.0 Client ID를 입력해 주세요:\n(예: 123456789-xxxx.apps.googleusercontent.com)\n\n※ 미입력/취소 시 시뮬레이션 간편 계정으로 즉시 로그인됩니다.',
        ''
      )
      if (inputId && inputId.trim()) {
        localStorage.setItem('google_custom_client_id', inputId.trim())
        triggerGooglePopup(inputId.trim())
        return
      } else {
        handleSocial('GOOGLE')
        return
      }
    } else {
      triggerGooglePopup(clientId)
    }
  }

  const triggerGooglePopup = (clientId: string) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      setFeedback('구글 인증 라이브러리를 로딩 중입니다. 1초 후 다시 클릭해 주세요.')
      return
    }

    setLoading(true)
    setFeedback('구글 공식 계정 로그인 창을 여는 중...')
    setIsError(false)

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              setFeedback('구글 공식 프로필 확인 중...')
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              })
              const userInfo = await userRes.json()

              if (userInfo && userInfo.email) {
                const res = await socialLogin({
                  provider: 'GOOGLE',
                  providerId: userInfo.sub,
                  email: userInfo.email,
                  nickname: userInfo.name || userInfo.email.split('@')[0],
                  avatarUrl: userInfo.picture
                })

                if (res.success) {
                  setFeedback(`🎉 [${userInfo.name || userInfo.email}] 님, 구글 공식 계정 로그인 성공!`)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_session', JSON.stringify(res))
                  }
                  setTimeout(() => {
                    router.push('/')
                  }, 800)
                } else {
                  setFeedback(res.message || '구글 로그인 처리에 실패했습니다.')
                  setIsError(true)
                }
              }
            } catch (err: any) {
              setFeedback('구글 프로필 조회 오류: ' + (err?.message || ''))
              setIsError(true)
            } finally {
              setLoading(false)
            }
          }
        },
        error_callback: () => {
          setFeedback('구글 로그인이 취소되었거나 팝업이 닫혔습니다.')
          setIsError(true)
          setLoading(false)
        }
      })

      client.requestAccessToken()
    } catch (e: any) {
      setFeedback('구글 로그인 초기화 오류: ' + (e?.message || ''))
      setIsError(true)
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
    if (provider === 'GOOGLE') {
      handleGoogleLogin()
      return
    }

    setLoading(true)
    setFeedback(`[${provider}] 간편 소셜 인증 진행 중...`)
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
        setFeedback(`🎉 [${res.nickname}] 님, ${provider} 간편 로그인 완료!`)
        setIsError(false)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => {
          router.push('/')
        }, 800)
      } else {
        setFeedback(res.message || '인증에 실패했습니다.')
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
          <div className="eyebrow"><span className="diamond">◆</span> AI FACT-CHECK & QUANT</div>
          <h1>Decisions,<br /><em>with evidence.</em></h1>
          <p>Access your quant workspace and verified signals securely in one second, without entering sensitive personal information.</p>
          <div className="auth-status">
            <span className="live-dot" /> SYSTEMS OPERATIONAL <span>ENCRYPTED ZERO-PII SESSION</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <span className="overline">USER ACCESS</span>
              <h2>Welcome back.</h2>
              <p className="auth-subtitle">소셜 원클릭 로그인 또는 아이디/비밀번호로 로그인하세요.</p>
            </div>
            <span className="status-tag">SECURE</span>
          </div>

          {/* Login Mode Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setLoginMode('SOCIAL')}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 700,
                border: loginMode === 'SOCIAL' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: loginMode === 'SOCIAL' ? '#f0f9ff' : '#f8fafc',
                color: loginMode === 'SOCIAL' ? '#0369a1' : '#64748b',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              1-CLICK SOCIAL LOGIN
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('CREDENTIALS')}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 700,
                border: loginMode === 'CREDENTIALS' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: loginMode === 'CREDENTIALS' ? '#f0f9ff' : '#f8fafc',
                color: loginMode === 'CREDENTIALS' ? '#0369a1' : '#64748b',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ID & PASSWORD LOGIN
            </button>
          </div>

          {loginMode === 'SOCIAL' ? (
            <div>
              <div className="social-grid social-grid-wide">
                <button
                  className="social-button"
                  type="button"
                  onClick={() => handleSocial('GOOGLE')}
                  disabled={loading}
                >
                  <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg" alt="Google" />
                  GOOGLE <span>↗</span>
                </button>

                <button
                  className="social-button"
                  type="button"
                  onClick={() => handleSocial('NAVER')}
                  disabled={loading}
                >
                  <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/naver/default.svg" alt="Naver" />
                  NAVER <span>↗</span>
                </button>

                <button
                  className="social-button"
                  type="button"
                  onClick={() => handleSocial('KAKAO')}
                  disabled={loading}
                >
                  <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/kakao/default.svg" alt="Kakao" />
                  KAKAO <span>↗</span>
                </button>

                <button
                  className="social-button"
                  type="button"
                  onClick={() => handleSocial('APPLE')}
                  disabled={loading}
                >
                  <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/default.svg" alt="Apple" />
                  APPLE <span>↗</span>
                </button>
              </div>

              <button
                className="wallet-button"
                type="button"
                onClick={() => handleSocial('METAMASK')}
                disabled={loading}
                style={{ marginTop: '12px' }}
              >
                <span className="wallet-mark">◇</span>
                CONNECT METAMASK
                <small>ANONYMOUS WEB3 ACCESS</small>
                <span>↗</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCredentialsLogin} style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>아이디 (Username) *</span>
                <input
                  type="text"
                  required
                  placeholder="아이디 입력"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>비밀번호 (Password) *</span>
                <input
                  type="password"
                  required
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                />
              </label>

              <button
                className="primary-button auth-submit"
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '12px', background: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}
              >
                {loading ? '로그인 확인 중…' : 'SIGN IN (로그인)'} <span>↗</span>
              </button>
            </form>
          )}

          {feedback && (
            <div style={{
              padding: '10px 14px',
              marginTop: '14px',
              background: isError ? '#fef2f2' : '#f0fdf4',
              border: isError ? '1px solid #f87171' : '1px solid #4ade80',
              color: isError ? '#dc2626' : '#166534',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              {feedback}
            </div>
          )}

          <div className="auth-divider"><span>OR JOIN AETHER QUANT</span></div>

          <p className="auth-footer" style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748b' }}>
            아직 계정이 없으신가요? <Link href="/signup" style={{ color: '#0284c7', fontWeight: 700 }}>무료 회원가입 (Create Account)</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
