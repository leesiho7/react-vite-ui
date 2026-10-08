'use client'

import { useEffect, useState } from 'react'
import PairsTerminal from './PairsTerminal'
import ArbitrageTerminal from './ArbitrageTerminal'
import KimchiTerminal from './KimchiTerminal'
import { TerminalLang, TerminalLangProvider } from '@/lib/terminalI18n'

type TabKey = 'pairs' | 'arb' | 'kimchi'

const HASH: Record<TabKey, string> = { pairs: '#pairs-terminal', arb: '#pairs-terminal/arb', kimchi: '#pairs-terminal/kimchi' }

const TABS: { key: TabKey; label: string; hint: { ko: string; en: string } }[] = [
  { key: 'pairs', label: 'PAIRS', hint: { ko: '통계적 페어(평균회귀) 연구', en: 'Statistical pairs (mean reversion) research' } },
  { key: 'arb', label: 'ARBITRAGE', hint: { ko: '거래소 간 펀딩 차익 확률·통계', en: 'Cross-exchange funding-arbitrage probabilities & stats' } },
  { key: 'kimchi', label: 'KIMCHI', hint: { ko: '김치 프리미엄 분포·평균회귀 통계', en: 'Kimchi-premium distribution & mean-reversion stats' } }
]

/**
 * 상단 "터미널" 탭 안의 하위 탭 — 세 화면 모두 같은 Grafana 스타일 부모를 쓴다.
 * 주소로 바로 열 수 있다: #pairs-terminal (페어) / #pairs-terminal/arb (차익) / #pairs-terminal/kimchi (김프).
 * language: 사이트 언어. 'ko' 이외(en/cn)는 영어로 보여준다.
 */
export default function TerminalShell({ language = 'en' }: { language?: TerminalLang }) {
  const [tab, setTab] = useState<TabKey>('pairs')
  const lang = language === 'ko' ? 'ko' : 'en'

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.toLowerCase()
      setTab(h.includes('/kimchi') ? 'kimchi' : h.includes('/arb') ? 'arb' : 'pairs')
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const select = (key: TabKey) => {
    setTab(key)
    // replaceState 는 hashchange 를 일으키지 않아 상위 뷰 전환 로직을 건드리지 않는다
    window.history.replaceState(null, '', HASH[key])
  }

  return (
    <TerminalLangProvider language={language}>
      <div className="bg-[#0d0d0d]">
        <div className="max-w-[1400px] mx-auto px-4 pt-3 flex items-center gap-1 font-mono">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.hint[lang]}
              onClick={() => select(t.key)}
              className={`text-[11px] sm:text-[10px] font-bold tracking-wide px-3 py-2 sm:py-1 rounded-[2px] border ${
                tab === t.key ? 'border-[#f47a20] text-[#f47a20] bg-[#f47a201a]' : 'border-[#222222] text-[#888888] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="hidden sm:inline text-[9px] text-[#555555] ml-2">{TABS.find((t) => t.key === tab)?.hint[lang]}</span>
        </div>
        {tab === 'pairs' ? <PairsTerminal /> : tab === 'arb' ? <ArbitrageTerminal /> : <KimchiTerminal />}
      </div>
    </TerminalLangProvider>
  )
}
