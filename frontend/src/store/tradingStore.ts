import { create } from 'zustand'
import { Position, Trade, PortfolioStats } from '../types/trading'

interface TradingState {
  balance: number
  positions: Position[]
  trades: Trade[]
  stats: PortfolioStats | null
  isLoading: boolean
  error: string | null

  setBalance: (balance: number) => void
  setPositions: (positions: Position[]) => void
  setTrades: (trades: Trade[]) => void
  setStats: (stats: PortfolioStats | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTradingStore = create<TradingState>((set) => ({
  balance: 10000,
  positions: [],
  trades: [],
  stats: null,
  isLoading: false,
  error: null,

  setBalance: (balance) => set({ balance }),
  setPositions: (positions) => set({ positions }),
  setTrades: (trades) => set({ trades }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

