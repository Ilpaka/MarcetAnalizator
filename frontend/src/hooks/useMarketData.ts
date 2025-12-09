import { useEffect, useState } from 'react'
import { useMarketStore } from '../store/marketStore'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

export function useMarketData() {
  const {
    selectedSymbol,
    selectedTimeframe,
    setKlines,
    setTicker,
    setIndicators,
    setLoading,
    setError,
  } = useMarketStore()

  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    let intervalId: number | null = null

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const klines = await App.GetKlines(selectedSymbol, selectedTimeframe, 500)
        setKlines(klines)

        const ticker = await App.GetTicker24h(selectedSymbol)
        setTicker(ticker)

        // Process limit orders when price updates
        if (ticker && ticker.lastPrice > 0) {
          try {
            await App.ProcessOrdersForSymbol(selectedSymbol, ticker.lastPrice)
          } catch (error) {
            console.error('Error processing orders:', error)
          }
        }

        if (klines.length > 0) {
          const lastKline = klines[klines.length - 1]
          const indicators = await App.CalculateIndicators(
            selectedSymbol,
            selectedTimeframe,
            lastKline.high,
            lastKline.low,
            lastKline.close,
            lastKline.volume
          )
          setIndicators(indicators)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load market data')
      } finally {
        setLoading(false)
      }
    }

    loadData()

    if (!isSubscribed) {
      App.SubscribeKline(selectedSymbol.toLowerCase(), selectedTimeframe)
        .then(() => setIsSubscribed(true))
        .catch((err: Error) => setError(err.message))
    }

    intervalId = window.setInterval(loadData, 5000)

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [selectedSymbol, selectedTimeframe, isSubscribed])

  return { isSubscribed }
}

