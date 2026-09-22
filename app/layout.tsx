import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://aetherquantstudio.com'),
  title: 'AETHER — Market Intelligence Terminal',
  description: 'Institutional-grade market intelligence for decision makers.',
  keywords: ['퀀트', 'AI 트레이딩', '바이낸스 호가창', '비트코인 선물', 'ONNX', 'AETHER', '코인 10연승', '퀀트 매매 분석'],
  generator: 'v0.app',
  icons: {
    icon: '/brand-logo.png',
    apple: '/brand-logo.png',
    shortcut: '/brand-logo.png',
  },
  // 오픈그래프 썸네일 이미지 직접 지정 — 링크 공유 시 카톡/슬랙/트위터 등에서 보이는 미리보기 이미지
  openGraph: {
    title: 'AETHER — Market Intelligence Terminal',
    description: 'Institutional-grade market intelligence for decision makers.',
    url: 'https://aetherquantstudio.com',
    siteName: 'AETHER',
    images: [
      {
        url: '/brand-logo.png',
        width: 2048,
        height: 2048,
        alt: 'AETHER Official Logo',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AETHER — Market Intelligence Terminal',
    description: 'Institutional-grade market intelligence for decision makers.',
    images: ['/brand-logo.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3f5f7',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
