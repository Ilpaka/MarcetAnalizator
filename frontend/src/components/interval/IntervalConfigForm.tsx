import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Settings, Shield, Activity, Zap, Flame } from 'lucide-react'
import { IntervalConfig } from './IntervalStrategyPanel'
// @ts-ignore
import * as App from '../../../wailsjs/go/main/App'

type IntervalRiskPreset = 'safe' | 'normal' | 'risky' | 'meat'

interface IntervalRiskPresetConfig {
  name: string
  description: string
  icon: any
  color: string
  stopLossPercent: number
  maxPositionsCount: number
  preferredPositionPrice: number
  maxPositionPrice: number
}

const INTERVAL_RISK_PRESETS: Record<IntervalRiskPreset, IntervalRiskPresetConfig> = {
  safe: {
    name: 'Безопасный',
    description: 'Консервативная торговля',
    icon: Shield,
    color: 'text-blue-400',
    stopLossPercent: 1.0,
    maxPositionsCount: 2,
    preferredPositionPrice: 500,
    maxPositionPrice: 2000,
  },
  normal: {
    name: 'Нормальный',
    description: 'Сбалансированный подход',
    icon: Activity,
    color: 'text-green-400',
    stopLossPercent: 1.5,
    maxPositionsCount: 3,
    preferredPositionPrice: 1000,
    maxPositionPrice: 5000,
  },
  risky: {
    name: 'Рискованный',
    description: 'Агрессивная торговля',
    icon: Zap,
    color: 'text-yellow-400',
    stopLossPercent: 2.0,
    maxPositionsCount: 5,
    preferredPositionPrice: 2000,
    maxPositionPrice: 10000,
  },
  meat: {
    name: 'Мясо',
    description: 'Максимальная активность',
    icon: Flame,
    color: 'text-red-400',
    stopLossPercent: 3.0,
    maxPositionsCount: 10,
    preferredPositionPrice: 3000,
    maxPositionPrice: 15000,
  },
}

interface IntervalConfigFormProps {
  config: IntervalConfig
  onChange: (config: IntervalConfig) => void
}

const TIMEFRAMES = [
  { value: '1m', label: '1 минута' },
  { value: '5m', label: '5 минут' },
  { value: '15m', label: '15 минут' },
  { value: '30m', label: '30 минут' },
  { value: '1h', label: '1 час' },
  { value: '4h', label: '4 часа' },
  { value: '1d', label: '1 день' },
]

const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT',
  'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT', 'LTCUSDT',
]

