import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { useMarketStore } from '../../store/marketStore'
import { useTradingStore } from '../../store/tradingStore'

interface Zone {
  id: string
  from: Time
  to: Time | null
  entryPrice: number
  stopLoss: number
  takeProfit: number
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT'
  isActive: boolean
}

export const TradingZonesChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const zonesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const markersRef = useRef<any[]>([])
  const { klines, selectedSymbol, ticker } = useMarketStore()
  const { positions } = useTradingStore()
  const [zones, setZones] = useState<Zone[]>([])

  // Создание зон из позиций
  useEffect(() => {
    if (!klines.length) return

    const newZones: Zone[] = positions
      .filter((pos) => pos.symbol === selectedSymbol)
      .map((pos) => {
        const entryTime = Math.floor(pos.openedAt / 1000) as Time
        
        return {
          id: pos.symbol + '_' + pos.openedAt,
          from: entryTime,
          to: null,
          entryPrice: pos.entryPrice,
          stopLoss: pos.stopLoss || 0,
          takeProfit: pos.takeProfit || 0,
          side: pos.side as 'BUY' | 'SELL' | 'LONG' | 'SHORT',
          isActive: true,
        }
      })

    setZones(newZones)
  }, [positions, klines, selectedSymbol])

  // Инициализация графика
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
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1a1a1a',
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
      zonesRef.current.forEach((zone) => chart.removeSeries(zone))
      zonesRef.current.clear()
      chart.remove()
    }
  }, [])

  // Обновление данных свечей
  useEffect(() => {
    if (!seriesRef.current || klines.length === 0) return

    const data = klines.map((k) => ({
      time: (k.openTime / 1000) as Time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }))

    seriesRef.current.setData(data)
    updateMarkers()
  }, [klines, zones])

  // Обновление зон на графике
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || zones.length === 0 || klines.length === 0) return

    const chart = chartRef.current
    const currentPrice = ticker?.lastPrice || klines[klines.length - 1]?.close || 0
    const lastTime = (klines[klines.length - 1]?.openTime / 1000) as Time

    // Удаляем старые зоны
    zonesRef.current.forEach((zone) => chart.removeSeries(zone))
    zonesRef.current.clear()

    zones.forEach((zone) => {
      const isLong = zone.side === 'BUY' || zone.side === 'LONG'
      const zoneEnd = zone.to || lastTime
      const stopLossPrice = zone.stopLoss || (isLong ? zone.entryPrice * 0.98 : zone.entryPrice * 1.02)
      const takeProfitPrice = zone.takeProfit || (isLong ? zone.entryPrice * 1.04 : zone.entryPrice * 0.96)

      // Фильтруем свечи в диапазоне зоны
      const zoneKlines = klines.filter((k) => {
        const time = (k.openTime / 1000) as Time
        return time >= zone.from && time <= zoneEnd
      })

      if (zoneKlines.length === 0) return

      // Проверяем, в какой зоне находится текущая цена
      const isInProfitZone = isLong
        ? currentPrice >= zone.entryPrice && currentPrice <= takeProfitPrice
        : currentPrice <= zone.entryPrice && currentPrice >= takeProfitPrice
      
      const isInLossZone = isLong
        ? currentPrice < zone.entryPrice && currentPrice >= stopLossPrice
        : currentPrice > zone.entryPrice && currentPrice <= stopLossPrice

      // Зона прибыли (зеленая) - используем AreaSeries от entry до takeProfit
      if (isLong ? takeProfitPrice > zone.entryPrice : takeProfitPrice < zone.entryPrice) {
        const profitArea = chart.addAreaSeries({
          lineColor: isLong ? '#22c55e' : '#ef4444',
          topColor: isInProfitZone 
            ? (isLong ? '#22c55e50' : '#ef444450')
            : (isLong ? '#22c55e20' : '#ef444420'),
          bottomColor: 'transparent',
          priceLineVisible: false,
          lastValueVisible: false,
        })

        const profitData = zoneKlines.map((k) => ({
          time: (k.openTime / 1000) as Time,
          value: takeProfitPrice,
        }))
        profitArea.setData(profitData)

        // Создаем нижнюю границу (entry) для визуализации зоны
        const profitBottomArea = chart.addAreaSeries({
          lineColor: isLong ? '#22c55e60' : '#ef444460',
          topColor: 'transparent',
          bottomColor: isInProfitZone
            ? (isLong ? '#22c55e30' : '#ef444430')
            : (isLong ? '#22c55e10' : '#ef444410'),
          priceLineVisible: false,
          lastValueVisible: false,
        })

        const profitBottomData = zoneKlines.map((k) => ({
          time: (k.openTime / 1000) as Time,
          value: zone.entryPrice,
        }))
        profitBottomArea.setData(profitBottomData)

        zonesRef.current.set(zone.id + '_profit_top', profitArea)
        zonesRef.current.set(zone.id + '_profit_bottom', profitBottomArea)

        // Линии границ
        const profitTopLine = chart.addLineSeries({
          color: isLong ? '#22c55e80' : '#ef444480',
          lineWidth: 1,
          lineStyle: 0,
          priceLineVisible: false,
          lastValueVisible: false,
        })
        profitTopLine.setData([
          { time: zone.from, value: takeProfitPrice },
          { time: zoneEnd, value: takeProfitPrice },
        ])
        zonesRef.current.set(zone.id + '_profit_top_line', profitTopLine)
      }

      // Зона убытка (красная) - используем AreaSeries от stopLoss до entry
      if (isLong ? stopLossPrice < zone.entryPrice : stopLossPrice > zone.entryPrice) {
        const lossArea = chart.addAreaSeries({
          lineColor: '#ef4444',
          topColor: 'transparent',
          bottomColor: isInLossZone ? '#ef444450' : '#ef444420',
          priceLineVisible: false,
          lastValueVisible: false,
        })

        const lossData = zoneKlines.map((k) => ({
          time: (k.openTime / 1000) as Time,
          value: stopLossPrice,
        }))
        lossArea.setData(lossData)

        // Создаем верхнюю границу (entry)
        const lossTopArea = chart.addAreaSeries({
          lineColor: '#ef444460',
          topColor: isInLossZone ? '#ef444430' : '#ef444410',
          bottomColor: 'transparent',
          priceLineVisible: false,
          lastValueVisible: false,
        })

        const lossTopData = zoneKlines.map((k) => ({
          time: (k.openTime / 1000) as Time,
          value: zone.entryPrice,
        }))
        lossTopArea.setData(lossTopData)

        zonesRef.current.set(zone.id + '_loss_bottom', lossArea)
        zonesRef.current.set(zone.id + '_loss_top', lossTopArea)

        // Линии границ
        const lossBottomLine = chart.addLineSeries({
          color: '#ef444480',
          lineWidth: 1,
          lineStyle: 0,
          priceLineVisible: false,
          lastValueVisible: false,
        })
        lossBottomLine.setData([
          { time: zone.from, value: stopLossPrice },
          { time: zoneEnd, value: stopLossPrice },
        ])
        zonesRef.current.set(zone.id + '_loss_bottom_line', lossBottomLine)
      }

      // Линия входа
      const entryLine = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        title: 'Entry',
      })

      entryLine.setData([
        { time: zone.from, value: zone.entryPrice },
        { time: zoneEnd, value: zone.entryPrice },
      ])

      zonesRef.current.set(zone.id + '_entry', entryLine)
    })
  }, [zones, klines, ticker])

  const updateMarkers = () => {
    if (!seriesRef.current || !chartRef.current) return

    markersRef.current = []

    zones.forEach((zone) => {
      const marker = {
        time: zone.from,
        position: zone.side === 'BUY' || zone.side === 'LONG' ? 'belowBar' : 'aboveBar',
        color: zone.side === 'BUY' || zone.side === 'LONG' ? '#22c55e' : '#ef4444',
        shape: zone.side === 'BUY' || zone.side === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: zone.side === 'BUY' || zone.side === 'LONG' ? 'LONG' : 'SHORT',
        size: 2,
      }

      markersRef.current.push(marker)
    })

    seriesRef.current.setMarkers(markersRef.current)
  }

  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  )
}
