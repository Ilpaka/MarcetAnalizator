import { create } from 'zustand'

interface BotState {
  isRunning: boolean
  isEnabled: boolean
  symbols: string[]
  timeframes: string[]
  config: {
    riskPerTrade: number
    maxPositionSize: number
    minConfidence: number
    maxDailyTrades: number
    cooldownMinutes: number
  }
  stats: {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    totalPnL: number
    totalPnLPercent: number
  } | null

  setIsRunning: (running: boolean) => void
  setIsEnabled: (enabled: boolean) => void
  setSymbols: (symbols: string[]) => void
  setTimeframes: (timeframes: string[]) => void
  setConfig: (config: Partial<BotState['config']>) => void
  setStats: (stats: BotState['stats']) => void
  setTradingTimeframe: (timeframe: string) => void
}

export const useBotStore = create<BotState>((set) => ({
  isRunning: false,
  isEnabled: false,
  symbols: ['BTCUSDT'],
  timeframes: ['5m', '15m', '1h'],
  config: {
    riskPerTrade: 0.05,      // Увеличено для более активной торговли
    maxPositionSize: 0.2,    // Увеличено
    minConfidence: 0.3,      // Снижено для большего количества сделок
    maxDailyTrades: 20,      // Увеличено
    cooldownMinutes: 2,      // Уменьшено для более частых сделок
  },
  stats: null,

  setIsRunning: (isRunning) => set({ isRunning }),
  setIsEnabled: (isEnabled) => set({ isEnabled }),
  setSymbols: (symbols) => set({ symbols }),
  setTimeframes: (timeframes) => set({ timeframes }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  setStats: (stats) => set({ stats }),
  setTradingTimeframe: (timeframe) => set({ timeframes: [timeframe] }),
}))

