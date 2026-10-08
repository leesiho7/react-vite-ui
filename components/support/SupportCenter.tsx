'use client'

import { useEffect, useRef, useState } from 'react'
import { Headset } from 'lucide-react'
import { submitSupportTicket, SupportTicketPayload } from '@/lib/api'

type Tab = 'guide' | 'bots' | 'faq' | 'ticket'
type Bi = { ko: string; en: string }

/**
 * 24/7 Support Center — 오른쪽 하단 플로팅 버튼(헤드셋 아이콘)으로 여는 셀프서비스 안내 + 문의 접수.
 *
 * 정직하게 표시하는 것: 안내와 문의 접수는 24시간 열려 있지만, 실시간 상담원이 있는 것은 아니다.
 * 문의는 티켓으로 접수되어 남긴 이메일로 답변한다 (응답 시간을 약속하지 않는다).
 * 안내 문구는 실제 코드/서비스 동작에서 확인한 사실만 쓴다. 수익이나 성과를 암시하는 문구는 쓰지 않는다.
 */
const GUIDE: { view: string; name: string; text: Bi }[] = [
  { view: 'news', name: 'News Wire', text: { ko: '실시간 글로벌 금융·가상자산 뉴스. 기사를 누르면 AI 요약과 출처의 원문 소개문을 함께 볼 수 있습니다.', en: 'Live global finance & crypto news. Open an article to see an AI summary next to the source\'s original excerpt.' } },
  { view: 'trade', name: 'TRADE', text: { ko: '글로벌 자산 시세를 비교하고, 거래 전에 AI 코파일럿에게 물어볼 수 있는 마켓 오버뷰.', en: 'Market overview: compare live prices and ask the AI Copilot before you trade.' } },
  { view: 'bots', name: '24H Studio', text: { ko: '24시간 자동매매 봇을 호스팅하고 관리하는 곳. 자세한 내용은 "봇" 탭을 보세요.', en: 'Where you host and manage 24/7 automated trading bots. See the "Bots" tab for details.' } },
  { view: 'research', name: 'AI Quant Research', text: { ko: '종목과 전략에 대해 AI 리서치 어시스턴트와 대화하며 조사하는 화면.', en: 'Research assets and strategies by chatting with the AI research assistant.' } },
  { view: 'media', name: 'Media Desk', text: { ko: '공식 기관·가상자산 채널의 영상 인텔리전스를 터미널 안에서 보고 핵심을 확인합니다.', en: 'Finance & crypto video intelligence from official institutional channels, viewable inside the terminal.' } },
  { view: 'arbitrage', name: 'Arbitrage', text: { ko: '거래소 간 실시간 가격 차이와 호가(L2) 오더북을 보는 차익 터미널.', en: 'Real-time cross-exchange price gaps and a Level-2 order-book terminal.' } },
  { view: 'pairs', name: 'Terminal', text: { ko: '연구용 통계 터미널: 페어 트레이딩(평균회귀), 거래소 간 펀딩 차익, 김치 프리미엄 분포.', en: 'Research stats terminal: pairs trading (mean reversion), cross-exchange funding arbitrage and the Kimchi premium.' } },
  { view: 'trenchguard', name: 'TrenchGuard', text: { ko: 'pump.fun 신규 토큰의 초기 위험 신호와 사후 라벨(고점 대비 -80% 등)을 실시간 수집해 보여주는 연구 화면.', en: 'Live research on new pump.fun tokens: early risk signals and after-the-fact labels (e.g. -80% from peak).' } },
  { view: 'cryptoterminal', name: 'Crypto Terminal', text: { ko: '딥러닝 모델 학습·검증 모니터링: 학습된 딥러닝 모델(DOWN_RISK / UP_RISK)의 상태, 실전 정확도, 백테스트를 확인합니다.', en: 'Deep-learning model training & validation: check the trained deep-learning model (DOWN_RISK / UP_RISK) — status, live accuracy and backtests.' } }
]

