'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, RefreshCw, ShieldCheck, Zap } from 'lucide-react'

type Exchange = { name: string; mark: string; status: string; btc: string; eth: string; sol: string; xrp: string }
type Level = { price: string; size: string; total: string }

const exchanges: Exchange[] = [
  { name: 'Binance', mark: 'BN', status: 'CONNECTED', btc: '+0.18%', eth: '+0.24%', sol: '+0.42%', xrp: '+0.31%' },
  { name: 'Bybit', mark: 'BY', status: 'CONNECTED', btc: '+0.29%', eth: '+0.37%', sol: '+0.51%', xrp: '+0.18%' },
  { name: 'OKX', mark: 'OK', status: 'CONNECTED', btc: '+0.12%', eth: '+0.19%', sol: '+0.33%', xrp: '+0.26%' },
  { name: 'Coinbase', mark: 'CB', status: 'DEGRADED', btc: '-0.06%', eth: '+0.08%', sol: '+0.14%', xrp: '+0.04%' },
  { name: 'Upbit', mark: 'UP', status: 'CONNECTED', btc: '+0.44%', eth: '+0.62%', sol: '+0.81%', xrp: '+0.55%' },
]
const asks: Level[] = [['68,412.90','0.184','12,588'],['68,408.20','0.092','6,294'],['68,401.70','0.238','16,271'],['68,398.10','0.061','4,176'],['68,392.60','0.305','20,901']].map(([price,size,total]) => ({price,size,total}))
const bids: Level[] = [['68,382.40','0.118','8,052'],['68,377.90','0.244','16,655'],['68,371.20','0.096','6,545'],['68,366.80','0.330','22,561'],['68,360.50','0.157','10,732']].map(([price,size,total]) => ({price,size,total}))
const tape = [['14:22:08.421','68,392.10','0.042','BUY'],['14:22:08.306','68,388.70','0.118','SELL'],['14:22:08.172','68,390.20','0.076','BUY'],['14:22:07.984','68,384.90','0.021','BUY'],['14:22:07.801','68,381.40','0.190','SELL'],['14:22:07.664','68,379.80','0.054','SELL']]

function OrderLevels({ title, levels, tone }: { title: string; levels: Level[]; tone: 'ask' | 'bid' }) {
  return <div className="arb-book-column"><div className={`arb-column-title ${tone}`}><span>{title}</span><span>SIZE</span><span>NOTIONAL</span></div>{levels.map((level, index) => <div className="arb-level" key={level.price}><span>{level.price}</span><span>{level.size}</span><span>{level.total}</span><i style={{ width: `${30 + index * 13}%` }} /></div>)}</div>
}

