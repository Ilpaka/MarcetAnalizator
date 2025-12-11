import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { IntervalConfigForm } from './IntervalConfigForm'
import { IntervalChart } from './IntervalChart'
import { IntervalStats } from './IntervalStats'
import { ActiveIntervals } from './ActiveIntervals'
import { Play, Square, BarChart3, Activity } from 'lucide-react'
import { useMarketStore } from '../../store/marketStore'
import { useMarketData } from '../../hooks/useMarketData'
// @ts-ignore
import * as App from '../../../wailsjs/go/main/App'
// @ts-ignore
import { interval } from '../../../wailsjs/go/models'

export interface IntervalConfig {
  symbol: string // Выбранный символ для анализа и торговли
  timeframe: string // Таймфрейм для анализа (1m, 5m, 15m, 1h, 4h, 1d)
  periodMinutesToAnalyze: number // Период анализа в минутах
  symbols: string[] // Deprecated - для обратной совместимости
  daysToAnalyze: number // Deprecated - для обратной совместимости
  minProfitPercent: number
  maxProfitPercent: number
  topInstrumentsCount: number
  analysisMethod: number // 0=SIMPLEST, 1=BEST_WIDTH, 2=MATH_STAT
  lowPercentile: number
  highPercentile: number
  stopLossPercent: number
  maxPositionsCount: number
  preferredPositionPrice: number
  maxPositionPrice: number
  recalculateIntervalHours: number
}

// Используем типы из models вместо локальных определений
export type PriceInterval = interval.PriceInterval
export type IntervalStats = interval.IntervalStats

interface IntervalStrategyPanelProps {
  onSwitchToTechnical?: () => void
}

