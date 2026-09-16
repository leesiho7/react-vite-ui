import { BacktestTrade } from './types';

/**
 * 백테스트 응답의 실제 거래 리스트(`BacktestTrade[]`)에서 대시보드 차트가 필요로 하는
 * 시계열/분포를 계산하는 순수 함수 모음. 전부 실제 거래 데이터에서 파생된 값이고,
 * 화면단에서 새로 지어내는 숫자는 없다 — 차트마다 반복해서 계산 로직을 흩어두지 않도록
 * 컴포넌트와 분리해 여기 모아둔다.
 */

export interface EquityPoint {
  t: string; // exitTime
  equity: number; // 1.0 = 원금
}

/** 청산 시각 순서대로 복리 누적한 자산 곡선. 거래가 없으면 빈 배열. */
export function deriveEquitySeries(trades: BacktestTrade[]): EquityPoint[] {
  const sorted = [...trades]
    .filter((t) => t.outcome !== 'PENDING' && t.outcome !== 'INVALID')
    .sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());

  let equity = 1.0;
  return sorted.map((t) => {
    equity *= 1 + t.returnPct / 100;
    return { t: t.exitTime, equity };
  });
}

export interface DrawdownPoint {
  t: string;
  drawdownPct: number; // 0 이하
}

/** 자산 곡선에서 그때까지의 최고점 대비 낙폭(%)을 뽑는다. */
export function deriveDrawdownSeries(equitySeries: EquityPoint[]): DrawdownPoint[] {
  let peak = 1.0;
  return equitySeries.map((p) => {
    peak = Math.max(peak, p.equity);
    const dd = peak > 0 ? ((p.equity - peak) / peak) * 100 : 0;
    return { t: p.t, drawdownPct: dd };
  });
}

export interface DayVolume {
  day: string; // YYYY-MM-DD
  count: number;
}

/** 진입일(entryTime) 기준 일별 거래 건수. */
export function deriveTradeVolumeByDay(trades: BacktestTrade[]): DayVolume[] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    if (!t.entryTime) continue;
    const day = t.entryTime.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, count]) => ({ day, count }));
}

export interface OutcomeCount {
  outcome: string;
  count: number;
}

const OUTCOME_ORDER = ['TARGET_HIT', 'STOP_HIT', 'TIME_EXIT'];

/** 청산 사유(outcome)별 건수. TARGET_HIT/STOP_HIT/TIME_EXIT 순서 고정 — 범례 순서가
 *  필터를 바꿔도 흔들리지 않게 한다. */
export function deriveSignalDistribution(trades: BacktestTrade[]): OutcomeCount[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    counts.set(t.outcome, (counts.get(t.outcome) ?? 0) + 1);
  }
  return OUTCOME_ORDER.filter((o) => counts.has(o)).map((outcome) => ({
    outcome,
    count: counts.get(outcome) ?? 0
  }));
}

export interface HeatmapCell {
  dayOfWeek: number; // 0=일 ... 6=토
  hour: number; // 0~23 (진입 시각 UTC 기준)
  count: number;
  winRate: number | null; // 표본 없으면 null
}

/** 진입 요일×시간대별 승률 그리드(7x24). 표본이 없는 칸은 winRate=null로 남겨서
 *  "0% 패배"와 "데이터 없음"을 구분한다 — 없는 걸 0으로 지어내지 않는다. */
export function deriveWinRateHeatmap(trades: BacktestTrade[]): HeatmapCell[][] {
  const grid: { wins: number; total: number }[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ wins: 0, total: 0 }))
  );

  for (const t of trades) {
    if (!t.entryTime) continue;
    const d = new Date(t.entryTime);
    if (Number.isNaN(d.getTime())) continue;
    const dow = d.getUTCDay();
    const hour = d.getUTCHours();
    grid[dow][hour].total += 1;
    if (t.returnPct > 0) grid[dow][hour].wins += 1;
  }

  return grid.map((row, dayOfWeek) =>
    row.map((cell, hour) => ({
      dayOfWeek,
      hour,
      count: cell.total,
      winRate: cell.total > 0 ? cell.wins / cell.total : null
    }))
  );
}
