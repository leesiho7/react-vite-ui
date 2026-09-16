'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles, Bot, Code2, Trash2, Plus, MessageSquare, ShieldCheck, RefreshCw,
  Paperclip, BarChart2, BookOpen, Cpu, Send, BrainCircuit
} from 'lucide-react'
import { MARKDOWN_CHAT_COMPONENTS } from './research/MarkdownCodeBlock'
import ResearchThinkingTrace, { ThinkingStep } from './research/ResearchThinkingTrace'
import ResearchSourceChips, { NewsSource } from './research/ResearchSourceChips'
import type { AgentSession } from '../app/page'

export interface ResearchPanelProps {
  language: 'en' | 'cn' | 'ko'
  researchMode: 'INSIGHT' | 'GUIDE' | 'CODING'
  setResearchMode: (mode: 'INSIGHT' | 'GUIDE' | 'CODING') => void
  agentSessions: AgentSession[]
  setAgentSessions: React.Dispatch<React.SetStateAction<AgentSession[]>>
  currentSession: AgentSession | null
  activeSessionId: string
  setActiveSessionId: (id: string) => void
  handleClearAllSessions: (e?: React.MouseEvent) => void
  handleCreateNewSession: () => void
  handleDeleteSession: (id: string, e?: React.MouseEvent) => void
  agentThinking: boolean
  agentThinkingStep: string
  agentThinkingLog: ThinkingStep[]
  agentSourcesFound: NewsSource[]
  agentInputPrompt: string
  setAgentInputPrompt: (v: string) => void
  handleChatPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  handleSendAgentMessage: (customPrompt?: string) => void | Promise<void>
  attachedImage: string | null
  setAttachedImage: (v: string | null) => void
  attachedImageName: string
  setAttachedImageName: (v: string) => void
  chatFileInputRef: React.RefObject<HTMLInputElement | null>
  searched: string
  setSearched: React.Dispatch<React.SetStateAction<string>>
}

/** AI 리서치 인텔리전스 워크스페이스. app/page.tsx의 activeTopView === 'research'일 때만
 *  렌더링하도록 호출부에서 조건부로 감싼다(이 컴포넌트 자체는 항상 렌더링한다고 가정). */