const BOT_POINTS: Bi[] = [
  { ko: '무엇인가: 우리 서버에서 24시간 돌아가는 자동매매 봇 인스턴스입니다. 사용자가 입력한 본인 거래소 API 키로 주문을 냅니다.', en: 'What it is: a 24/7 automated trading bot instance that runs on our servers and places orders through the exchange API keys you provide.' },
  { ko: '거래소: Binance, OKX, Bybit. 타임프레임은 1분~1일 중에서 고를 수 있습니다.', en: 'Exchanges: Binance, OKX and Bybit. Timeframes from 1 minute to 1 day.' },
  // 초보자 모드(설정형)는 아직 지원하지 않아 안내에서 뺐다. 지원을 시작하면 이 줄을 되살린다.
  // { ko: '두 가지 모드: 초보자 모드(리스크 가드·지표 등을 켜고 끄는 설정형)와 개발자 모드(직접 작성한 파이썬 전략 코드). 코드는 실행 전에 테스트할 수 있습니다.', en: 'Two modes: Beginner (configure risk guard, indicators, etc.) and Developer (your own Python strategy code, which you can test before running).' },
  { ko: '개발자 모드: 직접 작성한 파이썬 전략 코드를 실행합니다. 코드는 실행 전에 테스트할 수 있습니다.', en: 'Developer mode: runs your own Python strategy code, which you can test before running.' },
  { ko: '데모 모드: 거래소의 모의투자(데모/테스트넷) 환경으로 먼저 돌려볼 수 있습니다.', en: 'Demo mode: run against the exchange\'s demo/testnet environment first.' },
  // 베타 기간에는 유료 안내를 숨긴다. 유료 결제를 다시 열 때 아래 줄의 주석을 풀고 바로 아래 "구독" 줄을 지운다.
  // { ko: '요금: 30일 $7 USDT. 온체인 USDT 입금이 확인되면 자동으로 활성화되며, 봇을 시작하려면 활성 구독이 필요합니다.', en: 'Price: $7 USDT per 30 days. The subscription activates automatically once the on-chain USDT deposit is confirmed, and an active subscription is required to start a bot.' },
  { ko: '구독: 이메일로 요청하시면 무료로 지급해 드립니다. "문의" 탭에서 "봇" 유형으로 가입 이메일을 적어 접수해 주세요. 봇을 시작하려면 활성 구독이 필요합니다.', en: 'Subscription: provided free of charge on email request. Open a ticket in the "Ticket" tab under "Bots" with your account email. An active subscription is required to start a bot.' },
  { ko: '제어: 시작 · 일시정지 · 중지 · 삭제, 상태와 로그 확인.', en: 'Controls: start, pause, stop, delete, and view status and logs.' },
  { ko: '안전 수칙: API 키는 "거래" 권한만 주고 "출금" 권한은 끄세요. 자동매매에는 손실 위험이 있으며 수익을 보장하지 않습니다. 투자 권유가 아닙니다.', en: 'Safety: give API keys "trade" permission only and keep "withdraw" disabled. Automated trading carries risk of loss; no returns are guaranteed. This is not investment advice.' }
]

