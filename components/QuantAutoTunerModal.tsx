'use client';

import React, { useState } from 'react';
import { fetchAutoTune } from '../lib/api';
import { AutoTuneResponse } from '../lib/types';
import { Sliders, CheckCircle2, Copy, Play, X, ArrowRight, TrendingUp, Trophy } from 'lucide-react';

interface QuantAutoTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  onApplyBotConfig?: (configJson: string) => void;
}

export function QuantAutoTunerModal({ isOpen, onClose, defaultSymbol = 'BTCUSDT', onApplyBotConfig }: QuantAutoTunerModalProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [metric, setMetric] = useState<'SHARPE' | 'WIN_RATE' | 'PROFIT_FACTOR'>('SHARPE');
  const [loading, setLoading] = useState(false);
  const [tuneResult, setTuneResult] = useState<AutoTuneResponse | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunTune = async () => {
    setLoading(true);
    try {
      const res = await fetchAutoTune({
        symbol,
        timeFrame: 'D1',
        candleLimit: 150,
        optimizationMetric: metric
      });
      if (res) setTuneResult(res);
    } catch (e) {
      console.warn('AutoTune error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (tuneResult?.oneClickBotConfigJson) {
      navigator.clipboard.writeText(tuneResult.oneClickBotConfigJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (tuneResult?.oneClickBotConfigJson && onApplyBotConfig) {
      onApplyBotConfig(tuneResult.oneClickBotConfigJson);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: 'min(860px, 100%)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
        fontFamily: 'var(--font-sans)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 22px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                노코드 퀀트 파라미터 오토튜너 & 1-클릭 복사
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                과거 캔들 기반 24개 전략 조합 시뮬레이션 → 최고 샤프지수 & 승률 조합 도출
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>자산:</span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  width: '110px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>목표 지표:</span>
              {[
                { id: 'SHARPE', label: '샤프 지수 (Sharpe)' },
                { id: 'WIN_RATE', label: '승률 (Win Rate)' },
                { id: 'PROFIT_FACTOR', label: '손익비 (PF)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMetric(opt.id as any)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: metric === opt.id ? 700 : 500,
                    background: metric === opt.id ? '#4f46e5' : '#ffffff',
                    color: metric === opt.id ? '#ffffff' : '#475569',
                    border: `1px solid ${metric === opt.id ? '#4f46e5' : '#cbd5e1'}`,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRunTune}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                background: loading ? '#94a3b8' : '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <Play size={13} fill="#fff" />
              {loading ? '그리드 시뮬레이션 중…' : '오토튜닝 실행'}
            </button>
          </div>

          {/* Results Display */}
          {tuneResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Champion Best Card */}
              <div style={{
                background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
                border: '1px solid #c7d2fe',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={16} color="#4f46e5" />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca' }}>GLOBAL OPTIMAL STRATEGY (1위 선정)</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>
                    {tuneResult.bestConfig?.strategyName || 'AutoTuned Strategy'}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px' }}>
                    <span>샤프 지수: <b style={{ color: '#4f46e5' }}>{tuneResult.bestSharpeRatio}</b></span>
                    <span>승률: <b style={{ color: '#059669' }}>{tuneResult.bestWinRate}%</b></span>
                    <span>손익비: <b>{tuneResult.bestProfitFactor}</b></span>
                    <span>최대 낙폭(MDD): <b style={{ color: '#dc2626' }}>{tuneResult.bestMaxDrawdown}%</b></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#4338ca',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={13} />
                    {copied ? '복사 완료!' : 'JSON 설정 복사'}
                  </button>
                  {onApplyBotConfig && (
                    <button
                      type="button"
                      onClick={handleApply}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '8px 14px',
                        background: '#4f46e5',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      1-클릭 봇 적용
                    </button>
                  )}
                </div>
              </div>

              {/* Top 5 Comparison Table */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  상위 파라미터 조합 랭킹 (Top 5 Candidates)
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px 12px' }}>순위</th>
                        <th style={{ padding: '8px 12px' }}>파라미터 세팅</th>
                        <th style={{ padding: '8px 12px' }}>샤프지수</th>
                        <th style={{ padding: '8px 12px' }}>승률</th>
                        <th style={{ padding: '8px 12px' }}>손익비</th>
                        <th style={{ padding: '8px 12px' }}>MDD</th>
                        <th style={{ padding: '8px 12px' }}>거래수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tuneResult.topCandidates?.map((cand, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx === 0 ? '#f0fdf4' : (idx % 2 === 0 ? '#ffffff' : '#fafafa')
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: idx === 0 ? '#059669' : '#64748b' }}>
                            #{cand.rank} {idx === 0 && '👑'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{cand.label}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: cand.sharpeRatio >= 0 ? '#4f46e5' : '#dc2626' }}>
                            {cand.sharpeRatio}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: cand.winRate >= 50 ? '#059669' : '#d97706' }}>
                            {cand.winRate}%
                          </td>
                          <td style={{ padding: '8px 12px' }}>{cand.profitFactor}</td>
                          <td style={{ padding: '8px 12px', color: '#dc2626' }}>{cand.maxDrawdown}%</td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{cand.totalTrades}회</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary note */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '11.5px',
                color: '#475569',
                lineHeight: 1.5
              }}>
                💡 {tuneResult.tuningSummary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}