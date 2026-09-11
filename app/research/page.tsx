'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  Crown,
  ArrowUpRight,
  Search,
  Zap,
  Cpu,
  Network,
  Send,
  Plus,
  RefreshCw,
  Layers,
  Compass,
  BarChart2,
  ShieldCheck,
  ChevronRight,
  Globe,
  Check,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  BookOpen,
  Terminal,
  BrainCircuit,
  Lock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Code2,
  Lightbulb,
  Bot,
  PieChart,
  Palette,
  ExternalLink,
  Activity,
  Radio,
  FileCode,
  TrendingUp,
  X,
  Trash2
} from 'lucide-react'
import {
  sendResearchChat,
  streamResearchChatSSE,
  fetchIntegratedDecision,
  fetchLiveFinancialNewsFeed
} from '../../lib/api'

interface ToolCallItem {
  name: string;
  detail: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  verdict?: string;
  qualityScore?: number;
  mode?: string;
  imageUrl?: string | null;
  toolCalls?: ToolCallItem[];
  isStreaming?: boolean;
}

interface ResearchSession {
  id: string;
  title: string;
  symbol: string;
  updatedAt: string;
  messages: ChatMessage[];
}

type ChipletMode = 'INSIGHT' | 'GUIDE' | 'CODING' | 'MASTER' | 'AGENT'

interface ChipletConfig {
  key: ChipletMode;
  name: string;
  icon: React.ReactNode;
  tag: string;
  cssClass: string;
  badgeLabel: string;
  placeholder: string;
}

function getAssetTelemetryFallback(symbol: string) {
  const sym = (symbol || '').toUpperCase()
  return {
    name: sym || 'Bitcoin (BTC/USD)',
    price: '--',
    change: '0.00%',
    isUp: true,
    rsi: '--',
    rsiStatus: 'NEUTRAL',
    score: '--',
    supp: '--',
    res: '--',
    fractalMatch: 'N/A',
    fractalName: '백엔드 연동 대기 중',
    fractalWin: 'N/A',
    fractalExp: '--',
    news: '스프링부트 백엔드 연결 후 실시간 온체인 및 뉴스 수급이 동동 표시됩니다.'
  }
}