const FAQ: { q: Bi; a: Bi }[] = [
  { q: { ko: '회원가입이 꼭 필요한가요?', en: 'Do I need an account?' }, a: { ko: '뉴스와 터미널 화면은 로그인 없이 볼 수 있습니다. 비회원은 AI 질문이 하루 3회로 제한되고, 가입하면 제한이 풀립니다. 로그인은 로그인 화면의 소셜 계정으로 합니다.', en: 'News and the terminals work without logging in. Guests are limited to 3 AI questions per day; signing up lifts that. Sign in with a social account on the Login page.' } },
  { q: { ko: '투자 조언인가요?', en: 'Is this investment advice?' }, a: { ko: '아닙니다. 모든 화면은 연구·교육용 정보이며 수익을 보장하지 않습니다. 과거 성과는 미래를 보장하지 않습니다.', en: 'No. Everything here is for research and education, with no guarantee of returns. Past performance does not guarantee future results.' } },
  { q: { ko: '데이터는 어디서 오나요?', en: 'Where does the data come from?' }, a: { ko: '공개 뉴스 피드, 거래소 공개 API(Binance, Bybit, OKX, Hyperliquid, Upbit 등), Solana pump.fun 프로그램 로그입니다. 값을 지어내거나 임의로 채우지 않으며, 못 받으면 "불러오지 못함"으로 표시합니다.', en: 'Public news feeds, public exchange APIs (Binance, Bybit, OKX, Hyperliquid, Upbit, etc.) and Solana pump.fun program logs. We do not make up or fill in values; if data cannot be loaded, we say so.' } },
  { q: { ko: 'AI 요약은 얼마나 정확한가요?', en: 'How accurate are the AI summaries?' }, a: { ko: '제목과 출처가 준 소개문만 근거로 AI가 만든 요약이라 부정확할 수 있습니다. 항상 바로 아래의 원문 소개문과 원문 기사를 확인하세요.', en: 'They are generated by AI from the headline and the source\'s excerpt only, so they can be wrong. Always compare with the original excerpt shown below and the full article.' } },
  { q: { ko: 'TrenchGuard의 점수와 라벨은 무슨 뜻인가요?', en: 'What do TrenchGuard scores and labels mean?' }, a: { ko: '점수는 토큰 생성 후 180초 시점의 위험 신호(번들링·워시 거래·과거 이력)를 합산한 값이고, 라벨은 생성 6시간 뒤 고점 대비 -80% 이상 하락했거나 유동성이 말랐는지에 대한 자동 판정입니다. 특정 지갑을 사기로 단정하는 것이 아닙니다.', en: 'The score sums early risk signals (bundling, wash trading, history) 180 seconds after creation. The label is an automatic check, 6 hours later, of whether the token fell 80%+ from its peak or its liquidity dried up. It is not an accusation against any wallet.' } },
  { q: { ko: '봇을 시작하려면 어떻게 하나요?', en: 'How do I start a bot?' }, a: { ko: '로그인 → 24H Studio에서 봇 만들기(거래소·종목 선택, API 키 입력, 파이썬 전략 코드 작성) → 구독 활성화 → 시작. 구독은 이메일로 요청하시면 무료로 지급해 드립니다. "문의" 탭에서 "봇" 유형으로 가입 이메일을 적어 접수해 주세요. 자세한 내용은 "봇" 탭을 보세요.', en: 'Log in → create a bot in 24H Studio (pick exchange and symbol, enter API keys, write your Python strategy code) → activate your subscription → start. The subscription is provided free of charge on email request: open a ticket in the "Ticket" tab under "Bots" with your account email. See the "Bots" tab for details.' } },
  // 베타 테스트 기간에는 구독을 이메일 요청 시 무료로 지급하므로 입금 관련 FAQ 는 잠시 숨긴다. 유료 결제를 다시 열 때 주석을 푼다.
  // { q: { ko: '입금했는데 구독이 활성화되지 않아요.', en: 'I paid but my subscription is not active.' }, a: { ko: '"문의" 탭에서 결제 문의로 티켓을 남겨 주세요. 가입 이메일, 입금 시각, 트랜잭션 해시(TxID)를 적어 주시면 확인이 빠릅니다.', en: 'Open a ticket in the "Ticket" tab under Payment. Include your account email, the deposit time and the transaction hash (TxID) so we can check it quickly.' } },
  { q: { ko: '언어는 어떻게 바꾸나요?', en: 'How do I change the language?' }, a: { ko: '화면 위쪽 오른쪽의 지구본(🌐) 버튼에서 한국어 / English / 中文을 고르세요. 일부 화면은 중국어를 지원하지 않아 영어로 표시됩니다.', en: 'Use the globe (🌐) button at the top right to choose 한국어 / English / 中文. Some screens do not support Chinese and show English instead.' } }
]

