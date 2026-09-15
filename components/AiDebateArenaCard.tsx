'use client';

import React, { useState, useEffect } from 'react';
import { fetchAiDebate } from '../lib/api';
import { AiDebateResponse } from '../lib/types';
import { RefreshCw, Shield, Landmark, Zap } from 'lucide-react';

interface AiDebateArenaCardProps {
  symbol?: string;
}

export function AiDebateArenaCard({ symbol = 'BTCUSDT' }: AiDebateArenaCardProps) {
  const [debate, setDebate] = useState<AiDebateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDebate = async () => {
    setLoading(true);
    try {
      const res = await fetchAiDebate(symbol);
      if (res) setDebate(res);
    } catch (e) {
      console.warn('Quote fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebate();
  }, [symbol]);

  const personaMeta: Record<string, { icon: any; avatarImg?: string; color: string }> = {
    buffett: { icon: Shield, avatarImg: '/buffett-avatar.png', color: '#b45309' },
    simons: { icon: Zap, avatarImg: '/simons-avatar.png', color: '#047857' },
    dalio: { icon: Landmark, avatarImg: '/dalio-avatar.png', color: '#1d4ed8' }
  };

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
            <span style={{ fontSize: '18px' }}>💬</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              월가 3대 거장의 명언
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            워런 버핏 · 짐 시몬스 · 레이 달리오 — 특정 종목에 대한 매매 신호가 아닌, 세 거장이 공개적으로 남긴 투자 철학 명언입니다.
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
            {loading ? '불러오는 중…' : '다른 명언 보기'}
          </button>
        </div>
      </div>

      <style>{`
        .quote-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px 18px;
          position: relative;
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
          cursor: default;
        }
        .quote-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.09), 0 4px 10px -2px rgba(15, 23, 42, 0.04);
          border-color: #cbd5e1;
        }
      `}</style>

      {/* Quote Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {debate?.dialogue?.map((msg, idx) => {
          const meta = personaMeta[msg.personaId] || { icon: Zap, color: '#64748b' };
          const IconComp = meta.icon;

          return (
            <div key={`${msg.personaId}-${idx}`} className="quote-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
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

              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.7, color: '#1e293b', whiteSpace: 'pre-line' }}>
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
