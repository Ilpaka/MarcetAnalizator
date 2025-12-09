import { create } from 'zustand'
import { Position, Trade, PortfolioStats } from '../types/trading'

export interface Order {
  id: string
  symbol: string
  side: string
  type: string
  price: number
  quantity: number
  filledQty: number
  status: string
  createdAt: number
  filledAt: number
  cancelledAt: number
}

interface TradingState {
  balance: number
  positions: Position[]
  trades: Trade[]
  orders: Order[]
  stats: PortfolioStats | null
  isLoading: boolean
  error: string | null

  setBalance: (balance: number) => void
  setPositions: (positions: Position[]) => void
  setTrades: (trades: Trade[]) => void
  setOrders: (orders: Order[]) => void
  setStats: (stats: PortfolioStats | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTradingStore = create<TradingState>((set) => ({
  balance: 50000,
  positions: [],
  trades: [],
  orders: [],
  stats: null,
  isLoading: false,
  error: null,

  setBalance: (balance) => set({ balance }),
  setPositions: (positions) => set({ positions }),
  setTrades: (trades) => set({ trades }),
  setOrders: (orders) => set({ orders }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))

