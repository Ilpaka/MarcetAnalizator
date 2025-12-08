export type SignalType = 'BUY' | 'SELL' | 'HOLD'
export type SignalSource = 'TECHNICAL' | 'ML' | 'SENTIMENT' | 'ENSEMBLE'

export interface Signal {
  type: SignalType
  strength: number // 0-1
  indicator: string
  reason: string
  timestamp: number
  source: SignalSource
}

export interface MLPrediction {
  direction: 'UP' | 'DOWN' | 'NEUTRAL'
  probability: number
  confidence: number
  expectedMove: number
  modelUsed: string
  timestamp: number
}

export interface MultiTimeframePrediction {
  predictions: Record<string, MLPrediction>
  consensus: {
    direction: 'UP' | 'DOWN'
    alignment: number
    confidence: number
    actionable: boolean
  }
}

export interface TechnicalSignals {
  rsi: Signal
  macd: Signal
  bb: Signal
  ema: Signal
  stochRsi: Signal
  overall: SignalType
  strength: number
}
