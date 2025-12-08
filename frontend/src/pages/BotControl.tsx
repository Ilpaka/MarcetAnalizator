import { useState } from 'react'
import { useBotStore } from '../store/botStore'
import { useBot } from '../hooks/useBot'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function BotControl() {
  const { isRunning, stats, config, setConfig } = useBotStore()
  const { startBot, stopBot } = useBot()
  const [localConfig, setLocalConfig] = useState(config)

  const handleSaveConfig = () => {
    setConfig(localConfig)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Управление ботом</h1>
        <p className="text-gray-400 mt-1">Настройка и управление автономным торговым ботом</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Статус бота</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Статус:</span>
              <span className={`font-semibold ${isRunning ? 'text-profit' : 'text-gray-400'}`}>
                {isRunning ? 'Работает' : 'Остановлен'}
              </span>
            </div>

            {stats && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Всего сделок:</span>
                  <span className="text-white font-semibold">{stats.totalTrades}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Процент побед:</span>
                  <span className="text-white font-semibold">{stats.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Общая прибыль:</span>
                  <span className={`font-semibold ${stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Прибыль %:</span>
                  <span className={`font-semibold ${stats.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {stats.totalPnLPercent >= 0 ? '+' : ''}
                    {stats.totalPnLPercent.toFixed(2)}%
                  </span>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-border-primary">
              {isRunning ? (
                <Button variant="danger" onClick={stopBot} className="w-full" size="lg">
                  Остановить бота
                </Button>
              ) : (
                <Button variant="primary" onClick={startBot} className="w-full" size="lg">
                  Запустить бота
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Bot Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Настройки</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Риск на сделку (%)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.riskPerTrade * 100}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    riskPerTrade: parseFloat(e.target.value) / 100,
                  })
                }
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Макс. размер позиции (%)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.maxPositionSize * 100}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    maxPositionSize: parseFloat(e.target.value) / 100,
                  })
                }
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Мин. уверенность</label>
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
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Макс. сделок в день</label>
              <input
                type="number"
                value={localConfig.maxDailyTrades}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    maxDailyTrades: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Охлаждение (минуты)</label>
              <input
                type="number"
                value={localConfig.cooldownMinutes}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    cooldownMinutes: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <Button variant="primary" onClick={handleSaveConfig} className="w-full" size="lg">
              Сохранить настройки
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
