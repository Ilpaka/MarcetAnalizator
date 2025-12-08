import { create } from 'zustand'
import { Kline, Ticker, IndicatorValues } from '../types/market'

interface MarketState {
  selectedSymbol: string
  selectedTimeframe: string
  klines: Kline[]
  ticker: Ticker | null
  indicators: IndicatorValues | null
  isLoading: boolean
  error: string | null
  
  setSelectedSymbol: (symbol: string) => void
  setSelectedTimeframe: (timeframe: string) => void
  setKlines: (klines: Kline[]) => void
  setTicker: (ticker: Ticker | null) => void
  setIndicators: (indicators: IndicatorValues | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedSymbol: 'BTCUSDT',
  selectedTimeframe: '1h',
  klines: [],
  ticker: null,
  indicators: null,
  isLoading: false,
  error: null,

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setKlines: (klines) => set({ klines }),
  setTicker: (ticker) => set({ ticker }),
  setIndicators: (indicators) => set({ indicators }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

