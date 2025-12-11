import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { PriceInterval } from './IntervalStrategyPanel'
import { useMarketStore } from '../../store/marketStore'

interface IntervalChartProps {
  intervals: PriceInterval[]
}

export function IntervalChart({ intervals }: IntervalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'>[]>([])

  const { klines, selectedSymbol } = useMarketStore()

  // Находим текущий интервал для выбранного символа
  const currentInterval = intervals.find(i => i.symbol === selectedSymbol)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Создаем график
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1d26' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries

    // Resize observer
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return
      const { width, height } = entries[0].contentRect
      chart.applyOptions({ width, height })
    })

    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [])

  // Обновляем свечи
  useEffect(() => {
    if (!candleSeriesRef.current || !klines.length) return

    const formattedData: CandlestickData<Time>[] = klines.map(kline => ({
      time: (kline.openTime / 1000) as Time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
    }))

    candleSeriesRef.current.setData(formattedData)
  }, [klines])

  // Рисуем интервалы
  useEffect(() => {
    if (!chartRef.current || !currentInterval) {
      // Если нет интервала, удаляем все линии
      if (chartRef.current && lineSeriesRef.current.length > 0) {
        lineSeriesRef.current.forEach(series => {
          if (series) {
            try {
              chartRef.current?.removeSeries(series)
            } catch (error) {
              // Игнорируем ошибки при удалении уже удаленных серий
              console.debug('Series already removed:', error)
            }
          }
        })
        lineSeriesRef.current = []
      }
      return
    }

    // Удаляем старые линии (только если они существуют)
    lineSeriesRef.current.forEach(series => {
      if (series && chartRef.current) {
        try {
          chartRef.current.removeSeries(series)
        } catch (error) {
          // Игнорируем ошибки при удалении уже удаленных серий
          console.debug('Series already removed:', error)
        }
      }
    })
    lineSeriesRef.current = []

    // Добавляем линии интервала
    const upperLine = chartRef.current.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 2, // Пунктирная
      title: 'Верхняя граница',
    })

    const lowerLine = chartRef.current.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 2,
      title: 'Нижняя граница',
    })

    const medianLine = chartRef.current.addLineSeries({
      color: '#fbbf24',
      lineWidth: 1,
      lineStyle: 3, // Точечная
      title: 'Медиана',
    })

    // Создаем данные для линий (горизонтальные)
    const nowTimestamp = Math.floor(Date.now() / 1000)
    const pastTimestamp = nowTimestamp - 86400 * 7 // 7 дней назад
    const now = nowTimestamp as Time
    const past = pastTimestamp as Time

    upperLine.setData([
      { time: past, value: currentInterval.upper },
      { time: now, value: currentInterval.upper },
    ])

    lowerLine.setData([
      { time: past, value: currentInterval.lower },
      { time: now, value: currentInterval.lower },
    ])

    medianLine.setData([
      { time: past, value: currentInterval.median },
      { time: now, value: currentInterval.median },
    ])

    lineSeriesRef.current = [upperLine, lowerLine, medianLine]

    return () => {
      lineSeriesRef.current.forEach(series => {
        if (series && chartRef.current) {
          try {
            chartRef.current.removeSeries(series)
          } catch (error) {
            // Игнорируем ошибки при удалении уже удаленных серий
            console.debug('Series already removed in cleanup:', error)
          }
        }
      })
      lineSeriesRef.current = []
    }
  }, [currentInterval])

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Информация об интервале */}
      {currentInterval && (
        <div className="absolute top-4 left-4 bg-bg-secondary/90 backdrop-blur-sm rounded-lg p-3 border border-border-primary">
          <div className="text-xs text-gray-400 mb-2">Интервал {currentInterval.symbol}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Верх:</span>
              <span className="text-profit font-semibold">${currentInterval.upper.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Медиана:</span>
              <span className="text-yellow-400 font-semibold">${currentInterval.median.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Низ:</span>
              <span className="text-loss font-semibold">${currentInterval.lower.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-border-primary">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Ширина:</span>
                <span className="text-white font-semibold">{currentInterval.width.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Пересечений:</span>
                <span className="text-white font-semibold">{currentInterval.crosses}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Волатильность:</span>
                <span className="text-primary-500 font-semibold">{currentInterval.volatility.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

