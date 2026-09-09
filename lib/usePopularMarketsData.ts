'use client';

import { useState, useEffect } from 'react';

export interface PopularMarketItem {
  name: string;
  ticker: string;
  logo: string;
  price: string;
  change: string;
  tagKo: string;
  tagEn: string;
  isUp: boolean;
}

const DEFAULT_POPULAR_MARKETS: PopularMarketItem[] = [
  { name: 'BTC / USD', ticker: 'BTC', logo: 'https://financialmodelingprep.com/image-stock/BTCUSD.png', price: '$78,418.00', change: '+2.84%', tagKo: '디지털 골드 · 기축', tagEn: 'Digital Gold · Reserve', isUp: true },
  { name: 'ETH / USD', ticker: 'ETH', logo: 'https://financialmodelingprep.com/image-stock/ETHUSD.png', price: '$3,842.17', change: '+1.62%', tagKo: '스마트 컨트랙트 허브', tagEn: 'Layer 1 Smart Contracts', isUp: true },
  { name: 'SOL / USD', ticker: 'SOL', logo: 'https://financialmodelingprep.com/image-stock/SOLUSD.png', price: '$182.64', change: '-0.48%', tagKo: '초고속 DeFi 생태계', tagEn: 'High-Throughput DeFi', isUp: false },
  { name: 'S&P 500', ticker: 'SPX', logo: 'https://financialmodelingprep.com/image-stock/SPY.png', price: '$5,842.91', change: '+0.37%', tagKo: '미국 대형주 500 지수', tagEn: 'US S&P 500 Benchmark', isUp: true },
  { name: 'NASDAQ 100', ticker: 'NDX', logo: 'https://financialmodelingprep.com/image-stock/QQQ.png', price: '$20,118.44', change: '+0.61%', tagKo: '나스닥 빅테크 100 지수', tagEn: 'NASDAQ 100 Tech', isUp: true },
  { name: 'GOLD', ticker: 'XAU', logo: 'https://financialmodelingprep.com/image-stock/GLD.png', price: '$2,348.70', change: '-0.12%', tagKo: '실물 금 안전자산', tagEn: 'Physical Gold Commodity', isUp: false },
  { name: 'NVDA', ticker: 'NVDA', logo: 'https://financialmodelingprep.com/image-stock/NVDA.png', price: '$138.50', change: '+2.45%', tagKo: 'AI 반도체 거인', tagEn: 'AI Semiconductor Giant', isUp: true },
  { name: 'TSLA', ticker: 'TSLA', logo: 'https://financialmodelingprep.com/image-stock/TSLA.png', price: '$218.40', change: '-1.71%', tagKo: '자율주행·로보택시', tagEn: 'Autonomous Driving', isUp: false },
  { name: 'AMZN', ticker: 'AMZN', logo: 'https://financialmodelingprep.com/image-stock/AMZN.png', price: '$214.80', change: '+1.35%', tagKo: '클라우드·E-커머스 공룡', tagEn: 'Cloud & E-Commerce Giant', isUp: true },
  { name: 'SPACEX', ticker: 'SPACEX', logo: 'https://financialmodelingprep.com/image-stock/TSLA.png', price: '$135.00', change: '+4.12%', tagKo: '민간 우주탐사·스타링크', tagEn: 'Space Exploration & Starlink', isUp: true },
  { name: '005930.KS', ticker: '005930', logo: 'https://financialmodelingprep.com/image-stock/005930.KS.png', price: '₩56,200', change: '+0.89%', tagKo: '글로벌 메모리·파운드리', tagEn: 'Global Memory & Foundry', isUp: true },
  { name: '000660.KS', ticker: '000660', logo: 'https://financialmodelingprep.com/image-stock/000660.KS.png', price: '₩186,500', change: '+2.14%', tagKo: 'HBM3E 고대역폭 메모리', tagEn: 'HBM3E Leader', isUp: true }
];

export function usePopularMarketsData() {
  const [markets, setMarkets] = useState<PopularMarketItem[]>(DEFAULT_POPULAR_MARKETS);

  useEffect(() => {
    let isCancelled = false;

    // 1. Fetch Real-time Crypto 24H Tickers from Binance
    const fetchCryptoTickers = async () => {
      try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled || !Array.isArray(data)) return;

        const cryptoMap: Record<string, { price: number; changePct: number }> = {};
        data.forEach((item: any) => {
          const p = parseFloat(item.lastPrice || '0');
          const c = parseFloat(item.priceChangePercent || '0');
          if (p > 0) {
            cryptoMap[item.symbol] = { price: p, changePct: c };
          }
        });

        setMarkets((prev) =>
          prev.map((item) => {
            let pair = '';
            if (item.ticker === 'BTC') pair = 'BTCUSDT';
            if (item.ticker === 'ETH') pair = 'ETHUSDT';
            if (item.ticker === 'SOL') pair = 'SOLUSDT';

            if (pair && cryptoMap[pair]) {
              const { price, changePct } = cryptoMap[pair];
              const priceStr = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
              return { ...item, price: priceStr, change: changeStr, isUp: changePct >= 0 };
            }
            return item;
          })
        );
      } catch (err) {
        console.warn('[usePopularMarketsData] Binance fetch error:', err);
      }
    };

    // 2. Fetch Real-time Traditional Assets Quotes from Backend API
    const fetchTraditionalQuotes = async () => {
      const tradTickers = ['SPX', 'NDX', 'GOLD', 'NVDA', 'TSLA'];
      for (const t of tradTickers) {
        try {
          const res = await fetch(`http://localhost:8080/api/market/historical?symbol=${t}&timeFrame=1h&limit=15`);
          if (!res.ok) continue;
          const candles = await res.json();
          if (isCancelled || !Array.isArray(candles) || candles.length === 0) continue;

          const last = candles[candles.length - 1];
          const first = candles[0];
          const currentP = last.close;
          const changePct = first.open > 0 ? ((currentP - first.open) / first.open) * 100 : 0;

          const prefix = t === 'SPX' || t === 'NDX' ? '' : '$';
          const priceStr = `${prefix}${currentP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;

          setMarkets((prev) =>
            prev.map((item) => {
              if (item.ticker === t) {
                return { ...item, price: priceStr, change: changeStr, isUp: changePct >= 0 };
              }
              return item;
            })
          );
        } catch (e) {
          // ignore trad asset fallback
        }
      }
    };

    fetchCryptoTickers();
    fetchTraditionalQuotes();

    const intervalId = setInterval(() => {
      fetchCryptoTickers();
      fetchTraditionalQuotes();
    }, 4000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return markets;
}
