'use client';

// 거래소 간 무기한 선물 펀딩비 비교 패널 (Binance · Bybit · OKX · Bitunix · Hyperliquid).
// 데이터는 전부 백엔드 /api/market/funding-compare 가 거래소 공개 API 에서 받아 정규화한 실제 값이다.
// 거래소가 해당 심볼을 상장하지 않았거나 응답이 없으면 "—" 로 두고 값을 채우지 않는다.

import React, { useEffect, useMemo, useState } from 'react';
import { fetchFundingCompare, type FundingCompareRow, type ExchangeFundingEntry } from '../lib/api';

const EXCHANGE_ORDER: ExchangeFundingEntry['exchange'][] = ['BINANCE', 'BYBIT', 'OKX', 'BITUNIX', 'HYPERLIQUID'];
const EXCHANGE_LABEL: Record<string, string> = {
  BINANCE: 'Binance',
  BYBIT: 'Bybit',
  OKX: 'OKX',
  BITUNIX: 'Bitunix',
  HYPERLIQUID: 'Hyperliquid',
};
const REFRESH_MS = 30_000;

function signed(v: number, digits: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

function utcTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

export function FundingComparePanel({ language = 'ko' }: { language?: 'en' | 'cn' | 'ko' }) {
  const isEn = language === 'en';
  const tr = (ko: string, en: string) => (isEn ? en : ko);

  const [rows, setRows] = useState<FundingCompareRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable'>('loading');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetchFundingCompare();
      if (cancelled) return;
      if (res && res.available && res.rows && res.rows.length > 0) {
        setRows(res.rows);
        setFetchedAt(res.fetchedAt ?? Date.now());
        setStatus('ok');
      } else {
        // 장애 시 이전 값을 현재 값처럼 남겨 두지 않는다
        setRows([]);
        setStatus('unavailable');
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // 차이가 큰 순서. 거래소가 1곳뿐이라 차이를 못 구한 심볼은 맨 아래.
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.differential?.annualizedPct ?? -Infinity) - (a.differential?.annualizedPct ?? -Infinity)),
    [rows]
  );

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ background: '#f8fafb', border: '1px solid #d8dee4', padding: '14px 18px', borderRadius: '4px', marginBottom: '12px' }}>
        <strong style={{ fontSize: '12px', color: '#18334a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {tr('거래소 간 펀딩비 비교 (무기한 선물)', 'Cross-Exchange Funding Comparison (Perpetuals)')}
        </strong>
        <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.6 }}>
          {tr(
            '같은 코인의 펀딩비가 거래소마다 다를 때, 가장 높은 곳에서 숏(수취)·가장 낮은 곳에서 롱(덜 지급)을 잡는 거래소 간 펀딩 차이를 보여줍니다. 정산 주기가 달라(Hyperliquid 1시간, 나머지 대부분 8시간) 모두 연환산으로 맞춰 비교합니다.',
            'When a coin’s funding differs across venues, this shows the spread between shorting where funding is highest (you receive) and going long where it is lowest (you pay least). Settlement intervals differ (Hyperliquid hourly, most others 8h), so everything is compared annualized.'
          )}
        </p>
        <p style={{ fontSize: '9.5px', color: '#74808c', margin: '4px 0 0' }}>
          {status === 'ok' && fetchedAt
            ? tr(`거래소 공개 API 실시간 값 · ${new Date(fetchedAt).toLocaleTimeString()} 갱신`, `Live values from exchange public APIs · updated ${new Date(fetchedAt).toLocaleTimeString()}`)
            : status === 'loading'
            ? tr('불러오는 중…', 'Loading…')
            : tr('데이터 없음 — 거래소 응답을 받지 못했습니다.', 'No data — exchange responses unavailable.')}
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#0b131e', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '10px 12px' }}>ASSET</th>
              {EXCHANGE_ORDER.map((ex) => (
                <th key={ex} style={{ padding: '10px 12px' }}>
                  {EXCHANGE_LABEL[ex].toUpperCase()}
                  <div style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>ANNUALIZED</div>
                </th>
              ))}
              <th style={{ padding: '10px 12px' }}>
                SPREAD
                <div style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>ANNUALIZED</div>
              </th>
              <th style={{ padding: '10px 12px' }}>{tr('숏 ▸ 롱', 'SHORT ▸ LONG')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={EXCHANGE_ORDER.length + 3} style={{ padding: '28px 12px', textAlign: 'center', color: '#74808c', background: '#f8fafb' }}>
                  {status === 'loading'
                    ? tr('거래소 간 펀딩비를 불러오는 중…', 'Loading cross-exchange funding…')
                    : tr('데이터 없음 — 추정값을 표시하지 않습니다.', 'No data — no estimated values are shown.')}
                </td>
              </tr>
            )}
            {sorted.map((row, idx) => {
              const byEx = new Map(row.entries.map((e) => [e.exchange, e]));
              const maxEx = row.differential?.shortExchange;
              const minEx = row.differential?.longExchange;
              return (
                <tr key={row.symbol} style={{ borderBottom: '1px solid #edf0f2', background: idx % 2 === 0 ? '#ffffff' : '#fcfdfe' }}>
                  <td style={{ padding: '12px' }}>
                    <strong style={{ color: '#18334a' }}>{row.symbol}</strong>
                  </td>
                  {EXCHANGE_ORDER.map((ex) => {
                    const e = byEx.get(ex);
                    if (!e) {
                      return (
                        <td key={ex} title={tr('이 거래소에 상장되지 않았거나 응답이 없습니다', 'Not listed on this exchange or no response')} style={{ padding: '12px', color: '#cbd5e1' }}>
                          —
                        </td>
                      );
                    }
                    const isMax = ex === maxEx;
                    const isMin = ex === minEx;
                    return (
                      <td
                        key={ex}
                        title={`${signed(e.fundingRatePct, 4)} / ${e.intervalHours}h · ${tr('다음 정산', 'next')} ${utcTime(e.nextFundingTime)}`}
                        style={{
                          padding: '12px',
                          background: isMax ? '#ecfdf5' : isMin ? '#eff6ff' : 'transparent',
                          boxShadow: isMax ? 'inset 3px 0 0 #10b981' : isMin ? 'inset 3px 0 0 #3b82f6' : 'none',
                        }}
                      >
                        <strong style={{ color: e.annualizedPct >= 0 ? '#0f766e' : '#ac5d59', fontSize: '12px' }}>{signed(e.annualizedPct, 2)}</strong>
                        <small style={{ color: '#74808c', display: 'block', fontSize: '8.5px' }}>
                          {signed(e.fundingRatePct, 4)} / {e.intervalHours}h
                        </small>
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px' }}>
                    {row.differential ? (
                      <strong style={{ color: '#18334a', fontSize: '12px' }}>{row.differential.annualizedPct.toFixed(2)}%</strong>
                    ) : (
                      <span style={{ color: '#cbd5e1' }} title={tr('비교하려면 거래소가 2곳 이상 필요합니다', 'Needs at least two venues')}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#18334a', whiteSpace: 'nowrap' }}>
                    {row.differential ? (
                      <>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{EXCHANGE_LABEL[row.differential.shortExchange] ?? row.differential.shortExchange}</span>
                        {' ▸ '}
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>{EXCHANGE_LABEL[row.differential.longExchange] ?? row.differential.longExchange}</span>
                      </>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '10px', fontSize: '9.5px', color: '#74808c', lineHeight: 1.7 }}>
        <div>
          <span style={{ color: '#10b981', fontWeight: 700 }}>■</span> {tr('가장 높음 (여기서 숏 = 수취)', 'Highest (short here = receive)')}
          {'  '}
          <span style={{ color: '#3b82f6', fontWeight: 700 }}>■</span> {tr('가장 낮음 (여기서 롱 = 가장 덜 지급)', 'Lowest (long here = pay least)')}
        </div>
        <div>
          {tr(
            '⚠ 연환산은 "지금 요율이 계속된다"는 단순 가정이며 예측이 아닙니다. 펀딩비는 정산마다 바뀝니다. 수수료, 슬리피지, 거래소 간 가격 괴리(베이시스), 증거금·청산 위험, 이체 비용은 반영하지 않았습니다. 거래소마다 "현재 요율"의 의미가 조금 다릅니다(Binance는 마지막 확정값, Bybit·OKX는 이번 주기 요율).',
            '⚠ Annualized assumes today’s rate persists — it is not a forecast, and funding changes every settlement. Fees, slippage, price basis between venues, margin/liquidation risk and transfer costs are not included. "Current rate" differs slightly by venue (Binance: last settled; Bybit/OKX: current period).'
          )}
        </div>
      </div>
    </div>
  );
}
