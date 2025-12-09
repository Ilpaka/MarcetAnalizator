import { useEffect } from 'react'
import { useMarketStore } from '../store/marketStore'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

export const useAllTickers = () => {
  const { setAllTickers, setLoading, setError } = useMarketStore()

  useEffect(() => {
    let intervalId: number | null = null

    const loadTickers = async () => {
      try {
        setLoading(true)
        setError(null)

        const tickers = await App.GetAllTickers()
        // Фильтруем только USDT пары и сортируем по объему
        const usdtTickers = tickers
          .filter((t: any) => t.symbol.endsWith('USDT'))
          .sort((a: any, b: any) => b.volume - a.volume)
        
        setAllTickers(usdtTickers)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load tickers')
      } finally {
        setLoading(false)
      }
    }

    loadTickers()
    intervalId = window.setInterval(loadTickers, 5000)

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [setAllTickers, setLoading, setError])
}

