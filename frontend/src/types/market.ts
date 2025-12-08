export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

export interface Ticker {
  symbol: string
  priceChange: number
  priceChangePercent: number
  lastPrice: number
  volume: number
  quoteVolume: number
}

export interface IndicatorValues {
  ema9: number
  ema21: number
  ema50: number
  ema200: number
  rsi14: number
  rsi7: number
  macdLine: number
  macdSignal: number
  macdHist: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbPercentB: number
  atr14: number
  stochRsiK: number
  stochRsiD: number
  obv: number
}

export interface ChartData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  indicators?: IndicatorValues
}