export function IntervalStrategyPanel({ onSwitchToTechnical }: IntervalStrategyPanelProps = {}) {
  const [isRunning, setIsRunning] = useState(false)
  const [isStarting, setIsStarting] = useState(false) // Защита от множественных кликов
  const { selectedSymbol, selectedTimeframe, setSelectedSymbol, setSelectedTimeframe } = useMarketStore()
  
  // Загружаем данные для выбранного символа и таймфрейма
  useMarketData()
  
  const [config, setConfig] = useState<IntervalConfig>({
    symbol: selectedSymbol || 'BTCUSDT',
    timeframe: selectedTimeframe || '1h',
    periodMinutesToAnalyze: 7 * 24 * 60, // 7 дней в минутах по умолчанию
    symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'], // Для обратной совместимости
    daysToAnalyze: 7, // Для обратной совместимости
    minProfitPercent: 0.2,
    maxProfitPercent: 0.6,
    topInstrumentsCount: 1, // Всегда 1, так как анализируем только один символ
    analysisMethod: 1, // BEST_WIDTH
    lowPercentile: 25,
    highPercentile: 75,
    stopLossPercent: 1.5,
    maxPositionsCount: 3,
    preferredPositionPrice: 1000,
    maxPositionPrice: 5000,
    recalculateIntervalHours: 6,
  })

  // Синхронизируем конфигурацию с выбранным символом и таймфреймом из store
  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== config.symbol) {
      setConfig(prev => ({ ...prev, symbol: selectedSymbol }))
    }
    if (selectedTimeframe && selectedTimeframe !== config.timeframe) {
      setConfig(prev => ({ ...prev, timeframe: selectedTimeframe }))
    }
  }, [selectedSymbol, selectedTimeframe])

  // Обновляем store при изменении конфигурации
  useEffect(() => {
    if (config.symbol && config.symbol !== selectedSymbol) {
      setSelectedSymbol(config.symbol)
    }
    if (config.timeframe && config.timeframe !== selectedTimeframe) {
      setSelectedTimeframe(config.timeframe)
    }
  }, [config.symbol, config.timeframe])
  const [stats, setStats] = useState<IntervalStats | null>(null)
  const [intervals, setIntervals] = useState<PriceInterval[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, intervalsData] = await Promise.all([
          App.GetIntervalStats(),
          App.GetActiveIntervals(),
        ])
        // Преобразуем данные из models в нужный формат
        setStats(statsData as any)
        setIntervals(Object.values(intervalsData) as any)
      } catch (error) {
        console.error('Failed to load interval data:', error)
      }
    }

    loadData()
    const intervalId = setInterval(loadData, 5000)
    return () => clearInterval(intervalId)
  }, [])

  // Проверяем статус стратегии при монтировании
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const stats = await App.GetIntervalStats()
        // Если есть активные интервалы, значит стратегия работает
        setIsRunning(Object.keys(stats.activeIntervals || {}).length > 0)
      } catch (error) {
        console.error('Failed to check strategy status:', error)
      }
    }
    checkStatus()
  }, [])

  const handleStart = async () => {
    // Защита от множественных кликов
    if (isStarting || isRunning) {
      console.log('Strategy is already starting or running, ignoring click')
      return
    }

    setIsStarting(true)
    
    try {
      console.log('=== STARTING INTERVAL STRATEGY ===')
      console.log('Config:', JSON.stringify(config, null, 2))
      
      // Проверяем наличие символов
      if (!config.symbols || config.symbols.length === 0) {
        alert('Ошибка: не выбраны символы для торговли')
        setIsStarting(false)
        return
      }
      
      // Преобразуем локальный конфиг в простой объект для передачи
      const intervalConfigData = {
        symbol: config.symbol || selectedSymbol || 'BTCUSDT',
        timeframe: config.timeframe || selectedTimeframe || '1h',
        periodMinutesToAnalyze: config.periodMinutesToAnalyze || (7 * 24 * 60),
        symbols: [config.symbol || selectedSymbol || 'BTCUSDT'], // Для обратной совместимости
        daysToAnalyze: config.daysToAnalyze || 7, // Для обратной совместимости
        minProfitPercent: config.minProfitPercent || 0.2,
        maxProfitPercent: config.maxProfitPercent || 0.6,
        topInstrumentsCount: 1, // Всегда 1
        analysisMethod: config.analysisMethod || 1,
        lowPercentile: config.lowPercentile || 25,
        highPercentile: config.highPercentile || 75,
        stopLossPercent: config.stopLossPercent || 1.5,
        maxPositionsCount: config.maxPositionsCount || 3,
        preferredPositionPrice: config.preferredPositionPrice || 1000,
        maxPositionPrice: config.maxPositionPrice || 5000,
        recalculateIntervalHours: config.recalculateIntervalHours || 6,
      }
      
      // Обновляем выбранный символ и таймфрейм в store
      setSelectedSymbol(intervalConfigData.symbol)
      setSelectedTimeframe(intervalConfigData.timeframe)
      
      console.log('Sending interval config to backend:', intervalConfigData)
      
      // Используем createFrom для правильного создания объекта
      const intervalConfig = interval.IntervalConfig.createFrom(intervalConfigData)
      
      console.log('Created interval config object:', intervalConfig)
      console.log('Calling App.StartIntervalStrategy...')
      
      // Добавляем таймаут для вызова метода
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: метод не ответил за 30 секунд')), 30000)
      })
      
      // Вызываем метод с обработкой ошибок и таймаутом
      const result = await Promise.race([
        App.StartIntervalStrategy(intervalConfig),
        timeoutPromise
      ]) as any
      
      console.log('StartIntervalStrategy returned:', result)
      
      console.log('Strategy started successfully, updating UI...')
      setIsRunning(true)
      setIsStarting(false)
      
      // Обновляем данные после запуска
      setTimeout(async () => {
        try {
          console.log('Fetching stats and intervals...')
          const [statsData, intervalsData] = await Promise.all([
            App.GetIntervalStats(),
            App.GetActiveIntervals(),
          ])
          console.log('Stats:', statsData)
          console.log('Intervals:', intervalsData)
          setStats(statsData as any)
          setIntervals(Object.values(intervalsData) as any)
        } catch (error) {
          console.error('Failed to refresh data:', error)
        }
      }, 2000)
    } catch (error) {
      console.error('=== ERROR STARTING STRATEGY ===')
      console.error('Error type:', typeof error)
      console.error('Error:', error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert('Ошибка запуска стратегии: ' + errorMessage + '\n\nПроверьте консоль (F12) и логи бэкенда для подробностей.')
      setIsRunning(false)
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    try {
      await App.StopIntervalStrategy()
      setIsRunning(false)
    } catch (error) {
      console.error('Failed to stop strategy:', error)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-secondary flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Интервальная стратегия</h1>
          <p className="text-sm text-gray-400 mt-1">
            Торговля в ценовых коридорах - покупка на нижней границе, продажа на верхней
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Strategy Type Toggle */}
          {onSwitchToTechnical && (
            <div className="flex bg-bg-tertiary rounded-lg p-1">
              <button
                onClick={onSwitchToTechnical}
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
              >
                <Activity className="w-4 h-4" />
                Техническая
              </button>
              <button
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 bg-primary-600 text-white"
              >
                <BarChart3 className="w-4 h-4" />
                Интервальная
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            {/* Status */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isRunning ? 'bg-profit/20 text-profit' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-profit animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-semibold">{isRunning ? 'Активна' : 'Остановлена'}</span>
            </div>

            {/* Control Button */}
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-loss hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Остановить
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isStarting 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-profit hover:bg-green-600 text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                {isStarting ? 'Запуск...' : 'Запустить'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Sidebar - Config & Stats */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          <IntervalConfigForm config={config} onChange={setConfig} />
          <IntervalStats stats={stats} />
          <ActiveIntervals intervals={intervals} />
        </div>

        {/* Center - Chart */}
        <div className="flex-1 min-w-0">
          <Card className="h-full p-4 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4">График торговли</h2>
            <div className="flex-1 min-h-0">
              <IntervalChart intervals={intervals} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

