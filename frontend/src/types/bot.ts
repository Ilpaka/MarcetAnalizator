export type BotStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR'
export type TradingMode = 'PAPER' | 'LIVE'
export type StrategyType = 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'MOMENTUM' | 'ML_BASED' | 'CUSTOM'

export interface BotConfig {
  symbol: string
  timeframe: string
  mode: TradingMode
  strategy: StrategyType
  riskPerTrade: number // percentage
  maxPositions: number
  stopLossPercent: number
  takeProfitPercent: number
  useMLPredictions: boolean
  useSentiment: boolean
  minSignalStrength: number
}

export interface BotState {
  status: BotStatus
  config: BotConfig
  startedAt?: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  currentDrawdown: number
  lastError?: string
}

export interface BotPerformance {
  equity: number[]
  timestamps: number[]
  trades: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  avgWin: number
  avgLoss: number
}
