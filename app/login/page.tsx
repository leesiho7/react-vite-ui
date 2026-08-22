'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitted(true) }
  return <main className="auth-shell"><div className="auth-grid"><section className="auth-brand"><Link href="/" className="auth-back">← AETHER TERMINAL</Link><div className="auth-mark">A</div><div className="eyebrow"><span className="diamond">◆</span> MARKET INTELLIGENCE</div><h1>Decisions,<br /><em>with evidence.</em></h1><p>Access your market workspace, verified signals, and reproducible strategy history.</p><div className="auth-status"><span className="live-dot" /> SYSTEMS OPERATIONAL <span>ENCRYPTED SESSION</span></div></section><section className="auth-card"><div className="auth-card-head"><div><span className="overline">ACCOUNT ACCESS</span><h2>Welcome back.</h2></div><span className="status-tag">SECURE</span></div><form onSubmit={submit}><label>Email address<input type="email" required placeholder="you@company.com" /></label><label>Password<input type="password" required placeholder="Enter your password" /></label><div className="auth-options"><label className="check"><input type="checkbox" /> Remember me</label><button type="button" className="auth-link">Forgot password?</button></div><button className="primary-button auth-submit" type="submit">{submitted ? 'SESSION READY' : 'SIGN IN'} <span>↗</span></button></form><div className="auth-divider"><span>OR</span></div><button className="sso-button" type="button">CONTINUE WITH SSO <span>↗</span></button><p className="auth-footer">New to Aether? <Link href="/signup">Create an account</Link></p></section></div></main>
}
