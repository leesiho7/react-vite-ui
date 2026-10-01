// 거래소 간 펀딩 차익 쌍(숏/롱)의 가격 괴리와 손익분기 계산 (순수 함수).
//
// 펀딩 차이만 보면 "연 4%"처럼 보여도, 두 거래소의 가격이 이미 벌어져 있으면 진입하는 순간 그만큼 손해일 수 있다.
// 그래서 같은 쌍의 **마크 가격 괴리**를 함께 보고, 그 손해를 펀딩 차이로 메우는 데 며칠이 걸리는지 계산한다.
//
// 한계(화면에도 명시): 마크 가격은 실제 체결 가능한 가격이 아니다. 수수료·슬리피지·호가 스프레드는 반영하지 않으며,
// 펀딩 차이는 "현재 요율이 유지된다"는 단순 가정이라 며칠 뒤에는 달라질 수 있다.

import type { ExchangeFundingEntry, FundingDifferential } from './api';

export interface PairEconomics {
  /** (숏 거래소 마크 − 롱 거래소 마크) / 롱 거래소 마크 × 100. 양수면 비싼 쪽에서 숏을 잡는 것이라 진입이 유리하다. 모르면 null */
  markGapPct: number | null;
  /** 하루치 펀딩 차이(%) = 연환산 차이 / 365 */
  dailyDifferentialPct: number;
  /**
   * 가격 괴리 손해를 펀딩 차이로 메우는 데 걸리는 일수.
   * 괴리가 이미 유리하거나 0 이면 0, 괴리를 모르면 null, 펀딩 차이가 0 이하면 메울 수 없으므로 null.
   */
  breakEvenDays: number | null;
}

export function pairEconomics(
  entries: ExchangeFundingEntry[],
  differential: FundingDifferential | undefined
): PairEconomics | null {
  if (!differential) return null;
  const dailyDifferentialPct = differential.annualizedPct / 365;

  const shortLeg = entries.find((e) => e.exchange === differential.shortExchange);
  const longLeg = entries.find((e) => e.exchange === differential.longExchange);
  const shortMark = shortLeg?.markPrice ?? null;
  const longMark = longLeg?.markPrice ?? null;

  if (shortMark === null || longMark === null || !(longMark > 0) || !(shortMark > 0)) {
    return { markGapPct: null, dailyDifferentialPct, breakEvenDays: null };
  }

  const markGapPct = ((shortMark - longMark) / longMark) * 100;
  let breakEvenDays: number | null;
  if (markGapPct >= 0) breakEvenDays = 0;
  else if (dailyDifferentialPct > 0) breakEvenDays = Math.abs(markGapPct) / dailyDifferentialPct;
  else breakEvenDays = null;

  return { markGapPct, dailyDifferentialPct, breakEvenDays };
}