export function IntervalConfigForm({ config, onChange }: IntervalConfigFormProps) {
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(POPULAR_SYMBOLS)
  const [selectedPreset, setSelectedPreset] = useState<IntervalRiskPreset | null>(null)

  const applyPreset = (presetKey: IntervalRiskPreset) => {
    const preset = INTERVAL_RISK_PRESETS[presetKey]
    onChange({
      ...config,
      stopLossPercent: preset.stopLossPercent,
      maxPositionsCount: preset.maxPositionsCount,
      preferredPositionPrice: preset.preferredPositionPrice,
      maxPositionPrice: preset.maxPositionPrice,
    })
    setSelectedPreset(presetKey)
  }

  useEffect(() => {
    // Загружаем список доступных символов
    const loadSymbols = async () => {
      try {
        const tickers = await App.GetAllTickers()
        const symbols = tickers
          .map((t: any) => t.symbol)
          .filter((s: string) => s.endsWith('USDT'))
          .sort()
        if (symbols.length > 0) {
          setAvailableSymbols(symbols)
        }
      } catch (error) {
        console.error('Failed to load symbols:', error)
      }
    }
    loadSymbols()
  }, [])

  // Конвертируем период в минуты в удобный формат
  const getPeriodDisplay = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`
    if (minutes < 1440) return `${Math.round(minutes / 60)} ч`
    return `${Math.round(minutes / 1440)} дн`
  }

  const periodMinutes = config.periodMinutesToAnalyze || 7 * 24 * 60
  const periodType = periodMinutes < 60 ? 'minutes' : periodMinutes < 1440 ? 'hours' : 'days'
  const periodValue = periodType === 'minutes' ? periodMinutes : periodType === 'hours' ? Math.round(periodMinutes / 60) : Math.round(periodMinutes / 1440)

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-white">Настройки стратегии</h2>
      </div>
      
      {/* Пресеты риска */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">Пресеты риска</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(INTERVAL_RISK_PRESETS) as IntervalRiskPreset[]).map((presetKey) => {
            const preset = INTERVAL_RISK_PRESETS[presetKey]
            const Icon = preset.icon
            const isSelected = selectedPreset === presetKey
            return (
              <button
                key={presetKey}
                onClick={() => applyPreset(presetKey)}
                className={`p-2 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-border-primary bg-bg-tertiary hover:border-primary-500/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`w-3.5 h-3.5 ${preset.color}`} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {preset.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400 leading-tight">{preset.description}</div>
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Выбор символа */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Криптовалюта</label>
          <select
            value={config.symbol || 'BTCUSDT'}
            onChange={(e) => onChange({ ...config, symbol: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Выбор таймфрейма */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Таймфрейм</label>
          <select
            value={config.timeframe || '1h'}
            onChange={(e) => onChange({ ...config, timeframe: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        {/* Период анализа */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Период анализа ({getPeriodDisplay(periodMinutes)})
          </label>
          <div className="flex gap-2">
            <select
              value={periodType}
              onChange={(e) => {
                const newType = e.target.value
                let newMinutes = periodMinutes
                if (newType === 'minutes') {
                  newMinutes = Math.min(periodMinutes, 59)
                } else if (newType === 'hours') {
                  if (periodType === 'minutes') {
                    newMinutes = Math.max(60, periodMinutes)
                  } else if (periodType === 'days') {
                    newMinutes = Math.max(60, Math.min(periodMinutes, 23 * 60))
                  }
                } else {
                  newMinutes = Math.max(1440, periodMinutes)
                }
                onChange({ ...config, periodMinutesToAnalyze: newMinutes })
              }}
              className="w-24 px-2 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="minutes">Минуты</option>
              <option value="hours">Часы</option>
              <option value="days">Дни</option>
            </select>
            <input
              type="number"
              min="1"
              max={periodType === 'minutes' ? 59 : periodType === 'hours' ? 23 : 30}
              value={periodValue}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                let newMinutes = value
                if (periodType === 'hours') {
                  newMinutes = value * 60
                } else if (periodType === 'days') {
                  newMinutes = value * 1440
                }
                onChange({ ...config, periodMinutesToAnalyze: newMinutes })
              }}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Мин. ширина коридора (%)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            value={config.minProfitPercent}
            onChange={(e) => onChange({ ...config, minProfitPercent: parseFloat(e.target.value) || 0.2 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Макс. ширина коридора (%)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={config.maxProfitPercent}
            onChange={(e) => onChange({ ...config, maxProfitPercent: parseFloat(e.target.value) || 0.6 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Метод анализа</label>
          <select
            value={config.analysisMethod}
            onChange={(e) => onChange({ ...config, analysisMethod: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={0}>Полный перебор</option>
            <option value={1}>Медиана + расширение</option>
            <option value={2}>Статистические процентили</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Stop-loss (%)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={config.stopLossPercent}
            onChange={(e) => onChange({ ...config, stopLossPercent: parseFloat(e.target.value) || 1.5 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Макс. позиций</label>
          <input
            type="number"
            min="1"
            max="10"
            value={config.maxPositionsCount}
            onChange={(e) => onChange({ ...config, maxPositionsCount: parseInt(e.target.value) || 3 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Размер позиции (USDT)</label>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={config.preferredPositionPrice}
            onChange={(e) => onChange({ ...config, preferredPositionPrice: parseFloat(e.target.value) || 1000 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Пересчет интервалов (часы)</label>
          <input
            type="number"
            min="1"
            max="24"
            value={config.recalculateIntervalHours}
            onChange={(e) => onChange({ ...config, recalculateIntervalHours: parseInt(e.target.value) || 6 })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </Card>
  )
}