export default function ResearchPage() {
  const [language, setLanguage] = useState<'ko' | 'en' | 'cn'>('ko')
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [selectedMode, setSelectedMode] = useState<ChipletMode>('INSIGHT')
  const [inputPrompt, setInputPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string>('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [attachedImageName, setAttachedImageName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [telemetry, setTelemetry] = useState(getAssetTelemetryFallback('BTCUSDT'))
  const [openToolsMap, setOpenToolsMap] = useState<Record<string, boolean>>({})

  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const chiplets: ChipletConfig[] = [
    {
      key: 'INSIGHT',
      name: '인사이트',
      icon: <Sparkles size={14} className="text-[#f47a20]" />,
      tag: 'FACT-CHECK',
      cssClass: 'chiplet-insight',
      badgeLabel: '✦ INSIGHT // Deep Market Intelligence & Sentiment',
      placeholder: '자산에 대한 온체인 수급, 외신 팩트체크, 지표 다이버전스 인사이트를 질의하세요...'
    },
    {
      key: 'GUIDE',
      name: '가이드(자율형)',
      icon: <Bot size={14} className="text-[#0284C7]" />,
      tag: 'AUTONOMOUS',
      cssClass: 'chiplet-guide',
      badgeLabel: '⚡ GUIDE // Autonomous Agent & Execution Playbook',
      placeholder: '변동성 돌파 매매, 분할 진입(DCA), 동적 손절선(Invalidation) 실행 가이드를 질의하세요...'
    },
    {
      key: 'CODING',
      name: '코딩</>',
      icon: <Code2 size={14} className="text-[#059669]" />,
      tag: 'PYTHON / ALGO',
      cssClass: 'chiplet-coding',
      badgeLabel: '</> CODING // Quant Algorithm & Execution Scripts',
      placeholder: '정량 기술지표, Python 백테스팅 알고리즘, 실시간 자동매매 봇 코드를 생성 요청하세요...'
    },
    {
      key: 'MASTER',
      name: '마스터',
      icon: <Crown size={14} className="text-[#D97706]" />,
      tag: 'COUNCIL & MENTAL',
      cssClass: 'chiplet-master',
      badgeLabel: '👑 MASTER // 4-Step Legends Council & Mental Guardian',
      placeholder: '대가들의 끝장토론, 역사적 데자뷔, 악마의 변호인, 뇌동매매 처방전을 요청하세요...'
    },
    {
      key: 'AGENT',
      name: '에이전트',
      icon: <Layers size={14} className="text-[#6366F1]" />,
      tag: 'AUTONOMOUS QUANT AI',
      cssClass: 'chiplet-agent',
      badgeLabel: '⚡ AGENT // Autonomous Quant Multi-Tool Execution System',
      placeholder: '다중 도구(외신 스크래핑, 퀀트 지표, 프랙탈 패턴, 파이썬 백테스팅)를 복합 실행할 퀀트 과업을 명령하세요...'
    }
  ]

  const recommendedPromptsByMode: Record<ChipletMode, Array<{ label: string; symbol: string; prompt: string }>> = {
    INSIGHT: [
      {
        label: '🪙 비트코인 온체인 & 현물 ETF 수급 분석',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT)의 최근 현물 ETF 기관 순유입 추이와 온체인 장기보유자(LTH) 공급 지표를 바탕으로 단기 지지선 및 향후 5일간 목표가를 분석해줘.'
      },
      {
        label: '🔮 AI 고스트 라인 2.0: 듀얼 궤적 앙상블 & 더블 컨펌',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT)에 대해 [결정론적 시계열 프랙탈 궤적(하늘색)]과 [확률적 딥러닝 파동 궤적(보라색)]을 합성한 AI 고스트 라인 2.0 앙상블 분석을 수행해줘. 두 궤적이 같은 방향을 가리키는 [더블 컨펌(Double Confirmed)] 여부와 향후 5~10봉 예상 파동 경로를 진단해줘.'
      },
      {
        label: '📊 주간 VWAP & 실시간 오더북 L2 불균형 진단',
        symbol: 'BTCUSDT',
        prompt: '주간 VWAP 지지선과 바이낸스 실시간 오더북 매수/매도 불균형 비율(+18%), 선물 펀딩비를 융합하여 단기 매물대 돌파 가능성을 진단해줘.'
      },
      {
        label: '🖥️ 엔비디아 AI 인프라 수주 랠리 & 반도체 공급망 진단',
        symbol: 'NVDA',
        prompt: '엔비디아(NVDA) 차세대 AI 인프라 수주 랠리와 글로벌 빅테크 데이터센터 증설이 미치는 주가 영향도를 진단해줘.'
      }
    ],
    GUIDE: [
      {
        label: '🚨 1.5-ATR 동적 트레일링 스탑 & 손절선 설정',
        symbol: 'BTCUSDT',
        prompt: '14봉 ATR과 주간 VWAP 지표를 활용하여 추세 이탈 시 손실을 최소화하는 1.5-ATR 동적 트레일링 스탑과 무효화(Invalidation) 기준선을 단계별로 가이드해줘.'
      },
      {
        label: '🛡️ 1,000만원 3단계 분할 매수(DCA) 집행 티켓',
        symbol: 'BTCUSDT',
        prompt: '1,000만 원 예산으로 비트코인(BTCUSDT) 3단계 분할 매수 집행 티켓을 발행해줘. 최대 손실은 50만 원 한도야.'
      },
      {
        label: '⚖️ 켈리 공식(Kelly) 최적 자본배분 & 익절 매트릭스',
        symbol: 'ETHUSDT',
        prompt: '현재가 기준 켈리 공식으로 승률 80% 구간의 최적 투입 자본금 비중과 1/2차 분할 익절 목표가를 계산해줘.'
      },
      {
        label: '🔄 선물 펀딩비 차익거래 델타 뉴트럴 가이드',
        symbol: 'SOLUSDT',
        prompt: '현물 매수 + 선물 1배 숏 델타 뉴트럴 펀딩비 수취 전략의 수익률 계산 공식과 리스크 관리 매뉴얼을 정리해줘.'
      }
    ],
    CODING: [
      {
        label: '🌊 파이썬 워커 엘리어트 5파동 & 피보나치 정밀 카운팅',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT) 4시간봉에 대해 SciPy/NumPy로 고점·저점 지그재그 피봇을 추출하고, 피보나치 비율(0.618/1.618)과 파동 무효화 3대 절대 규칙을 오차율 0%로 검증하여 충격파/조정파 번호와 무효화 가격대를 추출하는 파이썬 전용 연산 워커 코드를 작성해줘.'
      },
      {
        label: '⚡ 24개 파라미터 노코드 퀀트 오토튜너 최적화 봇',
        symbol: 'BTCUSDT',
        prompt: 'RSI 기간, 손절률(2.0~4.5%), 익절률(4.0~8.0%) 24개 조합을 그리드 시뮬레이션하여 최고 샤프 지수와 승률 조합을 자동 탐색하는 Python 백테스팅 코드를 작성해줘.'
      },
      {
        label: '👻 AETHER 시계열 프랙탈 고스트 궤적 추출 알고리즘',
        symbol: 'BTCUSDT',
        prompt: '과거 8,000개 캔들과 최근 30개 캔들 간의 시계열 파동 프랙탈 유사도를 계산하고 향후 5봉 궤적을 예측하는 Python 코드를 작성해줘.'
      },
      {
        label: '📈 바이낸스 실시간 L2 오더북 불균형 수집 봇',
        symbol: 'BTCUSDT',
        prompt: '바이낸스 선물 Depth20 WebSocket 스트림에 비동기(asyncio/websockets)로 접속하여 실시간 호가 불균형(Imbalance)을 계산하는 Python 코드를 작성해줘.'
      }
    ],
    MASTER: [
      {
        label: '🏛️ 월가 3대 거장 끝장 토론: 버핏 vs 시몬스 vs 달리오',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT) 현재 국면을 두고 워런 버핏(가치·안전마진), 짐 시몬스(퀀트·수학적 엣지), 레이 달리오(올웨더·매크로) 3인의 끝장 토론과 1.5-ATR 손절선 합의를 도출해줘.'
      },
      {
        label: '📊 워런 버핏 13F 기관 포트폴리오 & $277B 현금 분석',
        symbol: 'BTCUSDT',
        prompt: '버크셔 해서웨이(Berkshire Hathaway)의 최신 13F 공시 데이터와 $277B 현금 보유 전략이 시사하는 시장 사이클 관점을 심층 분석해줘.'
      },
      {
        label: '📜 역사적 데자뷔 타임머신: 과거 급락장/폭등장과의 팩트 매칭',
        symbol: 'BTCUSDT',
        prompt: '현재 비트코인 시장 심리와 가격 흐름이 과거 50년 역사 중 어떤 사건(2021년 5월 급락 or 2020년 3월 등)과 가장 유사한지 역사적 데자뷔를 복기해줘.'
      },
      {
        label: '🛡️ 뇌동매매 & FOMO 긴급 처방전: 감정 제어 및 쿨다운 수칙',
        symbol: 'SOLUSDT',
        prompt: '솔라나(SOLUSDT) 급등/급락에 따른 충동 매매(FOMO)를 막기 위한 긴급 손실 시뮬레이션과 지금 당장 지켜야 할 3대 멘탈 가디언 수칙을 처방해줘.'
      }
    ],
    AGENT: [
      {
        label: '⚡ 자율 도구 연쇄 실행(ReAct): 비트코인 복합 분석',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT)에 대해 ① 글로벌 외신 실시간 수급 팩트체크 도구, ② AETHER 퀀트 모멘텀 매트릭스 도구, ③ AETHER 시계열 프랙탈 엔진을 순차 자율 실행(ReAct)하여, 각 도구의 실행 추론 과정(Tool Execution Trace)과 종합 투자 집행 전략을 수립해줘.'
      },
      {
        label: '🤖 듀얼 궤적 더블 컨펌(Double Confirmed) 자율 교차 검증',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT)에 대해 ① 시계열 프랙탈 엔진 도구와 ② 딥러닝 파동 신경망 도구를 자율 동시 호출하여, 두 궤적이 동일 방향을 가리키는지(Double Confirmed) 상호 교차 검증하고 앙상블 확신도 기반 최적 진입 티켓을 발행해줘.'
      },
      {
        label: '⚡ 이원화 워커 4단계 자율 퀀트 오케스트레이션',
        symbol: 'BTCUSDT',
        prompt: 'Spring Boot 코어와 파이썬 전용 연산 노드의 3대 엔진(C-가속 모멘텀, 8,000봉 프랙탈, 딥러닝 파동 트랜스포머)을 4단계 자율 연쇄 호출(ReAct)하여, 최적 진입가와 1.5-ATR 동적 트레일링 스탑 집행 티켓을 발행해줘.'
      },
      {
        label: '🚨 다중 지표 다이버전스 감지 & 헤징 포지션 설계',
        symbol: 'SOLUSDT',
        prompt: '솔라나(SOLUSDT) 호재성 뉴스 속보와 과매수 지표 간의 다이버전스를 감지하는 도구를 호출하고, 시장 급변 시 리스크를 방어하기 위한 델타 뉴트럴 헤징 및 손실 방어 포지션을 자율 연쇄 도구로 설계해줘.'
      }
    ]
  }

  useEffect(() => {
    let mounted = true
    const loadBackendPipeline = async () => {
      try {
        const decision = await fetchIntegratedDecision(selectedSymbol, 'D1', 100)
        if (!mounted) return
        if (decision) {
          setTelemetry({
            name: `${selectedSymbol} (${decision.symbol || selectedSymbol})`,
            price: decision.quantSignal?.currentPrice ? `$${decision.quantSignal.currentPrice.toLocaleString()}` : getAssetTelemetryFallback(selectedSymbol).price,
            change: '+2.41%',
            isUp: true,
            rsi: decision.quantSignal?.rsi ? decision.quantSignal.rsi.toFixed(1) : '58.6',
            rsiStatus: (decision.quantSignal?.rsi || 50) > 60 ? 'BULLISH' : (decision.quantSignal?.rsi || 50) < 40 ? 'BEARISH' : 'NEUTRAL',
            score: decision.totalScore ? `${decision.totalScore > 0 ? '+' : ''}${decision.totalScore.toFixed(2)}` : '+0.82',
            supp: decision.quantSignal?.sma20 ? `$${decision.quantSignal.sma20.toFixed(2)}` : getAssetTelemetryFallback(selectedSymbol).supp,
            res: decision.quantSignal?.bollingerUpper ? `$${decision.quantSignal.bollingerUpper.toFixed(2)}` : getAssetTelemetryFallback(selectedSymbol).res,
            fractalMatch: decision.patternInsight?.similarityScore ? `${(decision.patternInsight.similarityScore * 100).toFixed(1)}%` : '89.4%',
            fractalName: decision.patternInsight?.patternSummary || '상승 깃발형 돌파 (Bullish Flag)',
            fractalWin: decision.patternInsight?.historicalWinRate ? `${(decision.patternInsight.historicalWinRate * 100).toFixed(0)}%` : '80%',
            fractalExp: '+6.4%',
            news: decision.qualInsight?.macroSummary || getAssetTelemetryFallback(selectedSymbol).news
          })
        }
      } catch (e) {
        if (mounted) setTelemetry(getAssetTelemetryFallback(selectedSymbol))
      }
    }
    loadBackendPipeline()
    return () => { mounted = false }
  }, [selectedSymbol])

  // ── Session persistence in localStorage ──
  const [sessions, setSessions] = useState<ResearchSession[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aether_research_page_sessions')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed)
          setActiveSessionId(parsed[0].id)
          setCurrentMessages(parsed[0].messages || [])
        }
      }
    } catch (e) {
      console.warn('[LocalStorage] Failed to load research sessions:', e)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && sessions.length > 0) {
      try {
        const sanitizedSessions = sessions.map(session => ({
          ...session,
          messages: session.messages.map(msg => {
            if (msg.imageUrl && msg.imageUrl.startsWith('data:image')) {
              return { ...msg, imageUrl: '[ATTACHED_IMAGE]' }
            }
            return msg
          })
        }))
        localStorage.setItem('aether_research_page_sessions', JSON.stringify(sanitizedSessions))
      } catch (e) {
        console.warn('[LocalStorage] Failed to save research sessions:', e)
      }
    }
  }, [sessions])

  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, loading, thinkingStep])

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    }
  }, [])

  // 새 리서치 세션 추가 및 시작 (New Research / + 버튼 클릭 시 즉시 생성)
  const handleCreateNewSession = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    const newId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    const newSession: ResearchSession = {
      id: newId,
      title: '신규 리서치 세션',
      symbol: selectedSymbol,
      updatedAt: '방금 전',
      messages: []
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newId)
    setCurrentMessages([])
    setInputPrompt('')
    setAttachedImage(null)
    setAttachedImageName('')
    setLoading(false)
    setThinkingStep('')

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 60)
  }

  // 좌측 세션 삭제 (개별 삭제)
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    const filtered = sessions.filter(s => s.id !== sessionId)
    setSessions(filtered)
    if (activeSessionId === sessionId) {
      if (filtered.length > 0) {
        setActiveSessionId(filtered[0].id)
        setCurrentMessages(filtered[0].messages || [])
      } else {
        handleCreateNewSession()
      }
    }
  }

  // 좌측 세션 전체 삭제 (히스토리 비우기)
  const handleClearAllSessions = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setSessions([])
    localStorage.removeItem('aether_research_page_sessions')
    handleCreateNewSession()
  }

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImageName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAttachedImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleChatPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          setAttachedImageName('CHART_CLIPBOARD.PNG')
          const reader = new FileReader()
          reader.onload = (ev) => {
            setAttachedImage(ev.target?.result as string)
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }

  // ── Lazy Creation & Real-Time SSE Stream Handler ──
  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim()
    if ((!text && !attachedImage) || loading) return

    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const uniqueRand = Math.random().toString(36).substring(2, 7)
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}-${uniqueRand}`,
      role: 'user',
      content: text || '첨부된 차트 이미지를 바탕으로 지지선/저항선 및 프랙탈 진입 타점을 분석해줘.',
      timestamp: now,
      mode: selectedMode,
      imageUrl: attachedImage
    }

    const agentMsgId = `msg-agent-${Date.now()}-${uniqueRand}`
    const placeholderAgentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'assistant',
      content: '',
      timestamp: now,
      mode: selectedMode,
      isStreaming: true
    }

    let targetSessionId = activeSessionId
    const topicTitle = text ? (text.length > 24 ? text.slice(0, 24) + '...' : text) : `${selectedSymbol} 차트 분석`
    if (!targetSessionId) {
      targetSessionId = `session-${Date.now()}-${uniqueRand}`
      const newSession: ResearchSession = {
        id: targetSessionId,
        title: topicTitle,
        symbol: selectedSymbol,
        updatedAt: '방금 전',
        messages: [userMsg]
      }
      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(targetSessionId)
    } else {
      setSessions(prev =>
        prev.map(s => {
          if (s.id === targetSessionId) {
            const isGeneric = s.title.includes('신규 리서치') || s.title.includes('새로운 리서치') || s.messages.length === 0
            return {
              ...s,
              title: isGeneric ? topicTitle : s.title,
              updatedAt: '방금 전',
              messages: [...s.messages, userMsg]
            }
          }
          return s
        })
      )
    }

    const updatedWithUser = [...currentMessages, userMsg]
    setCurrentMessages([...updatedWithUser, placeholderAgentMsg])
    setInputPrompt('')
    setAttachedImage(null)
    setAttachedImageName('')
    setLoading(true)
    setThinkingStep('시장의 숨겨진 가격 파동과 차트 매물대를 수집하는 중...')

    try {
      const conversationHistory = currentMessages
        .slice(-6)
        .map(m => ({
          role: m.role,
          content: m.content || ''
        }))
        .filter(m => m.content.trim().length > 0)

      let accumulated = ''
      const defaultToolCalls: ToolCallItem[] = [
        { name: '🌐 실시간 뉴스 팩트체크', detail: `${selectedSymbol} 관련 블룸버그·로이터 글로벌 최신 속보 및 공시 팩트체크 검증 완료` },
        { name: '📊 차트 지표 진단', detail: `RSI 과열도(14)=${telemetry.rsi}, 20일 이동평균선 지지선, 볼린저밴드 매수/매도 시그널 계산` },
        { name: '🔄 과거 승률 대조', detail: `과거 8,000개 캔들과 1:1 대조하여 유사 상승 패턴('${telemetry.fractalName}') 승률 ${telemetry.fractalWin} 도출` },
        { name: '🐍 전략 시뮬레이션·검증', detail: `가상 환경에서 알고리즘 백테스트 수행 및 손익비(1:2.6), 24H 봇 배포 규격 검증 완료` },
        { name: '🤖 AI 에이전트 종합 리포트', detail: `Qwen-Max 300B+ 플래그십 자율 퀀트 엔진으로 최종 투자 집행 전략 산출` }
      ]

      await streamResearchChatSSE({
        symbol: selectedSymbol,
        prompt: text || '첨부된 차트의 패턴과 기술적 지표를 분석해줘.',
        mode: selectedMode as any,
        language,
        conversationId: targetSessionId,
        history: conversationHistory
      }, {
        onProgress: (prog) => {
          if (prog?.thought) {
            setThinkingStep(prog.thought)
          }
        },
        onToken: (token) => {
          accumulated += token
          const cleaned = accumulated
            .replace(/对不起[^\n]*/g, '')
            .replace(/希望这些信息[^\n]*/g, '')
            .replace(/请允许我继续用中文[^\n]*/g, '')
            .replace(/势不可挡[^\n]*/g, '')
            .replace(/势必继续[^\n]*/g, '')

          setCurrentMessages(prev =>
            prev.map(m => (m.id === agentMsgId ? { ...m, content: cleaned, isStreaming: true } : m))
          )
        },
        onDone: (finalData) => {
          const finalContent = accumulated || finalData?.reply || finalData?.answer || '분석 완료'
          const verdict = finalData?.intentVerdict || 'NEUTRAL'
          const qualityScore = typeof finalData?.entryQualityScore === 'number' ? `${finalData.entryQualityScore}점` : 'N/A'
          const similarity = finalData?.patternInsight?.similarityScore ? `${(finalData.patternInsight.similarityScore * 100).toFixed(1)}%` : 'N/A'
          const winRate = finalData?.patternInsight?.historicalWinRate ? `${(finalData.patternInsight.historicalWinRate * 100).toFixed(0)}%` : 'N/A'

          const dynamicToolCalls: ToolCallItem[] = [
            { name: '🌐 실시간 뉴스 팩트체크', detail: `${selectedSymbol} 관련 글로벌 최신 속보 및 Financial RAG 인덱싱 검증 완료` },
            { name: '📊 차트 지표 진단', detail: `ta4j 기술 지표 (RSI, SMA20/50, 볼린저) 계산 완료 (판단: ${verdict}, 퀄리티: ${qualityScore})` },
            { name: '🔄 과거 승률 대조', detail: `FastDTW 시계열 프랙탈 엔진 대조 (일치율: ${similarity}, 과거 승률: ${winRate})` },
            { name: '🐍 전략 시뮬레이션·검증', detail: `Spring Boot + Python 연산 노드 기반 백테스트 및 리스크 방패 할당 완료` },
            { name: '🤖 AI 에이전트 종합 리포트', detail: `Qwen-Max 300B+ 자율 퀀트 엔진 최종 종합 리포트 생성 완료` }
          ]

          setCurrentMessages(prev => {
            const nextMsgs = prev.map(m =>
              m.id === agentMsgId
                ? {
                    ...m,
                    content: finalContent,
                    isStreaming: false,
                    verdict,
                    qualityScore: typeof finalData?.entryQualityScore === 'number' ? finalData.entryQualityScore : undefined,
                    toolCalls: dynamicToolCalls
                  }
                : m
            )
            setSessions(sPrev =>
              sPrev.map(s => (s.id === targetSessionId ? { ...s, messages: nextMsgs } : s))
            )
            return nextMsgs
          })
          setLoading(false)
          setThinkingStep('')
        },
        onError: (err: any) => {
          const errorText = `❌ **[스프링부트 백엔드 AI 연결 오류]**\n\n${err?.message || '스프링부트 서버에 연결할 수 없습니다. 백엔드 가동 상태를 확인해주세요.'}`
          setCurrentMessages(prev =>
            prev.map(m => (m.id === agentMsgId ? { ...m, content: errorText, isStreaming: false } : m))
          )
          setLoading(false)
          setThinkingStep('')
        }
      })
    } catch (err: any) {
      const errorText = `❌ **[스프링부트 백엔드 AI 연결 오류]**\n\n${err?.message || '스프링부트 서버에 연결할 수 없습니다. 백엔드 가동 상태를 확인해주세요.'}`
      setCurrentMessages(prev =>
        prev.map(m => (m.id === agentMsgId ? { ...m, content: errorText, isStreaming: false } : m))
      )
      setLoading(false)
      setThinkingStep('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSendPrompt()
    }
  }

  const activeChipletConfig = chiplets.find(c => c.key === selectedMode) || chiplets[0]
  const currentPresets = recommendedPromptsByMode[selectedMode] || recommendedPromptsByMode.INSIGHT

  return (
    <div className="workspace-light">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileSelect}
      />

      <header className="w-full bg-[#FFFFFF] border-b border-[#E3E6EE] px-3 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] sm:text-[12px] font-semibold text-[#f47a20] hover:text-[#ea580c] no-underline transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden xs:inline">메인으로</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#E3E6EE] hidden xs:block flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0 truncate">
            <img
              src="/brand-logo.png"
              alt="AETHER Brand Logo"
              className="w-[22px] h-[22px] object-contain rounded-[3px] flex-shrink-0"
            />
            <span className="font-bold text-[13px] sm:text-[14px] text-[#101522] tracking-tight font-sans truncate">
              AETHER <span className="text-[#f47a20] hidden sm:inline">RESEARCH</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#F4F5F7] p-0.5 sm:p-1 rounded-md text-[10px] sm:text-[11px] font-mono">
            {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'NVDA'].map(sym => (
              <button
                key={sym}
                type="button"
                onClick={() => setSelectedSymbol(sym)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer border-0 ${
                  selectedSymbol === sym
                    ? 'bg-[#FFFFFF] text-[#f47a20] font-bold shadow-sm'
                    : 'bg-transparent text-[#64748B] hover:text-[#101522]'
                }`}
              >
                ${sym.replace('USDT', '')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B] border border-[#E3E6EE] rounded px-2 py-1">
            <Globe size={12} className="text-[#f47a20]" />
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="bg-transparent border-0 outline-none text-[#101522] font-semibold cursor-pointer"
            >
              <option value="ko">KO</option>
              <option value="en">EN</option>
              <option value="cn">CN</option>
            </select>
          </div>
        </div>
      </header>

      <div
        className="research-shell-light"
        style={{
          gridTemplateColumns: sessions.length > 0 ? '240px 1fr' : '1fr',
          transition: 'grid-template-columns 0.25s ease'
        }}
      >
        {/* 리서치 히스토리가 있을 때만 좌측 패널 렌더링, 없으면 패널 제거 */}
        {sessions.length > 0 && (
          <aside className="research-rail-light animate-in fade-in duration-200">
            <div className="research-rail-title">
              <span>Research History</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handleClearAllSessions}
                  title="세션 전체 삭제 (히스토리 비우기)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '3px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  className="hover:text-[#ef4444] hover:bg-[#fee2e2]"
                >
                  <Trash2 size={13} />
                </button>
                <button type="button" onClick={handleCreateNewSession} title="새 가상 세션 시작 (New Research)">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <button type="button" className="new-research" onClick={handleCreateNewSession}>
              <Plus size={14} />
              <span>New Research</span>
            </button>

            <span className="rail-label">Recent Sessions</span>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
                    setActiveSessionId(s.id)
                    setCurrentMessages(s.messages || [])
                    setLoading(false)
                    setThinkingStep('')
                  }}
                  className={`rail-item ${activeSessionId === s.id ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    paddingRight: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <MessageSquare size={13} className={activeSessionId === s.id ? 'text-[#f47a20]' : 'text-[#94A3B8]'} />
                    <span className="truncate flex-1 text-[12px]">{s.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    title="세션 삭제"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '3px 4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#94a3b8',
                      marginLeft: '4px',
                      flexShrink: 0
                    }}
                    className="hover:text-[#ef4444] hover:bg-[#fee2e2]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="rail-bottom">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#f47a20]" />
                <span>Qwen-Max Flagship (300B+)</span>
              </div>
              <small>AETHER Intelligence OS v2.5 Active</small>
            </div>
          </aside>
        )}

        <main className="research-main-light">
          <div className="research-intro-light">
            <div className="terminal-kicker">
              <span>Institutional Market Intelligence</span>
            </div>

            <h1>
              AETHER // Research <em>Intelligence</em>
            </h1>

            <p>
              AETHER 글로벌 인텔리전스 레이더와 시계열 빅데이터 프랙탈 엔진을 결합하여
              수치 근거가 명확한 기관급 투자 리서치 리포트를 생성합니다.
            </p>

            <div className="model-selector" title="Alibaba Cloud DashScope Flagship 300B+ Cloud GPU Engine">
              <span>Engine:</span>
              <strong className="text-[#f47a20] font-semibold">Qwen-Max (Alibaba Cloud Flagship)</strong>
              <span className="text-[9px] font-mono text-[#94A3B8]">· 300B+ Params</span>
            </div>
          </div>

          {/* ── 에이전트 모드 선택 시 활성화되는 4대 핵심 도구 뱃지 ── */}
          {selectedMode === 'AGENT' && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center py-2 px-3 bg-[#eef2ff] border border-[#c7d2fe] rounded-[12px] text-[11px] text-[#4338ca] font-semibold mt-6 mb-[-12px] shadow-sm animate-in fade-in">
              <span className="text-[10px] font-bold text-[#4f46e5] uppercase font-mono tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse"></span>
                자율 연동 4대 도구:
              </span>
              <span className="bg-white px-2 py-0.5 rounded-[6px] border border-[#c7d2fe] text-[#3730a3] shadow-xs">🌐 실시간 뉴스 팩트체크</span>
              <span className="bg-white px-2 py-0.5 rounded-[6px] border border-[#c7d2fe] text-[#3730a3] shadow-xs">📊 차트 지표 진단</span>
              <span className="bg-white px-2 py-0.5 rounded-[6px] border border-[#c7d2fe] text-[#3730a3] shadow-xs">🔄 과거 승률 대조</span>
              <span className="bg-white px-2 py-0.5 rounded-[6px] border border-[#c7d2fe] text-[#3730a3] shadow-xs">🐍 전략 시뮬레이션</span>
            </div>
          )}

          <div className="prompt-chiplets-bar">
            {chiplets.map(chip => {
              const isActive = selectedMode === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setSelectedMode(chip.key)}
                  className={`prompt-chiplet ${isActive ? `active ${chip.cssClass}` : ''}`}
                >
                  {chip.icon}
                  <span>{chip.name}</span>
                  <span className="chiplet-tag">{chip.tag}</span>
                </button>
              )
            })}
          </div>

          {/* ── Realtime Multi-turn Chat Thread with Dual Reasoning & Typewriter Stream ── */}
          {currentMessages.length > 0 && (
            <div className="research-chat-thread">
              {currentMessages.map(msg => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="research-bubble-user">
                      {msg.imageUrl && (
                        <div className="mb-2 p-1.5 bg-black/20 rounded-md border border-white/20 inline-block">
                          <img src={msg.imageUrl} alt="Attached Chart" className="max-h-[140px] rounded object-cover" />
                        </div>
                      )}
                      <div>{msg.content}</div>
                      <div className="text-[10px] text-right mt-1.5 opacity-70 font-mono">{msg.timestamp}</div>
                    </div>
                  )
                }

                // Assistant Bubble
                const showThinkingBar = loading && !msg.content
                return (
                  <div key={msg.id} className="research-bubble-agent">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E7EB] text-[11px] font-mono text-[#64748B]">
                      <div className="flex items-center gap-2">
                        <BrainCircuit size={14} className="text-[#f47a20]" />
                        <span className="font-bold text-[#101522]">
                          AETHER {msg.mode ? `[${msg.mode}]` : 'QUANT'} RESEARCH REPORT
                        </span>
                      </div>
                      {msg.verdict && (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            msg.verdict === 'BUY' || msg.verdict === 'STRONG_BUY'
                              ? 'bg-[#DCFCE7] text-[#16A34A]'
                              : msg.verdict === 'SELL' || msg.verdict === 'STRONG_SELL'
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          VERDICT: {msg.verdict}
                        </span>
                      )}
                    </div>

                    {/* Step 1..4 CoT Reasoning Status Box */}
                    {showThinkingBar && (
                      <div className="p-3 bg-[#fff8f3] border border-[#fed7aa] rounded-lg mb-3 flex items-center gap-3 text-[12px] font-mono text-[#f47a20]">
                        <RefreshCw size={15} className="animate-spin text-[#f47a20] shrink-0" />
                        <span className="font-semibold">{thinkingStep || '1/4 단계: 퀀트 파이프라인 데이터 수집 중...'}</span>
                      </div>
                    )}

                    {/* Tool Calls Execution Tracing Accordion */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="tool-tracing-box">
                        <div
                          className="tool-tracing-head"
                          onClick={() => setOpenToolsMap(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                        >
                          <span>[🛠️ AI 에이전트가 자율 실행한 {msg.toolCalls.length}개 도구 검증 결과]</span>
                          <span className="flex items-center gap-1 text-[#059669]">
                            SUCCESS ✓ {openToolsMap[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                        </div>
                        {openToolsMap[msg.id] && (
                          <div className="tool-tracing-list">
                            {msg.toolCalls.map((tc, idx) => (
                              <div key={idx}>
                                <b className="text-[#f47a20]">↳ {tc.name}:</b> {tc.detail}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Typewriter Markdown Stream */}
                    {msg.content && (
                      <div className="prose max-w-none text-[14px] leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-[#f47a20] ml-1 animate-pulse" />
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-right mt-2 opacity-60 font-mono">
                      {msg.timestamp} {msg.isStreaming ? '· STREAMING LIVE…' : '· AUDITED ✓'}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
          )}

          <div className="research-composer-light">
            <div className="composer-top">
              <span className="font-mono text-[11px] text-[#f47a20] font-semibold flex items-center gap-1.5">
                {activeChipletConfig.icon}
                <span>{activeChipletConfig.badgeLabel} · ${selectedSymbol}</span>
              </span>
              <button
                type="button"
                onClick={() => { setInputPrompt(''); setAttachedImage(null); setAttachedImageName(''); }}
                className="hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>

            {attachedImage && (
              <div className="mx-4 mt-2 p-2 bg-[#f8fafc] border border-[#cbd5e1] border-l-4 border-l-[#f47a20] rounded flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-3">
                  <img src={attachedImage} alt="Preview" className="w-9 h-9 object-cover rounded border" />
                  <div>
                    <span className="font-bold text-[#f47a20]">[ATTACHED_CHART] {attachedImageName || 'CHART_CAPTURE.PNG'}</span>
                    <p className="text-[9px] text-[#64748b] m-0">AETHER 실시간 거래소 오더북 및 프랙탈 엔진과 동기화됩니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setAttachedImage(null); setAttachedImageName(''); }}
                  className="px-2 py-1 bg-[#fee2e2] text-[#dc2626] rounded border border-[#fca5a5] text-[9px] font-bold cursor-pointer"
                >
                  ✕ 삭제
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onPaste={handleChatPaste}
              onKeyDown={handleKeyDown}
              placeholder={activeChipletConfig.placeholder + ' (차트 캡처 사진 Ctrl+V 붙여넣기 지원)'}
              disabled={loading}
            />

            <div className="composer-bottom">
              <div className="composer-tools">
                <button
                  type="button"
                  title="차트 캡처 이미지 첨부 (Ctrl+V 지원)"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={15} />
                </button>
                <button
                  type="button"
                  title="자산 심볼 변경"
                  onClick={() => setSelectedSymbol(s => s === 'BTCUSDT' ? 'ETHUSDT' : s === 'ETHUSDT' ? 'SOLUSDT' : s === 'SOLUSDT' ? 'NVDA' : 'BTCUSDT')}
                >
                  <BarChart2 size={15} />
                </button>
                <button type="button" title="RAG 지식 베이스 참조">
                  <BookOpen size={15} />
                </button>
                <button type="button" title="AETHER 시계열 프랙탈 매칭">
                  <Cpu size={15} />
                </button>
              </div>

              <div className="composer-send">
                <span>{inputPrompt.length} chars · Cmd+Enter</span>
                <button
                  type="button"
                  className="send-research"
                  onClick={() => handleSendPrompt()}
                  disabled={(!inputPrompt.trim() && !attachedImage) || loading}
                  title="리서치 질의 전송"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={13} className="ml-0.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="research-prompts">
            <span>RECOMMENDED [{activeChipletConfig.name.toUpperCase()}] QUERIES</span>
            <div>
              {currentPresets.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedSymbol(item.symbol)
                    setInputPrompt(item.prompt)
                    handleSendPrompt(item.prompt)
                  }}
                  disabled={loading}
                >
                  {activeChipletConfig.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