export function CryptoArbitrageDashboard() {
  const [pair, setPair] = useState('BTC/USDT')
  const [filter, setFilter] = useState('ALL')
  const [watching, setWatching] = useState(false)
  const visibleExchanges = useMemo(() => filter === 'ALL' ? exchanges : exchanges.filter((exchange) => filter === 'CONNECTED' ? exchange.status === 'CONNECTED' : exchange.name === filter), [filter])
  return <main className="arb-page">
    <header className="arb-topbar"><div className="arb-brand"><Link href="/">AETHER</Link><span>MARKET INTELLIGENCE</span></div><nav><Link href="/">OVERVIEW</Link><Link className="active" href="/orderbook">MARKETS</Link><Link href="/media">MEDIA</Link><Link href="#engines">ENGINES</Link></nav><div className="arb-top-status"><span className="arb-dot" /> FEEDS <b>5/5</b><span className="arb-divider" /> <ShieldCheck size={13} /> PAPER-SAFE</div></header>
    <section className="arb-hero"><div><div className="arb-kicker"><Zap size={14} /> CROSS-EXCHANGE EXECUTION MONITOR</div><h1>Crypto <em>Arbitrage</em><br />& Orderbook Intelligence</h1><p>실시간 거래소 간 가격 차이, 유동성, 체결 강도를 한 화면에서 비교합니다. 원본 거래소 피드가 연결되면 데이터는 자동으로 갱신됩니다.</p></div><div className="arb-hero-readout"><span>NETWORK STATUS</span><strong><i className="arb-dot" /> NOMINAL</strong><small>Last sync 14:22:08 UTC<br />Median latency 18ms</small></div></section>
    <section className="arb-toolbar"><div className="arb-pair-tabs">{['BTC/USDT','ETH/USDT','SOL/USDT','XRP/USDT'].map((item) => <button key={item} className={pair === item ? 'selected' : ''} onClick={() => setPair(item)}>{item}</button>)}</div><div className="arb-actions"><button onClick={() => setWatching(!watching)}>{watching ? 'WATCHING' : 'ADD TO WATCHLIST'}</button><button><RefreshCw size={13} /> REFRESH FEEDS</button></div></section>
    <section className="arb-section"><div className="arb-section-heading"><div><span className="arb-kicker">01 / MARKET MAP</span><h2>Exchange Spread <em>Heatmap</em></h2></div><div className="arb-filter">{['ALL','CONNECTED','Binance','Bybit'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="arb-table"><div className="arb-table-row arb-table-head"><span>EXCHANGE</span><span>STATUS</span><span>BTC / USDT</span><span>ETH / USDT</span><span>SOL / USDT</span><span>XRP / USDT</span><span /></div>{visibleExchanges.map((exchange) => <div className="arb-table-row" key={exchange.name}><span className="arb-exchange"><b>{exchange.mark}</b>{exchange.name}</span><span className={`arb-connection ${exchange.status.toLowerCase()}`}><i />{exchange.status}</span>{[exchange.btc, exchange.eth, exchange.sol, exchange.xrp].map((value) => <span className={value.startsWith('-') ? 'negative' : 'positive'} key={value}>{value}</span>)}<ExternalLink size={13} /></div>)}</div></section>
    <section className="arb-best-route"><div><span className="arb-kicker">HIGHEST CAPTURED SPREAD</span><h2>Upbit <ArrowUp size={17} /> Binance</h2><p>{pair} · gross spread before fees</p></div><strong>+0.44%</strong><div className="arb-route-meta"><span>EST. NET <b>+0.31%</b></span><span>DEPTH <b>$2.4M</b></span><span>CONFIDENCE <b>HIGH</b></span></div><button>OPEN ROUTE <ArrowUp size={14} /></button></section>
    <section className="arb-terminal-section"><div className="arb-section-heading"><div><span className="arb-kicker">02 / MICROSTRUCTURE</span><h2>{pair} <em>Orderbook</em></h2></div><div className="arb-live-label"><span className="arb-dot" /> BINANCE L2 · 100ms</div></div><div className="arb-terminal"><OrderLevels title="ASKS / SELL" levels={asks} tone="ask" /><div className="arb-mid-price"><small>MARK PRICE</small><strong>68,392.10</strong><span>+2.84%</span><hr /><small>SPREAD</small><b>$30.80 · 0.045%</b></div><OrderLevels title="BIDS / BUY" levels={bids} tone="bid" /><div className="arb-tape"><div className="arb-column-title"><span>TRADE TAPE</span><span>PRICE</span><span>SIZE</span></div>{tape.map(([time,price,size,side]) => <div className="arb-tape-row" key={time}><span>{time}</span><b className={side === 'BUY' ? 'positive' : 'negative'}>{price}</b><span>{size}</span></div>)}</div></div></section>
    <footer className="arb-footer"><span>DATA IS FOR RESEARCH ONLY · NO EXECUTION HAS BEEN REQUESTED</span><span>PUBLIC FEED FALLBACK ACTIVE · <Link href="/login">SIGN IN FOR PRIVATE ENGINES</Link></span></footer>
  </main>
}

export default CryptoArbitrageDashboard
