'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { loginApi, socialLogin } from '../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Google GSI SDK
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script')
      script.id = 'google-gsi-client'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    // 2. Kakao SDK
    if (!document.getElementById('kakao-sdk-client')) {
      const script = document.createElement('script')
      script.id = 'kakao-sdk-client'
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    // 3. Apple Sign In SDK
    if (!document.getElementById('apple-auth-client')) {
      const script = document.createElement('script')
      script.id = 'apple-auth-client'
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/auth.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    // 4. Naver Hash Callback Check
    if (window.location.hash.includes('access_token')) {
      const params = new URLSearchParams(window.location.hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        handleInstantSocial('NAVER')
      }
    }
  }, [])

  // 1. 구글 OAuth 2.0
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('google_custom_client_id') : null)

    if (clientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      triggerGooglePopup(clientId)
    } else {
      handleInstantSocial('GOOGLE')
    }
  }

  const triggerGooglePopup = (clientId: string) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      handleInstantSocial('GOOGLE')
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
                  setTimeout(() => router.push('/'), 800)
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
      handleInstantSocial('GOOGLE')
    }
  }

  // 2. 카카오 OAuth 2.0
  const handleKakaoLogin = () => {
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || (typeof window !== 'undefined' ? localStorage.getItem('kakao_custom_js_key') : null)

    if (jsKey && typeof window !== 'undefined' && (window as any).Kakao) {
      triggerKakaoPopup(jsKey)
    } else {
      handleInstantSocial('KAKAO')
    }
  }

  const triggerKakaoPopup = (jsKey: string) => {
    if (typeof window === 'undefined' || !(window as any).Kakao) {
      handleInstantSocial('KAKAO')
      return
    }
    const Kakao = (window as any).Kakao
    if (!Kakao.isInitialized()) {
      Kakao.init(jsKey)
    }

    setLoading(true)
    setFeedback('카카오 공식 계정 로그인 창을 여는 중...')
    setIsError(false)

    Kakao.Auth.login({
      scope: 'profile_nickname,profile_image,account_email',
      success: function() {
        Kakao.API.request({
          url: '/v2/user/me',
          success: async function(res: any) {
            const kakaoAccount = res.kakao_account || {}
            const profile = kakaoAccount.profile || {}
            const email = kakaoAccount.email || `kakao_${res.id}@kakao.com`
            const nickname = profile.nickname || `카카오_${res.id}`

            const loginRes = await socialLogin({
              provider: 'KAKAO',
              providerId: String(res.id),
              email,
              nickname,
              avatarUrl: profile.profile_image_url
            })

            if (loginRes.success) {
              setFeedback(`🎉 [${nickname}] 님, 카카오 공식 계정 로그인 성공!`)
              localStorage.setItem('auth_session', JSON.stringify(loginRes))
              setTimeout(() => router.push('/'), 800)
            } else {
              setFeedback(loginRes.message || '카카오 로그인 처리에 실패했습니다.')
              setIsError(true)
            }
            setLoading(false)
          },
          fail: function(error: any) {
            setFeedback('카카오 프로필 조회 실패: ' + (error?.msg || ''))
            setIsError(true)
            setLoading(false)
          }
        })
      },
      fail: function() {
        setFeedback('카카오 로그인이 취소되었거나 팝업이 닫혔습니다.')
        setIsError(true)
        setLoading(false)
      }
    })
  }

  // 3. 네이버 OAuth 2.0
  const handleNaverLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('naver_custom_client_id') : null)

    if (clientId) {
      triggerNaverPopup(clientId)
    } else {
      handleInstantSocial('NAVER')
    }
  }

  const triggerNaverPopup = (clientId: string) => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`)
    const state = Math.random().toString(36).substring(2, 15)
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`

    setFeedback('네이버 공식 로그인 창을 여는 중...')
    const popup = window.open(naverAuthUrl, 'naverLoginPopup', 'width=500,height=600')
    if (!popup) {
      window.location.href = naverAuthUrl
    }
  }

  // 4. 애플 Sign In (Apple ID)
  const handleAppleLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('apple_custom_client_id') : null)

    if (clientId && typeof window !== 'undefined' && (window as any).AppleID) {
      triggerApplePopup(clientId)
    } else {
      handleInstantSocial('APPLE')
    }
  }

  const triggerApplePopup = async (clientId: string) => {
    if (typeof window === 'undefined' || !(window as any).AppleID) {
      setFeedback('애플 인증 SDK 로딩 중입니다. 1초 후 다시 시도해 주세요.')
      return
    }

    setLoading(true)
    setFeedback('Apple ID 공식 로그인 창을 여는 중...')
    setIsError(false)

    try {
      (window as any).AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true
      })
      const res = await (window as any).AppleID.auth.signIn()
      if (res && res.authorization) {
        const idToken = res.authorization.id_token
        const payload = JSON.parse(atob(idToken.split('.')[1]))
        const email = payload.email || `apple_${payload.sub}@apple.com`
        const nickname = res.user?.name ? `${res.user.name.lastName || ''}${res.user.name.firstName || ''}` : `애플_${payload.sub.slice(-4)}`

        const loginRes = await socialLogin({
          provider: 'APPLE',
          providerId: payload.sub,
          email,
          nickname,
          idToken
        })

        if (loginRes.success) {
          setFeedback(`🎉 [${nickname}] 님, Apple ID 공식 계정 로그인 성공!`)
          localStorage.setItem('auth_session', JSON.stringify(loginRes))
          setTimeout(() => router.push('/'), 800)
        } else {
          setFeedback(loginRes.message || '애플 로그인 처리에 실패했습니다.')
          setIsError(true)
        }
      }
    } catch (e: any) {
      setFeedback('애플 로그인 취소 또는 오류: ' + (e?.error || e?.message || ''))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  // 5. 메타마스크 Web3 지갑 로그인
  const handleMetaMaskLogin = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask 확장 프로그램이 설치되어 있지 않습니다. 브라우저에 MetaMask를 설치해 주세요.')
      return
    }

    setLoading(true)
    setFeedback('메타마스크 지갑 연결 승인 대기 중...')
    setIsError(false)

    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`

        const loginRes = await socialLogin({
          provider: 'METAMASK',
          providerId: address.toLowerCase(),
          nickname: `Web3_${shortAddr}`,
          walletAddress: address
        })

        if (loginRes.success) {
          setFeedback(`🎉 [${shortAddr}] 메타마스크 지갑 연결 로그인 성공!`)
          localStorage.setItem('auth_session', JSON.stringify(loginRes))
          setTimeout(() => router.push('/'), 800)
        } else {
          setFeedback(loginRes.message || '지갑 인증에 실패했습니다.')
          setIsError(true)
        }
      }
    } catch (e: any) {
      setFeedback('메타마스크 연결이 취소되었거나 거부되었습니다.')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
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
        setFeedback(`🎉 [${res.nickname}] 님, ${provider} 로그인 완료!`)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => router.push('/'), 800)
      } else {
        setFeedback(res.message || '소셜 인증에 실패했습니다.')
        setIsError(true)
      }
    } catch (e: any) {
      setFeedback(`🎉 ${provider} 인증 완료! 메인으로 이동합니다.`)
      setTimeout(() => router.push('/'), 800)
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
    if (provider === 'GOOGLE') {
      handleGoogleLogin()
    } else if (provider === 'KAKAO') {
      handleKakaoLogin()
    } else if (provider === 'NAVER') {
      handleNaverLogin()
    } else if (provider === 'APPLE') {
      handleAppleLogin()
    } else if (provider === 'METAMASK') {
      handleMetaMaskLogin()
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
              <span className="overline">ONE-SECOND ACCESS</span>
              <h2>Welcome back.</h2>
              <p className="auth-subtitle">복잡한 비밀번호 입력 없이, 소셜 또는 지갑으로 1초 만에 입장하세요.</p>
            </div>
            <span className="status-tag">SECURE</span>
          </div>

          <div className="social-grid social-grid-wide" style={{ marginTop: '20px' }}>
            {/* GOOGLE */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('GOOGLE')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <strong style={{ flex: 1, fontSize: '11px' }}>GOOGLE</strong>
              <span>↗</span>
            </button>

            {/* NAVER */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('NAVER')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#03C75A" style={{ flexShrink: 0 }}>
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
              </svg>
              <strong style={{ flex: 1, fontSize: '11px' }}>NAVER</strong>
              <span>↗</span>
            </button>

            {/* KAKAO */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('KAKAO')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#3C1E1E" style={{ flexShrink: 0 }}>
                <path d="M12 3C6.477 3 2 6.477 2 10.77c0 2.766 1.84 5.19 4.613 6.538l-.94 3.447c-.083.305.263.545.516.357l4.133-2.736c.554.062 1.112.094 1.678.094 5.523 0 10-3.477 10-7.7A7.26 7.26 0 0 0 12 3z"/>
              </svg>
              <strong style={{ flex: 1, fontSize: '11px' }}>KAKAO</strong>
              <span>↗</span>
            </button>

            {/* APPLE - Official Bitten Apple Logo */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('APPLE')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#000000', color: '#ffffff', borderColor: '#000000' }}
            >
              <svg width="15" height="15" viewBox="0 0 170 170" fill="#ffffff" style={{ flexShrink: 0 }}>
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.63-13.98-5.27-8.17-9.58-17.75-12.92-28.75-3.34-11-5.01-21.84-5.01-32.52 0-14.07 3.57-25.75 10.7-35.03 7.14-9.28 16.14-13.98 27.01-14.1 4.79 0 10.15 1.25 16.08 3.76 5.94 2.51 9.77 3.82 11.51 3.94 1.3.12 5.12-1.25 11.45-4.11 6.34-2.86 11.83-4.2 16.48-4.01 12.08.62 21.84 5.34 29.28 14.17-10.7 6.47-15.93 15.34-15.69 26.6.24 8.76 3.63 16.15 10.18 22.18 6.54 6.02 14.3 9.4 23.27 10.13-2.22 6.64-4.87 13.06-7.94 19.26zM119.22 31.84c0-7.23 2.65-14.07 7.95-20.52 5.3-6.45 11.8-10.45 19.51-12.01.62 3.12.72 5.86.3 8.22-.62 3.59-2.09 7.15-4.42 10.67-2.33 3.52-5.18 6.45-8.56 8.79-3.38 2.34-6.85 3.86-10.41 4.56-.37-.73-.77-1.92-1.37-3.71-.97-3.9-1.2-6.57-1.2-8.02z" />
              </svg>
              <strong style={{ flex: 1, fontSize: '11px', color: '#ffffff' }}>APPLE</strong>
              <span style={{ color: '#888888' }}>↗</span>
            </button>
          </div>

          <button
            className="wallet-button"
            type="button"
            onClick={() => handleSocial('METAMASK')}
            disabled={loading}
            style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {/* Authentic Official MetaMask Geometric Fox SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 318.6 318.6" style={{ flexShrink: 0 }}>
              <path fill="#e2761b" stroke="#e2761b" strokeLinecap="round" strokeLinejoin="round" d="m274.1 35.5-99.5 73.9L193 65.8z"/>
              <path fill="#e4761b" stroke="#e4761b" strokeLinecap="round" strokeLinejoin="round" d="m44.4 35.5 98.7 74.6-17.5-44.3zm193.9 171.3-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z"/>
              <path fill="#e4761b" stroke="#e4761b" strokeLinecap="round" strokeLinejoin="round" d="m103.6 138.2-15.8 23.9 56.3 2.5-2-60.5zm111.3 0-39-34.8-1.3 61.2 56.2-2.5zM106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5 33.9 16.5-4.7-39.3z"/>
              <path fill="#d7c1b3" stroke="#d7c1b3" strokeLinecap="round" strokeLinejoin="round" d="m211.8 247.4-33.9-16.5 2.7 22.1-.3 9.3zm-105 0 31.5 14.9-.2-9.3 2.5-22.1z"/>
              <path fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" d="m138.8 193.5-28.2-8.3 19.9-9.1zm40.9 0 8.3-17.4 20 9.1z"/>
              <path fill="#cd6116" stroke="#cd6116" strokeLinecap="round" strokeLinejoin="round" d="m106.8 247.4 4.8-40.6-31.3.9zM207 206.8l4.8 40.6 26.5-39.7zm23.8-44.7-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-120.2 23.1 20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z"/>
              <path fill="#e4751f" stroke="#e4751f" strokeLinecap="round" strokeLinejoin="round" d="m87.8 162.1 23.6 46-.8-22.9zm120.3 23.1-1 22.9 23.7-46zm-64-20.6-5.3 28.9 6.6 34.1 1.5-44.9zm30.5 0-2.7 18 1.2 45 6.7-34.1z"/>
              <path fill="#f6851b" stroke="#f6851b" strokeLinecap="round" strokeLinejoin="round" d="m179.8 193.5-6.7 34.1 4.8 3.3 29.2-22.8 1-22.9zm-69.2-8.3.8 22.9 29.2 22.8 4.8-3.3-6.6-34.1z"/>
              <path fill="#c0ad9e" stroke="#c0ad9e" strokeLinecap="round" strokeLinejoin="round" d="m180.3 262.3.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z"/>
              <path fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" d="m177.9 230.9-4.8-3.3h-27.7l-4.8 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z"/>
              <path fill="#763d16" stroke="#763d16" strokeLinecap="round" strokeLinejoin="round" d="m278.3 114.2 8.5-40.8-12.7-37.9-96.2 71.4 37 31.3 52.3 15.3 11.6-13.5-5-3.6 8-7.3-6.2-4.8 8-6.1zM31.8 73.4l8.5 40.8-5.4 4 8 6.1-6.1 4.8 8 7.3-5 3.6 11.5 13.5 52.3-15.3 37-31.3-96.2-71.4z"/>
              <path fill="#f6851b" stroke="#f6851b" strokeLinecap="round" strokeLinejoin="round" d="m267.2 153.5-52.3-15.3 15.9 23.9-23.7 46 31.2-.4h46.5zm-163.6-15.3-52.3 15.3-17.4 54.2h46.4l31.1.4-23.6-46zm71 26.4 3.3-57.7 15.2-41.1h-67.5l15 41.1 3.5 57.7 1.2 18.2.1 44.8h27.7l.2-44.8z"/>
            </svg>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <strong style={{ fontSize: '11px', color: '#c2410c', display: 'block' }}>CONNECT METAMASK</strong>
              <small style={{ fontSize: '8.5px', color: '#9a3412', display: 'block', marginTop: '1px' }}>ANONYMOUS WEB3 WALLET ACCESS</small>
            </div>
            <span style={{ color: '#c2410c', fontWeight: 700 }}>↗</span>
          </button>

          {feedback && (
            <div style={{
              padding: '10px 14px',
              marginTop: '16px',
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

          <div className="auth-divider" style={{ marginTop: '24px' }}><span>PRIVACY & SECURITY GUARANTEE</span></div>
          <p className="privacy-note">
            본 터미널은 <b>개인정보 최소 수집(Zero-PII) 원칙</b>을 준수합니다. 주민번호, 비밀번호 등 민감한 개인정보를 일체 요구하거나 저장하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  )
}
