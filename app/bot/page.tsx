'use client'

import { useState } from 'react'
import { Bot, ChevronDown, Code2, Filter, MoreHorizontal, Play, Plus, Search, SquareTerminal, SlidersHorizontal, Square, Trash2, X } from 'lucide-react'
import { FinanceNav } from '@/components/FinanceNav'

const bots = [
  { id: 'qnt-7f3a2c', name: 'BTC momentum alpha', state: 'RUNNING', resource: '1 vCPU · 1 GB', event: '2 min ago', created: '12d ago', pnl: '+8.42%' },
  { id: 'qnt-19b8e1', name: 'ETH mean reversion', state: 'STOPPED', resource: '1 vCPU · 1 GB', event: '3h ago', created: '28d ago', pnl: '+2.10%' },
  { id: 'qnt-44c9d0', name: 'SOL volatility scout', state: 'PAUSED', resource: '2 vCPU · 2 GB', event: '1d ago', created: '41d ago', pnl: '-1.28%' },
]

export default function BotPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [running, setRunning] = useState<Record<string, boolean>>({ 'qnt-7f3a2c': true })
  const [query, setQuery] = useState('')
  const filtered = bots.filter((bot) => bot.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="bot-console">
      <FinanceNav active="bot" />
      <div className="bot-console-body">
        <aside className="bot-console-sidebar">
          <div className="bot-console-brand">
            <span className="bot-mark"><Bot size={16} /></span>
            <strong>AETHER</strong>
          </div>
          <div className="bot-workspace-select">
            Personal <ChevronDown size={14} />
          </div>
          <label className="bot-side-search">
            <Search size={14} />
            <input placeholder="Search" />
          </label>
          <nav className="bot-console-nav">
            <a className="active"><Bot size={16} /> 24H Bot Center</a>
            <a><SquareTerminal size={16} /> Terminal</a>
            <a><Code2 size={16} /> Strategies</a>
            <a><SlidersHorizontal size={16} /> Settings</a>
          </nav>
          <div className="bot-side-footer">
            PRO PLAN<br />
            <span>1 of 2 instances used</span>
          </div>
        </aside>

        <section className="bot-console-main">
          <header className="bot-console-header">
            <div>
              <span className="bot-console-kicker">AUTONOMOUS TRADING / WORKSPACE</span>
              <h1>24H <em>Bot Center</em></h1>
              <p>Manage, monitor, and deploy your autonomous trading instances.</p>
            </div>
            <button className="bot-create-button" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create bot
            </button>
          </header>

          <div className="bot-toolbar">
            <label className="bot-search">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" />
            </label>
            <button className="bot-tool-button"><Filter size={15} /> Filter</button>
            <button className="bot-tool-icon" aria-label="Refresh"><SlidersHorizontal size={16} /></button>
          </div>

          <div className="bot-table-wrap">
            <div className="bot-table-head">
              <span></span>
              <span>Name</span>
              <span>State</span>
              <span>Resource</span>
              <span>Last event</span>
              <span>Created</span>
              <span>Actions</span>
            </div>
            {filtered.map((bot) => {
              const isRunning = !!running[bot.id];
              return (
                <div className="bot-table-row" key={bot.id}>
                  <span className="bot-checkbox"></span>
                  <div className="bot-name-cell">
                    <span className="bot-row-icon"><Bot size={15} /></span>
                    <span>
                      <strong>{bot.name}</strong>
                      <small>{bot.id}</small>
                    </span>
                  </div>
                  <span className={`bot-state ${isRunning ? 'is-running' : ''}`}>
                    <i />{isRunning ? 'Running' : bot.state[0] + bot.state.slice(1).toLowerCase()}
                  </span>
                  <span className="bot-resource">{bot.resource}</span>
                  <span className="bot-event">{bot.event}</span>
                  <span className="bot-created">{bot.created}</span>
                  <div className="bot-row-actions">
                    <button
                      onClick={() => setRunning((prev) => ({ ...prev, [bot.id]: !isRunning }))}
                      aria-label={isRunning ? 'Stop bot' : 'Start bot'}
                      title={isRunning ? 'Stop' : 'Start'}
                    >
                      {isRunning ? <Square size={15} /> : <Play size={16} />}
                    </button>
                    <button aria-label="Open terminal" title="Terminal">
                      <SquareTerminal size={16} />
                    </button>
                    <button aria-label="More actions" title="More">
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bot-table-footer">
            <span>{filtered.length} bot instances</span>
            <button>25 per page <ChevronDown size={14} /></button>
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="bot-create-overlay" role="dialog" aria-modal="true">
          <div className="bot-create-card">
            <button className="bot-modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
              <X size={18} />
            </button>
            <span className="bot-console-kicker">NEW INSTANCE</span>
            <h2>Create trading bot</h2>
            <p>Deploy an isolated 24H strategy runtime.</p>
            <input placeholder="Bot name" />
            <button className="bot-confirm-create" onClick={() => setShowCreate(false)}>
              Create bot <Plus size={15} />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
