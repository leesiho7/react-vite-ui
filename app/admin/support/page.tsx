'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import AdminOnlyGate from '@/components/admin/AdminOnlyGate'
import { fetchSupportTickets, updateSupportTicket, SupportTicket } from '@/lib/api'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED'] as const
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'text-[#f2495c] border-[#f2495c]/50',
  IN_PROGRESS: 'text-[#e0b400] border-[#e0b400]/50',
  ANSWERED: 'text-[#73bf69] border-[#73bf69]/50',
  CLOSED: 'text-[#888888] border-[#444444]'
}

/**
 * 관리자 전용 — 24/7 Support Center 로 들어온 문의 티켓 목록.
 * 이메일·문의 내용이 들어 있어 서버가 ROLE_ADMIN JWT 로만 내려준다 (이 페이지의 게이트는 UI 용일 뿐이다).
 * 답변은 티켓의 이메일로 직접 보낸다. 여기서는 처리 상태와 내부 메모만 관리한다.
 */
export default function AdminSupportPage() {
  return (
    <AdminOnlyGate>
      <SupportAdmin />
    </AdminOnlyGate>
  )
}

function SupportAdmin() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [filter, setFilter] = useState<string>('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [notes, setNotes] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    const r = await fetchSupportTickets(filter || undefined)
    setError(r === null)
    if (r) setTickets(r)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (t: SupportTicket, status: string) => {
    const r = await updateSupportTicket(t.id, { status })
    if (r) setTickets((prev) => prev?.map((x) => (x.id === t.id ? r : x)) ?? prev)
  }
  const saveNote = async (t: SupportTicket) => {
    const r = await updateSupportTicket(t.id, { adminNote: notes[t.id] ?? t.adminNote ?? '' })
    if (r) setTickets((prev) => prev?.map((x) => (x.id === t.id ? r : x)) ?? prev)
  }

  const counts = (tickets ?? []).reduce<Record<string, number>>((m, t) => ({ ...m, [t.status]: (m[t.status] ?? 0) + 1 }), {})

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-4 font-mono text-white">
      <div className="max-w-[1100px] mx-auto">
        <Link href="/" className="text-[9px] text-[#555555] hover:text-[#f47a20]">← AETHER TERMINAL</Link>
        <h1 className="text-[13px] font-bold mt-0.5">AETHER · SUPPORT TICKETS</h1>
        <p className="text-[9px] text-[#555555] mt-0.5">
          문의 {tickets?.length ?? '—'}건 {STATUSES.map((s) => `· ${s} ${counts[s] ?? 0}`).join(' ')} · 답변은 티켓 이메일로 직접 보내고 여기서는 상태·메모만 관리합니다.
        </p>

        <div className="flex gap-1.5 my-3 flex-wrap">
          {['', ...STATUSES].map((s) => (
            <button
              key={s || 'ALL'}
              type="button"
              onClick={() => setFilter(s)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] border cursor-pointer bg-transparent ${
                filter === s ? 'border-[#f47a20] text-[#f47a20]' : 'border-[#222222] text-[#888888] hover:text-white'
              }`}
            >
              {s || 'ALL'}
            </button>
          ))}
          <button type="button" onClick={load} className="text-[10px] font-bold px-2.5 py-1 rounded-[2px] bg-[#f47a20] text-black cursor-pointer border-0 ml-auto">
            REFRESH
          </button>
        </div>

        {error && <p className="text-[11px] text-[#f2495c]">티켓을 불러오지 못했습니다. 관리자 계정으로 로그인했는지 확인하세요.</p>}
        {tickets && tickets.length === 0 && <p className="text-[11px] text-[#555555]">해당 상태의 문의가 없습니다.</p>}

        <div className="flex flex-col gap-1.5">
          {(tickets ?? []).map((t) => (
            <div key={t.id} className="border border-[#222222] bg-[#111111] rounded-[2px]">
              <button
                type="button"
                onClick={() => setOpenId(openId === t.id ? null : t.id)}
                className="w-full text-left px-3 py-2 flex items-center gap-3 cursor-pointer bg-transparent border-0 text-white"
              >
                <span className="text-[#888888] text-[10px] w-10">#{t.id}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-[2px] ${STATUS_COLOR[t.status] ?? ''}`}>{t.status}</span>
                <span className="text-[10px] text-[#aaaaaa] w-16">{t.category}</span>
                <span className="text-[11px] font-semibold flex-1 truncate">{t.subject}</span>
                <span className="text-[9px] text-[#666666] hidden sm:inline">{t.createdAt?.slice(0, 16).replace('T', ' ')}</span>
              </button>
              {openId === t.id && (
                <div className="px-3 pb-3 border-t border-[#1a1a1a] text-[11px]">
                  <p className="text-[10px] text-[#888888] my-2">
                    <a href={`mailto:${t.email}?subject=${encodeURIComponent('Re: ' + t.subject)}`} className="text-[#5794f2] hover:underline">{t.email}</a>
                    {' · '}{t.language}{t.userId ? ` · user #${t.userId}` : ' · guest'}
                  </p>
                  <pre className="whitespace-pre-wrap break-words m-0 p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2px] text-[#dddddd] font-sans text-[12px]">{t.message}</pre>
                  <div className="flex gap-1.5 flex-wrap mt-2.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(t, s)}
                        disabled={t.status === s}
                        className={`text-[10px] font-bold px-2 py-1 rounded-[2px] border cursor-pointer bg-transparent disabled:opacity-40 ${STATUS_COLOR[s]}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <textarea
                    defaultValue={t.adminNote ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
                    placeholder="내부 메모 (고객에게 보이지 않음)"
                    rows={2}
                    maxLength={1000}
                    className="w-full mt-2 bg-[#0d0d0d] border border-[#222222] rounded-[2px] px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#f47a20]"
                  />
                  <button type="button" onClick={() => saveNote(t)} className="mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-[2px] bg-[#f47a20] text-black cursor-pointer border-0">
                    메모 저장
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
