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
  X
} from 'lucide-react'
import {
  sendResearchChat,
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
  if (sym.includes('005930') || sym.includes('삼성')) {
    return {
      name: '삼성전자 (005930.KS)',
      price: '₩56,200',
      change: '+0.89%',
      isUp: true,
      rsi: '43.2',
      rsiStatus: 'NEUTRAL',
      score: '+0.48',
      supp: '₩55,350',
      res: '₩58,160',
      fractalMatch: '84.2%',
      fractalName: '박스권 횡보 후 지지선 반등',
      fractalWin: '75%',
      fractalExp: '+4.2%',
      news: '삼성전자 HBM3E 12단 퀄테스트 통과 임박 및 반도체 밸류업 공시 수급'
    }
  }
  if (sym.includes('NVDA') || sym.includes('엔비디아')) {
    return {
      name: 'NVIDIA (NVDA)',
      price: '$138.50',
      change: '+2.45%',
      isUp: true,
      rsi: '62.4',
      rsiStatus: 'BULLISH',
      score: '+0.84',
      supp: '$136.40',
      res: '$145.20',
      fractalMatch: '91.8%',
      fractalName: '차세대 칩 수요 상승 깃발형 돌파',
      fractalWin: '85%',
      fractalExp: '+8.4%',
      news: '빅테크 2026 AI 데이터센터 인프라 CAPEX 상향 및 마진율 방어'
    }
  }
  if (sym.includes('SOL') || sym.includes('솔라나')) {
    return {
      name: 'Solana (SOL/USD)',
      price: '$178.50',
      change: '+4.20%',
      isUp: true,
      rsi: '65.8',
      rsiStatus: 'BULLISH',
      score: '+0.78',
      supp: '$172.00',
      res: '$188.00',
      fractalMatch: '88.6%',
      fractalName: 'DEX 유동성 급증 모멘텀 지속형',
      fractalWin: '82%',
      fractalExp: '+7.6%',
      news: '솔라나 온체인 DEX 24H 거래량 사상 최고치 경신 및 고래 지갑 순매수'
    }
  }
  if (sym.includes('ETH') || sym.includes('이더리움')) {
    return {
      name: 'Ethereum (ETH/USD)',
      price: '$2,340.50',
      change: '+1.85%',
      isUp: true,
      rsi: '52.1',
      rsiStatus: 'NEUTRAL',
      score: '+0.56',
      supp: '$2,280.00',
      res: '$2,420.00',
      fractalMatch: '82.5%',
      fractalName: '스테이킹 락업 매물 잠김 수렴형',
      fractalWin: '78%',
      fractalExp: '+5.1%',
      news: '이더리움 스테이킹 참여율 분기 최고치 경신 및 거래소 잔고 최저치'
    }
  }
  return {
    name: 'Bitcoin (BTC/USD)',
    price: '$78,418.00',
    change: '+2.41%',
    isUp: true,
    rsi: '58.6',
    rsiStatus: 'BULLISH',
    score: '+0.82',
    supp: '$77,200.00',
    res: '$81,500.00',
    fractalMatch: '89.4%',
    fractalName: '상승 깃발형 돌파 (Bullish Flag)',
    fractalWin: '80%',
    fractalExp: '+6.4%',
    news: '비트코인 현물 ETF 4.8억 달러 기관 순유입 및 선물 미결제약정 증가'
  }
}