const CATEGORIES: { value: SupportTicketPayload['category']; label: Bi }[] = [
  { value: 'ACCOUNT', label: { ko: '계정 / 로그인', en: 'Account / login' } },
  { value: 'PAYMENT', label: { ko: '결제 / 구독', en: 'Payment / subscription' } },
  { value: 'BOT', label: { ko: '봇', en: 'Bots' } },
  { value: 'DATA', label: { ko: '데이터 / 화면 오류', en: 'Data / bug report' } },
  { value: 'OTHER', label: { ko: '기타', en: 'Other' } }
]

const ERRORS: Record<string, Bi> = {
  invalid_email: { ko: '이메일 주소를 확인해 주세요.', en: 'Please check your email address.' },
  invalid_category: { ko: '문의 유형을 선택해 주세요.', en: 'Please choose a category.' },
  invalid_subject: { ko: '제목은 3~200자로 입력해 주세요.', en: 'The subject must be 3–200 characters.' },
  message_too_short: { ko: '문의 내용을 10자 이상 적어 주세요.', en: 'Please write at least 10 characters.' },
  message_too_long: { ko: '문의 내용은 2000자 이하로 적어 주세요.', en: 'Please keep the message under 2000 characters.' },
  rate_limited: { ko: '오늘 접수 가능한 문의 수를 넘었습니다. 내일 다시 시도해 주세요.', en: 'You have reached today\'s ticket limit. Please try again tomorrow.' },
  network: { ko: '접수하지 못했습니다. 잠시 후 다시 시도해 주세요.', en: 'We could not submit your ticket. Please try again shortly.' }
}

