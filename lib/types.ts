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