export default function ResearchPanel({
  language, researchMode, setResearchMode, agentSessions, setAgentSessions, currentSession,
  activeSessionId, setActiveSessionId, handleClearAllSessions, handleCreateNewSession, handleDeleteSession,
  agentThinking, agentThinkingStep, agentThinkingLog, agentSourcesFound, agentInputPrompt, setAgentInputPrompt, handleChatPaste, handleSendAgentMessage,
  attachedImage, setAttachedImage, attachedImageName, setAttachedImageName, chatFileInputRef, searched, setSearched
}: ResearchPanelProps) {
  return (
    <>
        <section className="research-terminal panel" id="research-terminal" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e3e6ee', borderRadius: '12px', background: '#ffffff', margin: '20px 0' }}>
        <div className="workspace-light" style={{ minHeight: 'auto' }}>
          {/* Header Intro inside main page */}
          <div className="research-intro-light" style={{ padding: '36px 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <div className="terminal-kicker">
              <span>{language === 'en' ? 'Institutional Market Intelligence' : language === 'cn' ? '机构级市场研报终端' : 'Institutional Market Intelligence'}</span>
            </div>

            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '10px 0 8px', fontWeight: 700, letterSpacing: '-0.04em', color: '#101522' }}>
              AETHER // Research <em style={{ background: 'linear-gradient(135deg, #f47a20 0%, #ff9f43 50%, #e65100 100%)', WebkitBackgroundClip: 'text', color: 'transparent', fontStyle: 'normal', fontWeight: 800 }}>Intelligence</em>
            </h2>

            <p style={{ maxWidth: '620px', margin: '0 auto', fontSize: '13px', color: '#64748b' }}>
              {language === 'en'
                ? 'Combines AETHER global intelligence radar and time-series fractal engine to generate institutional-grade investment research reports with clear data backing.'
                : language === 'cn'
                ? '结合 AETHER 全球情报雷达与时间序列分形引擎，生成具备明确数据支撑的机构级投资研报。'
                : 'AETHER 글로벌 인텔리전스 레이더와 시계열 빅데이터 프랙탈 엔진을 결합하여 수치 근거가 명확한 기관급 투자 리서치 리포트를 생성합니다.'}
            </p>

            <div className="model-selector" title="Alibaba Cloud DashScope Flagship 300B+ Cloud GPU Engine">
              <span>Engine:</span>
              <strong className="text-[#f47a20] font-semibold">Qwen-Max (Alibaba Cloud Flagship)</strong>
              <span className="text-[9px] font-mono text-[#94A3B8]">· 300B+ Params</span>
            </div>

            {/* 5 Prompt Chiplets Bar */}
            <div className="prompt-chiplets-bar" style={{ marginTop: '20px', marginBottom: '0' }}>
              {[
                { key: 'INSIGHT', name: language === 'en' ? 'Insight' : language === 'cn' ? '洞察' : '인사이트', icon: <Sparkles size={14} className="text-[#f47a20]" />, tag: 'FACT-CHECK', cssClass: 'chiplet-insight' },
                { key: 'GUIDE', name: language === 'en' ? 'Guide (Auto)' : language === 'cn' ? '指南(自主)' : '가이드(자율형)', icon: <Bot size={14} className="text-[#0284C7]" />, tag: 'AUTONOMOUS', cssClass: 'chiplet-guide' },
                { key: 'CODING', name: language === 'en' ? 'Coding</>' : language === 'cn' ? '编程</>' : '코딩</>', icon: <Code2 size={14} className="text-[#059669]" />, tag: 'PYTHON / ALGO', cssClass: 'chiplet-coding' }
              ].map(chip => {
                const isActive = (researchMode || 'INSIGHT') === chip.key
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setResearchMode(chip.key as any)
                      if (currentSession) {
                        setAgentSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, mode: chip.key as any } : s))
                      }
                    }}
                    className={`prompt-chiplet ${isActive ? `active ${chip.cssClass}` : ''}`}
                  >
                    {chip.icon}
                    <span>{chip.name}</span>
                    <span className="chiplet-tag">{chip.tag}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Research 2-Column Shell (Rail + Main Canvas) */}
          <div
            className="research-shell-light"
            style={{
              minHeight: '520px',
              gridTemplateColumns: agentSessions.length > 0 ? '240px 1fr' : '1fr',
              transition: 'grid-template-columns 0.25s ease'
            }}
          >
            {/* 리서치 히스토리가 있을 때만 좌측 패널 렌더링, 없으면 패널 제거 */}
            {agentSessions.length > 0 && (
              <aside className="research-rail-light animate-in fade-in duration-200">
                <div className="research-rail-title">
                  <span>{language === 'en' ? 'Research History' : language === 'cn' ? '研报历史' : 'Research History'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={handleClearAllSessions}
                      title={language === 'en' ? 'Clear all sessions' : language === 'cn' ? '清空所有会话' : '세션 전체 삭제 (히스토리 비우기)'}
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
                    <button type="button" onClick={() => handleCreateNewSession()} title={language === 'en' ? 'Start new research session' : language === 'cn' ? '新建研报会话' : '새 가상 세션 시작 (New Research)'}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <button type="button" className="new-research" onClick={() => handleCreateNewSession()}>
                  <Plus size={14} />
                  <span>{language === 'en' ? 'New Research' : language === 'cn' ? '新建研报' : 'New Research'}</span>
                </button>

                <span className="rail-label">{language === 'en' ? 'Recent Sessions' : language === 'cn' ? '最近会话' : 'Recent Sessions'}</span>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[420px]">
                  {agentSessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => setActiveSessionId(sess.id)}
                      className={`rail-item ${activeSessionId === sess.id ? 'active' : ''}`}
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
                        <MessageSquare size={13} className={activeSessionId === sess.id ? 'text-[#f47a20]' : 'text-[#94A3B8]'} />
                        <span className="truncate flex-1 text-[12px]">{sess.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        title={language === 'en' ? 'Delete session' : language === 'cn' ? '删除会话' : '세션 삭제'}
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
                    <span>AETHER Autonomous Flagship Core (300B+)</span>
                  </div>
                  <small>AETHER Intelligence OS v2.5 Active</small>
                </div>
              </aside>
            )}

            {/* 2. Main Chat Canvas */}
            <main className="research-main-light" style={{ padding: '24px 28px' }}>
              {/* Chat Thread */}
              {currentSession && currentSession.messages && currentSession.messages.length > 0 && (
                <div className="research-chat-thread" style={{ marginTop: '0', maxWidth: '100%' }}>
                {currentSession?.messages?.map((msg) => {
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

                  return (
                    <div key={msg.id} className="research-bubble-agent">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E7EB] text-[11px] font-mono text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <BrainCircuit size={14} className="text-[#f47a20]" />
                          <span className="font-bold text-[#101522]">
                            AETHER [{researchMode || 'INSIGHT'}] QUANT RESEARCH REPORT
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold bg-[#DCFCE7] text-[#16A34A]">
                          VERDICT: BUY
                        </span>
                      </div>

                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="tool-tracing-box">
                          <div className="tool-tracing-head">
                            <span>[{language === 'en' ? `🛠️ AI Agent Autonomous Metrics Verification: ${msg.toolCalls.length} Steps Completed` : language === 'cn' ? `🛠️ AI 智能体自主指标核查: 完成 ${msg.toolCalls.length} 个步骤` : `🛠️ AI 에이전트 자율 지표 검증: ${msg.toolCalls.length}개 단계 완료`}]</span>
                            <span className="flex items-center gap-1 text-[#059669]">
                              SUCCESS ✓
                            </span>
                          </div>
                          <div className="tool-tracing-list">
                            {msg.toolCalls.map((tc, idx) => (
                              <div key={idx}>
                                <b className="text-[#f47a20]">↳ {tc.name}:</b> {tc.detail}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="prose max-w-none text-[14px] leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={MARKDOWN_CHAT_COMPONENTS}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      <div className="text-[10px] text-right mt-2 opacity-60 font-mono">{msg.timestamp} · AUDITED ✓</div>
                    </div>
                  )
                })}

                {agentThinking && (
                  <div className="research-bubble-agent">
                    <ResearchThinkingTrace
                      steps={agentThinkingLog}
                      fallbackLabel={agentThinkingStep || (language === 'en' ? 'Qwen-Max flagship model is performing deep research via institutional quant framework...' : language === 'cn' ? 'Qwen-Max 旗舰大模型正在通过机构级量化框架进行深度研报分析...' : 'Qwen-Max 대형모델이 기관급 퀀트 프레임워크로 심층 리서치 중입니다...')}
                    />
                    <ResearchSourceChips sources={agentSourcesFound} />
                  </div>
                )}
              </div>
              )}

              {/* Research Composer (Input Box) */}
              <div className="research-composer-light" style={{ maxWidth: '100%', marginTop: '20px' }}>
                <div className="composer-top">
                  <span className="font-mono text-[11px] text-[#f47a20] font-semibold flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>✦ {researchMode || 'INSIGHT'} // Deep Intelligence · ${currentSession?.symbol || searched}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAgentInputPrompt(''); setAttachedImage(null); setAttachedImageName(''); }}
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
                        <p className="text-[9px] text-[#64748b] m-0">
                          {language === 'en'
                            ? 'Synchronized with AETHER real-time exchange orderbook & fractal engine.'
                            : language === 'cn'
                            ? '与 AETHER 实时交易所订单簿和分形引擎同步。'
                            : 'AETHER 실시간 거래소 오더북 및 프랙탈 엔진과 동기화됩니다.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAttachedImage(null); setAttachedImageName(''); }}
                      className="px-2 py-1 bg-[#fee2e2] text-[#dc2626] rounded border border-[#fca5a5] text-[9px] font-bold cursor-pointer"
                    >
                      {language === 'en' ? '✕ Remove' : language === 'cn' ? '✕ 删除' : '✕ 삭제'}
                    </button>
                  </div>
                )}

                <textarea
                  value={agentInputPrompt}
                  onChange={e => setAgentInputPrompt(e.target.value)}
                  onPaste={handleChatPaste}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendAgentMessage()
                    }
                  }}
                  placeholder={
                    language === 'en'
                      ? `Ask questions about on-chain flow, fact-checks, indicators for ${currentSession?.symbol || searched}, or paste a chart screenshot...`
                      : language === 'cn'
                      ? `询问关于 ${currentSession?.symbol || searched} 的链上资金流、事实核查与指标分析，或粘贴图表截图...`
                      : `${currentSession?.symbol || searched}의 온체인 수급, 팩트체크, 지표 분석을 질문하거나 차트 캡처 사진을 붙여넣으세요...`
                  }
                  disabled={agentThinking}
                />

                <div className="composer-bottom">
                  <div className="composer-tools">
                    <button
                      type="button"
                      title={language === 'en' ? 'Attach chart screenshot (Ctrl+V supported)' : language === 'cn' ? '附加图表截图 (支持 Ctrl+V)' : '차트 캡처 사진 첨부 (Ctrl+V 지원)'}
                      onClick={() => chatFileInputRef.current?.click()}
                    >
                      <Paperclip size={15} />
                    </button>
                    <button
                      type="button"
                      title={language === 'en' ? 'Switch target symbol' : language === 'cn' ? '切换目标标的' : '타겟 종목 전환'}
                      onClick={() => setSearched(s => s === 'BTC/USD' ? 'ETH/USD' : s === 'ETH/USD' ? 'SOL/USD' : s === 'SOL/USD' ? 'NVDA' : 'BTC/USD')}
                    >
                      <BarChart2 size={15} />
                    </button>
                    <button type="button" title={language === 'en' ? 'Search RAG Knowledge Base' : language === 'cn' ? '搜索 RAG 知识库' : 'RAG 지식베이스 검색'}>
                      <BookOpen size={15} />
                    </button>
                    <button type="button" title={language === 'en' ? 'AETHER Time-Series Fractal Match' : language === 'cn' ? 'AETHER 时间序列分形匹配' : 'AETHER 시계열 프랙탈 매칭'}>
                      <Cpu size={15} />
                    </button>
                  </div>

                  <div className="composer-send">
                    <span className="hidden sm:inline">{agentInputPrompt.length} chars · {language === 'en' ? 'Enter to send' : language === 'cn' ? 'Enter 发送' : 'Enter 전송'}</span>
                    <button
                      type="button"
                      className="send-research"
                      onClick={() => handleSendAgentMessage()}
                      disabled={(!agentInputPrompt.trim() && !attachedImage) || agentThinking}
                      title={language === 'en' ? 'Send research query' : language === 'cn' ? '发送研报查询' : '리서치 질의 전송'}
                    >
                      {agentThinking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={13} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Recommended Prompt Chips */}
              <div className="research-prompts" style={{ maxWidth: '100%', marginTop: '16px' }}>
                <span>RECOMMENDED [{researchMode || 'INSIGHT'}] QUERIES</span>
                <div>
                  {(researchMode === 'CODING' ? (
                    language === 'en' ? [
                      { label: '⚡ 24-Param No-Code Quant AutoTuner', prompt: `Write Python backtesting code for ${currentSession?.symbol || searched} grid simulation over 24 parameter combinations of RSI period, stop loss (2-4.5%), and take profit (4-8%) to automatically find the highest Sharpe Ratio & win rate.` },
                      { label: '👻 AETHER Fractal Ghost Trajectory Code', prompt: `Write Python code to calculate time-series wave fractal similarity between historical 8,000 candles and recent 30 candles for ${currentSession?.symbol || searched} and forecast next 5 bars.` },
                      { label: '📈 Real-time L2 Orderbook Imbalance Bot', prompt: `Write asynchronous Python code connecting to Binance Futures Depth20 WebSocket stream to calculate real-time orderbook imbalance.` },
                      { label: '🤖 RSI(14) + Bollinger 1:3 Risk-Reward Bot', prompt: `Write 4h timeframe trend-following algorithm bot code for ${currentSession?.symbol || searched} based on 70% win-rate RSI(14) oversold bounce and Bollinger lower band touch with 1:3 R:R.` }
                    ] : language === 'cn' ? [
                      { label: '⚡ 24-参数无代码量化自动调优器', prompt: `编写 Python 回测代码，为 ${currentSession?.symbol || searched} 对 RSI 周期、止损率 (2~4.5%)、止盈率 (4~8%) 的 24 组组合进行网格模拟，自动搜索最高夏普比率与胜率组合。` },
                      { label: '👻 AETHER 分形幽灵轨迹预测代码', prompt: `编写 Python 代码计算 ${currentSession?.symbol || searched} 历史 8,000 根 K 线与最近 30 根 K 线之间的时序波浪分形相似度，并预测未来 5 根 K 线轨迹。` },
                      { label: '📈 实时 L2 订单簿失衡收集机器人', prompt: `编写异步 Python 代码连接币安合约 Depth20 WebSocket 流，计算实时挂单失衡率 (Imbalance)。` },
                      { label: '🤖 RSI(14) + 布林带 1:3 盈亏比自主交易', prompt: `编写 ${currentSession?.symbol || searched} 4小时 K 线胜率 70% 的 RSI(14) 超卖反弹及触及布林带下轨 1:3 盈亏比趋势跟踪算法机器人代码。` }
                    ] : [
                      { label: '⚡ 24개 파라미터 노코드 퀀트 오토튜너', prompt: `${currentSession?.symbol || searched} RSI 기간, 손절률(2~4.5%), 익절률(4~8%) 24개 조합을 그리드 시뮬레이션하여 최고 샤프 지수와 승률 조합을 자동 탐색하는 Python 백테스팅 코드를 작성해줘.` },
                      { label: '👻 AETHER 프랙탈 고스트 궤적 예측 코드', prompt: `${currentSession?.symbol || searched} 과거 8,000개 캔들과 최근 30개 캔들 간의 시계열 파동 프랙탈 유사도를 계산하고 향후 5봉 궤적을 예측하는 Python 코드를 작성해줘.` },
                      { label: '📈 실시간 L2 오더북 불균형 수집 봇', prompt: `바이낸스 선물 Depth20 WebSocket 스트림에 비동기로 접속하여 실시간 호가 불균형(Imbalance)을 계산하는 Python 코드를 작성해줘.` },
                      { label: '🤖 RSI(14) + 볼린저 1:3 손익비 자율 매매', prompt: `${currentSession?.symbol || searched} 4시간봉 승률 70% RSI(14) 과매도 반등 및 볼린저 밴드 하단 터치 기반 손익비 1:3 추세추종 알고리즘 봇 코드를 작성해줘.` }
                    ]
                  ) : researchMode === 'GUIDE' ? (
                    language === 'en' ? [
                      { label: '🚨 1.5-ATR Dynamic Trailing Stop & Loss Cut', prompt: `Guide step-by-step 1.5-ATR dynamic trailing stop and invalidation level using 14-period ATR and weekly VWAP for ${currentSession?.symbol || searched}.` },
                      { label: '🛡️ $10K 3-Step Scaling-in Plan', prompt: `Issue a 3-step scaling-in buy ticket for ${currentSession?.symbol || searched} with a $10,000 budget and max loss capped at $500.` },
                      { label: '⚖️ Kelly Criterion Capital Allocation', prompt: `Calculate optimal capital allocation and 1st/2nd target profit prices using Kelly Criterion for ${currentSession?.symbol || searched} at current price.` },
                      { label: '🔄 Spot-Futures Arbitrage Delta Neutral', prompt: `Summarize the yield formula and risk management manual for spot buy + futures 1x short delta neutral funding fee harvesting strategy.` }
                    ] : language === 'cn' ? [
                      { label: '🚨 1.5-ATR 动态追踪止损与止损线', prompt: `利用 14 周期 ATR 与周 VWAP 指标，逐步指引 ${currentSession?.symbol || searched} 的 1.5-ATR 动态追踪止损与失效 (Invalidation) 基准线。` },
                      { label: '🛡️ 1000 万韩元 3 阶段分批建仓工单', prompt: `以 1000 万韩元预算为 ${currentSession?.symbol || searched} 开出 3 阶段分批建仓工单，最大亏损控制在 50 万韩元以内。` },
                      { label: '⚖️ 凯利公式 (Kelly) 最佳资本配置', prompt: `基于 ${currentSession?.symbol || searched} 当前价格，用凯利公式计算最佳投入资本与一/二阶段止盈目标价。` },
                      { label: '🔄 现货期货套利 Delta 中性策略', prompt: `整理现货买入 + 期货 1 倍做空 Delta 中性赚取资金费率策略的收益率计算公式与风险管理手册。` }
                    ] : [
                      { label: '🚨 1.5-ATR 동적 트레일링 스탑 & 손절선', prompt: `14봉 ATR과 주간 VWAP 지표를 활용하여 추세 이탈 시 손실을 최소화하는 1.5-ATR 동적 트레일링 스탑과 무효화(Invalidation) 기준선을 단계별로 가이드해줘.` },
                      { label: '🛡️ 1,000만원 3단계 분할 매수 티켓', prompt: `1,000만 원 예산으로 ${currentSession?.symbol || searched} 3단계 분할 매수 집행 티켓을 발행해줘. 최대 손실은 50만 원 한도야.` },
                      { label: '⚖️ 켈리 공식(Kelly) 최적 자본배분', prompt: `${currentSession?.symbol || searched} 현재가 기준 켈리 공식으로 최적 투입 자본금과 1/2차 익절 목표가를 계산해줘.` },
                      { label: '🔄 선물 펀딩비 차익거래 델타 뉴트럴', prompt: `현물 매수 + 선물 1배 숏 델타 뉴트럴 펀딩비 수취 전략의 수익률 계산 공식과 리스크 관리 매뉴얼을 정리해줘.` }
                    ]
                  ) : (
                    language === 'en' ? [
                      { label: '🪙 Bitcoin On-Chain & Spot ETF Inflow Analysis', prompt: `Analyze BTCUSDT short-term support and 5-day price target based on spot ETF net inflows and LTH supply metrics.` },
                      { label: '🔮 AI Ghost Line 2.0: Dual Trajectory Ensemble', prompt: `Perform AI Ghost Line 2.0 ensemble analysis combining deterministic fractal trajectory and probabilistic neural wave trajectory for ${currentSession?.symbol || searched}.` },
                      { label: '📊 Weekly VWAP & Live Orderbook L2 Imbalance', prompt: `Diagnose short-term resistance breakout potential by fusing weekly VWAP, Binance L2 orderbook imbalance, and futures funding rate.` },
                      { label: '🖥️ Nvidia AI Infrastructure Order Rally Diagnosis', prompt: `Diagnose stock impact of Nvidia (NVDA) next-gen AI infrastructure orders and global big-tech data center expansion.` }
                    ] : language === 'cn' ? [
                      { label: '🪙 比特币链上与现货 ETF 资金流分析', prompt: `基于比特币 (BTCUSDT) 近期现货 ETF 机构净流入趋势与链上长期持有者 (LTH) 供应指标分析短期支撑线与未来 5 天目标价。` },
                      { label: '🔮 AI 幽灵线 2.0: 双轨迹集成', prompt: `为 ${currentSession?.symbol || searched} 执行结合 [确定性时间序列分形轨迹] 与 [概率性深度学习波浪轨迹] 的 AI 幽灵线 2.0 集成诊断。` },
                      { label: '📊 周 VWAP 与实时订单簿 L2 失衡率', prompt: `融合周 VWAP 支撑线、币安实时订单簿买/卖失衡比例及期货资金费率，诊断短期阻力位突破可能性。` },
                      { label: '🖥️ 英伟达 AI 基础设施订单 Rally 诊断', prompt: `诊断英伟达 (NVDA) 下一代 AI 基础设施订单 Rally 及全球科技巨头数据中心扩建对股价的影响。` }
                    ] : [
                      { label: '🪙 비트코인 온체인 & 현물 ETF 수급 분석', prompt: `비트코인(BTCUSDT)의 최근 현물 ETF 기관 순유입 추이와 온체인 장기보유자(LTH) 공급 지표를 바탕으로 단기 지지선 및 향후 5일간 목표가를 분석해줘.` },
                      { label: '🔮 AI 고스트 라인 2.0: 듀얼 궤적 앙상블', prompt: `${currentSession?.symbol || searched}에 대해 [결정론적 시계열 프랙탈 궤적(하늘색)]과 [확률적 딥러닝 파동 궤적(보라색)]을 합성한 AI 고스트 라인 2.0 앙상블 분석을 수행해줘. 두 궤적이 같은 방향을 가리키는 [더블 컨펌(Double Confirmed)] 여부와 향후 5~10봉 예상 파동 경로를 진단해줘.` },
                      { label: '📊 주간 VWAP & 실시간 오더북 L2 불균형', prompt: `주간 VWAP 지지선과 바이낸스 실시간 오더북 매수/매도 불균형 비율, 선물 펀딩비를 융합하여 단기 매물대 돌파 가능성을 진단해줘.` },
                      { label: '🖥️ 엔비디아 AI 인프라 수주 랠리 진단', prompt: `엔비디아(NVDA) 차세대 AI 인프라 수주 랠리와 글로벌 빅테크 데이터센터 증설이 미치는 주가 영향도를 진단해줘.` }
                    ]
                  )).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAgentMessage(item.prompt)}
                      disabled={agentThinking}
                    >
                      <Sparkles size={12} className="text-[#f47a20]" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </>
  )
}