export default function SupportCenter({
  language = 'en',
  onNavigate,
  userEmail
}: {
  language?: 'ko' | 'en' | 'cn'
  onNavigate?: (view: string) => void
  userEmail?: string
}) {
  const ko = language === 'ko'
  const t = (b: Bi) => (ko ? b.ko : b.en)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('guide')
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<SupportTicketPayload['category']>('OTHER')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // 허니팟
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketNo, setTicketNo] = useState<number | null>(null)

  useEffect(() => {
    if (userEmail && !email) setEmail(userEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (view: string) => {
    onNavigate?.(view)
    setOpen(false)
  }

  const send = async () => {
    setError(null)
    setSending(true)
    const r = await submitSupportTicket({
      email: email.trim(),
      category,
      subject: subject.trim(),
      message: message.trim(),
      language: ko ? 'ko' : 'en',
      website
    })
    setSending(false)
    if (r.ok) {
      setTicketNo(r.ticketNo ?? 0)
      setSubject('')
      setMessage('')
    } else {
      setError(r.error || 'network')
    }
  }

  const tabs: { key: Tab; label: Bi }[] = [
    { key: 'guide', label: { ko: '기능 안내', en: 'Guide' } },
    { key: 'bots', label: { ko: '봇', en: 'Bots' } },
    { key: 'faq', label: { ko: 'FAQ', en: 'FAQ' } },
    { key: 'ticket', label: { ko: '문의', en: 'Ticket' } }
  ]

  return (
    <>
      {/* 플로팅 버튼 — 모바일에서는 하단 탭바(68px) 위에 둔다 */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="24/7 Support Center"
          title="24/7 Support Center"
          className="fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] md:right-5 md:bottom-5 z-[950] flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full bg-[#f47a20] hover:bg-[#ea580c] text-white shadow-[0_8px_22px_rgba(244,122,32,0.35)] transition-colors cursor-pointer border-0"
        >
          <Headset size={20} strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline text-[11px] font-bold font-mono tracking-wide">24/7 Support</span>
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="24/7 Support Center"
          className="fixed right-3 sm:right-5 bottom-[calc(84px+env(safe-area-inset-bottom))] md:bottom-5 z-[950] w-[min(392px,calc(100vw-24px))] h-[min(580px,calc(100vh-130px))] flex flex-col bg-[#121212] text-white border border-[#27272a] rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.55)] outline-none font-sans"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#27272a] bg-[#171717] rounded-t-[10px]">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <Headset size={16} className="text-[#f47a20]" aria-hidden /> 24/7 Support Center
              </div>
              <div className="text-[9.5px] text-[#a1a1aa] mt-0.5">
                {ko ? '셀프서비스 안내 · 문의 접수 (실시간 상담원은 없으며 이메일로 답변합니다)' : 'Self-service guide & ticket intake (no live agent — we reply by email)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={ko ? '닫기' : 'Close'}
              className="text-[#a1a1aa] hover:text-white text-[18px] leading-none px-1.5 cursor-pointer bg-transparent border-0"
            >
              ×
            </button>
          </div>

          <div className="flex border-b border-[#27272a]" role="tablist">
            {tabs.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setTab(x.key)}
                className={`flex-1 py-2 text-[11px] font-semibold cursor-pointer bg-transparent border-0 border-b-2 ${
                  tab === x.key ? 'text-[#f47a20] border-b-[#f47a20]' : 'text-[#a1a1aa] border-b-transparent hover:text-white'
                }`}
              >
                {t(x.label)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 text-[12px] leading-relaxed">
            {tab === 'guide' && (
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {GUIDE.map((g) => (
                  <li key={g.view} className="border border-[#27272a] rounded-[6px] p-2.5 bg-[#171717]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong className="text-[12px] text-white">{g.name}</strong>
                      <button
                        type="button"
                        onClick={() => go(g.view)}
                        className="text-[10px] font-semibold text-[#f47a20] hover:underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        {ko ? '열기 →' : 'Open →'}
                      </button>
                    </div>
                    <p className="m-0 text-[#a1a1aa] text-[11px]">{t(g.text)}</p>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'bots' && (
              <div>
                <h3 className="m-0 mb-2 text-[13px] font-bold">{ko ? '24H 자동매매 봇' : '24/7 trading bots'}</h3>
                <ul className="m-0 pl-4 flex flex-col gap-2 text-[#d4d4d8] text-[11.5px]">
                  {BOT_POINTS.map((p, i) => (
                    <li key={i}>{t(p)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => go('bots')}
                  className="mt-3 w-full py-2 rounded-[6px] bg-[#f47a20] hover:bg-[#ea580c] text-white text-[11px] font-bold cursor-pointer border-0"
                >
                  {ko ? '24H Studio 열기' : 'Open 24H Studio'}
                </button>
              </div>
            )}

            {tab === 'faq' && (
              <div className="flex flex-col gap-1.5">
                {FAQ.map((f, i) => (
                  <div key={i} className="border border-[#27272a] rounded-[6px] bg-[#171717]">
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      aria-expanded={faqOpen === i}
                      className="w-full text-left px-2.5 py-2 text-[11.5px] font-semibold text-white cursor-pointer bg-transparent border-0 flex justify-between gap-2"
                    >
                      <span>{t(f.q)}</span>
                      <span className="text-[#a1a1aa]" aria-hidden>{faqOpen === i ? '−' : '+'}</span>
                    </button>
                    {faqOpen === i && <p className="m-0 px-2.5 pb-2.5 text-[11px] text-[#a1a1aa]">{t(f.a)}</p>}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTab('ticket')}
                  className="mt-2 text-[11px] font-semibold text-[#f47a20] hover:underline cursor-pointer bg-transparent border-0 text-left p-0"
                >
                  {ko ? '원하는 답이 없나요? 문의 남기기 →' : 'Did not find your answer? Open a ticket →'}
                </button>
              </div>
            )}

            {tab === 'ticket' && (
              <div>
                {ticketNo !== null ? (
                  <div className="border border-[#2f6f4f] bg-[#10231a] rounded-[6px] p-3">
                    <div className="text-[13px] font-bold text-[#73bf69] mb-1">
                      {ko ? '문의가 접수되었습니다' : 'Your ticket was received'}
                    </div>
                    {ticketNo > 0 && (
                      <div className="text-[12px] mb-1">
                        {ko ? '접수 번호' : 'Ticket no.'} <b>#{ticketNo}</b>
                      </div>
                    )}
                    <p className="m-0 text-[11px] text-[#a1a1aa]">
                      {ko
                        ? '남겨 주신 이메일로 답변드립니다. 접수 순서대로 확인하며, 답변 시간은 보장하지 못합니다.'
                        : 'We will reply to the email you provided. Tickets are read in the order received; we cannot guarantee a response time.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTicketNo(null)}
                      className="mt-2.5 text-[11px] font-semibold text-[#f47a20] hover:underline cursor-pointer bg-transparent border-0 p-0"
                    >
                      {ko ? '다른 문의 남기기' : 'Submit another'}
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!sending) send()
                    }}
                    className="flex flex-col gap-2.5"
                  >
                    <p className="m-0 text-[10.5px] text-[#a1a1aa]">
                      {ko
                        ? '봇 문의는 가입 이메일을 함께 적어 주세요. API 키·비밀번호·시드 문구는 절대 적지 마세요.'
                        : 'For bot inquiries, please include your account email. Never write API keys, passwords or seed phrases.'}
                    </p>
                    <label className="flex flex-col gap-1 text-[10.5px] text-[#a1a1aa]">
                      {ko ? '답변 받을 이메일' : 'Email for the reply'}
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={254}
                        autoComplete="email"
                        className="bg-[#0d0d0d] border border-[#27272a] rounded-[4px] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#f47a20]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[10.5px] text-[#a1a1aa]">
                      {ko ? '문의 유형' : 'Category'}
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as SupportTicketPayload['category'])}
                        className="bg-[#0d0d0d] border border-[#27272a] rounded-[4px] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#f47a20]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{t(c.label)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[10.5px] text-[#a1a1aa]">
                      {ko ? '제목' : 'Subject'}
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        minLength={3}
                        maxLength={200}
                        className="bg-[#0d0d0d] border border-[#27272a] rounded-[4px] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#f47a20]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[10.5px] text-[#a1a1aa]">
                      <span className="flex justify-between">
                        <span>{ko ? '문의 내용' : 'Message'}</span>
                        <span className={message.length > 2000 ? 'text-[#f2495c]' : ''}>{message.length}/2000</span>
                      </span>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        minLength={10}
                        rows={5}
                        className="bg-[#0d0d0d] border border-[#27272a] rounded-[4px] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#f47a20] resize-y"
                      />
                    </label>
                    {/* 허니팟: 사람에게는 보이지 않고 봇만 채운다 */}
                    <input
                      type="text"
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                    />
                    {error && <p className="m-0 text-[11px] text-[#f2495c]">{t(ERRORS[error] ?? ERRORS.network)}</p>}
                    <button
                      type="submit"
                      disabled={sending}
                      className="py-2 rounded-[6px] bg-[#f47a20] hover:bg-[#ea580c] disabled:opacity-50 text-white text-[12px] font-bold cursor-pointer border-0"
                    >
                      {sending ? (ko ? '접수 중…' : 'Submitting…') : ko ? '문의 접수' : 'Submit ticket'}
                    </button>
                    <p className="m-0 text-[9.5px] text-[#71717a]">
                      {ko
                        ? '이메일과 문의 내용은 답변 목적으로만 저장됩니다. 접속 IP는 원문이 아닌 해시로만 남겨 스팸 방지에 씁니다.'
                        : 'Your email and message are stored only to answer your request. Your IP is kept only as a hash, for spam prevention.'}
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
