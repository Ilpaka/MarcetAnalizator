import { useEffect } from 'react'
import { useBotStore } from '../store/botStore'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

export function useBot() {
  const {
    isRunning,
    setIsRunning,
    symbols,
    timeframes,
    setStats,
  } = useBotStore()

  useEffect(() => {
    const loadBotStats = async () => {
      try {
        const stats = await App.GetBotStats()
        setStats({
          totalTrades: stats.totalTrades || 0,
          winningTrades: stats.winningTrades || 0,
          losingTrades: stats.losingTrades || 0,
          winRate: stats.winRate || 0,
          totalPnL: stats.totalPnL || 0,
          totalPnLPercent: stats.totalPnLPercent || 0,
        })
      } catch (error) {
        console.error('Failed to load bot stats:', error)
      }
    }

    if (isRunning) {
      loadBotStats()
      const intervalId = setInterval(loadBotStats, 5000)
      return () => clearInterval(intervalId)
    }
  }, [isRunning])

  const startBot = async () => {
    try {
      await App.StartBot(symbols, timeframes)
      setIsRunning(true)
    } catch (error) {
      console.error('Failed to start bot:', error)
    }
  }

  const stopBot = async () => {
    try {
      App.StopBot()
      setIsRunning(false)
    } catch (error) {
      console.error('Failed to stop bot:', error)
    }
  }

  return { startBot, stopBot }
}

