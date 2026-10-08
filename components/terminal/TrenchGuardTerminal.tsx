'use client'

import { useCallback, useEffect, useState } from 'react'
import StatTile from '@/components/admin/monitoring/StatTile'
import SectionHeader from '@/components/admin/monitoring/SectionHeader'
import PanelFrame from '@/components/admin/monitoring/PanelFrame'
import BarChartPanel from '@/components/admin/monitoring/BarChartPanel'
import { fetchTrenchGuard } from '@/lib/api'
import { TerminalLang, TerminalLangProvider, useT, useTerminalLang } from '@/lib/terminalI18n'

interface Overview {
  now: number
  live: boolean
  collector_last_token_ms: number | null
  tokens: number
  tokens_24h: number
  tokens_1h: number
  trades: number
  scored: number
  label_after_hours: number
  pass_threshold: number
  labels: { decided: number; rugged: number; normal: number; undecidable: number; pending: number; rug_rate: number | null; min_sample: number }
  score_distribution: { lo: number; n: number }[]
  blacklist: number
  families: number
  funder?: {
    resolved: number
    too_old: number
    unresolved: number
    creators_pending: number
    clusters: number
    exchange_like: number
    credits_today: number
    daily_cap: number
  }
}
interface PaperGroup {
  n: number
  mean: number
  median: number
  win_rate: number
  take: number
  stop: number
  time: number
  worst_decile: number
}
interface Paper {
  groups: Record<string, PaperGroup>
  pass_minus_reject: { mean: number; lo: number; hi: number } | null
  params: Record<string, number>
  min_sample: number
}
interface FeedRow {
  mint: string
  symbol: string | null
  name: string | null
  creator: string
  created_at: number
  last_mcap_sol: number | null
  migrated_at: number | null
  trades_stored: number | null
  total: number | null
  passed: number | null
  label_rug: number | null
}
interface Lift {
  n: number
  min_sample: number
  base: number | null
  buckets: { lo: number; n: number; rug_rate: number }[]
  sweep: { T: number; reject_n: number; reject_rug: number | null; pass_n: number; pass_rug: number | null; lift: number | null; recall: number | null }[]
  prior: { k: number; n: number; rug_rate: number | null }[]
}
interface Repeater {
  creator: string
  rugged_labels: number
  tokens: number
}

interface Detail {
  token: { mint: string; symbol: string | null; name: string | null; creator: string; created_at: number; last_mcap_sol: number | null; migrated: boolean; trades_stored: number | null }
  score: {
    total: number
    passed: boolean
    breakdown: { categories: Record<string, { points: number; max: number; metrics: Record<string, { value: number | null; points: number; note?: string }> }>; reasons?: string[]; info?: Record<string, unknown> } | null
  } | null
  label: { rug: number | null; dump80: number | null; drawdown: number | null; peak_mcap_sol: number | null } | null
  creator_history: { tokens_in_db: number; labeled: number; rugged: number; blacklisted: boolean; recent: { mint: string; symbol: string | null; created_at: number; label_rug: number | null; drawdown_from_peak: number | null }[]; note: string }
  funder: { address: string | null; sol: number | null; status: string | null; cluster: { member_count: number; tokens_launched: number; tokens_rugged: number; is_rug_family_candidate: number; is_exchange_like: number } | null } | null
  links: Record<string, string>
}

const METRIC_LABEL: Record<string, string> = {
  same_slot_wallets: '생성 직후 같은 슬롯 외부 지갑 수',
  bundle_supply_share: '번들 매수 공급 비중',
  dev_plus_linked_share: '개발자+연관 지갑 비중',
  size_cv: '매수 크기 변동계수',
  repeat_size_ratio: '비슷한 크기 매수 비율',
  interval_cv: '슬롯 간격 변동계수',
  volume_per_new_holder: '매수자당 거래량(SOL)',
  creator_prior_tokens: '개발자 과거 토큰 수(로컬 DB)',
  creator_prior_rug_ratio: '개발자 과거 러그 비율',
  early_buyers_flagged_ratio: '초기 매수자 중 위험 지갑 비율',
  top1_share_supply: '최대 보유 지갑 지분(총공급)',
  top5_share_supply: '상위 5 지갑 지분(총공급)',
  top10_share_supply: '상위 10 지갑 지분(총공급)',
  top5_share_circ: '상위 5 지갑 비중(유통분)',
  top10_share_circ: '상위 10 지갑 비중(유통분)',
  dev_share_supply: '개발자 보유 지분(총공급)',
  holders: '순매수 보유 지갑 수'
}
const SHARE_KEYS = new Set(['bundle_supply_share', 'dev_plus_linked_share', 'repeat_size_ratio', 'creator_prior_rug_ratio', 'early_buyers_flagged_ratio', 'top1_share_supply', 'top5_share_supply', 'top10_share_supply', 'top5_share_circ', 'top10_share_circ', 'dev_share_supply'])
const fmtMetric = (k: string, v: number | null) => (v == null ? '—' : SHARE_KEYS.has(k) ? `${(v * 100).toFixed(1)}%` : Number.isInteger(v) ? String(v) : v.toFixed(2))

const METRIC_LABEL_EN: Record<string, string> = {
  same_slot_wallets: 'External wallets in the creation slot',
  bundle_supply_share: 'Bundle-bought share of supply',
  dev_plus_linked_share: 'Creator + linked wallets share',
  size_cv: 'Buy-size coefficient of variation',
  repeat_size_ratio: 'Similar-size buy ratio',
  interval_cv: 'Slot-interval coefficient of variation',
  volume_per_new_holder: 'Volume per buyer (SOL)',
  creator_prior_tokens: 'Creator prior tokens (local DB)',
  creator_prior_rug_ratio: 'Creator prior rug ratio',
  early_buyers_flagged_ratio: 'Flagged early-buyer ratio',
  top1_share_supply: 'Largest holder (% of supply)',
  top5_share_supply: 'Top 5 holders (% of supply)',
  top10_share_supply: 'Top 10 holders (% of supply)',
  top5_share_circ: 'Top 5 holders (% of circulating)',
  top10_share_circ: 'Top 10 holders (% of circulating)',
  dev_share_supply: 'Creator holding (% of supply)',
  holders: 'Net-long holders'
}

