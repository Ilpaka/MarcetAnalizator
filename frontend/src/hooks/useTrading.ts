import { useEffect } from 'react'
import { useTradingStore } from '../store/tradingStore'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

export function useTrading() {
  const {
    setBalance,
    setPositions,
    setTrades,
    setStats,
    setLoading,
    setError,
  } = useTradingStore()

  useEffect(() => {
    const loadTradingData = async () => {
      try {
        setLoading(true)
        setError(null)

        const balance = await App.GetBalance()
        setBalance(balance)

        const positions = await App.GetPositions()
        setPositions(positions.map((p: any) => ({
          symbol: p.symbol,
          side: p.side,
          entryPrice: p.entryPrice,
          quantity: p.quantity,
          currentPrice: p.entryPrice,
          pnl: p.unrealizedPnL || 0,
          pnlPercent: p.unrealizedPnLPct || 0,
          openedAt: p.openedAt ? (typeof p.openedAt === 'string' ? new Date(p.openedAt).getTime() : p.openedAt) : Date.now(),
          stopLoss: p.stopLoss,
          takeProfit: p.takeProfit,
        })))

        const trades = await App.GetTradeHistory()
        setTrades(trades.map((t: any) => ({
          id: t.id,
          symbol: t.symbol,
          side: t.side,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          quantity: t.quantity,
          pnl: t.pnl,
          pnlPercent: t.pnlPercent,
          openedAt: t.openedAt ? (typeof t.openedAt === 'string' ? new Date(t.openedAt).getTime() : t.openedAt) : Date.now(),
          closedAt: t.closedAt ? (typeof t.closedAt === 'string' ? new Date(t.closedAt).getTime() : t.closedAt) : Date.now(),
          duration: t.duration,
        })))

        const stats = await App.GetBotStats()
        setStats({
          totalValue: balance,
          availableBalance: balance,
          positionsValue: 0,
          totalPnL: stats.totalPnL || 0,
          totalPnLPercent: stats.totalPnLPercent || 0,
          winRate: stats.winRate || 0,
          totalTrades: stats.totalTrades || 0,
          winningTrades: stats.winningTrades || 0,
          losingTrades: stats.losingTrades || 0,
        })
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load trading data')
      } finally {
        setLoading(false)
      }
    }

    loadTradingData()

    const intervalId = setInterval(loadTradingData, 2000)

    return () => clearInterval(intervalId)
  }, [])
}

