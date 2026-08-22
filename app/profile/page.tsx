'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ProfilePage() {
  const [wallet, setWallet] = useState('')
  const [saved, setSaved] = useState(false)

  return <main className="auth-shell"><div className="profile-shell"><header className="profile-header"><Link href="/" className="auth-back">← AETHER TERMINAL</Link><div className="profile-identity"><span className="member-avatar">♙</span><div><span className="overline">MEMBER PROFILE</span><strong>PERSONAL ACCESS</strong></div></div><span className="status-tag">SESSION ACTIVE</span></header><section className="profile-content"><div><span className="eyebrow"><span className="diamond">◆</span> REWARD DESTINATION</span><h1>Control your<br /><em>claim address.</em></h1><p>Manage the wallet address used for eligible event rewards. Your address is only used as a destination for claims.</p></div><div className="profile-form"><label>WALLET ADDRESS<input value={wallet} onChange={(event) => { setWallet(event.target.value); setSaved(false) }} placeholder="0x... wallet address" aria-label="Wallet address" /></label><div className="profile-actions"><button className="primary-button" disabled={!wallet.trim()} onClick={() => setSaved(true)}>{saved ? 'ADDRESS SAVED' : 'SAVE ADDRESS'} <span>↗</span></button><button className="secondary-button" type="button" onClick={() => setWallet('')}>CLEAR</button></div><p className="privacy-note">본 서비스는 개인정보 최소수집 원칙을 준수하며, 비밀번호나 민감정보를 절대 저장하지 않습니다.</p><p className="profile-warning">Verify every character before saving. Blockchain transfers cannot be reversed.</p></div></section></div></main>
}