const FUNDER_STATUS_EN: Record<string, string> = {
  ok: 'Resolved',
  too_old: 'Wallet history too long to find the first deposit (we do not guess)',
  no_sig: 'No transaction history',
  no_transfer: 'Could not identify the SOL source in the first transaction',
  error: 'Lookup error (retrying automatically)'
}

/** 서버가 한글로 내려주는 사유 문구를 영어로 바꾼다. 알 수 없는 문구는 그대로 둔다. */
const SERVER_TEXT_EN: Record<string, string> = {
  '데이터 부족': 'Insufficient data',
  '초기 매수자 없음': 'No early buyers',
  '생성 slot 없음(PumpPortal 보완 수집) → 번들 판정 불가': 'No creation slot (PumpPortal backfill) → bundle not assessable',
  '수집 시작(2026-10-08) 이후 이 시스템이 본 이력만 반영합니다. 그 이전 이력은 알 수 없습니다.': 'Only history this system has seen since collection started (2026-10-08). Earlier history is unknown.'
}
const SERVER_RULES_EN: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^라벨된 과거 토큰 (\d+)개 < (\d+)$/, (m) => `Labeled prior tokens ${m[1]} < ${m[2]}`],
  [/^비개발자 매수 (\d+)건 < (\d+)$/, (m) => `Non-creator buys ${m[1]} < ${m[2]}`],
  [/^생성 슬롯\+(\d+) 내 외부 지갑 (\d+)개가 공급의 ([\d.]+%) 매수, 개발자\+연관 ([\d.]+%)$/, (m) => `${m[2]} external wallets bought ${m[3]} of supply within creation slot+${m[1]}; creator + linked ${m[4]}`],
  [/^개발자 과거 토큰 (\d+)개\(로컬 DB 기준\)$/, (m) => `Creator has ${m[1]} prior tokens (local DB)`],
  [/^하드컷: (.*)$/, (m) => `Hard cut: ${m[1]}`]
]
function serverText(text: string, ko: boolean): string {
  if (ko || !text) return text
  if (SERVER_TEXT_EN[text]) return SERVER_TEXT_EN[text]
  for (const [re, f] of SERVER_RULES_EN) {
    const m = text.match(re)
    if (m) return f(m)
  }
  return text
}

const FUNDER_STATUS: Record<string, string> = {
  ok: '확인됨',
  too_old: '거래 이력이 너무 길어 첫 입금을 찾지 못함(추측하지 않음)',
  no_sig: '거래 기록 없음',
  no_transfer: '첫 거래에서 SOL 입금 출처를 확인하지 못함',
  error: '조회 오류(자동 재시도)'
}

