import { useState, useEffect } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { useTrading } from '../hooks/useTrading'
import { useMarketStore } from '../store/marketStore'
import { Card } from '../components/ui/Card'
import { Settings } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

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

export default function Analytics() {
  useTrading()
  const { trades, stats } = useTradingStore()
  const { selectedSymbol, selectedTimeframe, setSelectedSymbol, setSelectedTimeframe } = useMarketStore()
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(POPULAR_SYMBOLS)

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

  const equityData = trades.reduce((acc, trade, idx) => {
    const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 10000
    const newValue = prevValue + trade.pnl
    acc.push({
      trade: idx + 1,
      value: newValue,
    })
    return acc
  }, [] as { trade: number; value: number }[])

  const dailyPnL = trades.reduce((acc, trade) => {
    const date = new Date(trade.closedAt).toLocaleDateString('ru-RU')
    if (!acc[date]) {
      acc[date] = 0
    }
    acc[date] += trade.pnl
    return acc
  }, {} as Record<string, number>)

  const dailyPnLData = Object.entries(dailyPnL)
    .map(([date, pnl]) => ({ date, pnl }))
    .slice(-30)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Аналитика</h1>
        <p className="text-gray-400 mt-1">Детальный анализ производительности и статистика</p>
      </div>

      {/* Настройки стратегии */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-white">Настройки стратегии</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Выбор криптовалюты */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Криптовалюта</label>
            <select
              value={selectedSymbol || 'BTCUSDT'}
              onChange={(e) => setSelectedSymbol(e.target.value)}
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
              value={selectedTimeframe || '1h'}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Кривая капитала</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="trade" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
              />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Daily P&L */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Дневная прибыль/убыток</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyPnLData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
              />
              <Bar dataKey="pnl" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Всего сделок</div>
            <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
          </Card>

          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Прибыльных сделок</div>
            <div className="text-2xl font-bold text-profit">{stats.winningTrades}</div>
          </Card>

          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Убыточных сделок</div>
            <div className="text-2xl font-bold text-loss">{stats.losingTrades}</div>
          </Card>

          <Card className="p-6">
            <div className="text-gray-400 text-sm mb-1">Процент побед</div>
            <div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
          </Card>
        </div>
      )}
    </div>
  )
}
