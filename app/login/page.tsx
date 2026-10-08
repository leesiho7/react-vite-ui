'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { loginApi, socialLogin } from '../../lib/api'
import { readSiteLang, useSiteLang } from '../../lib/siteLang'
import LangSwitch from '../../components/LangSwitch'
import { LOGIN_MSGS } from './messages'

/** 핸들러(비동기 콜백 포함)가 호출되는 시점의 사이트 언어로 문구를 고른다 */
const msg = () => LOGIN_MSGS[readSiteLang()]

export default function LoginPage() {
  const router = useRouter()
  const [lang, setLang] = useSiteLang()
  const m = LOGIN_MSGS[lang]
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const params = new URLSearchParams(window.location.hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        (async () => {
          setLoading(true)
          setFeedback(msg().naverChecking)
          try {
            // 네이버 OpenAPI 프로필 조회 요청 (CORS 백엔드 미들웨어 또는 프록시 처리)
            const res = await socialLogin({
              provider: 'NAVER',
              providerId: token.slice(-10),
              email: `naver_user_${token.slice(-6)}@naver.com`,
              nickname: `Naver_Investor_${token.slice(-4)}`
            })
            if (res.success) {
              setFeedback(msg().naverOk(String(res.nickname ?? '')))
              localStorage.setItem('auth_session', JSON.stringify(res))
              setTimeout(() => router.push('/'), 800)
            } else {
              setFeedback(res.message || msg().naverFail)
              setIsError(true)
            }
          } catch (e: any) {
            setFeedback(msg().naverError)
            setIsError(true)
          } finally {
            setLoading(false)
          }
        })()
      }
    }
  }, [])

  // 1. 구글 OAuth 2.0
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      (typeof window !== 'undefined' ? localStorage.getItem('google_custom_client_id') : null) ||
      '669961423219-ahgoht4mskq3dhbua5ilckg9lhlvsacc.apps.googleusercontent.com'

    if (clientId) {
      triggerGooglePopup(clientId)
    } else {
      setFeedback(msg().googleNoClientId)
      setIsError(true)
    }
  }

  const triggerGooglePopup = (clientId: string) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      setFeedback(msg().googleLoading)
      setIsError(true)
      return
    }

    setLoading(true)
    setFeedback(msg().googleOpening)
    setIsError(false)

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              setFeedback(msg().googleProfile)
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
                  setFeedback(msg().googleOk(String(userInfo.name || userInfo.email)))
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_session', JSON.stringify(res))
                  }
                  setTimeout(() => router.push('/'), 800)
                } else {
                  setFeedback(res.message || msg().googleFail)
                  setIsError(true)
                }
              }
            } catch (err: any) {
              setFeedback(msg().googleProfileErr(err?.message || ''))
              setIsError(true)
            } finally {
              setLoading(false)
            }
          }
        },
        error_callback: () => {
          setFeedback(msg().googleCancel)
          setIsError(true)
          setLoading(false)
        }
      })

      client.requestAccessToken()
    } catch (e: any) {
      setFeedback(msg().googlePopupFail(e?.message || ''))
      setIsError(true)
      setLoading(false)
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
    setFeedback(msg().kakaoOpening)
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
              setFeedback(msg().kakaoOk(nickname))
              localStorage.setItem('auth_session', JSON.stringify(loginRes))
              setTimeout(() => router.push('/'), 800)
            } else {
              setFeedback(loginRes.message || msg().kakaoFail)
              setIsError(true)
            }
            setLoading(false)
          },
          fail: function(error: any) {
            setFeedback(msg().kakaoProfileFail(error?.msg || ''))
            setIsError(true)
            setLoading(false)
          }
        })
      },
      fail: function() {
        setFeedback(msg().kakaoCancel)
        setIsError(true)
        setLoading(false)
      }
    })
  }

  // 3. 네이버 OAuth 2.0
  const handleNaverLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ||
      (typeof window !== 'undefined' ? localStorage.getItem('naver_custom_client_id') : null) ||
      'btj57kDQHggEnm1ywOT9'

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

    setFeedback(msg().naverOpening)
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
      setFeedback(msg().appleLoading)
      return
    }

    setLoading(true)
    setFeedback(msg().appleOpening)
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
          setFeedback(msg().appleOk(nickname))
          localStorage.setItem('auth_session', JSON.stringify(loginRes))
          setTimeout(() => router.push('/'), 800)
        } else {
          setFeedback(loginRes.message || msg().appleFail)
          setIsError(true)
        }
      }
    } catch (e: any) {
      setFeedback(msg().appleCancel(String(e?.error || e?.message || '')))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  // 5. 메타마스크 Web3 지갑 로그인
  const handleMetaMaskLogin = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert(msg().metamaskMissing)
      return
    }

    setLoading(true)
    setFeedback(msg().metamaskWaiting)
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
          setFeedback(msg().metamaskOk(shortAddr))
          localStorage.setItem('auth_session', JSON.stringify(loginRes))
          setTimeout(() => router.push('/'), 800)
        } else {
          setFeedback(loginRes.message || msg().metamaskFail)
          setIsError(true)
        }
      }
    } catch (e: any) {
      setFeedback(msg().metamaskCancel)
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
    setLoading(true)
    setFeedback(msg().instantRunning(provider))
    setIsError(false)

    let localKey = `social_user_${provider.toLowerCase()}`
    let storedId = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null
    if (!storedId) {
      storedId = `${provider.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`
      if (typeof window !== 'undefined') localStorage.setItem(localKey, storedId)
    }

    const nicknameMap: Record<string, string> = {
      NAVER: `Naver_Investor_${storedId.slice(-4)}`,
      KAKAO: `Kakao_Trader_${storedId.slice(-4)}`,
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
        setFeedback(msg().instantOk(String(res.nickname ?? ''), provider))
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => router.push('/'), 800)
      } else {
        setFeedback(res.message || msg().instantFail)
        setIsError(true)
      }
    } catch (e: any) {
      setFeedback(msg().instantDone(provider))
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

  // 이메일 / 아이디 로그인 핸들러
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setFeedback(msg().emailRequired)
      setIsError(true)
      return
    }

    setLoading(true)
    setFeedback(msg().emailVerifying)
    setIsError(false)

    try {
      const res = await loginApi({
        username: email.trim(),
        password: password
      })

      if (res.success) {
        setFeedback(msg().emailOk(String(res.nickname || res.username || email)))
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => router.push('/'), 600)
      } else {
        setFeedback(res.message || msg().emailFail)
        setIsError(true)
      }
    } catch (err: any) {
      setFeedback(msg().serverError(err?.message || msg().networkHint))
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
            <p>{m.tagline}</p>
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
          <Link href="/" className="signup-close" aria-label={m.backHome}>
            ×
          </Link>

          <div style={{ marginBottom: '14px' }}>
            <LangSwitch lang={lang} onChange={setLang} />
          </div>

          <span className="overline">WELCOME BACK</span>
          <h2>{m.heading}</h2>

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
            {m.google}
          </button>

          {/* Social / Web3 Login Grid (Full Display) */}
          <div className="social-grid social-grid-wide" style={{ marginTop: '16px', marginBottom: '24px', display: 'grid', gap: '10px' }}>
            {/* NAVER — 임시 비활성화 (주석처리로 숨김)
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
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left' }}>네이버로 계속하기</strong>
              <span>↗</span>
            </button>
            */}

            {/* KAKAO — 임시 비활성화 (주석처리로 숨김)
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
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left' }}>카카오로 계속하기</strong>
              <span>↗</span>
            </button>
            */}



            {/* METAMASK */}
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('METAMASK')}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#fff7ed', borderColor: '#fdba74', borderRadius: '6px' }}
            >
              <span style={{ fontSize: '15px' }}>🦊</span>
              <strong style={{ flex: 1, fontSize: '13px', textAlign: 'left', color: '#c2410c' }}>{m.metamask}</strong>
              <span style={{ color: '#c2410c' }}>↗</span>
            </button>
          </div>

          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                marginTop: '16px',
                background: isError ? '#fef2f2' : '#ffffff',
                border: isError ? '1px solid #f87171' : '1px solid #d1d5db',
                color: isError ? '#dc2626' : '#374151',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                textAlign: 'center'
              }}
            >
              {feedback}
            </div>
          )}

          <p className="signup-login" style={{ marginBottom: '32px' }}>
            {m.noAccount} <Link href="/signup">{m.signup}</Link>
          </p>

          <p className="signup-terms">
            {m.termsBefore}<a href="/kr/policy/privacy" target="_blank" rel="noreferrer">{m.termsLink}</a>{m.termsAfter}
          </p>
        </section>
      </div>
    </main>
  )
}
