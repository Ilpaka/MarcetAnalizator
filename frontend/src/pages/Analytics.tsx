import { useTradingStore } from '../store/tradingStore'
import { useTrading } from '../hooks/useTrading'
import { Card } from '../components/ui/Card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Analytics() {
  useTrading()
  const { trades, stats } = useTradingStore()

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
