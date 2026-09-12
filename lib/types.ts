export type ActionType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface QuantitativeSignal {
  symbol: string;
  currentPrice: number;
  rsi: number;
  rsiStatus: string;
  goldenCross: boolean;
  deadCross: boolean;
  sma20: number;
  sma50: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  suggestedAction: ActionType;
  quantScore: number;
  vwap?: number;
  atr?: number;
  atrTrailingStop?: number;
  orderbookImbalance?: number;
  fundingRate?: number;
  signalsSummary: string[];
}

export interface QualitativeInsight {
  symbol: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  confidence: number;
  macroSummary: string;
  keyHeadlines: string[];
  riskFactors: string;
}

export interface PatternInsight {
  patternName: string;
  mostSimilarPeriod: string;
  similarityScore: number;
  historicalWinRate: number;
  expectedReturn5Day: number;
  patternSummary: string;
  ghostHistoryPrices?: number[];
  ghostFuturePrices?: number[];
}

export interface PersonaAdvice {
  warrenBuffett: string;
  jimSimons: string;
  rayDalio: string;
}

export interface IntegratedDecisionReport {
  symbol: string;
  finalAction: ActionType;
  totalScore: number;
  divergenceRisk: string;
  decisionReason: string;
  quantSignal: QuantitativeSignal;
  qualInsight: QualitativeInsight;
  patternInsight: PatternInsight;
  agentReflection: string;
  personaAdvice: PersonaAdvice;
  generatedAt: string;
}

export interface CandleData {
  timestamp: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PredictionLeaderboardItem {
  rank: number;
  userId: number;
  nickname: string;
  walletAddress?: string;
  tier: string;
  currentStreak: number;
  maxStreak: number;
  winRatePct: number;
  totalPredictions: number;
  wonPredictions: number;
  totalEarnedTokens: number;
}

export interface HiveMindBattle {
  symbol: string;
  aiConfidenceScore: number;
  aiDecision: string;
  humanBullPercentage: number;
  humanBearPercentage: number;
  totalHumanVotes: number;
  winningSide: string;
  battleCommentary: string;
}

export interface ArenaStrategyItem {
  id: number;
  name: string;
  authorNickname: string;
  season: string;
  totalReturnPct: number;
  profitFactor: number;
  winRatePct: number;
  maxDrawdownPct: number;
  copyCount: number;
  entryRules: string;
  exitRules: string;
}

export interface SocialLoginRequest {
  provider: 'NAVER' | 'KAKAO' | 'GOOGLE' | 'APPLE' | 'METAMASK';
  providerId: string;
  nickname?: string;
  email?: string;
  walletAddress?: string | null;
  avatarUrl?: string;
  idToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: number;
  username?: string;
  nickname?: string;
  walletAddress?: string;
  reputationScore?: number;
  tokenBalance?: number;
  role?: string;
  accessToken?: string;
}

export interface ExpertProfile {
  userId: number;
  username: string;
  nickname: string;
  walletAddress?: string;
  reputationScore: number;
  role: string;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  score?: string | number;
  posts?: number;
  tone?: string;
  lastSignal?: string;
}

export interface FollowResponse {
  success: boolean;
  message: string;
  following: boolean;
  followerCount: number;
  followingCount: number;
  targetReputationScore: number;
}

export interface RichNewsItem {
  id: string;
  symbol: string;
  category: 'ALL' | 'CRYPTO' | 'KOREA' | 'US_TECH' | 'MACRO';
  categoryLabel: string;
  title: string;
  snippet: string;
  source: string;
  timestamp: string;
  imageUrl: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  impact: 'HIGH' | 'MED' | 'LOW';
  impactPercent: number;
  link?: string;
}

// ── 혁신 기능 2: 3인 AI 투자의견 토론 (Debate Arena) ──
export interface DebateMessage {
  personaId: string;
  name: string;
  title: string;
  avatar: string;
  stance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  content: string;
  metrics: string[];
  targetPrice?: string;
}

export interface AiDebateResponse {
  symbol: string;
  timestamp: string;
  consensusScore: number;
  consensusVerdict: string;
  bullRatio: number;
  bearRatio: number;
  suggestedAction: string;
  keyTakeaway: string;
  recommendedTrailingStop?: number;
  targetPriceRange?: string;
  dialogue: DebateMessage[];
}

// ── 혁신 기능 3: 비전 차트 즉시 스캔 (Vision Chart Scan) ──
export interface VisionChartAnalysisRequest {
  imageBase64: string;
  symbol?: string;
  timeFrame?: string;
  prompt?: string;
}

export interface VisionChartAnalysisResponse {
  success: boolean;
  symbol: string;
  analysisMarkdown: string;
  identifiedPatterns: string[];
  technicalVerdict: string;
  supportPrice?: number;
  resistancePrice?: number;
  currentPrice?: number;
  modelUsed?: string;
  processingTimeMs?: number;
  analyzedAt?: string;
}

// ── 혁신 기능 4: 노코드 퀀트 파라미터 오토튜너 & 1-클릭 복사 ──
export interface AutoTuneResult {
  rank: number;
  label: string;
  config: any;
  backtest: any;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  grossReturn: number;
  totalTrades: number;
}

export interface AutoTuneResponse {
  symbol: string;
  optimizationMetric: string;
  evaluatedCount: number;
  bestConfig: any;
  bestSharpeRatio: number;
  bestWinRate: number;
  bestProfitFactor: number;
  bestMaxDrawdown: number;
  bestTotalReturn: number;
  topCandidates: AutoTuneResult[];
  oneClickBotConfigJson: string;
  tuningSummary: string;
}

// ── AI 코파일럿: 전략 연구·검증 (Strategy Research & Validation) ──
export type StrategyArchetypeKey =
  | 'TREND_FOLLOWING'
  | 'MEAN_REVERSION'
  | 'BREAKOUT'
  | 'RSI_STANDALONE'
  | 'VWAP_TREND'
  | 'MACD_CROSSOVER'
  | 'MA_RIBBON'
  | 'BOLLINGER_SQUEEZE_BREAKOUT'
  | 'ATR_VOLATILITY_BREAKOUT'
  | 'MULTI_BOTTOM_BREAKOUT'
  | 'GARTLEY_222';

export interface StrategyCandidateView {
  archetype: StrategyArchetypeKey;
  label: string;
  metricsReliable: boolean;
  reliabilityNote: string;
  /** 추천(승자) 후보에서 제외된 사유. 표본 부족/워크포워드 비일관 등으로 제외되지 않았으면 null/undefined. */
  exclusionReason?: string | null;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalCostPct: number;
  outOfSampleTrades: number;
  outOfSampleWinRate: number;
  walkForwardSegments: number;
  walkForwardReliableSegments: number;
  walkForwardProfitableSegments: number;
  walkForwardConsistent: boolean;
  robust: boolean;
}

export interface StrategyResearchResult {
  symbol: string;
  timeframe: string;
  candidates: StrategyCandidateView[];
  failureReason?: string | null;
  recommendedArchetype?: StrategyArchetypeKey | null;
  narrative?: string | null;
}

// ── AI 코파일럿: 포지션 코파일럿 (Position Copilot) ──
export interface CopilotWorkspaceResponse {
  openPositionCount: number;
  positions: any[];
  summaryText?: string;
}

export interface InvalidationAlert {
  symbol?: string;
  message?: string;
  [key: string]: any;
}

