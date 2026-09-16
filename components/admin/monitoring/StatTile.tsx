'use client'

type Tone = 'neutral' | 'good' | 'bad'

/** Grafana 상단 오버뷰 줄의 작은 stat 타일. 값에 의미가 있을 때만(healthy/failing) 배경을
 *  살짝 채운다 — 나머지는 어두운 배경을 유지해서 정말 중요한 타일만 눈에 띄게 한다. */
export default function StatTile({
  label,
  value,
  tone = 'neutral',
  fill = false,
  hint
}: {
  label: string
  value: string
  tone?: Tone
  fill?: boolean
  hint?: string
}) {
  const valueColor = tone === 'good' ? 'text-[#73bf69]' : tone === 'bad' ? 'text-[#f2495c]' : 'text-white'
  const bg = fill ? (tone === 'good' ? 'bg-[#73bf691a]' : tone === 'bad' ? 'bg-[#f2495c1a]' : 'bg-[#0d0d0d]') : 'bg-[#0d0d0d]'

  return (
    <div className={`border border-[#222222] rounded-[2px] px-2.5 py-2 flex flex-col justify-between min-w-0 ${bg}`} title={hint}>
      <span className="text-[9px] text-[#888888] uppercase tracking-wide truncate">{label}</span>
      <span className={`text-lg font-bold font-mono leading-tight ${valueColor}`}>{value}</span>
    </div>
  )
}
