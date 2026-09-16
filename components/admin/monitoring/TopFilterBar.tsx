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

/** 실제로 백엔드가 지원하는 타임프레임은 H1 하나뿐이다(OnnxVetoBacktestService가 항상
 *  TimeFrame.H1 8,000봉으로 고정 조회). 나머지는 드롭다운에 "미구현"으로 남겨두고
 *  네이티브 disabled로 회색 처리한다 — 옵션을 아예 숨기면 "이것도 되나?" 싶은 궁금증에
 *  답을 안 주는 것이고, 몰래 켜둔 채로 두면 안 되는 걸 되는 척하는 것이라 둘 다 피한다. */
const TIMEFRAMES: { value: string; label: string; implemented: boolean }[] = [
  { value: 'H1', label: 'H1', implemented: true },
  { value: 'H4', label: 'H4 (미구현)', implemented: false },
  { value: 'D1', label: 'D1 (미구현)', implemented: false },
  { value: 'W1', label: 'W1 (미구현)', implemented: false }
]

/**
 * 얇은 다크 바에 필터 드롭다운을 한 줄로 배치한다. 실제로 동작하지 않는 옵션(전체 전략
 * 집계, H1 외 타임프레임)은 지우지 않고 드롭다운 안에 회색(비활성)으로 남겨서 "이건 아직
 * 안 된다"는 걸 명시한다 — mock 데이터로 채워서 되는 척하지 않는다.
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
    <div className="mb-3">
      <div className="flex items-center flex-wrap gap-2 bg-[#111111] border border-[#222222] rounded-[2px] px-2.5 py-1.5">
        <FilterSelect label="Strategy" value={archetype} onChange={(v) => onArchetypeChange(v as OnnxBacktestArchetypeKey)}>
          <option disabled value="__ALL__" className="text-[#555555]">전체 전략 (미구현)</option>
          {ARCHETYPES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </FilterSelect>

        <FilterInput label="Asset" value={symbol} onChange={onSymbolChange} />

        <FilterSelect label="Timeframe" value="H1" onChange={() => {}} disabled={false}>
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value} disabled={!tf.implemented} className={!tf.implemented ? 'text-[#555555]' : ''}>
              {tf.label}
            </option>
          ))}
        </FilterSelect>

        <button
          type="button"
          onClick={() => onLiveRefreshChange(!liveRefresh)}
          title="모델 상태와 실전 거부권 정확도만 자동 갱신됩니다 — 백테스트/차트는 RUN BACKTEST로 수동 갱신"
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
      <p className="text-[8px] text-[#555555] mt-1">회색으로 흐리게 표시된 항목은 아직 구현되지 않아 선택할 수 없습니다.</p>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-[#888888]">
      {label}:
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0d0d0d] border border-[#222222] rounded-[2px] text-[9px] text-[#dddddd] px-1 py-1 disabled:opacity-50"
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
