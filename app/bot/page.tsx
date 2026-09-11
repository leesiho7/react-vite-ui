'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePersistentState } from '@/lib/usePersistentState'
import { Bot, ChevronDown, Code2, Filter, MoreHorizontal, Play, Plus, Search, SquareTerminal, SlidersHorizontal, Square, Trash2, X, RefreshCw, Radio, Copy, Check, Zap, ExternalLink } from 'lucide-react'
import { FinanceNav } from '@/components/FinanceNav'
import {
  fetchUserBots,
  createBotInstanceApi,
  startBotApi,
  pauseBotApi,
  deleteBotApi,
  fetchTradingViewConfig,
  fetchTradingViewLogs,
  sendTradingViewSignal
} from '@/lib/api'
import type { BotControlResult } from '@/lib/api'
import type { AuthResponse } from '@/lib/types'

export default function BotPage() {
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'bot-center' | 'webhook' | 'settings'>('bot-center')

  // TradingView Webhook State
  const [tvConfig, setTvConfig] = useState<any>(null)
  const [tvLogs, setTvLogs] = useState<any[]>([])
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPayload, setCopiedPayload] = useState(false)
  const [sendingSignal, setSendingSignal] = useState(false)

  /**
   * 로그인한 고객의 userId. 비로그인 시 null.
   */
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  // Create Bot Form State
  const [newBotName, setNewBotName] = useState('')
  const [newExchange, setNewExchange] = useState<'BINANCE' | 'BYBIT' | 'OKX'>('OKX')
  const [newSymbol, setNewSymbol] = useState('ETHUSDT')
  const [newMode, setNewMode] = useState<'BEGINNER' | 'DEVELOPER'>('DEVELOPER')
  const [creating, setCreating] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  const [newApiSecret, setNewApiSecret] = useState('')
  const [newPassphrase, setNewPassphrase] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_session')
      const user: AuthResponse | null = stored ? JSON.parse(stored) : null
      setActiveUserId(user?.userId ? Number(user.userId) : null)
    } catch (e) {
      console.warn('Failed to read auth session:', e)
      setActiveUserId(null)
    } finally {
      setAuthLoaded(true)
    }
  }, [])

  const loadBots = useCallback(async () => {
    if (activeUserId === null) {
      setBots([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchUserBots(activeUserId)
      if (Array.isArray(data)) {
        setBots(data)
      }
    } catch (e) {
      console.warn('Failed to load user bots:', e)
    } finally {
      setLoading(false)
    }
  }, [activeUserId])

  const loadTvData = useCallback(async () => {
    const uId = activeUserId ?? 1
    try {
      const config = await fetchTradingViewConfig(uId)
      setTvConfig(config)
      const logs = await fetchTradingViewLogs(uId)
      setTvLogs(logs)
    } catch (e) {
      console.warn('Failed to load TradingView Webhook data:', e)
    }
  }, [activeUserId])

  useEffect(() => {
    if (authLoaded) {
      loadBots()
      loadTvData()
    }
  }, [authLoaded, loadBots, loadTvData])

  const handleCopyUrl = () => {
    if (!tvConfig?.webhookUrl) return
    const fullUrl = `${tvConfig.webhookUrl}?userId=${activeUserId || 1}&secretKey=${tvConfig.secretKey}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleCopyPayload = () => {
    if (!tvConfig?.samplePayload) return
    navigator.clipboard.writeText(JSON.stringify(tvConfig.samplePayload, null, 2))
    setCopiedPayload(true)
    setTimeout(() => setCopiedPayload(false), 2000)
  }

  const handleSendTestSignal = async (action: 'BUY' | 'SELL') => {
    const uId = activeUserId ?? 1
    setSendingSignal(true)
    try {
      await sendTradingViewSignal({
        userId: uId,
        secretKey: tvConfig?.secretKey || 'aether_tv_sec_1',
        action,
        symbol: 'BTCUSDT',
        exchange: 'BINANCE',
        quantity: 0.01,
        strategyName: 'Elliott_Wave3_Breakout'
      })
      await loadTvData()
    } catch (e) {
      console.warn('Test signal error:', e)
    } finally {
      setSendingSignal(false)
    }
  }

  /** 서버 응답을 검사하고 실패 시 실제 사유를 알린다. */
  const ensureSucceeded = (result: BotControlResult, fallbackMessage: string) => {
    if (result?.success) return true
    alert(result?.message || fallbackMessage)
    return false
  }

  const requireActiveUserId = () => {
    if (activeUserId === null) {
      alert('봇 인스턴스를 생성하거나 제어하려면 로그인이 필요합니다.')
      return null
    }
    return activeUserId
  }

  const handleOpenCreate = () => {
    if (requireActiveUserId() === null) return
    setShowCreate(true)
  }

  const handleCreateBot = async () => {
    if (!newBotName.trim()) return
    const uId = requireActiveUserId()
    if (uId === null) return

    setCreating(true)
    try {
      const result = await createBotInstanceApi({
        userId: uId,
        botName: newBotName,
        exchange: newExchange,
        symbol: newSymbol,
        mode: newMode,
        apiKey: newApiKey,
        apiSecret: newApiSecret ? `${newApiSecret}:${newPassphrase}` : newApiSecret
      })
      if (!ensureSucceeded(result, '봇 인스턴스 생성에 실패했습니다.')) return

      if (result.status && result.status !== 'RUNNING' && result.message) {
        alert(result.message)
      }
      setNewBotName('')
      setShowCreate(false)
      await loadBots()
    } catch (e) {
      console.warn('Failed to create bot:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleState = async (botId: number, currentStatus: string) => {
    const uId = requireActiveUserId()
    if (uId === null) return

    const result = currentStatus === 'RUNNING'
      ? await pauseBotApi(botId, uId)
      : await startBotApi(botId, uId)

    ensureSucceeded(result, '봇 상태 변경에 실패했습니다.')
    await loadBots()
  }

  const handleDeleteBot = async (botId: number) => {
    if (!confirm('정말로 이 24시간 봇 인스턴스를 삭제하시겠습니까?')) return
    const uId = requireActiveUserId()
    if (uId === null) return

    const result = await deleteBotApi(botId, uId)
    if (!ensureSucceeded(result, '봇 인스턴스 삭제에 실패했습니다.')) return
    await loadBots()
  }

  const filtered = bots.filter((bot) =>
    (bot.botName || '').toLowerCase().includes(query.toLowerCase()) ||
    (bot.symbol || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="bot-console">
      <FinanceNav active="bot" />
      <div className="bot-console-body">
        <aside className="bot-console-sidebar">
          <div className="bot-console-brand">
            <img
              src="/brand-logo.png"
              alt="AETHER Brand Logo"
              className="w-[26px] h-[26px] object-contain rounded-[6px]"
            />
            <strong>AETHER</strong>
          </div>
          <div className="bot-workspace-select">
            Personal Workspace <ChevronDown size={14} />
          </div>
          <label className="bot-side-search">
            <Search size={14} />
            <input placeholder="Search" />
          </label>
          <nav className="bot-console-nav">
            <a
              className={activeTab === 'bot-center' ? 'active' : ''}
              onClick={() => setActiveTab('bot-center')}
              style={{ cursor: 'pointer' }}
            >
              <Bot size={16} /> 24H Bot Center
            </a>
            <a
              className={activeTab === 'webhook' ? 'active' : ''}
              onClick={() => setActiveTab('webhook')}
              style={{ cursor: 'pointer' }}
            >
              <Radio size={16} /> TradingView Webhook
            </a>
            <a href="/"><SquareTerminal size={16} /> Terminal Console</a>
            <a
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
              style={{ cursor: 'pointer' }}
            >
              <SlidersHorizontal size={16} /> Settings
            </a>
          </nav>
          <div className="bot-side-footer">
            PRO INSTANCE POOL<br />
            <span>{bots.length} of 10 instances used</span>
          </div>
        </aside>

        {activeTab === 'bot-center' ? (
          <section className="bot-console-main">
            <header className="bot-console-header">
              <div>
                <span className="bot-console-kicker">AUTONOMOUS TRADING / WORKSPACE</span>
                <h1>24H <em>Bot Center</em></h1>
                <p>Manage, monitor, and deploy your autonomous trading instances across Binance & Bybit.</p>
              </div>
              <button className="bot-create-button" onClick={handleOpenCreate}>
                <Plus size={16} /> Create bot
              </button>
            </header>

            <div className="bot-toolbar">
              <label className="bot-search">
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by bot name or symbol" />
              </label>
              <button className="bot-tool-button" onClick={loadBots}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="bot-table-wrap">
              <div className="bot-table-head">
                <span></span>
                <span>Name / Ticker</span>
                <span>Exchange</span>
                <span>State</span>
                <span>Symbol</span>
                <span>Win Rate / PnL</span>
                <span>Actions</span>
              </div>

              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading 24H bot instances from backend database...
                </div>
              ) : activeUserId === null ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #e2e8f0', margin: '16px' }}>
                  <Bot size={32} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>로그인이 필요합니다.</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>내 24시간 봇 인스턴스를 조회하고 제어하려면 먼저 로그인해 주세요.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #e2e8f0', margin: '16px' }}>
                  <Bot size={32} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>활성화된 봇 인스턴스가 0개입니다.</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>오른쪽 상단의 [+ Create bot] 버튼을 클릭하여 바이낸스/바이비트 자동매매 봇을 새로 생성하세요.</p>
                </div>
              ) : (
                filtered.map((bot) => {
                  const isRunning = bot.status === 'RUNNING'
                  const isPaused = bot.status === 'PAUSED'
                  const isExpired = bot.status === 'EXPIRED'
                  const ex = bot.exchange || 'BINANCE'
                  const winRate = Number(bot.winRate ?? 0)

                  return (
                    <div className="bot-table-row" key={bot.instanceId || bot.id}>
                      <span className="bot-checkbox"></span>
                      <div className="bot-name-cell">
                        <span className="bot-row-icon"><Bot size={15} /></span>
                        <span>
                          <strong>{bot.botName}</strong>
                          <small>ID #{bot.instanceId || bot.id}</small>
                        </span>
                      </div>
                      <span>
                        <b style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          background: ex === 'BYBIT' ? '#fff7ed' : '#f0fdf4',
                          color: ex === 'BYBIT' ? '#c2410c' : '#15803d',
                          border: `1px solid ${ex === 'BYBIT' ? '#ffedd5' : '#bbf7d0'}`
                        }}>
                          {ex}
                        </b>
                      </span>
                      <span className={`bot-state ${isRunning ? 'is-running' : isPaused ? 'is-paused' : ''}`}>
                        <i />{isRunning ? 'Running' : isPaused ? 'Paused' : isExpired ? 'Expired' : 'Stopped'}
                      </span>
                      <span className="bot-resource">{bot.symbol || 'BTCUSDT'}</span>
                      <span className="bot-event" style={{ color: winRate >= 50 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                        {winRate.toFixed(1)}% ({bot.totalTrades || 0} trades)
                      </span>
                      <div className="bot-row-actions">
                        <button
                          onClick={() => handleToggleState(bot.instanceId || bot.id, bot.status)}
                          aria-label={isRunning ? 'Pause bot' : 'Start bot'}
                          title={isExpired ? '구독 만료 — 재구독 후 가동할 수 있습니다' : isRunning ? 'Pause' : 'Start'}
                        >
                          {isRunning ? <Square size={15} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteBot(bot.instanceId || bot.id)}
                          aria-label="Delete bot"
                          title="Delete bot"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="bot-table-footer">
              <span>{filtered.length} active bot instances in DB</span>
              <button>10 per page <ChevronDown size={14} /></button>
            </div>
          </section>
        ) : activeTab === 'webhook' ? (
          <section className="bot-console-main" style={{ padding: '32px 36px', background: '#f8fafc', minHeight: '100vh' }}>
            <header className="bot-console-header" style={{ marginBottom: '20px' }}>
              <div>
                <span className="bot-console-kicker" style={{ color: '#f47a20', fontWeight: 700, letterSpacing: '0.05em' }}>
                  INSTITUTIONAL SIGNAL RELAY / WEBHOOK ENGINE
                </span>
                <h1 style={{ margin: '4px 0 6px', fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
                  TradingView <em>Webhook Automation</em>
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  Connect TradingView alert webhooks directly to AETHER execution engine for zero-latency automated trades.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSendTestSignal('BUY')}
                  disabled={sendingSignal}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(22,163,74,0.2)'
                  }}
                >
                  <Zap size={14} /> {sendingSignal ? 'Executing...' : 'Simulate BUY Signal'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendTestSignal('SELL')}
                  disabled={sendingSignal}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                  }}
                >
                  <Zap size={14} /> {sendingSignal ? 'Executing...' : 'Simulate SELL Signal'}
                </button>
              </div>
            </header>

            {/* Top KPI Metrics Cards (4 Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', borderLeft: '4px solid #f47a20' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>PROCESSED SIGNALS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{tvLogs.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Alerts</span></div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', borderLeft: '4px solid #0f766e' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AVG EXECUTION LATENCY</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>~7.4 <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>ms</span></div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUCCESS RATE</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>100.0% <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>(0 Errors)</span></div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ENGINE STATUS</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} /> DIRECT RELAY ACTIVE
                </div>
              </div>
            </div>

            {/* 3-Step Setup Quick Guide Bar */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '12px', color: '#1e40af' }}>
                <div><strong>STEP 1</strong> · Copy Endpoint URL</div>
                <span>➔</span>
                <div><strong>STEP 2</strong> · Paste into TradingView Webhook Alert</div>
                <span>➔</span>
                <div><strong>STEP 3</strong> · Paste JSON Payload & Save</div>
              </div>
              <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Open TradingView <ExternalLink size={12} />
              </a>
            </div>

            {/* 1. Endpoint & Secret Key Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                YOUR DEDICATED TRADINGVIEW WEBHOOK ENDPOINT
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={tvConfig?.webhookUrl ? `${tvConfig.webhookUrl}?userId=${activeUserId || 1}&secretKey=${tvConfig.secretKey}` : 'Loading Webhook URL...'}
                  style={{
                    flex: 1,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  style={{
                    background: copiedUrl ? '#16a34a' : '#0f172a',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                  {copiedUrl ? 'Copied!' : 'Copy Webhook URL'}
                </button>
              </div>
            </div>

            {/* 2. TradingView Alert Message JSON Template Box */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', marginBottom: '24px', color: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TRADINGVIEW ALERT MESSAGE PAYLOAD (JSON)
                </span>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  style={{
                    background: '#1e293b',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                  {copiedPayload ? 'Copied JSON' : 'Copy JSON'}
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8', overflowX: 'auto', background: '#020617', padding: '14px', borderRadius: '6px' }}>
{JSON.stringify(tvConfig?.samplePayload || {
  userId: activeUserId || 1,
  secretKey: tvConfig?.secretKey || 'aether_tv_sec_1',
  action: "BUY",
  symbol: "BTCUSDT",
  exchange: "BINANCE",
  quantity: 0.01,
  strategyName: "Elliott_Wave3_Breakout"
}, null, 2)}
              </pre>
            </div>

            {/* 3. Real-time Webhook Executed Trades Log Table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  ⚡ Real-time Webhook Execution Logs ({tvLogs.length})
                </h3>
                <button
                  type="button"
                  onClick={loadTvData}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={13} /> Refresh Logs
                </button>
              </div>

              {tvLogs.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No TradingView webhook signals received yet. Click [Simulate BUY Signal] above to test execution!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>ID / Time</th>
                        <th style={{ padding: '10px 12px' }}>Exchange</th>
                        <th style={{ padding: '10px 12px' }}>Symbol</th>
                        <th style={{ padding: '10px 12px' }}>Action</th>
                        <th style={{ padding: '10px 12px' }}>Qty</th>
                        <th style={{ padding: '10px 12px' }}>Strategy</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tvLogs.map((logItem) => (
                        <tr key={logItem.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ color: '#0f172a' }}>#{logItem.id}</strong><br />
                            <small style={{ color: '#94a3b8' }}>{logItem.receivedAt}</small>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{logItem.exchange}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{logItem.symbol}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '11px',
                              background: logItem.action === 'BUY' ? '#dcfce7' : '#fee2e2',
                              color: logItem.action === 'BUY' ? '#15803d' : '#b91c1c'
                            }}>
                              {logItem.action}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{logItem.quantity}</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{logItem.strategyName}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>● {logItem.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>
                            {logItem.latencyMs}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="bot-console-main" style={{ padding: '32px 36px' }}>
            <header className="bot-console-header">
              <div>
                <span className="bot-console-kicker">PREFERENCES</span>
                <h1>Workspace <em>Settings</em></h1>
                <p>Configure API keys, Telegram notifications, and default trading leverage.</p>
              </div>
            </header>
            <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>API & Notification Preferences</h3>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Configure your Binance & Bybit API keys and Telegram bot tokens here.</p>
            </div>
          </section>
        )}

      </div>

      {/* Create Bot Modal */}
      {showCreate && (
        <div className="bot-create-overlay" role="dialog" aria-modal="true">
          <div className="bot-create-card" style={{ width: '440px', maxWidth: '100%' }}>
            <button className="bot-modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
              <X size={18} />
            </button>
            <span className="bot-console-kicker">NEW INSTANCE</span>
            <h2>Create trading bot</h2>
            <p>Deploy an isolated 24H strategy runtime for Binance or Bybit.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  BOT NAME
                </label>
                <input
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="e.g. Bybit Volatility Alpha v1"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    EXCHANGE
                  </label>
                  <select
                    value={newExchange}
                    onChange={(e) => setNewExchange(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                  >
                    <option value="BINANCE">Binance (바이낸스)</option>
                    <option value="OKX">OKX (오케이엑스)</option>
                    <option value="BYBIT">Bybit (바이비트)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    SYMBOL
                  </label>
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                  >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  STRATEGY MODE
                </label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                >
                  <option value="BEGINNER">BEGINNER (Goldman Risk Guard + RSI + SMA)</option>
                  <option value="DEVELOPER">DEVELOPER (Python 3.12 Custom Code)</option>
                </select>
              </div>

              {/* API Key Credentials */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>🔑 OKX / API CREDENTIALS (FOR REAL ORDERS)</span>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="OKX API Key (e.g. 26757bfb-...)"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="password"
                  value={newApiSecret}
                  onChange={(e) => setNewApiSecret(e.target.value)}
                  placeholder="OKX API Secret Key"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  placeholder="OKX Passphrase (API 비밀번호)"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <button
                className="bot-confirm-create"
                disabled={!newBotName.trim() || creating}
                onClick={handleCreateBot}
                style={{ marginTop: '10px' }}
              >
                {creating ? <RefreshCw size={14} className="animate-spin" /> : <>Deploy Instance <Plus size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
