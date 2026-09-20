'use client'

import { useEffect, useState } from 'react'
import { fetchPredictionLeaderboard } from '@/lib/api'
import { PredictionLeaderboardItem } from '@/lib/types'

const TIER_LABEL: Record<string, string> = {
  ORACLE: 'ORACLE',
  GRAND_MASTER: 'GRAND MASTER',
  MASTER: 'MASTER',
  TRADER: 'TRADER',
  NOVICE: 'NOVICE'
}

const TIER_COLOR: Record<string, string> = {
  ORACLE: '#b45309',
  GRAND_MASTER: '#7c3aed',
  MASTER: '#0284c7',
  TRADER: '#0f766e',
  NOVICE: '#64748b'
}

const RANK_COLOR: Record<number, string> = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#b45309'
}

/**
 * 10연승 챌린지 예측 적중 랭킹 — "League of Traders" 스타일의 깔끔한 순위표를 참고해서,
 * 이미 globals.css에 있는(현재는 안 쓰이던) .commons-section/.leaderboard/.strategy-row
 * 클래스를 그대로 재활용한다(새 CSS를 또 만들지 않음).
 *
 * 승률/현재 연승이 아니라 "실제로 맞춘 누적 횟수(wonPredictions)"로 순위를 매긴다 — 한 번
 * 지면 꺾이는 지표가 아니라 계속 도전할수록만 올라가는 지표라서, 10연승 챌린지에 계속
 * 도전하게 만드는 과시성 랭킹 목적에 더 맞는다(백엔드 정렬 기준도 이렇게 맞춰뒀다).
 */
export function PredictionLeaderboardPanel() {
  const [items, setItems] = useState<PredictionLeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPredictionLeaderboard(10).then((data) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <section className="commons-section" id="prediction-leaderboard">
      <div className="commons-header">
        <div>
          <span className="eyebrow"><span className="diamond">◆</span> LEAGUE OF PREDICTORS</span>
          <h2>예측 적중 <em>랭킹.</em></h2>
          <p>승률이 아니라 실제로 예측을 맞춘 누적 횟수 기준입니다. 계속 도전할수록만 올라가는 순위라, 지면 리셋되는 연승 트래커와 달리 꾸준히 참여할수록 랭킹이 쌓입니다.</p>
        </div>
        <div className="commons-stats">
          <span>참여 트레이더</span>
          <strong>{items.length}</strong>
          <span>최고 적중 기록</span>
          <strong>{items[0]?.wonPredictions ?? 0}회</strong>
        </div>
      </div>

      <div className="leaderboard">
        <div className="strategy-head">
          <span>#</span>
          <span>트레이더</span>
          <span>적중 횟수</span>
          <span>승률</span>
          <span>최고 연승</span>
          <span>총 참여</span>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>불러오는 중…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>아직 예측 기록이 없습니다. 첫 예측을 맞혀 1위에 도전해 보세요.</div>
        ) : (
          items.map((item) => (
            <div className="strategy-row" key={item.userId}>
              <span className="strategy-rank" style={{ color: RANK_COLOR[item.rank] || 'var(--blue)', fontWeight: item.rank <= 3 ? 700 : 400 }}>
                {item.rank}
              </span>
              <span className="strategy-name">
                <strong>{item.nickname}</strong>
                <small style={{ color: TIER_COLOR[item.tier] || '#64748b' }}>{TIER_LABEL[item.tier] || item.tier}</small>
              </span>
              <span className="return-value">{item.wonPredictions}회</span>
              <span>{item.winRatePct.toFixed(1)}%</span>
              <span>{item.maxStreak}연승</span>
              <span style={{ color: 'var(--muted)' }}>{item.totalPredictions}회</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default PredictionLeaderboardPanel
