import { useState, useEffect } from 'react'
import { useBotStore } from '../store/botStore'
import { useBot } from '../hooks/useBot'
import { useMarketStore } from '../store/marketStore'
import { useTradingStore } from '../store/tradingStore'
import { useMarketData } from '../hooks/useMarketData'
import { Card } from '../components/ui/Card'
import { TradingZonesChart } from '../components/charts/TradingZonesChart'
import { Play, Square, Settings, TrendingUp, TrendingDown, Activity } from 'lucide-react'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

const TIMEFRAMES = [
  { label: '1m', value: '1m', description: 'Минутный (для тестов)' },
  { label: '5m', value: '5m', description: '5 минут' },
  { label: '15m', value: '15m', description: '15 минут' },
  { label: '1h', value: '1h', description: '1 час' },
  { label: '4h', value: '4h', description: '4 часа' },
  { label: '1d', value: '1d', description: '1 день' },
]

export default function BotControl() {
  const { isRunning, stats, config, setConfig, timeframes, setTimeframes } = useBotStore()
  const { startBot, stopBot } = useBot()
  const { selectedSymbol, setSelectedTimeframe } = useMarketStore()
  const { positions, balance } = useTradingStore()
  const [localConfig, setLocalConfig] = useState(config)
  const [selectedTradingTimeframe, setSelectedTradingTimeframe] = useState(timeframes[0] || '1m')
  
  // Загружаем данные графика
  useMarketData()

  useEffect(() => {
    // Статистика обновляется через useBot hook
  }, [])

  const handleSaveConfig = async () => {
    try {
      // Сохраняем в локальный state
      setConfig(localConfig)
      
      // Отправляем настройки в backend
      await App.UpdateBotConfig(
        localConfig.riskPerTrade,
        localConfig.maxPositionSize,
        localConfig.minConfidence,
        localConfig.maxDailyTrades,
        localConfig.cooldownMinutes
      )
      
      // Показываем уведомление об успешном сохранении
      alert('Настройки успешно сохранены!')
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('Ошибка при сохранении настроек: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    }
  }

  const handleStartBot = async () => {
    await startBot()
  }

  const handleStopBot = async () => {
    await stopBot()
  }

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTradingTimeframe(timeframe)
    setTimeframes([timeframe])
    setSelectedTimeframe(timeframe)
  }

  const activePositions = positions.filter((p) => p.symbol === selectedSymbol)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-secondary flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Управление ботом</h1>
          <p className="text-sm text-gray-400 mt-1">Настройка и мониторинг автономного торгового бота</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isRunning ? 'bg-profit/20 text-profit' : 'bg-gray-500/20 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-profit animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-semibold">
              {isRunning ? 'Работает' : 'Остановлен'}
            </span>
          </div>
          {isRunning ? (
            <button
              onClick={handleStopBot}
              className="flex items-center gap-2 px-4 py-2 bg-loss hover:bg-red-600 text-white rounded-lg transition-colors"
              tabIndex={0}
              aria-label="Остановить бота"
            >
              <Square className="w-4 h-4" />
              Остановить
            </button>
          ) : (
            <button
              onClick={handleStartBot}
              className="flex items-center gap-2 px-4 py-2 bg-profit hover:bg-green-600 text-white rounded-lg transition-colors"
              tabIndex={0}
              aria-label="Запустить бота"
            >
              <Play className="w-4 h-4" />
              Запустить
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Sidebar - Settings */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Trading Timeframe Selection */}
          <Card className="p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-white">Таймфрейм торговли</h2>
            </div>
            <div className="space-y-2">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => handleTimeframeChange(tf.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                    selectedTradingTimeframe === tf.value
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-bg-tertiary text-gray-300 hover:bg-bg-elevated'
                  }`}
                  tabIndex={0}
                  aria-label={`Выбрать таймфрейм ${tf.label}`}
                >
                  <div className="font-semibold">{tf.label}</div>
                  <div className="text-xs opacity-75">{tf.description}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Bot Statistics */}
          <Card className="p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-white">Статистика</h2>
            </div>
            <div className="space-y-3">
              {stats ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Всего сделок</span>
                    <span className="text-base font-semibold text-white">{stats.totalTrades}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Процент побед</span>
                    <span className="text-base font-semibold text-white">{stats.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Прибыльных</span>
                    <span className="text-base font-semibold text-profit">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      {stats.winningTrades}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Убыточных</span>
                    <span className="text-base font-semibold text-loss">
                      <TrendingDown className="w-4 h-4 inline mr-1" />
                      {stats.losingTrades}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Общая прибыль</span>
                      <span className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Прибыль %</span>
                      <span className={`text-base font-semibold ${stats.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {stats.totalPnLPercent >= 0 ? '+' : ''}
                        {stats.totalPnLPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-4">Нет данных</div>
              )}
            </div>
          </Card>

          {/* Bot Configuration */}
          <Card className="p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-white">Настройки</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">Риск на сделку (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={localConfig.riskPerTrade * 100}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      riskPerTrade: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  tabIndex={0}
                  aria-label="Риск на сделку"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Макс. размер позиции (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={localConfig.maxPositionSize * 100}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      maxPositionSize: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  tabIndex={0}
                  aria-label="Максимальный размер позиции"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Мин. уверенность</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={localConfig.minConfidence}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      minConfidence: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  tabIndex={0}
                  aria-label="Минимальная уверенность"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Макс. сделок в день</label>
                <input
                  type="number"
                  min="1"
                  value={localConfig.maxDailyTrades}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      maxDailyTrades: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  tabIndex={0}
                  aria-label="Максимум сделок в день"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Охлаждение (минуты)</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.cooldownMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      cooldownMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  tabIndex={0}
                  aria-label="Охлаждение между сделками"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-semibold"
                tabIndex={0}
                aria-label="Сохранить настройки"
              >
                Сохранить настройки
              </button>
            </div>
          </Card>

          {/* Active Positions */}
          {activePositions.length > 0 && (
            <Card className="p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white mb-4">Активные позиции</h2>
              <div className="space-y-2">
                {activePositions.map((pos) => (
                  <div
                    key={pos.symbol + '_' + pos.openedAt}
                    className="p-3 bg-bg-tertiary rounded-lg border border-border-primary"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        {pos.symbol.replace('USDT', '/USDT')}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        (pos.side === 'BUY' || (pos as any).side === 'LONG') 
                          ? 'bg-profit/20 text-profit' 
                          : 'bg-loss/20 text-loss'
                      }`}>
                        {(pos.side === 'BUY' || (pos as any).side === 'LONG') ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Вход:</span>
                        <span className="text-white">${pos.entryPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">PnL:</span>
                        <span className={pos.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <Card className="flex-1 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {selectedSymbol.replace('USDT', '/USDT')} - Торговые зоны
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Баланс: ${balance.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TradingZonesChart />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
