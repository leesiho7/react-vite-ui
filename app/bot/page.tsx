'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePersistentState } from '@/lib/usePersistentState'
import { Bot, ChevronDown, Code2, Filter, MoreHorizontal, Play, Plus, Search, SquareTerminal, SlidersHorizontal, Square, Trash2, X, RefreshCw } from 'lucide-react'
import { FinanceNav } from '@/components/FinanceNav'
import {
  fetchUserBots,
  createBotInstanceApi,
  startBotApi,
  pauseBotApi,
  deleteBotApi
} from '@/lib/api'
import type { BotControlResult } from '@/lib/api'
import type { AuthResponse } from '@/lib/types'

export default function BotPage() {
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')

  /**
   * 로그인한 고객의 userId. 비로그인 시 null.
   * 이 페이지는 예전에 userId를 1로 하드코딩해서, 어떤 고객이 접속하든 1번 유저의 봇을 보고 제어했다.
   */
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  // Create Bot Form State (Draft saved in localStorage)
  const [newBotName, setNewBotName] = usePersistentState('draft_bot_name', '')
  const [newExchange, setNewExchange] = usePersistentState<'BINANCE' | 'BYBIT'>('draft_bot_exchange', 'BINANCE')
  const [newSymbol, setNewSymbol] = usePersistentState('draft_bot_symbol', 'BTCUSDT')
  const [newMode, setNewMode] = usePersistentState<'BEGINNER' | 'DEVELOPER'>('draft_bot_mode', 'BEGINNER')
  const [creating, setCreating] = useState(false)

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

  useEffect(() => {
    if (authLoaded) loadBots()
  }, [authLoaded, loadBots])

  /** 서버 응답을 검사하고 실패 시 실제 사유를 알린다. */
  const ensureSucceeded = (result: BotControlResult, fallbackMessage: string) => {
    if (result?.success) return true
    alert(result?.message || fallbackMessage)
    return false
  }

  const requireActiveUserId = () => {
    if (activeUserId === null) {
      alert('봇 인스턴스를 제어하려면 로그인이 필요합니다.')
      return null
    }
    return activeUserId
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
        mode: newMode
      })
      if (!ensureSucceeded(result, '봇 인스턴스 생성에 실패했습니다.')) return

      // 구독이 없으면 백엔드가 STOPPED로 생성하고 사유를 알려준다
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

    // 성공/실패 모두 서버 상태를 다시 읽어 화면을 단일 진실 소스에 맞춘다
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
            <a className="active"><Bot size={16} /> 24H Bot Center</a>
            <a href="/"><SquareTerminal size={16} /> Terminal Console</a>
            <a><Code2 size={16} /> Strategies</a>
            <a><SlidersHorizontal size={16} /> Settings</a>
          </nav>
          <div className="bot-side-footer">
            PRO INSTANCE POOL<br />
            <span>{bots.length} of 10 instances used</span>
          </div>
        </aside>

        <section className="bot-console-main">
          <header className="bot-console-header">
            <div>
              <span className="bot-console-kicker">AUTONOMOUS TRADING / WORKSPACE</span>
              <h1>24H <em>Bot Center</em></h1>
              <p>Manage, monitor, and deploy your autonomous trading instances across Binance & Bybit.</p>
            </div>
            <button className="bot-create-button" onClick={() => setShowCreate(true)}>
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
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '12px' }}>오른쪽 상단의 [+ Create bot] 버튼을 클릭하여 바이낸스/바이비트 자동매매 봇을 새로 생성하세요.</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  style={{ background: '#f47a20', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + 첫번째 봇 인스턴스 생성하기
                </button>
              </div>
            ) : (
              filtered.map((bot) => {
                const isRunning = bot.status === 'RUNNING'
                const isPaused = bot.status === 'PAUSED'
                const isExpired = bot.status === 'EXPIRED'
                const ex = bot.exchange || 'BINANCE'
                // 백엔드 BotInstanceResponse의 필드명은 winRate (예전 winRatePct는 항상 undefined → 0.0%로 표시됐다)
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
