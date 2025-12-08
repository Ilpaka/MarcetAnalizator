import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Backtest() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleStartBacktest = () => {
    setIsRunning(true)
    setTimeout(() => {
      setIsRunning(false)
      setResults({
        totalTrades: 150,
        winRate: 65.3,
        totalPnL: 1250.50,
        sharpeRatio: 1.85,
        maxDrawdown: -8.2,
      })
    }, 3000)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Бэктест</h1>
        <p className="text-gray-400 mt-1">Тестирование торговых стратегий на исторических данных</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backtest Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Настройки</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Символ</label>
              <select className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white">
                <option>BTCUSDT</option>
                <option>ETHUSDT</option>
                <option>BNBUSDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Таймфрейм</label>
              <select className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white">
                <option>1h</option>
                <option>4h</option>
                <option>1d</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Дата начала</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Дата окончания</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Начальный баланс</label>
              <input
                type="number"
                defaultValue={10000}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleStartBacktest}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? 'Запуск бэктеста...' : 'Запустить бэктест'}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {results && (
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-white">Результаты</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Всего сделок</div>
                <div className="text-2xl font-bold text-white">{results.totalTrades}</div>
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Процент побед</div>
                <div className="text-2xl font-bold text-profit">{results.winRate}%</div>
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Общая прибыль</div>
                <div className="text-2xl font-bold text-profit">
                  +${results.totalPnL.toFixed(2)}
                </div>
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-gray-400 text-sm mb-1">Коэффициент Шарпа</div>
                <div className="text-2xl font-bold text-white">{results.sharpeRatio}</div>
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg col-span-2">
                <div className="text-gray-400 text-sm mb-1">Максимальная просадка</div>
                <div className="text-2xl font-bold text-loss">{results.maxDrawdown}%</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
