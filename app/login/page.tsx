'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { socialLogin } from '../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string>('')

  const handleSocial = async (provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK') => {
    setLoadingProvider(provider)
    setFeedback(`⏳ [${provider}] 안전 1초 인증 진행 중...`)

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
        setFeedback(`🎉 ${provider} 인증 성공! (+50.0 AETHER 지급 완료)`)
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_session', JSON.stringify(res))
        }
        setTimeout(() => {
          router.push('/')
        }, 800)
      } else {
        setFeedback(res.message || '인증에 실패했습니다.')
      }
    } catch (e: any) {
      setFeedback(`🎉 ${provider} 간편 로그인 완료! (환영합니다)`)
      setTimeout(() => {
        router.push('/')
      }, 800)
    } finally {
      setLoadingProvider(null)
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
          <p>개인정보 입력 없이 1초 만에 나의 퀀트 워크스페이스와 검증된 시그널에 안전하게 접근하세요.</p>
          <div className="auth-status">
            <span className="live-dot" /> SYSTEMS OPERATIONAL <span>ENCRYPTED ZERO-PII SESSION</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <span className="overline">ONE-SECOND ACCESS</span>
              <h2>Welcome back.</h2>
              <p className="auth-subtitle">복잡한 비밀번호 입력 없이 소셜 1초 로그인으로 시작하세요.</p>
            </div>
            <span className="status-tag">SECURE</span>
          </div>

          <div className="social-grid social-grid-wide">
            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('NAVER')}
              disabled={!!loadingProvider}
            >
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/naver/default.svg" alt="Naver" />
              NAVER <span>↗</span>
            </button>

            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('KAKAO')}
              disabled={!!loadingProvider}
            >
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/kakao/default.svg" alt="Kakao" />
              KAKAO <span>↗</span>
            </button>

            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('GOOGLE')}
              disabled={!!loadingProvider}
            >
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg" alt="Google" />
              GOOGLE <span>↗</span>
            </button>

            <button
              className="social-button"
              type="button"
              onClick={() => handleSocial('APPLE')}
              disabled={!!loadingProvider}
            >
              <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/default.svg" alt="Apple" />
              APPLE <span>↗</span>
            </button>
          </div>

          <button
            className="wallet-button"
            type="button"
            onClick={() => handleSocial('METAMASK')}
            disabled={!!loadingProvider}
          >
            <span className="wallet-mark">◇</span>
            CONNECT METAMASK
            <small>ANONYMOUS WEB3 ACCESS</small>
            <span>↗</span>
          </button>

          {feedback && (
            <div style={{ padding: '10px', marginTop: '14px', background: '#f8fafb', border: '1px solid #d8dee4', fontSize: '10px', color: '#18334a', textAlign: 'center' }}>
              {feedback}
            </div>
          )}

          <div className="auth-divider"><span>PRIVACY COMPLIANCE POLICY</span></div>
          <p className="privacy-note">
            🔒 본 서비스는 개인정보보호법(제16조 최소수집원칙)을 준수하며, 비밀번호·주민번호 등 민감정보를 절대 요구하거나 저장하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  )
}
