'use client';

import React, { useState, useEffect } from 'react';
import { fetchAiDebate } from '../lib/api';
import { AiDebateResponse } from '../lib/types';
import { RefreshCw, Shield, Landmark, Zap, ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AiDebateArenaCardProps {
  symbol?: string;
  onApplyTrailingStop?: (price: number) => void;
}

export function AiDebateArenaCard({ symbol = 'BTCUSDT', onApplyTrailingStop }: AiDebateArenaCardProps) {
  const [debate, setDebate] = useState<AiDebateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePersonaTab, setActivePersonaTab] = useState<'ALL' | 'buffett' | 'simons' | 'dalio'>('ALL');

  const loadDebate = async () => {
    setLoading(true);
    try {
      const res = await fetchAiDebate(symbol);
      if (res) setDebate(res);
    } catch (e) {
      console.warn('Debate fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebate();
  }, [symbol]);

  const personaMeta: Record<string, { icon: any; avatarImg?: string; color: string; bg: string; border: string }> = {
    buffett: { icon: Shield, avatarImg: '/buffett-avatar.png', color: '#b45309', bg: '#ffffff', border: '#e2e8f0' },
    simons: { icon: Zap, avatarImg: '/simons-avatar.png', color: '#047857', bg: '#ffffff', border: '#e2e8f0' },
    dalio: { icon: Landmark, avatarImg: '/dalio-avatar.png', color: '#1d4ed8', bg: '#ffffff', border: '#e2e8f0' }
  };

  const isBullish = (debate?.consensusScore ?? 50) >= 60;
  const isBearish = (debate?.consensusScore ?? 50) <= 40;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dfe3eb',
      borderRadius: '8px',
      padding: '20px 24px',
      margin: '20px 0',
      fontFamily: 'var(--font-sans)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎙️</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              월가 3대 거장 AI 끝장 토론 (Wall Street Legends Debate Arena)
            </h3>
            <span style={{ fontSize: '10px', background: '#0f172a', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              ROUND-TABLE
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            워런 버핏 (가치·안전마진) × 짐 시몬스 (퀀트·수학적 엣지) × 레이 달리오 (올웨더·매크로 사이클) 3인 실시간 합의
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadDebate}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? '토론 분석 중…' : '토론 다시 진행'}
          </button>
        </div>
      </div>

      {/* Consensus Score Gauge Banner */}
      {debate && (
        <div style={{
          marginTop: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>3인 합의 스코어</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 900,
                color: isBullish ? '#059669' : (isBearish ? '#dc2626' : '#d97706')
              }}>
                {debate.consensusScore}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>/ 100</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isBullish ? '#ecfdf5' : (isBearish ? '#fef2f2' : '#fffbeb'),
                color: isBullish ? '#059669' : (isBearish ? '#dc2626' : '#d97706'),
                border: `1px solid ${isBullish ? '#a7f3d0' : (isBearish ? '#fecaca' : '#fde68a')}`
              }}>
                {debate.suggestedAction === 'BUY' ? '매수 우위 (BUY)' : (debate.suggestedAction === 'SELL' ? '방어/비중축소' : '중립 관망 (HOLD)')}
              </span>
            </div>
          </div>

          {/* Bull vs Bear Ratio Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              <span style={{ color: '#059669' }}>상승 지지 {debate.bullRatio}%</span>
              <span style={{ color: '#dc2626' }}>하방 경계 {debate.bearRatio}%</span>
            </div>
            <div style={{ height: '8px', background: '#fee2e2', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${debate.bullRatio}%`, background: '#10b981', transition: 'width 0.4s ease' }} />
              <div style={{ width: `${debate.bearRatio}%`, background: '#ef4444', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Trailing Stop Action Box */}
          {debate.recommendedTrailingStop && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>권장 1.5-ATR 스탑로스</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', fontFamily: 'Consolas, monospace' }}>
                  ${debate.recommendedTrailingStop.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              {onApplyTrailingStop && (
                <button
                  type="button"
                  onClick={() => onApplyTrailingStop(debate.recommendedTrailingStop!)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    background: '#0ea5e9',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  적용
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs for Personas */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        {[
          { id: 'ALL', label: '전체 토론 (Round-Table)' },
          { id: 'buffett', label: '워런 버핏 (가치·안전마진)', avatarImg: '/buffett-avatar.png' },
          { id: 'simons', label: '짐 시몬스 (퀀트·수학적 엣지)', avatarImg: '/simons-avatar.png' },
          { id: 'dalio', label: '레이 달리오 (올웨더·매크로)', avatarImg: '/dalio-avatar.png' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePersonaTab(tab.id as any)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: activePersonaTab === tab.id ? 700 : 500,
              borderRadius: '4px',
              border: 'none',
              background: activePersonaTab === tab.id ? '#0f172a' : '#f8fafc',
              color: activePersonaTab === tab.id ? '#ffffff' : '#64748b',
              cursor: 'pointer'
            }}
          >
            {tab.avatarImg && (
              <img
                src={tab.avatarImg}
                alt=""
                style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <style>{`
        .debate-dialogue-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px 18px;
          position: relative;
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          cursor: default;
        }
        .debate-dialogue-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.09), 0 4px 10px -2px rgba(15, 23, 42, 0.04);
          border-color: #cbd5e1;
        }
      `}</style>

      {/* Dialogue Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
        {debate?.dialogue
          ?.filter(m => activePersonaTab === 'ALL' || m.personaId === activePersonaTab)
          ?.map((msg, idx) => {
            const meta = personaMeta[msg.personaId] || { icon: Zap, color: '#64748b', bg: '#ffffff', border: '#e2e8f0' };
            const IconComp = meta.icon;
            const isMsgBull = msg.stance === 'BULLISH';
            const isMsgBear = msg.stance === 'BEARISH';

            return (
              <div
                key={`${msg.personaId}-${idx}`}
                className="debate-dialogue-card"
              >
                {/* Persona Head */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {meta.avatarImg ? (
                        <img
                          src={meta.avatarImg}
                          alt={msg.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <IconComp size={15} color={meta.color} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {msg.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {msg.title}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isMsgBull ? '#ecfdf5' : (isMsgBear ? '#fef2f2' : '#f8fafc'),
                    color: isMsgBull ? '#059669' : (isMsgBear ? '#dc2626' : '#64748b'),
                    border: `1px solid ${isMsgBull ? '#a7f3d0' : (isMsgBear ? '#fecaca' : '#cbd5e1')}`
                  }}>
                    {msg.stance}
                  </span>
                </div>

                {/* Persona Text */}
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', lineHeight: 1.6, color: '#1e293b' }}>
                  "{msg.content}"
                </p>

                {/* Evidence Metrics Chips */}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {msg.metrics.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {m}
                      </span>
                    ))}
                    {msg.targetPrice && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        background: '#f8fafc',
                        color: meta.color,
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        {msg.targetPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Key Takeaway Summary */}
      {debate?.keyTakeaway && (
        <div style={{
          marginTop: '14px',
          padding: '14px 18px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#334155',
          lineHeight: 1.6,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
        }}>
          <span style={{ marginRight: '6px', fontSize: '14px' }}>💡</span>
          <b style={{ color: '#0f172a', fontWeight: 800 }}>합의 총평:</b>{' '}
          <span style={{ color: '#334155' }}>{debate.keyTakeaway}</span>
        </div>
      )}
    </div>
  );
}