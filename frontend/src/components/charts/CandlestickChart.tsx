import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts'
import { useMarketStore } from '../../store/marketStore'
import { Kline } from '../../types/market'

export function CandlestickChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const { klines } = useMarketStore()

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#0f0f0f' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true, // Show seconds for real-time updates
        rightOffset: 0, // Auto-scroll to latest candle
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  const prevKlinesRef = useRef<Kline[]>([])

  useEffect(() => {
    if (!seriesRef.current || klines.length === 0) return

    const prevKlines = prevKlinesRef.current
    const hasNewData = prevKlines.length === 0 || 
      klines.length !== prevKlines.length ||
      klines[klines.length - 1].openTime !== prevKlines[prevKlines.length - 1]?.openTime

    if (hasNewData) {
      // Check if it's just the last candle update (same timestamp)
      const isLastCandleUpdate = prevKlines.length > 0 && 
        klines.length === prevKlines.length &&
        klines[klines.length - 1].openTime === prevKlines[prevKlines.length - 1].openTime

      if (isLastCandleUpdate) {
        // Update only the last candle for real-time updates
        const lastCandle = klines[klines.length - 1]
        seriesRef.current.update({
          time: (lastCandle.openTime / 1000) as any,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        })
      } else {
        // Full data update for new candles
        const data = klines.map((k) => ({
          time: (k.openTime / 1000) as any,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }))
        seriesRef.current.setData(data)
        // Auto-scroll to latest candle
        if (chartRef.current) {
          chartRef.current.timeScale().scrollToPosition(-1, false)
        }
      }
      
      prevKlinesRef.current = [...klines]
    }
  }, [klines])

  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  )
}

