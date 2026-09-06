'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchVisionChartAnalysis } from '../lib/api';
import { VisionChartAnalysisResponse } from '../lib/types';
import { Camera, UploadCloud, X, CheckCircle2, AlertCircle, Scan, ArrowRight, ShieldCheck } from 'lucide-react';

interface VisionChartScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export function VisionChartScanModal({ isOpen, onClose, defaultSymbol = 'BTCUSDT' }: VisionChartScanModalProps) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionChartAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  // Handle Ctrl+V paste anywhere inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImageBase64(event.target?.result as string);
              setResult(null);
              setErrorMsg(null);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageBase64(event.target?.result as string);
        setResult(null);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunScan = async () => {
    if (!imageBase64) {
      setErrorMsg('분석할 차트 스크린샷을 붙여넣거나(Ctrl+V) 업로드해 주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetchVisionChartAnalysis({
        symbol,
        imageBase64,
        prompt: '이 차트의 캔들 패턴, 핵심 지지/저항선, 매매 타점 정밀 분석'
      });

      if (res && res.success) {
        setResult(res);
      } else {
        setErrorMsg('비전 분석에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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
        width: 'min(820px, 100%)',
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
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scan size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                차트 사진 1초 AI 비전 진단 (Vision Chart Scan)
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                스크린샷 붙여넣기(Ctrl+V) 즉시 거래소 Ground-Truth 수치 & AETHER 시계열 프랙탈 자동 결합
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

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Symbol Select & Paste Zone */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>분석 대상 자산:</span>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="예: BTCUSDT, ETHUSDT"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                width: '140px',
                outline: 'none'
              }}
            />
          </div>

          {/* Drag / Paste Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${imageBase64 ? '#0284c7' : '#cbd5e1'}`,
              borderRadius: '8px',
              padding: imageBase64 ? '12px' : '28px 20px',
              background: imageBase64 ? '#f0f9ff' : '#f8fafc',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {imageBase64 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img
                  src={imageBase64}
                  alt="Uploaded chart preview"
                  style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain', border: '1px solid #e2e8f0' }}
                />
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                  클릭하여 다른 이미지로 교체 또는 Ctrl+V로 새 이미지 붙여넣기
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  차트 캡처 이미지를 <b>Ctrl+V</b> 로 여기에 붙여넣으세요
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  또는 클릭하여 이미지 파일(.png, .jpg) 직접 업로드
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          {/* Run Scan Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRunScan}
              disabled={loading || !imageBase64}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: (!imageBase64 || loading) ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: (!imageBase64 || loading) ? 'not-allowed' : 'pointer'
              }}
            >
              <Scan size={15} />
              {loading ? '1초 퀀트 비전 스캔 중…' : '차트 즉시 정밀 진단 실행'}
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Verdict Header Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#059669" />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    진단 결과: {result.technicalVerdict}
                  </span>
                  <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                    소요시간 {result.processingTimeMs}ms
                  </span>
                </div>

                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {result.modelUsed}
                </span>
              </div>

              {/* Targets Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>현재 체결가</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>${result.currentPrice?.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#059669' }}>핵심 지지선</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>${result.supportPrice?.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626' }}>목표 저항선</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626' }}>${result.resistancePrice?.toLocaleString()}</div>
                </div>
              </div>

              {/* Identified Patterns */}
              {result.identifiedPatterns && result.identifiedPatterns.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>감지된 패턴 & 시각적 형상:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.identifiedPatterns.map((p, idx) => (
                      <span key={idx} style={{ fontSize: '11px', fontWeight: 600, background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px' }}>
                        ✓ {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown Detailed Report */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '12px',
                lineHeight: 1.6,
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {result.analysisMarkdown}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}