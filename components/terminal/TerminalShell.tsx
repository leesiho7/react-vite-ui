'use client'

import { useEffect, useState } from 'react'
import PairsTerminal from './PairsTerminal'
import ArbitrageTerminal from './ArbitrageTerminal'

type TabKey = 'pairs' | 'arb'

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: 'pairs', label: 'PAIRS', hint: '통계적 페어(평균회귀) 연구' },
  { key: 'arb', label: 'ARBITRAGE', hint: '거래소 간 펀딩 차익 확률·통계' }
]

/**
 * 상단 "터미널" 탭 안의 하위 탭. 두 화면 모두 같은 Grafana 스타일 부품을 쓴다.
 * 주소로 바로 열 수 있다: #pairs-terminal (페어) / #pairs-terminal/arb (차익).
 */
export default function TerminalShell() {
  const [tab, setTab] = useState<TabKey>('pairs')

  useEffect(() => {
    const fromHash = () => setTab(window.location.hash.toLowerCase().includes('/arb') ? 'arb' : 'pairs')
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const select = (key: TabKey) => {
    setTab(key)
    // replaceState 는 hashchange 를 일으키지 않아 상위 뷰 전환 로직을 건드리지 않는다
    window.history.replaceState(null, '', key === 'arb' ? '#pairs-terminal/arb' : '#pairs-terminal')
  }

  return (
    <div className="bg-[#0d0d0d]">
      <div className="max-w-[1400px] mx-auto px-4 pt-3 flex items-center gap-1 font-mono">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            title={t.hint}
            onClick={() => select(t.key)}
            className={`text-[10px] font-bold tracking-wide px-3 py-1 rounded-[2px] border ${
              tab === t.key ? 'border-[#f47a20] text-[#f47a20] bg-[#f47a201a]' : 'border-[#222222] text-[#888888] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="text-[9px] text-[#555555] ml-2">{TABS.find((t) => t.key === tab)?.hint}</span>
      </div>
      {tab === 'pairs' ? <PairsTerminal /> : <ArbitrageTerminal />}
    </div>
  )
}
