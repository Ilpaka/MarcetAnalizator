export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT'
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'

export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  status: OrderStatus
  timestamp: number
  filledPrice?: number
  filledAt?: number
}

export interface Position {
  symbol: string
  side: OrderSide
  entryPrice: number
  quantity: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  openedAt: number
  stopLoss?: number
  takeProfit?: number
}

export interface Trade {
  id: string
  symbol: string
  side: OrderSide
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  openedAt: number
  closedAt: number
  duration: number
}

export interface PortfolioStats {
  totalValue: number
  availableBalance: number
  positionsValue: number
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
}
