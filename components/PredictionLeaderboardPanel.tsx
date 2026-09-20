'use client'

import { useEffect, useState } from 'react'
import { fetchPredictionLeaderboard } from '@/lib/api'
import { PredictionLeaderboardItem } from '@/lib/types'

// 브랜드 오렌지/블랙 2톤으로 통일 — 티어/순위별로 색을 따로 칠하던 것(보라/파랑/초록/금은동
// 등)을 다 빼고, 강조는 항상 오렌지, 본문은 항상 블랙만 쓴다.
const ORANGE = '#f47a20'
const BLACK = '#0b131e'
const FONT_SANS = 'var(--font-sans)'
const FONT_MONO = 'var(--font-mono)'

/**
 * 10연승 챌린지 예측 적중 랭킹 — "League of Traders" 스타일의 깔끔한 순위표를 참고해서,
 * 이미 globals.css에 있는(현재는 안 쓰이던) .commons-section/.leaderboard/.strategy-row
 * 클래스를 그대로 재활용한다(새 CSS를 또 만들지 않음). 색상만 이 컴포넌트 안에서 인라인으로
 * 오렌지/블랙 2톤으로 덮어써서, 공용 클래스를 다른 곳에서 재사용해도 영향이 없게 한다.
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
    <section className="commons-section" id="prediction-leaderboard" style={{ fontFamily: FONT_SANS, color: BLACK }}>
      <div className="commons-header">
        <div>
          <span className="eyebrow" style={{ color: BLACK }}>
            <span className="diamond" style={{ color: ORANGE }}>◆</span> LEAGUE OF PREDICTORS
          </span>
          <h2 style={{ color: BLACK }}>예측 적중 <em style={{ color: ORANGE, fontStyle: 'normal' }}>랭킹.</em></h2>
          <p style={{ color: BLACK }}>승률이 아니라 실제로 예측을 맞춘 누적 횟수 기준입니다. 계속 도전할수록만 올라가는 순위라, 지면 리셋되는 연승 트래커와 달리 꾸준히 참여할수록 랭킹이 쌓입니다.</p>
        </div>
        <div className="commons-stats" style={{ color: BLACK }}>
          <span style={{ color: BLACK }}>참여 트레이더</span>
          <strong style={{ color: ORANGE, fontFamily: FONT_MONO }}>{items.length}</strong>
          <span style={{ color: BLACK }}>최고 적중 기록</span>
          <strong style={{ color: ORANGE, fontFamily: FONT_MONO }}>{items[0]?.wonPredictions ?? 0}회</strong>
        </div>
      </div>

      <div className="leaderboard">
        <div className="strategy-head" style={{ color: BLACK }}>
          <span>#</span>
          <span>트레이더</span>
          <span>적중 횟수</span>
          <span>승률</span>
          <span>최고 연승</span>
          <span>총 참여</span>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: BLACK, fontSize: '11px' }}>불러오는 중…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: BLACK, fontSize: '11px' }}>아직 예측 기록이 없습니다. 첫 예측을 맞혀 1위에 도전해 보세요.</div>
        ) : (
          items.map((item) => (
            <div className="strategy-row" key={item.userId} style={{ color: BLACK }}>
              <span className="strategy-rank" style={{ color: ORANGE, fontFamily: FONT_MONO, fontWeight: item.rank <= 3 ? 700 : 500 }}>
                {item.rank}
              </span>
              <span className="strategy-name">
                <strong style={{ color: BLACK }}>{item.nickname}</strong>
                <small style={{ color: ORANGE }}>{item.tier}</small>
              </span>
              <span style={{ color: ORANGE, fontFamily: FONT_MONO, fontWeight: 700 }}>{item.wonPredictions}회</span>
              <span style={{ color: BLACK, fontFamily: FONT_MONO }}>{item.winRatePct.toFixed(1)}%</span>
              <span style={{ color: BLACK, fontFamily: FONT_MONO }}>{item.maxStreak}연승</span>
              <span style={{ color: BLACK, fontFamily: FONT_MONO }}>{item.totalPredictions}회</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default PredictionLeaderboardPanel
