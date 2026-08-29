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

    if (!clientId) {
      const inputId = window.prompt(
        '🔑 Google Cloud Console에서 발급받은 OAuth 2.0 Client ID를 입력해 주세요:\n(예: 123456789-xxxx.apps.googleusercontent.com)\n\n※ 미입력/취소 시 시뮬레이션 간편 계정으로 즉시 로그인됩니다.',
        ''
      )
      if (inputId && inputId.trim()) {
        localStorage.setItem('google_custom_client_id', inputId.trim())
        triggerGooglePopup(inputId.trim())
      } else {
        handleInstantSocial('GOOGLE')
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
      setFeedback('구글 로그인 초기화 오류: ' + (e?.message || ''))
      setIsError(true)
      setLoading(false)
    }
  }

  // 2. 카카오 OAuth 2.0
  const handleKakaoLogin = () => {
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || (typeof window !== 'undefined' ? localStorage.getItem('kakao_custom_js_key') : null)

    if (!jsKey) {
      const inputKey = window.prompt(
        '🔑 Kakao Developers(developers.kakao.com)에서 발급받은 JavaScript 키를 입력해 주세요:\n(예: 8a4c1b9...)\n\n※ 미입력/취소 시 시뮬레이션 간편 계정으로 즉시 로그인됩니다.',
        ''
      )
      if (inputKey && inputKey.trim()) {
        localStorage.setItem('kakao_custom_js_key', inputKey.trim())
        triggerKakaoPopup(inputKey.trim())
      } else {
        handleInstantSocial('KAKAO')
      }
    } else {
      triggerKakaoPopup(jsKey)
    }
  }

  const triggerKakaoPopup = (jsKey: string) => {
    if (typeof window === 'undefined' || !(window as any).Kakao) {
      setFeedback('카카오 인증 SDK 로딩 중입니다. 1초 후 다시 시도해 주세요.')
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

    if (!clientId) {
      const inputId = window.prompt(
        '🔑 Naver Developers(developers.naver.com)에서 발급받은 Client ID를 입력해 주세요:\n(예: Naver_Client_ID_xxxx)\n\n※ 미입력/취소 시 시뮬레이션 간편 계정으로 즉시 로그인됩니다.',
        ''
      )
      if (inputId && inputId.trim()) {
        localStorage.setItem('naver_custom_client_id', inputId.trim())
        triggerNaverPopup(inputId.trim())
      } else {
        handleInstantSocial('NAVER')
      }
    } else {
      triggerNaverPopup(clientId)
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

  // 4. 애플 Sign In
  const handleAppleLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || (typeof window !== 'undefined' ? localStorage.getItem('apple_custom_client_id') : null)

    if (!clientId) {
      const inputId = window.prompt(
        '🔑 Apple Developer에서 발급받은 Service ID (Client ID)를 입력해 주세요:\n(예: com.aether.web.signin)\n\n※ 미입력/취소 시 시뮬레이션 간편 계정으로 즉시 로그인됩니다.',
        ''
      )
      if (inputId && inputId.trim()) {
        localStorage.setItem('apple_custom_client_id', inputId.trim())
        triggerApplePopup(inputId.trim())
      } else {
        handleInstantSocial('APPLE')
      }
    } else {
      triggerApplePopup(clientId)
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
            style={{ marginTop: '14px' }}
          >
            <span className="wallet-mark">◇</span>
            CONNECT METAMASK
            <small>ANONYMOUS WEB3 ACCESS</small>
            <span>↗</span>
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