const REFRESH_MS = 5000
const pct = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`)
const short = (s: string) => (s.length > 12 ? `${s.slice(0, 5)}…${s.slice(-4)}` : s)
const ago = (tr: (ko: string, en: string) => string, ms: number, now: number) => {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  return s < 60 ? tr(`${s}초 전`, `${s}s ago`) : s < 3600 ? tr(`${Math.floor(s / 60)}분 전`, `${Math.floor(s / 60)}m ago`) : tr(`${Math.floor(s / 3600)}시간 전`, `${Math.floor(s / 3600)}h ago`)
}

/**
 * TRENCHGUARD — pump.fun 신규 토큰의 초기 위험 신호(번들링·워시·반복 생성자)와 그 사후 라벨(고점 대비 -80% / 유동성 고갈)을
 * 실시간 수집해 보여주는 연구 화면. Grafana 스타일.
 *
 * 데이터: 서버에서 24시간 도는 수집기가 쌓는 SQLite 를 읽기 전용 API(/api/trenchguard/*)로 제공. 5초마다 갱신.
 * 라벨은 자동 휴리스틱이며 특정 지갑·개발자에 대한 사기 주장이 아니다. 표본이 작은 행은 "표본부족"으로 표시하고 결론에 쓰지 않는다.
 */
export default function TrenchGuardTerminal({ language = 'en' }: { language?: TerminalLang }) {
  return (
    <TerminalLangProvider language={language}>
      <TrenchGuardInner />
    </TerminalLangProvider>
  )
}

function TrenchGuardInner() {
  const tr = useT()
  const ko = useTerminalLang() === 'ko'
  const mlabel = (m: string) => (ko ? METRIC_LABEL : METRIC_LABEL_EN)[m] ?? m
  const srv = (s: string) => serverText(s, ko)
  const [ov, setOv] = useState<Overview | null>(null)
  const [feed, setFeed] = useState<FeedRow[]>([])
  const [lift, setLift] = useState<Lift | null>(null)
  const [rep, setRep] = useState<Repeater[]>([])
  const [paper, setPaper] = useState<Paper | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailErr, setDetailErr] = useState(false)
  const [error, setError] = useState(false)
  const [updated, setUpdated] = useState<number | null>(null)

  const loadFast = useCallback(async () => {
    const [o, f] = await Promise.all([fetchTrenchGuard<Overview>('overview'), fetchTrenchGuard<FeedRow[]>('feed?limit=25')])
    if (!o) {
      setError(true)
      return
    }
    setError(false)
    setOv(o)
    if (f) setFeed(f)
    setUpdated(Date.now())
  }, [])

  const loadSlow = useCallback(async () => {
    const [l, r, p] = await Promise.all([
      fetchTrenchGuard<Lift>('lift'),
      fetchTrenchGuard<Repeater[]>('repeaters'),
      fetchTrenchGuard<Paper>('paper')
    ])
    if (l) setLift(l)
    if (r) setRep(r)
    if (p) setPaper(p)
  }, [])

  useEffect(() => {
    loadFast()
    loadSlow()
    const a = setInterval(loadFast, REFRESH_MS)
    const b = setInterval(loadSlow, 60_000)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [loadFast, loadSlow])

  useEffect(() => {
    if (!sel) {
      setDetail(null)
      return
    }
    let alive = true
    const load = async () => {
      const d = await fetchTrenchGuard<Detail>(`token?mint=${encodeURIComponent(sel)}`)
      if (!alive) return
      setDetailErr(!d)
      if (d) setDetail(d)
    }
    setDetail(null)
    setDetailErr(false)
    load()
    const t = setInterval(load, 10_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [sel])

  const L = ov?.labels
  const enough = (n: number) => n >= (L?.min_sample ?? 30)
  const noLabels = !L || L.decided === 0

  return (
    <div className="bg-[#0d0d0d] px-4 py-4 font-mono">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
              AETHER · TRENCHGUARD
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] border ${ov?.live ? 'border-[#73bf69]/50 text-[#73bf69]' : 'border-[#f2495c]/50 text-[#f2495c]'}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${ov?.live ? 'bg-[#73bf69] animate-pulse' : 'bg-[#f2495c]'}`} />
                {ov ? (ov.live ? 'COLLECTOR LIVE' : 'COLLECTOR STALE') : 'CONNECTING'}
              </span>
            </h2>
            <p className="text-[9px] text-[#555555] mt-0.5">
              {tr(`pump.fun 신규 토큰 실시간 수집 · 생성 후 180초 시점 위험 점수(번들링·워시·과거 이력) · 사후 라벨(생성 ${ov?.label_after_hours ?? 6}시간 기준 고점 대비 -80% 또는 유동성 고갈) · ${REFRESH_MS / 1000}초 갱신`,
                `Live collection of new pump.fun tokens · risk score at 180s after creation (bundling · wash trading · history) · post-hoc label (-80% from peak or liquidity dried up, judged ${ov?.label_after_hours ?? 6}h after creation) · refreshes every ${REFRESH_MS / 1000}s`)}
            </p>
          </div>
          <span className="text-[9px] text-[#e0b400] border border-[#e0b400]/40 rounded-[2px] px-2 py-1 max-w-[560px]">
            {tr('연구·교육용 · 투자 권유 아님 · 라벨은 자동 휴리스틱이며 특정 지갑에 대한 사기 주장이 아님 · 과거 통계는 미래를 보장하지 않음', 'For research & education only · Not investment advice · Labels are automatic heuristics, not an accusation of fraud against any wallet · Past statistics do not guarantee future results')}
          </span>
        </div>

        {error && <p className="text-[10px] text-[#f2495c] mb-3">{tr('TrenchGuard 데이터를 불러오지 못했습니다. 잠시 후 자동으로 다시 시도합니다. (지어낸 값으로 대체하지 않습니다)', 'Failed to load TrenchGuard data. Retrying automatically. (We never substitute made-up values.)')}</p>}

        <SectionHeader label="Overview">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1.5">
            <StatTile label="Tokens tracked" value={ov ? ov.tokens.toLocaleString() : '—'} hint={tr('수집기가 지금까지 기록한 신규 토큰 수', 'New tokens recorded by the collector so far')} />
            <StatTile label="New · 1h" value={ov ? ov.tokens_1h.toLocaleString() : '—'} tone={ov?.live ? 'good' : 'neutral'} />
            <StatTile label="New · 24h" value={ov ? ov.tokens_24h.toLocaleString() : '—'} />
            <StatTile label="Trades stored" value={ov ? ov.trades.toLocaleString() : '—'} hint={tr('토큰당 처음 5분(통과 토큰은 1시간) 거래 원장', 'Trade ledger: first 5 minutes per token (1 hour for tokens that pass)')} />
            <StatTile label="Stage-2 scored" value={ov ? ov.scored.toLocaleString() : '—'} hint={tr('생성 후 180초 시점에 점수가 매겨진 토큰 수', 'Tokens scored at 180s after creation')} />
            <StatTile label="Last token" value={ov?.collector_last_token_ms ? ago(tr, ov.collector_last_token_ms, ov.now) : '—'} tone={ov ? (ov.live ? 'good' : 'bad') : 'neutral'} fill />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mb-1">
            <StatTile label="Labeled" value={L ? L.decided.toLocaleString() : '—'} tone={L && !enough(L.decided) ? 'bad' : 'neutral'} hint={L ? tr(`판정불가(수집 공백·거래 없음) ${L.undecidable} · 대기 중 ${L.pending}`, `Undecidable (collection gap / no trades) ${L.undecidable} · pending ${L.pending}`) : undefined} />
            <StatTile label="Rug rate" value={L ? pct(L.rug_rate) : '—'} tone={L && L.rug_rate != null && L.rug_rate > 0.5 ? 'bad' : 'neutral'} hint={L && !enough(L.decided) ? tr(`표본 ${L.decided}건 < ${L.min_sample} — 참고만`, `Sample ${L.decided} < ${L.min_sample} — for reference only`) : tr('라벨 완료 토큰 중 RUGGED 비율', 'Share of RUGGED among labeled tokens')} />
            <StatTile label="Rugged" value={L ? L.rugged.toLocaleString() : '—'} />
            <StatTile label="Normal" value={L ? L.normal.toLocaleString() : '—'} />
            <StatTile label="Pending" value={L ? L.pending.toLocaleString() : '—'} hint={tr(`생성 후 ${ov?.label_after_hours ?? 6}시간이 지나야 라벨이 붙습니다`, `A label is assigned ${ov?.label_after_hours ?? 6}h after creation`)} />
            <StatTile label="Blacklist / Families" value={ov ? `${ov.blacklist} / ${ov.families}` : '—'} hint={tr('RUGGED 라벨이 누적된 개발자 지갑 수 / 같은 자금 출처 군집 후보 수', 'Creator wallets with accumulated RUGGED labels / candidate same-funder clusters')} />
          </div>
          {ov?.funder && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 mt-1.5">
              <StatTile label="Funders resolved" value={ov.funder.resolved.toLocaleString()} tone={ov.funder.resolved > 0 ? 'good' : 'neutral'} hint={tr('첫 SOL 입금 출처를 찾은 지갑 수 (개발자 지갑 우선)', 'Wallets whose first SOL deposit source was found (creator wallets first)')} />
              <StatTile label="Funder queue" value={ov.funder.creators_pending.toLocaleString()} hint={tr('아직 출처를 조회하지 않은 개발자 지갑 수', 'Creator wallets not looked up yet')} />
              <StatTile label="Too old / n.a." value={`${ov.funder.too_old} / ${ov.funder.unresolved}`} hint={tr('거래 이력이 너무 길거나(추측하지 않음) 입금 출처를 확인하지 못한 지갑', 'Wallets with too long a history (we do not guess) or whose deposit source could not be identified')} />
              <StatTile label="Funder clusters" value={`${ov.funder.clusters}`} hint={tr(`같은 출처에서 자금을 받은 지갑 묶음 · 거래소/분배 지갑 추정 ${ov.funder.exchange_like}개는 제외`, `Groups of wallets funded by the same source · ${ov.funder.exchange_like} suspected exchange/distribution wallets excluded`)} />
              <StatTile label="Credits today (est.)" value={`${Math.round(ov.funder.credits_today).toLocaleString()} / ${ov.funder.daily_cap.toLocaleString()}`} tone={ov.funder.credits_today >= ov.funder.daily_cap ? 'bad' : 'neutral'} hint={tr('자금 출처 조회에 쓴 추정 Helius 크레딧과 일일 상한 (UTC 기준, 메서드별 단가로 환산한 추정치)', 'Estimated Helius credits used for funding-source lookups vs the daily cap (UTC; estimated from per-method unit costs)')} />
            </div>
          )}
          {noLabels && ov && (
            <p className="text-[9px] text-[#e0b400] mt-1.5">
              {tr(`라벨은 토큰 생성 후 ${ov.label_after_hours}시간이 지나야 붙기 시작합니다. 그 전에는 점수 분포와 실시간 피드만 의미가 있습니다.`, `Labels start to appear ${ov.label_after_hours}h after a token is created. Until then only the score distribution and the live feed are meaningful.`)}
            </p>
          )}
        </SectionHeader>

        {sel && (
          <SectionHeader label={tr('Token Detail — 선택한 토큰', 'Token Detail — selected token')}>
            {detailErr && <p className="text-[10px] text-[#f2495c] mb-2">{tr('상세 정보를 불러오지 못했습니다. (지어낸 값으로 대체하지 않습니다)', 'Failed to load details. (We never substitute made-up values.)')}</p>}
            {!detail && !detailErr && <p className="text-[10px] text-[#555555] mb-2">{tr('불러오는 중…', 'Loading…')}</p>}
            {detail && (
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="text-[11px] text-white font-bold">
                    {detail.token.symbol || '—'} <span className="text-[#888888] font-normal">{detail.token.name}</span>
                    <span className="ml-2 text-[9px] text-[#555555] font-normal">{detail.token.mint}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(detail.links).map(([k, u]) => (
                      <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#5794f2] border border-[#222222] rounded-[2px] px-1.5 py-0.5 hover:border-[#5794f2] uppercase">{k}</a>
                    ))}
                    <button type="button" onClick={() => setSel(null)} className="text-[9px] text-[#888888] border border-[#222222] rounded-[2px] px-1.5 py-0.5 hover:text-white">{tr('닫기', 'Close')} ✕</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <PanelFrame title="SCORE BREAKDOWN" subtitle={detail.score ? tr(`합계 ${detail.score.total.toFixed(1)}점 · ${detail.score.passed ? 'PASS' : 'REJECT'}`, `Total ${detail.score.total.toFixed(1)} pts · ${detail.score.passed ? 'PASS' : 'REJECT'}`) : tr('아직 판정 전(생성 후 180초)', 'Not scored yet (180s after creation)')}>
                    {detail.score?.breakdown ? (
                      <div className="space-y-2">
                        {Object.entries(detail.score.breakdown.categories).filter(([c]) => c !== 'concentration' && c !== 'extra').map(([c, v]) => (
                          <div key={c}>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-[#dddddd] uppercase">{c}</span>
                              <span className="text-white font-bold">{v.points.toFixed(1)} / {v.max}</span>
                            </div>
                            <div className="h-1 bg-[#1a1a1a] mb-1"><div className="h-1 bg-[#f47a20]" style={{ width: `${v.max ? Math.min(100, (v.points / v.max) * 100) : 0}%` }} /></div>
                            {Object.entries(v.metrics).map(([m, d]) => (
                              <div key={m} className="flex justify-between text-[9px] text-[#888888]" title={srv(d.note ?? '')}>
                                <span>{mlabel(m)}</span>
                                <span className={d.value == null ? 'text-[#555555]' : 'text-[#dddddd]'}>{d.value == null ? `— ${srv(d.note ?? '')}` : fmtMetric(m, d.value)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                        {(detail.score.breakdown.reasons ?? []).map((r, i) => (
                          <p key={i} className="text-[9px] text-[#e0b400]">· {srv(r)}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#555555]">{tr('점수는 생성 후 180초에 확정됩니다.', 'The score is finalized 180s after creation.')}</p>
                    )}
                  </PanelFrame>

                  <PanelFrame title="HOLDER CONCENTRATION" subtitle={tr('판정 시점까지의 거래로 계산한 순보유량 기준 (기록 전용 · 점수 미반영)', 'Based on net holdings from trades up to scoring time (record only · not part of the score)')}>
                    {detail.score?.breakdown?.categories.concentration ? (
                      <div className="space-y-1">
                        {Object.entries(detail.score.breakdown.categories.concentration.metrics).map(([m, d]) => (
                          <div key={m} className="flex justify-between text-[10px]">
                            <span className="text-[#888888]">{mlabel(m)}</span>
                            <span className="text-white font-bold">{fmtMetric(m, d.value)}</span>
                          </div>
                        ))}
                        <p className="text-[8px] text-[#555555] pt-1">{tr('지갑 간 직접 전송은 보이지 않고, 판정 전 거래만 반영합니다. 집중도가 높다고 곧 폭락한다는 뜻은 아니며, 라벨과의 관계를 검증하는 중입니다.', 'Direct wallet-to-wallet transfers are not visible, and only trades before scoring are counted. High concentration does not mean an imminent crash; its relationship to labels is still being validated.')}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#555555]">{tr('이 토큰은 집중도 기록 도입 이전에 판정되어 값이 없습니다.', 'This token was scored before concentration tracking was introduced, so there is no value.')}</p>
                    )}
                  </PanelFrame>

                  <PanelFrame title="CREATOR HISTORY" subtitle={short(detail.token.creator)}>
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                      <StatTile label="Tokens" value={String(detail.creator_history.tokens_in_db)} hint={tr('이 시스템이 본 이 개발자의 다른 토큰 수', 'Other tokens by this creator seen by this system')} />
                      <StatTile label="Rugged" value={`${detail.creator_history.rugged} / ${detail.creator_history.labeled}`} tone={detail.creator_history.rugged > 0 ? 'bad' : 'neutral'} hint={tr('라벨 완료된 과거 토큰 중 RUGGED 건수', 'RUGGED count among labeled prior tokens')} />
                      <StatTile label="Blacklist" value={detail.creator_history.blacklisted ? 'YES' : 'NO'} tone={detail.creator_history.blacklisted ? 'bad' : 'neutral'} />
                    </div>
                    {detail.creator_history.recent.length > 0 && (
                      <table className="w-full text-[9px]">
                        <tbody>
                          {detail.creator_history.recent.map((h) => (
                            <tr key={h.mint} className="border-b border-[#141414]">
                              <td className="py-0.5"><button type="button" onClick={() => setSel(h.mint)} className="text-[#5794f2] hover:underline">{h.symbol || short(h.mint)}</button></td>
                              <td className="py-0.5 text-right text-[#888888]">{ov ? ago(tr, h.created_at, ov.now) : ''}</td>
                              <td className={`py-0.5 text-right ${h.label_rug === 1 ? 'text-[#f2495c]' : h.label_rug === 0 ? 'text-[#73bf69]' : 'text-[#555555]'}`}>
                                {h.label_rug === 1 ? `RUGGED ${pct(h.drawdown_from_peak, 0)}` : h.label_rug === 0 ? 'NORMAL' : 'PENDING'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="text-[8px] text-[#555555] mt-1">{srv(detail.creator_history.note)}</p>
                  </PanelFrame>

                  <PanelFrame title="FUNDING SOURCE" subtitle={tr('개발자 지갑이 처음 SOL 을 받은 출처', 'Where the creator wallet first received SOL')}>
                    {detail.funder?.status === 'ok' && detail.funder.address ? (
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between"><span className="text-[#888888]">{tr('출처 지갑', 'Source wallet')}</span>
                          <a href={`https://solscan.io/account/${detail.funder.address}`} target="_blank" rel="noopener noreferrer" className="text-[#5794f2] hover:underline">{short(detail.funder.address)}</a></div>
                        <div className="flex justify-between"><span className="text-[#888888]">{tr('첫 입금액', 'First deposit')}</span><span className="text-white">{detail.funder.sol?.toFixed(3)} SOL</span></div>
                        {detail.funder.cluster ? (
                          <>
                            <div className="flex justify-between"><span className="text-[#888888]">{tr('같은 출처 지갑 수', 'Wallets from same source')}</span><span className="text-white">{detail.funder.cluster.member_count}</span></div>
                            <div className="flex justify-between"><span className="text-[#888888]">{tr('그 군집의 러그 라벨', 'Rug labels in that cluster')}</span><span className={detail.funder.cluster.tokens_rugged > 0 ? 'text-[#f2495c] font-bold' : 'text-white'}>{tr(`${detail.funder.cluster.tokens_rugged}건 / 토큰 ${detail.funder.cluster.tokens_launched}개`, `${detail.funder.cluster.tokens_rugged} / ${detail.funder.cluster.tokens_launched} tokens`)}</span></div>
                            {detail.funder.cluster.is_exchange_like ? <p className="text-[9px] text-[#e0b400]">{tr('거래소/분배 지갑으로 추정되어 군집 판정에서 제외됩니다.', 'Suspected exchange/distribution wallet — excluded from cluster judgement.')}</p> : null}
                            {detail.funder.cluster.is_rug_family_candidate ? <p className="text-[9px] text-[#f2495c]">{tr('러그 라벨이 누적된 군집(후보)입니다.', 'A (candidate) cluster with accumulated rug labels.')}</p> : null}
                          </>
                        ) : (
                          <p className="text-[9px] text-[#555555]">{tr('군집 통계는 다음 라벨러 주기(10분)에 계산됩니다.', 'Cluster stats are computed on the next labeler cycle (10 min).')}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#555555]">{detail.funder?.status ? (ko ? FUNDER_STATUS : FUNDER_STATUS_EN)[detail.funder.status] ?? detail.funder.status : tr('아직 조회하지 않았습니다(대기열).', 'Not looked up yet (queued).')}</p>
                    )}
                  </PanelFrame>
                </div>
                {detail.label && (
                  <p className="text-[9px] text-[#aaaaaa] mt-1.5">
                    {tr('사후 라벨: ', 'Post-hoc label: ')}<span className={detail.label.rug ? 'text-[#f2495c] font-bold' : 'text-[#73bf69] font-bold'}>{detail.label.rug ? 'RUGGED' : 'NORMAL'}</span>
                    {' '}· {tr('고점 대비 최대 낙폭 ', 'Max drawdown from peak ')}{pct(detail.label.drawdown)} · {tr('고점 시총 ', 'Peak mcap ')}{detail.label.peak_mcap_sol?.toFixed(1)} SOL
                  </p>
                )}
              </div>
            )}
          </SectionHeader>
        )}

        <SectionHeader label={tr('Live Feed — 최신 토큰', 'Live Feed — latest tokens')}>
          <PanelFrame title="NEW TOKENS" subtitle={tr('점수가 높을수록 위험 신호가 많음 · 통과 기준 미만이면 PASS · 점수는 생성 후 180초에 확정', 'Higher score = more risk signals · below the pass threshold = PASS · score is finalized 180s after creation')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[10px]">
                <thead>
                  <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                    <th className="py-1 font-normal">TIME</th>
                    <th className="py-1 font-normal">SYMBOL</th>
                    <th className="py-1 font-normal">MINT</th>
                    <th className="py-1 font-normal">CREATOR</th>
                    <th className="py-1 font-normal text-right">MCAP (SOL)</th>
                    <th className="py-1 font-normal text-right">SCORE</th>
                    <th className="py-1 font-normal text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-[#555555]">{tr('데이터 없음', 'No data')}</td>
                    </tr>
                  )}
                  {feed.map((r) => {
                    const hot = r.total != null && r.total >= (ov?.pass_threshold ?? 40) * 0.5
                    return (
                      <tr key={r.mint} className="border-b border-[#141414] hover:bg-[#141414]">
                        <td className="py-1 text-[#888888] whitespace-nowrap">{ov ? ago(tr, r.created_at, ov.now) : '—'}</td>
                        <td className="py-1 truncate max-w-[110px]">
                          <button type="button" onClick={() => setSel(r.mint)} title={tr('점수·개발자 이력·자금 출처·집중도 상세 보기', 'View score, creator history, funding source and concentration')} className={`font-bold hover:text-[#f47a20] ${sel === r.mint ? 'text-[#f47a20]' : 'text-white'}`}>
                            {r.symbol || '—'}
                          </button>
                        </td>
                        <td className="py-1">
                          <a href={`https://solscan.io/token/${r.mint}`} target="_blank" rel="noopener noreferrer" className="text-[#5794f2] hover:underline">{short(r.mint)}</a>
                        </td>
                        <td className="py-1 text-[#888888]">{short(r.creator)}</td>
                        <td className="py-1 text-right text-[#dddddd]">{r.last_mcap_sol != null ? r.last_mcap_sol.toFixed(1) : '—'}</td>
                        <td className={`py-1 text-right font-bold ${r.total == null ? 'text-[#555555]' : hot ? 'text-[#f47a20]' : 'text-[#dddddd]'}`}>{r.total != null ? r.total.toFixed(1) : '…'}</td>
                        <td className="py-1 text-right whitespace-nowrap">
                          {r.label_rug === 1 ? (
                            <span className="text-[#f2495c]">RUGGED</span>
                          ) : r.label_rug === 0 ? (
                            <span className="text-[#73bf69]">NORMAL</span>
                          ) : r.total == null ? (
                            <span className="text-[#555555]">SCORING</span>
                          ) : r.passed ? (
                            <span className="text-[#888888]">PASS</span>
                          ) : (
                            <span className="text-[#f2495c]">REJECT</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </PanelFrame>
        </SectionHeader>

        <SectionHeader label={tr('Score Distribution', 'Score Distribution')}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
            <PanelFrame title="STAGE-2 SCORE HISTOGRAM" subtitle={tr(`5점 구간별 토큰 수 · 통과 기준 ${ov?.pass_threshold ?? '—'}점 미만`, `Tokens per 5-point bucket · pass threshold: below ${ov?.pass_threshold ?? '—'}`)}>
              <BarChartPanel
                autoWidth
                data={(ov?.score_distribution ?? []).map((b) => ({
                  label: tr(`${b.lo}~${b.lo + 4}점`, `${b.lo}–${b.lo + 4} pts`),
                  value: b.n,
                  color: b.lo >= (ov?.pass_threshold ?? 40) ? '#f2495c' : b.lo >= 20 ? '#f47a20' : '#5794f2'
                }))}
                valueFormat={(v) => v.toFixed(0)}
              />
              <p className="text-[8px] text-[#555555] mt-1">{tr('파랑: 낮음 · 주황: 20점 이상 · 빨강: 통과 기준 이상. 번들링(30)·워시(20)·과거 이력(30) 합산.', 'Blue: low · Orange: 20 pts or more · Red: at/above the pass threshold. Sum of bundling (30) + wash trading (20) + history (30).')}</p>
            </PanelFrame>
            <PanelFrame title="RUG RATE BY SCORE" subtitle={tr('점수 구간별 실제 러그 비율 — 필터가 작동하면 오른쪽(고점수)이 높아야 함', 'Actual rug rate per score bucket — if the filter works, the right (high scores) should be higher')}>
              {lift && lift.buckets.length > 0 ? (
                <BarChartPanel
                  autoWidth
                  data={lift.buckets.map((b) => ({
                    label: tr(`${b.lo}~${b.lo + 9}점 (n=${b.n}${enough(b.n) ? '' : ', 표본부족'})`, `${b.lo}–${b.lo + 9} pts (n=${b.n}${enough(b.n) ? '' : ', small sample'})`),
                    value: Number((b.rug_rate * 100).toFixed(1)),
                    color: enough(b.n) ? '#f47a20' : '#444444'
                  }))}
                  valueFormat={(v) => `${v.toFixed(0)}%`}
                />
              ) : (
                <p className="text-[10px] text-[#555555] py-8 text-center">{tr(`라벨이 쌓이면 표시됩니다 (생성 후 ${ov?.label_after_hours ?? 6}시간)`, `Shown once labels accumulate (${ov?.label_after_hours ?? 6}h after creation)`)}</p>
              )}
              <p className="text-[8px] text-[#555555] mt-1">{tr(`회색 막대는 표본 ${L?.min_sample ?? 30}건 미만이라 결론에 쓰지 않습니다.`, `Grey bars have fewer than ${L?.min_sample ?? 30} samples and are not used for conclusions.`)}</p>
            </PanelFrame>
          </div>
        </SectionHeader>

        <SectionHeader label={tr('Filter Validation — 필터 변별력', 'Filter Validation — discriminating power')}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
            <PanelFrame title="THRESHOLD SWEEP" subtitle={lift ? tr(`점수와 라벨이 모두 있는 토큰 ${lift.n}건 · 기준 러그율 ${pct(lift.base)}`, `${lift.n} tokens with both score and label · baseline rug rate ${pct(lift.base)}`) : '—'}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[10px]">
                  <thead>
                    <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                      <th className="py-1 font-normal">T</th>
                      <th className="py-1 font-normal text-right">{tr('탈락 n', 'Rejected n')}</th>
                      <th className="py-1 font-normal text-right">{tr('탈락 러그율', 'Rejected rug rate')}</th>
                      <th className="py-1 font-normal text-right">{tr('통과 n', 'Passed n')}</th>
                      <th className="py-1 font-normal text-right">{tr('통과 러그율', 'Passed rug rate')}</th>
                      <th className="py-1 font-normal text-right">LIFT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lift?.sweep ?? []).map((s) => {
                      const ok = enough(s.reject_n) && enough(s.pass_n)
                      return (
                        <tr key={s.T} className={`border-b border-[#141414] ${ok ? '' : 'opacity-50'}`}>
                          <td className="py-1 text-white font-bold">≥ {s.T}</td>
                          <td className="py-1 text-right text-[#dddddd]">{s.reject_n}</td>
                          <td className="py-1 text-right text-[#dddddd]">{pct(s.reject_rug)}</td>
                          <td className="py-1 text-right text-[#dddddd]">{s.pass_n}</td>
                          <td className="py-1 text-right text-[#dddddd]">{pct(s.pass_rug)}</td>
                          <td className={`py-1 text-right font-bold ${s.lift != null && ok ? (s.lift >= 1.5 ? 'text-[#73bf69]' : s.lift < 1 ? 'text-[#f2495c]' : 'text-[#dddddd]') : 'text-[#555555]'}`}>
                            {s.lift != null ? s.lift.toFixed(2) : '—'}{ok ? '' : ' *'}
                          </td>
                        </tr>
                      )
                    })}
                    {(!lift || lift.sweep.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-[#555555]">{tr('라벨이 쌓이면 표시됩니다', 'Shown once labels accumulate')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[8px] text-[#555555] mt-1">{tr(`LIFT = 탈락 그룹 러그율 ÷ 통과 그룹 러그율. 1.5 이상(초록)이면 필터가 작동, 1 미만(빨강)이면 거꾸로. * 표시는 표본 ${L?.min_sample ?? 30}건 미만이라 신뢰하지 않음.`, `LIFT = rug rate of the rejected group ÷ rug rate of the passed group. 1.5 or more (green) means the filter works; below 1 (red) means it is inverted. * = fewer than ${L?.min_sample ?? 30} samples, not reliable.`)}</p>
            </PanelFrame>
            <PanelFrame title="PRIOR-RUG HISTORY" subtitle={tr('과거 러그가 k건 이상 확정돼 있던 개발자의 새 토큰 러그율 (시점 기준 · 미래 정보 없음)', 'Rug rate of new tokens from creators who already had k or more confirmed rugs (point-in-time · no future information)')}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[300px] text-[10px]">
                  <thead>
                    <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                      <th className="py-1 font-normal">{tr('조건', 'Condition')}</th>
                      <th className="py-1 font-normal text-right">n</th>
                      <th className="py-1 font-normal text-right">{tr('러그율', 'Rug rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lift?.prior ?? []).map((p) => (
                      <tr key={p.k} className={`border-b border-[#141414] ${enough(p.n) ? '' : 'opacity-50'}`}>
                        <td className="py-1 text-white">{p.k === 0 ? tr('과거 러그 0건', '0 prior rugs') : tr(`과거 러그 ${p.k}건 이상`, `${p.k}+ prior rugs`)}</td>
                        <td className="py-1 text-right text-[#dddddd]">{p.n}</td>
                        <td className="py-1 text-right text-[#dddddd]">{pct(p.rug_rate)}{enough(p.n) ? '' : ' *'}</td>
                      </tr>
                    ))}
                    {(!lift || lift.prior.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-[#555555]">{tr('라벨이 쌓이면 표시됩니다', 'Shown once labels accumulate')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[8px] text-[#555555] mt-1">{tr('k건 이상 그룹이 0건 그룹보다 확연히 높고 표본이 충분한 가장 작은 k가 블랙리스트 기준 후보입니다.', 'The smallest k whose group is clearly higher than the 0-rug group, with enough samples, is the candidate blacklist threshold.')}</p>
            </PanelFrame>
          </div>
        </SectionHeader>

        <SectionHeader label={tr('Paper Trading — 가상 체결 (실거래 아님)', 'Paper Trading — simulated fills (not real trades)')}>
          <PanelFrame
            title="PASS vs REJECT vs ALL"
            subtitle={
              paper
                ? tr(`생성 ${paper.params.entry_delay_sec}초 후 판정 뒤 진입 · 익절 +${(paper.params.take_profit * 100).toFixed(0)}% / 손절 -${(paper.params.stop_loss * 100).toFixed(0)}% / 최대 ${paper.params.hold_hours}h · 비용 왕복 약 ${(((paper.params.fee_bps + paper.params.slippage_bps) * 2) / 100).toFixed(0)}%`,
                    `Enter ${paper.params.entry_delay_sec}s after scoring · take-profit +${(paper.params.take_profit * 100).toFixed(0)}% / stop-loss -${(paper.params.stop_loss * 100).toFixed(0)}% / max ${paper.params.hold_hours}h · round-trip cost ≈ ${(((paper.params.fee_bps + paper.params.slippage_bps) * 2) / 100).toFixed(0)}%`)
                : '—'
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[10px]">
                <thead>
                  <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                    <th className="py-1 font-normal">GROUP</th>
                    <th className="py-1 font-normal text-right">n</th>
                    <th className="py-1 font-normal text-right">{tr('평균 수익률', 'Mean return')}</th>
                    <th className="py-1 font-normal text-right">{tr('중앙값', 'Median')}</th>
                    <th className="py-1 font-normal text-right">{tr('승률', 'Win rate')}</th>
                    <th className="py-1 font-normal text-right">{tr('익절/손절/시간', 'TP / SL / time')}</th>
                    <th className="py-1 font-normal text-right">{tr('하위 10%', 'Bottom 10%')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['all', 'pass', 'reject'] as const).map((g) => {
                    const v = paper?.groups[g]
                    if (!v) return null
                    const ok = v.n >= (paper?.min_sample ?? 30)
                    return (
                      <tr key={g} className={`border-b border-[#141414] ${ok ? '' : 'opacity-50'}`}>
                        <td className="py-1 text-white font-bold uppercase">{g}{ok ? '' : ' *'}</td>
                        <td className="py-1 text-right text-[#dddddd]">{v.n}</td>
                        <td className={`py-1 text-right font-bold ${v.mean >= 0 ? 'text-[#73bf69]' : 'text-[#f2495c]'}`}>{pct(v.mean)}</td>
                        <td className="py-1 text-right text-[#dddddd]">{pct(v.median)}</td>
                        <td className="py-1 text-right text-[#dddddd]">{pct(v.win_rate)}</td>
                        <td className="py-1 text-right text-[#888888]">{pct(v.take, 0)} / {pct(v.stop, 0)} / {pct(v.time, 0)}</td>
                        <td className="py-1 text-right text-[#dddddd]">{pct(v.worst_decile)}</td>
                      </tr>
                    )
                  })}
                  {(!paper || Object.keys(paper.groups).length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-[#555555]">{tr(`생성 후 ${paper?.params.hold_hours ?? 6}시간이 지난 토큰부터 쌓입니다`, `Accumulates from tokens older than ${paper?.params.hold_hours ?? 6}h`)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {paper?.pass_minus_reject && (
              <p className="text-[9px] text-[#aaaaaa] mt-1.5">
                {tr('PASS − REJECT 평균 수익률 차이: ', 'PASS − REJECT mean-return difference: ')}<span className="text-white font-bold">{pct(paper.pass_minus_reject.mean)}</span>
                {' '}({tr('부트스트랩 95% 구간 ', 'bootstrap 95% interval ')}{pct(paper.pass_minus_reject.lo)} ~ {pct(paper.pass_minus_reject.hi)}
                {paper.pass_minus_reject.lo <= 0 && paper.pass_minus_reject.hi >= 0 ? tr(' — 0을 포함: 차이가 있다고 말할 수 없음', ' — includes 0: cannot say there is a difference') : ''})
              </p>
            )}
            <p className="text-[8px] text-[#555555] mt-1">
              {tr(`분 단위 최고/최저가로 근사한 가상 체결입니다. 같은 분에 익절·손절이 모두 가능하면 손절로 처리하고, 손절은 그 분의 저가로 체결합니다. 실제 유동성·주문 영향·체인 지연은 반영하지 않아 실거래 성과를 보장하지 않습니다. 통과 기준에 걸리는 토큰이 없으면 PASS 는 ALL 과 같습니다. * 표본 ${paper?.min_sample ?? 30}건 미만.`,
                `Simulated fills approximated from per-minute highs/lows. If both take-profit and stop-loss are possible in the same minute, the stop-loss is assumed, and stops fill at that minute's low. Real liquidity, order impact and chain latency are not modeled, so real-trade results are not guaranteed. If no token hits the reject threshold, PASS equals ALL. * = fewer than ${paper?.min_sample ?? 30} samples.`)}
            </p>
          </PanelFrame>
        </SectionHeader>

        <SectionHeader label={tr('Repeat Creators — 러그 라벨 누적 개발자', 'Repeat Creators — creators with accumulated rug labels')}>
          <PanelFrame title="CREATORS WITH ≥2 RUGGED LABELS" subtitle={tr('자동 라벨 건수일 뿐, 개별 지갑에 대한 사기 판정이 아님', 'Automatic label counts only — not a fraud finding against any individual wallet')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[10px]">
                <thead>
                  <tr className="text-left text-[#666666] border-b border-[#1a1a1a]">
                    <th className="py-1 font-normal">CREATOR</th>
                    <th className="py-1 font-normal text-right">RUGGED LABELS</th>
                    <th className="py-1 font-normal text-right">TOKENS CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-[#555555]">{tr('해당 없음 (라벨이 쌓이면 표시됩니다)', 'None (shown once labels accumulate)')}</td>
                    </tr>
                  )}
                  {rep.map((r) => (
                    <tr key={r.creator} className="border-b border-[#141414] hover:bg-[#141414]">
                      <td className="py-1">
                        <a href={`https://solscan.io/account/${r.creator}`} target="_blank" rel="noopener noreferrer" className="text-[#5794f2] hover:underline">{short(r.creator)}</a>
                      </td>
                      <td className="py-1 text-right text-[#f47a20] font-bold">{r.rugged_labels}</td>
                      <td className="py-1 text-right text-[#dddddd]">{r.tokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelFrame>
        </SectionHeader>

        <p className="text-[8px] text-[#444444] mb-2">
          {updated ? tr(`마지막 갱신 ${new Date(updated).toLocaleTimeString('ko-KR')}`, `Last updated ${new Date(updated).toLocaleTimeString('en-US')}`) : ''} · {tr('수집: Solana pump.fun 프로그램 로그(공개 RPC) + PumpPortal 신규 토큰 스트림 · 점수·라벨 정의는 연구용 가정이며 검증 중입니다.', 'Source: Solana pump.fun program logs (public RPC) + PumpPortal new-token stream · Score and label definitions are research assumptions still under validation.')}
        </p>
      </div>
    </div>
  )
}
