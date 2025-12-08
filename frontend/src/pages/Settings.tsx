import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useMarketStore } from '../store/marketStore'

export default function Settings() {
  const { selectedSymbol, selectedTimeframe, setSelectedSymbol, setSelectedTimeframe } = useMarketStore()
  const [localSymbol, setLocalSymbol] = useState(selectedSymbol)
  const [localTimeframe, setLocalTimeframe] = useState(selectedTimeframe)

  const handleSave = () => {
    setSelectedSymbol(localSymbol)
    setSelectedTimeframe(localTimeframe)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Настройки</h1>
        <p className="text-gray-400 mt-1">Настройка приложения</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Настройки рынка</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Символ по умолчанию</label>
              <select
                value={localSymbol}
                onChange={(e) => setLocalSymbol(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="ADAUSDT">ADA/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Таймфрейм по умолчанию</label>
              <select
                value={localTimeframe}
                onChange={(e) => setLocalTimeframe(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              >
                <option value="1m">1 минута</option>
                <option value="5m">5 минут</option>
                <option value="15m">15 минут</option>
                <option value="1h">1 час</option>
                <option value="4h">4 часа</option>
                <option value="1d">1 день</option>
              </select>
            </div>

            <Button variant="primary" onClick={handleSave} className="w-full" size="lg">
              Сохранить настройки
            </Button>
          </div>
        </Card>

        {/* Application Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Информация о приложении</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Версия</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Сборка</span>
              <span className="text-white">2024.01.01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Платформа</span>
              <span className="text-white">Windows</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