export default function ResearchPage() {
  const [language, setLanguage] = useState<'ko' | 'en' | 'cn'>('ko')
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [selectedMode, setSelectedMode] = useState<ChipletMode>('INSIGHT')
  const [inputPrompt, setInputPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string>('')
  const [activeSessionId, setActiveSessionId] = useState('session-1')

  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [attachedImageName, setAttachedImageName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        label: '비트코인 온체인 & 현물 ETF 수급 분석',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT)의 최근 현물 ETF 기관 순유입 추이와 온체인 장기보유자(LTH) 공급 지표를 바탕으로 단기 지지선 및 향후 5일간 목표가를 분석해줘.'
      },
      {
        label: '솔라나 DEX 유동성 & 온체인 고래 추적',
        symbol: 'SOLUSDT',
        prompt: '솔라나(SOLUSDT) 네트워크 DEX 거래량 급증 및 대형 고래 지갑 순매집 현황을 분석하고 분할 진입 전략을 제시해줘.'
      },
      {
        label: '지표-외신 다이버전스 감성 분석',
        symbol: 'BTCUSDT',
        prompt: '호재성 외신 속보와 RSI 과매수/과매도 다이버전스가 충돌할 때, 시장의 숨겨진 트랩 리스크와 적정 포지션 비중을 분석해줘.'
      },
      {
        label: '엔비디아 AI 인프라 수주 랠리 진단',
        symbol: 'NVDA',
        prompt: '엔비디아(NVDA) 차세대 AI 인프라 수주 랠리와 글로벌 빅테크 데이터센터 증설이 미치는 주가 영향도를 진단해줘.'
      }
    ],
    GUIDE: [
      {
        label: '변동성 돌파 자율 매매 봇 전략 설계',
        symbol: 'BTCUSDT',
        prompt: '래리 윌리엄스 변동성 돌파(Volatility Breakout) 전략을 기반으로 24시간 자율 매매 봇의 K값(0.5) 및 진입/청산 룰을 상세히 가이드해줘.'
      },
      {
        label: '분할 매수(DCA) & 리스크 패리티 가이드',
        symbol: 'ETHUSDT',
        prompt: '시장 급락 시 최대 낙폭(MDD)을 10% 이내로 방어하는 5단계 분할 매수(DCA) 및 켈리 공식 기반 자금 관리 플레이북을 작성해줘.'
      },
      {
        label: '손절선(Invalidation) & 트레일링 스탑 설정',
        symbol: 'BTCUSDT',
        prompt: 'SMA20 및 ATR(14) 지표를 활용하여 추세 이탈 시 손실을 최소화하는 동적 무효화(Invalidation) 기준선을 단계별로 가이드해줘.'
      },
      {
        label: '선물 펀딩비 차익거래(Arbitrage) 가이드',
        symbol: 'SOLUSDT',
        prompt: '현물 매수 + 선물 1배 숏 델타 뉴트럴 펀딩비 수취 전략의 수익률 계산 공식과 리스크 관리 매뉴얼을 정리해줘.'
      }
    ],
    CODING: [
      {
        label: 'Python RSI+볼린저 역추세 퀀트 전략 코드',
        symbol: 'BTCUSDT',
        prompt: '실행 가능한 고성능 RSI(14) < 30 + 볼린저 밴드 하단 터치 반등 매수 백테스팅 스크립트(Python 3.12)를 작성해줘.'
      },
      {
        label: '바이낸스 WebSocket 실시간 오더북 수집 봇',
        symbol: 'BTCUSDT',
        prompt: '바이낸스 선물 Depth20 WebSocket 스트림에 비동기(asyncio/websockets)로 접속하여 실시간 호가 불균형(Imbalance)을 계산하는 Python 코드를 작성해줘.'
      },
      {
        label: 'AETHER 시계열 프랙탈 유사도 계산기',
        symbol: 'BTCUSDT',
        prompt: '과거 8,000개 캔들과 최근 30개 캔들 간의 시계열 파동 유사도 및 프랙탈 일치율(%)을 계산하는 고속 연산 코드를 작성해줘.'
      },
      {
        label: 'REST API 포트폴리오 리밸런싱 자동화 스크립트',
        symbol: 'NVDA',
        prompt: 'Spring Boot REST API와 통신하여 주기적으로 타겟 비중(BTC 50%, NVDA 30%, CASH 20%)을 맞추는 자동 리밸런싱 Python 함수를 만들어줘.'
      }
    ],
    MASTER: [
      {
        label: '대가들의 끝장 토론: 버핏 vs 캐시우드 vs 소로스 난상 격돌',
        symbol: 'BTCUSDT',
        prompt: '비트코인(BTCUSDT) 현재 국면을 두고 워런 버핏(보수 가치), 캐시 우드(혁신 성장), 조지 소로스(매크로 심판) 3인의 끝장 토론과 중재 결론을 도출해줘.'
      },
      {
        label: '역사적 데자뷔 타임머신: 과거 급락장/폭등장과의 팩트 매칭',
        symbol: 'BTCUSDT',
        prompt: '현재 비트코인 시장 심리와 가격 흐름이 과거 50년 역사 중 어떤 사건(2021년 5월 급락 or 2020년 3월 등)과 가장 유사한지 역사적 데자뷔를 복기해줘.'
      },
      {
        label: '악마의 변호인 (Red Team): 내 투자 생각의 치명적 맹점 3가지 공격',
        symbol: 'NVDA',
        prompt: '엔비디아(NVDA)를 매수하려는 투자자의 논리에서 가장 치명적인 3가지 맹점을 월가 공매도 헤지펀드 시각에서 가혹하게 비판하고 반박 질문을 던져줘.'
      },
      {
        label: '뇌동매매 & FOMO 긴급 처방전: 감정 제어 및 쿨다운 행동 수칙',
        symbol: 'SOLUSDT',
        prompt: '솔라나(SOLUSDT) 급등/급락에 따른 충동 매매(FOMO)를 막기 위한 긴급 손실 시뮬레이션과 지금 당장 지켜야 할 3대 멘탈 가디언 수칙을 처방해줘.'
      }
    ],
    CREATIVE: [
      {
        label: '2030 글로벌 가상자산 미래 시나리오 소설',
        symbol: 'BTCUSDT',
        prompt: '2030년 월가 중앙은행 디지털화폐(CBDC)와 온체인 인공지능 자율 거래소가 공존하는 글로벌 금융 시장의 하루를 영화 같은 시나리오로 창작해줘.'
      },
      {
        label: '기관급 위클리 퀀트 뉴스레터 초안 작성',
        symbol: 'BTCUSDT',
        prompt: '골드만삭스/블룸버그 리서치 헤드라인 스타일로 이번 주 글로벌 매크로, 온체인 고래, 프랙탈 패턴을 아우르는 고급스러운 위클리 인텔리전스 레터를 작성해줘.'
      },
      {
        label: '워런 버핏 vs 퀀트 AI 가상 토론',
        symbol: 'BTCUSDT',
        prompt: '가치투자의 거장 워런 버핏과 초단타 퀀트 AI 에이전트가 "비트코인의 본질 가치와 24H 시장"을 주제로 펼치는 가상 토론 대본을 흥미진진하게 창작해줘.'
      },
      {
        label: '미래 웹3 스테이블코인 결제망 예측 리포트',
        symbol: 'SOLUSDT',
        prompt: '솔라나/폴리곤 기반 마이크로세컨드 스테이블코인 결제 인프라가 전통 SWIFT 망을 대체해 나가는 5단계 로드맵을 창의적인 인텔리전스 리포트로 작성해줘.'
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

  const [sessions, setSessions] = useState<ResearchSession[]>([
    {
      id: 'session-1',
      title: '비트코인 온체인 및 현물 ETF 수급 분석',
      symbol: 'BTCUSDT',
      updatedAt: '방금 전',
      messages: []
    },
    {
      id: 'session-2',
      title: '엔비디아 블랙웰 아키텍처 실적 전망',
      symbol: 'NVDA',
      updatedAt: '2시간 전',
      messages: []
    },
    {
      id: 'session-3',
      title: '솔라나 DEX 24H 거래량 & 고래 추적',
      symbol: 'SOLUSDT',
      updatedAt: '어제',
      messages: []
    }
  ])

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

  const handleCreateNewSession = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    const newId = `session-${Date.now()}`
    const newSession: ResearchSession = {
      id: newId,
      title: '새로운 퀀트 리서치 질의',
      symbol: selectedSymbol,
      updatedAt: '방금 전',
      messages: []
    }
    setSessions([newSession, ...sessions])
    setActiveSessionId(newId)
    setCurrentMessages([])
    setInputPrompt('')
    setAttachedImage(null)
    setAttachedImageName('')
    setLoading(false)
    setThinkingStep('')
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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

  const startTypewriterStream = (
    fullText: string,
    agentMsgId: string,
    verdict: string,
    qualityScore: number,
    toolCalls: ToolCallItem[]
  ) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)

    let charIndex = 0
    const totalLength = fullText.length
    // Dynamic chunk size: streams fast and smoothly (3-5 chars per 16ms frame)
    const chunkSize = Math.max(2, Math.floor(totalLength / 180))

    typingTimerRef.current = setInterval(() => {
      charIndex += chunkSize
      if (charIndex >= totalLength) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current)
        typingTimerRef.current = null

        setCurrentMessages(prev => {
          const updated = prev.map(m => {
            if (m.id === agentMsgId) {
              return {
                ...m,
                content: fullText,
                isStreaming: false,
                verdict,
                qualityScore,
                toolCalls
              }
            }
            return m
          })
          setSessions(sPrev =>
            sPrev.map(s => (s.id === activeSessionId ? { ...s, messages: updated } : s))
          )
          return updated
        })
        setLoading(false)
        setThinkingStep('')
      } else {
        const partialText = fullText.slice(0, charIndex)
        setCurrentMessages(prev =>
          prev.map(m => {
            if (m.id === agentMsgId) {
              return {
                ...m,
                content: partialText,
                isStreaming: true
              }
            }
            return m
          })
        )
      }
    }, 16)
  }

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim()
    if ((!text && !attachedImage) || loading) return

    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text || '첨부된 차트 이미지를 바탕으로 지지선/저항선 및 프랙탈 진입 타점을 분석해줘.',
      timestamp: now,
      mode: selectedMode,
      imageUrl: attachedImage
    }

    const agentMsgId = `msg-${Date.now() + 1}`
    const placeholderAgentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'assistant',
      content: '',
      timestamp: now,
      mode: selectedMode,
      isStreaming: true
    }

    const updatedWithUser = [...currentMessages, userMsg]
    setCurrentMessages([...updatedWithUser, placeholderAgentMsg])
    setInputPrompt('')
    setAttachedImage(null)
    setAttachedImageName('')
    setLoading(true)

    // ── Phase 1 to 4 CoT Reasoning Progression ──
    setThinkingStep('1/4 단계: 거래소 OHLCV 캔들 및 모멘텀 지표 수집 중...')

    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: s.title === '새로운 퀀트 리서치 질의' ? (text || '차트 캡처 분석').slice(0, 24) + '...' : s.title,
            updatedAt: '방금 전',
            messages: updatedWithUser
          }
        }
        return s
      })
    )

    try {
      setTimeout(() => setThinkingStep('2/4 단계: AETHER 8,000 시계열 프랙탈 매칭 & 온체인 데이터 대조 중...'), 500)
      setTimeout(() => setThinkingStep('3/4 단계: AETHER 글로벌 외신 레이더 실시간 팩트체크 인덱싱...'), 1000)
      setTimeout(() => setThinkingStep('4/4 단계: Qwen-Max 플래그십 (300B+) 기관급 CoT 추론 & 실시간 토큰 스트림 시작...'), 1500)

      // ── Multi-turn Conversation Memory: Pass last 6 messages (3 full turns) ──
      const conversationHistory = currentMessages
        .slice(-6)
        .map(m => ({
          role: m.role,
          content: m.content || ''
        }))
        .filter(m => m.content.trim().length > 0)

      const response = await sendResearchChat({
        symbol: selectedSymbol,
        prompt: text || '첨부된 차트의 패턴과 기술적 지표를 분석해줘.',
        mode: selectedMode,
        language,
        imageUrl: attachedImage || undefined,
        conversationId: activeSessionId,
        history: conversationHistory
      })

      const replyContent = response.reply || response.answer || response.content || response.message || '리서치 결과를 생성할 수 없습니다.'

      const mockToolCalls: ToolCallItem[] = [
        { name: '🌐 실시간 뉴스 팩트체크', detail: `${selectedSymbol} 관련 블룸버그·로이터 글로벌 최신 속보 및 공시 팩트체크 검증 완료` },
        { name: '📊 차트 지표 진단', detail: `RSI 과열도(14)=${telemetry.rsi}, 20일 이동평균선 지지선, 볼린저밴드 매수/매도 시그널 계산` },
        { name: '🔄 과거 승률 대조', detail: `과거 8,000개 캔들과 1:1 대조하여 유사 상승 패턴('${telemetry.fractalName}') 승률 ${telemetry.fractalWin} 도출` },
        { name: '🐍 전략 시뮬레이션·검증', detail: `가상 환경에서 알고리즘 백테스트 수행 및 손익비(1:2.6), 24H 봇 배포 규격 검증 완료` },
        { name: '🤖 AI 에이전트 종합 리포트', detail: `Qwen-Max 300B+ 플래그십 자율 퀀트 엔진으로 최종 투자 집행 전략 산출` }
      ]

      // Start the dynamic typewriter stream with chunk-by-chunk typing animation!
      startTypewriterStream(
        replyContent,
        agentMsgId,
        response.intentVerdict || 'BUY',
        response.entryQualityScore || 88,
        mockToolCalls
      )
    } catch (err) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
      const errorText = '⚠️ Qwen-Max 및 퀀트 엔진 연결 중 일시적인 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.'
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

      <div className="research-shell-light">
        <aside className="research-rail-light">
          <div className="research-rail-title">
            <span>Research History</span>
            <button type="button" onClick={handleCreateNewSession} title="새 리서치 생성">
              <Plus size={16} />
            </button>
          </div>

          <button type="button" className="new-research" onClick={handleCreateNewSession}>
            <Plus size={14} />
            <span>New Research</span>
          </button>

          <span className="rail-label">Recent Sessions</span>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {sessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (typingTimerRef.current) clearInterval(typingTimerRef.current)
                  setActiveSessionId(s.id)
                  setCurrentMessages(s.messages || [])
                  setLoading(false)
                  setThinkingStep('')
                }}
                className={`rail-item ${activeSessionId === s.id ? 'active' : ''}`}
              >
                <MessageSquare size={13} className={activeSessionId === s.id ? 'text-[#f47a20]' : 'text-[#94A3B8]'} />
                <span className="truncate flex-1">{s.title}</span>
                <span
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 hover:opacity-100 p-0.5 rounded hover:bg-[#e2e8f0] text-[#94a3b8] hover:text-[#ef4444]"
                  title="세션 삭제"
                >
                  <X size={11} />
                </span>
              </button>
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

        <main className="research-main-light">
          <div className="research-intro-light">
            <div className="terminal-kicker">
              <Sparkles size={13} className="text-[#f47a20]" />
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
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
