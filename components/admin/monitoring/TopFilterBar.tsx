'use client'

import { OnnxBacktestArchetypeKey } from '@/lib/types'

const ARCHETYPES: OnnxBacktestArchetypeKey[] = [
  'TREND_FOLLOWING',
  'MEAN_REVERSION',
  'BREAKOUT',
  'RSI_STANDALONE',
  'VWAP_TREND',
  'MACD_CROSSOVER',
  'MA_RIBBON',
  'BOLLINGER_SQUEEZE_BREAKOUT',
  'ATR_VOLATILITY_BREAKOUT'
]

/**
 * 얇은 다크 바에 필터 드롭다운을 한 줄로 배치한다. "Timeframe"은 지금 백테스트가 항상
 * H1 8,000봉 고정이라 실제로 바꿀 게 없어서, 작동하는 척하는 드롭다운 대신 정보성 배지로만
 * 둔다 — 안 되는 기능을 되는 것처럼 보이면 안 된다.
 */
export default function TopFilterBar({
  symbol,
  onSymbolChange,
  archetype,
  onArchetypeChange,
  liveRefresh,
  onLiveRefreshChange,
  onRun,
  running
}: {
  symbol: string
  onSymbolChange: (v: string) => void
  archetype: OnnxBacktestArchetypeKey
  onArchetypeChange: (v: OnnxBacktestArchetypeKey) => void
  liveRefresh: boolean
  onLiveRefreshChange: (v: boolean) => void
  onRun: () => void
  running: boolean
}) {
  return (
    <div className="flex items-center flex-wrap gap-2 bg-[#111111] border border-[#222222] rounded-[2px] px-2.5 py-1.5 mb-3">
      <FilterSelect label="Strategy" value={archetype} onChange={(v) => onArchetypeChange(v as OnnxBacktestArchetypeKey)}>
        {ARCHETYPES.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </FilterSelect>

      <FilterInput label="Asset" value={symbol} onChange={onSymbolChange} />

      <span className="text-[9px] text-[#555555] border border-[#222222] rounded-[2px] px-1.5 py-1">
        Timeframe: H1 (fixed)
      </span>

      <button
        type="button"
        onClick={() => onLiveRefreshChange(!liveRefresh)}
        className={`flex items-center gap-1.5 text-[9px] font-semibold px-2 py-1 rounded-[2px] border ${
          liveRefresh ? 'border-[#73bf69] text-[#73bf69] bg-[#73bf691a]' : 'border-[#222222] text-[#888888]'
        }`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${liveRefresh ? 'bg-[#73bf69] animate-pulse' : 'bg-[#444444]'}`} />
        Live Refresh {liveRefresh ? 'ON' : 'OFF'}
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="text-[10px] font-bold px-3 py-1 rounded-[2px] bg-[#f47a20] text-black disabled:opacity-50"
      >
        {running ? 'RUNNING…' : 'RUN BACKTEST'}
      </button>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-[#888888]">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[9px] text-[#dddddd] px-1 py-1"
      >
        {children}
      </select>
    </label>
  )
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-[#888888]">
      {label}:
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[9px] text-[#dddddd] px-1.5 py-1 w-16"
      />
    </label>
  )
}
