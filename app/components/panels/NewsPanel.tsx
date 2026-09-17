import React, { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, RefreshCw, Send, AlertTriangle, ShieldCheck, UserRound, ArrowUpRight, BarChart2, CheckCircle2, ChevronDown, ChevronUp, Cpu, Crown, Filter, MessageSquare, Play, Sparkles, X, Award, Search, Copy, Check, Radio , SlidersHorizontal } from 'lucide-react';

const NEWS_PAGE_SIZE = 6;
const WIRE_PAGE_SIZE = 6;

export function NewsPanel(props: any) {
  const { language, handleSelectTopView, newsCategoryTabs, setLanguage, activeMarketCategory, setActiveMarketCategory, query, setQuery, setNewsOpen, newsItems, formatNewsTime, setArticleModalOpen, setSelectedArticle, currentNewsList, wireStockQuery, setWireStockQuery, liveAssetTickers, searched, decisionReport, setSearched, newsCategory, setNewsCategory, activeNews, selectNews } = props;

  // 키셋(커서) 방식 대신 페이지셋 — 전체 기사(예: 85개)를 페이지 단위로 끝까지 넘겨볼 수 있게 한다.
  // currentNewsList는 이미 백엔드가 한 번에 다 내려준 전체 목록이라 별도 API 호출 없이 클라이언트에서 페이징한다.
  const [newsPage, setNewsPage] = useState(0);
  const totalNewsPages = Math.max(1, Math.ceil(currentNewsList.length / NEWS_PAGE_SIZE));

  useEffect(() => {
    setNewsPage(0);
  }, [currentNewsList]);

  const pagedNewsList = currentNewsList.slice(newsPage * NEWS_PAGE_SIZE, (newsPage + 1) * NEWS_PAGE_SIZE);

  // 우측 "실시간 속보 피드" 사이드바도 앞 6개 고정이 아니라 오프셋 페이징으로 전체를 볼 수 있게 한다.
  const [wirePage, setWirePage] = useState(0);
  const totalWirePages = Math.max(1, Math.ceil(currentNewsList.length / WIRE_PAGE_SIZE));

  useEffect(() => {
    setWirePage(0);
  }, [currentNewsList]);

  const pagedWireList = currentNewsList.slice(wirePage * WIRE_PAGE_SIZE, (wirePage + 1) * WIRE_PAGE_SIZE);

  return (
    <>
        <section className="wire-news-shell" id="live-newswire" style={{ margin: '0 auto', maxWidth: '1440px', padding: '0 24px 40px' }}>
          {/* 와이어 뉴스 헤딩 섹션 */}
          <section className="wire-news-heading">
            <div>
              <span className="overline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={12} className="text-[#38bdf8] animate-pulse" />
                {language === 'ko' ? '실시간 글로벌 시장 인텔리전스 와이어' : language === 'cn' ? '全球实时市场情报快讯' : 'REAL-TIME GLOBAL MARKET INTELLIGENCE WIRE'}
              </span>
              <h1>
                {language === 'ko' ? '소음 없는 실시간 시장 맥락' : language === 'cn' ? '没有噪音的实时市场语境' : 'Market Context, Without the Noise'}
              </h1>
              <p>
                {language === 'ko'
                  ? '공식 기관 출처의 금융 뉴스와 AI 팩트체크 인텔리전스를 실시간 데이터 파이프라인으로 확인하세요.'
                  : language === 'cn'
                  ? '通过实时数据管道查看来自官方机构的金融新闻和AI真实性核查情报。'
                  : 'Finance-specialized news and AI fact-checked intelligence directly streamed from official sources.'}
              </p>
            </div>
          </section>

          {/* 3단 그리드 레이아웃: 좌측(종목점수/검색/관심목록) - 중앙(실시간 뉴스 피처 & 그리드) - 우측(최신속보 & 요약) */}
          <div className="wire-layout">
            {/* ── 좌측 사이드바: 종목 검색 및 주식/코인 점수 ── */}
            <aside className="wire-sidebar">
              <div className="wire-section-title">
                <h2>{language === 'ko' ? '주식·가상자산 점수' : language === 'cn' ? '股票/加密评分' : 'STOCK SCORES'}</h2>
                <span>{currentNewsList.length} / 4224</span>
              </div>
              <label className="wire-search">
                <Search size={15} />
                <input
                  value={wireStockQuery}
                  onChange={(e) => setWireStockQuery(e.target.value)}
                  placeholder={language === 'ko' ? '종목 검색 (예: NVDA, BTC)' : language === 'cn' ? '搜索股票/代币' : 'Search stocks/symbols'}
                />
              </label>

              {liveAssetTickers
                .filter((item) => {
                  const q = wireStockQuery.toLowerCase().trim()
                  if (!q) return true
                  return (
                    item.name.toLowerCase().includes(q) ||
                    item.nameKo.toLowerCase().includes(q) ||
                    item.symbol.toLowerCase().includes(q)
                  )
                })
                .map((item) => {
                  const isCurrent = searched.startsWith(item.symbol) || searched === item.target
                  const dynamicScore = isCurrent && decisionReport?.totalScore
                    ? (decisionReport.totalScore * 10).toFixed(1)
                    : item.score

                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      className={`wire-stock ${isCurrent ? 'active' : ''}`}
                      onClick={() => setSearched(item.target)}
                      title={`클릭하여 ${item.name}(${item.symbol}) 차트, 퀀트 리포트 및 속보 동기화`}
                    >
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          minWidth: '26px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          border: '1px solid #dfe3eb',
                          flexShrink: 0
                        }}
                      >
                        <img
                          src={item.logo}
                          alt={item.symbol}
                          width={18}
                          height={18}
                          style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'block' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <span>
                        <strong>{language === 'ko' ? item.nameKo : item.name}</strong>
                        <small>{item.symbol} · AI SCORE {dynamicScore}</small>
                      </span>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono), monospace', color: '#17191f', fontWeight: 600 }}>
                          {item.price}
                        </span>
                        <b style={{ color: item.isUp ? '#09a58e' : '#e34f5a', fontSize: '9px' }}>
                          {item.change}
                        </b>
                      </div>
                    </button>
                  )
                })}

              <div className="wire-sidebar-divider" />
              <h2>{language === 'ko' ? '관심 종목' : language === 'cn' ? '关注列表' : 'WATCHLIST'}</h2>
              <p className="wire-muted">
                {language === 'ko'
                  ? '선택한 종목의 AI 팩트체크 속보와 수급을 실시간으로 추적합니다.'
                  : language === 'cn'
                  ? '实时追踪所选资产的AI核查快讯与资金流向。'
                  : 'Track AI fact-checked news and institutional flows in real-time.'}
              </p>
              <button
                type="button"
                className="wire-create"
                onClick={() => handleSelectTopView('trade')}
              >
                + {language === 'ko' ? '차트 연동 분석하기' : language === 'cn' ? '联动图表分析' : 'SYNC CHART & TRADE'}
              </button>
            </aside>

            {/* ── 중앙 섹션: 카테고리 필터 + 메인 기사 + 2열 뉴스 그리드 ── */}
            <section className="wire-center">
              <div className="media-toolbar">
                <div className="media-filters">
                  <SlidersHorizontal size={13} />
                  {newsCategoryTabs.map((tab) => {
                    const isSelected = newsCategory === tab.key;
                    return (
                      <button
                        key={tab.key}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => setNewsCategory(tab.key as any)}
                      >
                        {tab.labels[language]}
                      </button>
                    );
                  })}
                </div>
                <span className="media-updated">
                  {language === 'ko' ? '실시간 스트리밍' : 'LIVE STREAM'} ·{' '}
                  {currentNewsList.length > 0
                    ? `${newsPage * NEWS_PAGE_SIZE + 1}-${Math.min((newsPage + 1) * NEWS_PAGE_SIZE, currentNewsList.length)} / ${currentNewsList.length}`
                    : `0`} {language === 'ko' ? '개 기사' : 'ARTICLES'}
                </span>
              </div>

              {/* 수집 결과가 없으면 비어 있음을 정직하게 알린다.
                  예전에는 하드코딩된 가짜 속보로 화면을 채웠다. */}
              {currentNewsList.length === 0 && (
                <section
                  className="panel"
                  style={{
                    background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '6px',
                    padding: '28px 22px', marginBottom: '20px', textAlign: 'center', color: '#687184'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                    {language === 'ko' ? '현재 수집된 속보가 없습니다'
                      : language === 'cn' ? '暂无已采集的快讯'
                      : 'No articles collected right now'}
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: 1.6 }}>
                    {language === 'ko'
                      ? '뉴스 피드 수집에 실패했거나 아직 수신된 기사가 없습니다. 확인되지 않은 기사를 임의로 표시하지 않습니다.'
                      : language === 'cn'
                      ? '新闻采集失败或尚无文章。我们不会显示未经核实的内容。'
                      : 'Feed collection failed or no articles are available yet. Unverified items are never shown.'}
                  </div>
                </section>
              )}

              {/* 메인 피처 기사 (실제 뉴스 기사 데이터) */}
              {activeNews && (
                <section className="media-feature panel" style={{ background: '#fff', border: '1px solid #dfe3eb', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div
                    className="media-feature-visual"
                    style={{
                      minHeight: '230px',
                      background: '#17191f',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                    onClick={() => selectNews(activeNews)}
                  >
                    {activeNews.imageUrl ? (
                      <img
                        src={activeNews.imageUrl}
                        alt={activeNews.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '20px', fontWeight: 700 }}>
                        {activeNews.tag || 'MARKET WIRE'}
                      </div>
                    )}
                    {/* 'AI FACT-CHECKED' 배지는 근거가 없어 제거했다. 실제 출처를 표시한다. */}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {activeNews.source}
                    </div>
                  </div>

                  <div className="media-feature-copy" style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span className="overline" style={{ fontSize: '10px', color: '#f47a20', fontWeight: 700 }}>
                        ★ FEATURED · {activeNews.source} · {activeNews.tag}
                      </span>
                      {activeNews.sentiment && (
                        <span className={`sentiment ${activeNews.tone}`} style={{ fontSize: '9px', fontWeight: 700 }}
                              title={activeNews.analysisMethod === 'KEYWORD_RULE'
                                ? '키워드 규칙 기반 분류입니다 (AI 모델 점수가 아닙니다)'
                                : undefined}>
                          {activeNews.sentiment}
                          {activeNews.analysisMethod === 'KEYWORD_RULE' && (
                            <span style={{ fontWeight: 500, opacity: 0.7 }}> · 규칙기반</span>
                          )}
                        </span>
                      )}
                    </div>

                    <h2
                      className="hover:text-[#f47a20] transition-colors duration-200"
                      style={{ fontSize: '19px', lineHeight: '1.3', margin: '0 0 10px', cursor: 'pointer' }}
                      onClick={() => selectNews(activeNews)}
                    >
                      {activeNews.title}
                    </h2>
                    <p style={{ fontSize: '11px', color: '#687184', lineHeight: '1.6', margin: '0 0 14px' }}>
                      {(activeNews as any).snippet || activeNews.title}
                    </p>

                    {/* ⚡ AETHER AI 심층 인과관계 체인 (Deep Causal Chain & Root Cause) */}
                    {((activeNews as any).causalChainKo || (activeNews as any).rootCauseKo) && (
                      <div
                        style={{
                          margin: '0 0 16px',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: '#fff8f3',
                          border: '1px solid #ffd8be',
                          fontSize: '11px',
                          lineHeight: '1.55'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#c2410c', fontWeight: 700, fontSize: '10px' }}>
                          <span>⚡ AI 심층 인과관계 분석 (CAUSAL CHAIN REACTION)</span>
                        </div>
                        {(activeNews as any).rootCauseKo && (
                          <div style={{ marginBottom: '6px', color: '#17191f' }}>
                            <strong style={{ color: '#ea580c' }}>[발생 원인]</strong> {(activeNews as any).rootCauseKo}
                          </div>
                        )}
                        {(activeNews as any).causalChainKo && (
                          <div style={{ color: '#431407', background: 'rgba(255,255,255,0.7)', padding: '6px 8px', borderRadius: '4px', border: '1px solid #fed7aa', marginBottom: '6px' }}>
                            <strong style={{ color: '#ea580c' }}>[파급 경로]</strong> {(activeNews as any).causalChainKo}
                          </div>
                        )}
                        {(activeNews as any).marketImpactDetail && (
                          <div style={{ fontSize: '10px', color: '#7c2d12', fontWeight: 600 }}>
                            📌 <strong>시장 파급:</strong> {(activeNews as any).marketImpactDetail}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #edf0f2', paddingTop: '12px' }}>
                      {/* 'AI IMPACT x/10'은 키워드 카운트를 점수로 위장한 값이어서 제거했다.
                          대신 검증 가능한 정보(출처, 발행시각)를 표시한다. */}
                      <div className="media-meta" style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#9aa2b1' }}>
                        <span>{activeNews.source}</span>
                        {activeNews.timestamp && <span>{activeNews.timestamp}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ height: '32px', padding: '0 12px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '4px' }}
                          onClick={() => selectNews(activeNews)}
                        >
                          {language === 'ko' ? '기사 전문 리포트' : 'READ BRIEF'}
                        </button>
                        {(activeNews as any).link && (
                          <a
                            href={(activeNews as any).link}
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-button"
                            style={{ height: '32px', padding: '0 10px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderRadius: '4px' }}
                          >
                            {language === 'ko' ? '원문' : 'SOURCE'} <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 실시간 2열 뉴스 그리드 */}
              <section className="media-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {pagedNewsList.map((item) => (
                  <button
                    className={`media-card ${activeNews?.title === item.title ? 'active' : ''}`}
                    key={item.title + ((item as any).link || '')}
                    onClick={() => selectNews(item)}
                    style={{
                      background: '#fff',
                      border: activeNews?.title === item.title ? '1.5px solid #f47a20' : '1px solid #dfe3eb',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      textAlign: 'left',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div className="media-card-thumb" style={{ height: '110px', width: '100%', background: '#1e293b', overflow: 'hidden', position: 'relative' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          {item.tag || 'NEWS'}
                        </div>
                      )}
                      <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '8px', padding: '2px 6px', borderRadius: '2px' }}>
                        {item.tag}
                      </span>
                    </div>
                    <div className="media-card-body" style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="media-card-top" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9aa2b1', marginBottom: '6px' }}>
                          <span>{item.source}</span>
                          <span className={`sentiment ${item.tone}`}>{item.sentiment}</span>
                        </div>
                        <h3
                          className="hover:text-[#f47a20] transition-colors duration-200"
                          style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 6px', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {item.title}
                        </h3>
                        <p style={{ fontSize: '10px', color: '#687184', margin: 0, lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {(item as any).snippet || item.title}
                        </p>
                        {((item as any).rootCauseKo || (item as any).causalChainKo) && (
                          <div style={{ marginTop: '6px', padding: '4px 6px', background: '#fff8f3', borderRadius: '3px', border: '1px solid #fed7aa', fontSize: '9px', color: '#c2410c', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            <strong>⚡ 인과분석:</strong> {(item as any).rootCauseKo || (item as any).causalChainKo}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '10px' }}>
                        {/* 'IMPACT x/10' 제거 — 근거 없는 점수였다. 발행시각을 표시한다. */}
                        <span style={{ fontSize: '9px', color: '#9aa2b1' }}>{(item as any).timestamp || ''}</span>
                        <span className="card-link" style={{ fontSize: '9px', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          {language === 'ko' ? '분석' : 'VIEW'} <ArrowUpRight size={11} />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </section>

              {/* 전체 기사 페이지 넘기기 — currentNewsList 전체를 페이지 단위로 끝까지 볼 수 있게 한다 */}
              {currentNewsList.length > NEWS_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => setNewsPage((p: number) => Math.max(0, p - 1))}
                    disabled={newsPage === 0}
                    style={{
                      padding: '6px 14px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                      border: '1px solid #dfe3eb',
                      background: newsPage === 0 ? '#f1f5f9' : '#fff',
                      color: newsPage === 0 ? '#b6bcc7' : '#334155',
                      cursor: newsPage === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {language === 'ko' ? '이전' : language === 'cn' ? '上一页' : 'PREV'}
                  </button>
                  <span style={{ fontSize: '11px', color: '#687184', fontWeight: 700, fontFamily: 'var(--font-mono), monospace' }}>
                    {newsPage + 1} / {totalNewsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewsPage((p: number) => Math.min(totalNewsPages - 1, p + 1))}
                    disabled={newsPage >= totalNewsPages - 1}
                    style={{
                      padding: '6px 14px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                      border: '1px solid #dfe3eb',
                      background: newsPage >= totalNewsPages - 1 ? '#f1f5f9' : '#fff',
                      color: newsPage >= totalNewsPages - 1 ? '#b6bcc7' : '#334155',
                      cursor: newsPage >= totalNewsPages - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {language === 'ko' ? '다음' : language === 'cn' ? '下一页' : 'NEXT'}
                  </button>
                </div>
              )}
            </section>

            {/* ── 우측 사이드바: 최신 실시간 속보 피드 & 시장 요약 ── */}
            <aside className="wire-right">
              <div className="wire-section-title">
                <h2>{language === 'ko' ? '실시간 속보 피드' : language === 'cn' ? '实时快讯流' : 'LATEST WIRES'}</h2>
                <span style={{ color: '#09a58e', fontWeight: 600 }}>REAL-TIME</span>
              </div>

              {pagedWireList.map((s) => (
                <button
                  className="wire-feed"
                  key={s.title}
                  onClick={() => selectNews(s)}
                  style={{
                    borderBottom: '1px solid #dfe3eb',
                    padding: '12px 0',
                    background: 'transparent',
                    border: 'none',
                    borderBottomStyle: 'solid',
                    borderBottomWidth: '1px',
                    borderBottomColor: '#edf0f2',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <strong
                    className="hover:text-[#f47a20] transition-colors duration-200"
                    style={{ display: 'block', fontSize: '11px', lineHeight: '1.4', marginBottom: '4px' }}
                  >
                    {s.title}
                  </strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9aa2b1' }}>
                    <b style={{ color: '#f47a20', fontWeight: 600 }}>{s.source}</b>
                    <span className={`sentiment ${s.tone}`}>{s.sentiment}</span>
                  </div>
                </button>
              ))}

              {currentNewsList.length > WIRE_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <button
                    type="button"
                    onClick={() => setWirePage((p: number) => Math.max(0, p - 1))}
                    disabled={wirePage === 0}
                    style={{
                      padding: '4px 10px', fontSize: '10px', fontWeight: 600, borderRadius: '4px',
                      border: '1px solid #dfe3eb',
                      background: wirePage === 0 ? '#f1f5f9' : '#fff',
                      color: wirePage === 0 ? '#b6bcc7' : '#334155',
                      cursor: wirePage === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {language === 'ko' ? '이전' : language === 'cn' ? '上一页' : 'PREV'}
                  </button>
                  <span style={{ fontSize: '10px', color: '#9aa2b1', fontWeight: 600 }}>
                    {wirePage + 1} / {totalWirePages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWirePage((p: number) => Math.min(totalWirePages - 1, p + 1))}
                    disabled={wirePage >= totalWirePages - 1}
                    style={{
                      padding: '4px 10px', fontSize: '10px', fontWeight: 600, borderRadius: '4px',
                      border: '1px solid #dfe3eb',
                      background: wirePage >= totalWirePages - 1 ? '#f1f5f9' : '#fff',
                      color: wirePage >= totalWirePages - 1 ? '#b6bcc7' : '#334155',
                      cursor: wirePage >= totalWirePages - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {language === 'ko' ? '다음' : language === 'cn' ? '下一页' : 'NEXT'}
                  </button>
                </div>
              )}

              <div className="wire-sidebar-divider" />
              <h2>{language === 'ko' ? '글로벌 시장 요약' : language === 'cn' ? '全球市场概览' : 'MARKET SUMMARY'}</h2>
              <div className="wire-summary-tabs" style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#7d8593', margin: '10px 0' }}>
                <b style={{ color: '#f47a20' }}>{newsCategoryTabs[0].labels[language]}</b>
                <span>{newsCategoryTabs[1].labels[language]}</span>
                <span>{newsCategoryTabs[2].labels[language]}</span>
              </div>

              {liveAssetTickers.slice(0, 5).map((item) => (
                <div
                  className="wire-summary-row"
                  key={item.symbol}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSearched(item.target)}
                  title={`클릭하여 ${item.name} 차트 및 퀀트 동기화`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img
                      src={item.logo}
                      alt={item.symbol}
                      width={14}
                      height={14}
                      style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span>
                      {language === 'ko' ? item.nameKo : item.name}
                      <small>{item.symbol}</small>
                    </span>
                  </span>
                  <b>{item.price}</b>
                  <strong style={{ color: item.isUp ? '#09a58e' : '#e34f5a' }}>{item.change}</strong>
                </div>
              ))}
            </aside>
          </div>
        </section>
      
    </>
  );
}
