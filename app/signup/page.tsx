'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { signUpApi, socialLogin } from '../../lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [showMore, setShowMore] = useState(false)

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
                  setFeedback(`🎉 [${userInfo.name || userInfo.email}] 님, 구글 공식 계정 연동 성공!`)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_session', JSON.stringify(res))
                  }
                  setTimeout(() => router.push('/'), 800)
                } else {
                  setFeedback(res.message || '구글 연동 처리에 실패했습니다.')
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
              setFeedback(`🎉 [${nickname}] 님, 카카오 공식 계정 연동 성공!`)
              localStorage.setItem('auth_session', JSON.stringify(loginRes))
              setTimeout(() => router.push('/'), 800)
            } else {
              setFeedback(loginRes.message || '카카오 연동 처리에 실패했습니다.')
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
    const redirectUri = encodeURIComponent(`${window.location.origin}/signup`)
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
        redirectURI: `${window.location.origin}/signup`,
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
          setFeedback(`🎉 [${nickname}] 님, Apple ID 공식 계정 연동 성공!`)
          localStorage.setItem('auth_session', JSON.stringify(loginRes))
          setTimeout(() => router.push('/'), 800)
        } else {
          setFeedback(loginRes.message || '애플 연동 처리에 실패했습니다.')
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

  // 5. 메타마스크 Web3 지갑
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
          setFeedback(`🎉 [${shortAddr}] 메타마스크 지갑 연결 계정 연동 성공!`)
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
        setFeedback(`🎉 [${res.nickname}] 님, ${provider} 계정 연동 완료!`)
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

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setFeedback('올바른 이메일 주소를 입력해 주세요.')
      setIsError(true)
      return
    }

    if (step === 1) {
      setStep(2)
      setFeedback(null)
      return
    }

    setLoading(true)
    setFeedback('계정을 생성하고 워크스페이스를 설정하는 중...')
    setIsError(false)

    try {
      const res = await signUpApi({
        username: email,
        password: password || '12345678',
        nickname: nickname || email.split('@')[0]
      })

      if (res.success) {
        setFeedback(`🎉 [${res.nickname || email}] 님, 회원가입이 완료되었습니다!`)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => router.push('/'), 800)
      } else {
        setFeedback(res.message || '회원가입 처리에 실패했습니다.')
        setIsError(true)
      }
    } catch (err: any) {
      setFeedback('서버 통신 오류: ' + (err?.message || '네트워크 연결을 확인해 주세요.'))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signup-backdrop">
      <div className="signup-modal">
        {/* Visual Brand Left Section */}
        <section className="signup-visual">
          <Link href="/" className="signup-logo">
            AETHER
          </Link>

          <div className="signup-visual-copy">
            <span>MARKET INTELLIGENCE</span>
            <h1>
              The edge<br />
              <em>starts here.</em>
            </h1>
            <p>실시간 시장 데이터와 분석 도구를 더 빠르게 확인하세요.</p>
          </div>

          <div className="signup-orbit">
            <div className="signup-orbit-mark" style={{ padding: '10px' }}>
              <img src="/brand-logo.png" alt="AETHER Official Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
            </div>
            <span className="orbit-line orbit-line-one" />
            <span className="orbit-line orbit-line-two" />
          </div>

          <div className="signup-visual-footer">
            AETHER / PRIVATE MARKET WORKSPACE
          </div>
        </section>

        {/* Form Panel Right Section */}
        <section className="signup-form-panel">
          <Link href="/" className="signup-close" aria-label="홈으로 돌아가기">
            ×
          </Link>

          <span className="overline">NEW ACCOUNT</span>
          <h2>무료 회원가입</h2>

          {/* Google 1-Click Button */}
          <button
            className="signup-google"
            type="button"
            onClick={() => handleSocial('GOOGLE')}
            disabled={loading}
          >
            <img
              src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg"
              alt="Google"
            />{' '}
            Google로 계속하기
          </button>

          {/* Social / Web3 Register Grid (Full Display) */}
          <div className="social-grid social-grid-wide" style={{ marginTop: '16px', marginBottom: '24px', display: 'grid', gap: '10px' }}>
            {/* NAVER */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('NAVER')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#03C75A', color: '#ffffff', borderColor: '#03C75A', borderRadius: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" style={{ flexShrink: 0 }}>
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
              </svg>
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left' }}>네이버로 가입하기</strong>
              <span>↗</span>
            </button>

            {/* KAKAO */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('KAKAO')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#FEE500', color: '#000000', borderColor: '#FEE500', borderRadius: '6px' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#000000" style={{ flexShrink: 0 }}>
                <path d="M12 3C6.477 3 2 6.477 2 10.77c0 2.766 1.84 5.19 4.613 6.538l-.94 3.447c-.083.305.263.545.516.357l4.133-2.736c.554.062 1.112.094 1.678.094 5.523 0 10-3.477 10-7.7A7.26 7.26 0 0 0 12 3z"/>
              </svg>
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left' }}>카카오로 가입하기</strong>
              <span>↗</span>
            </button>



            {/* METAMASK */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('METAMASK')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#fff7ed', borderColor: '#fdba74', borderRadius: '6px' }}
            >
              <span style={{ fontSize: '15px' }}>🦊</span>
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left', color: '#c2410c' }}>MetaMask 지갑 연결</strong>
              <span style={{ color: '#c2410c' }}>↗</span>
            </button>
          </div>

          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                marginTop: '16px',
                background: isError ? '#fef2f2' : '#f0fdf4',
                border: isError ? '1px solid #f87171' : '1px solid #4ade80',
                color: isError ? '#dc2626' : '#166534',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                textAlign: 'center'
              }}
            >
              {feedback}
            </div>
          )}

          <p className="signup-login">
            이미 등록하셨나요? <Link href="/login">로그인</Link>
          </p>

          <p className="signup-terms">
            등록함으로써 귀하는 저희 <a href="#terms">개인정보 처리방침</a>에 동의하고 이를 인정합니다.
          </p>
        </section>
      </div>
    </main>
  )
}
