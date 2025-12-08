import { useMarketStore } from '../store/marketStore'
import { useTradingStore } from '../store/tradingStore'
import { useMarketData } from '../hooks/useMarketData'
import { useTrading } from '../hooks/useTrading'
import { Card } from '../components/ui/Card'
import { CandlestickChart } from '../components/charts/CandlestickChart'
import { format } from 'date-fns'

export default function Dashboard() {
  useMarketData()
  useTrading()

  const { ticker, selectedSymbol } = useMarketStore()
  const { balance, stats, trades } = useTradingStore()

  const recentTrades = trades.slice(-5).reverse()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Панель управления</h1>
        <p className="text-gray-400 mt-1">
          Обзор торговой производительности и рыночных условий
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Общий баланс</div>
          <div className="text-2xl font-bold text-white">
            ${balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {stats && (
            <div className={`text-sm mt-1 ${stats.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stats.totalPnLPercent >= 0 ? '+' : ''}
              {stats.totalPnLPercent.toFixed(2)}%
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Открытые позиции</div>
          <div className="text-2xl font-bold text-white">{stats?.totalTrades || 0}</div>
          {stats && (
            <div className="text-gray-400 text-sm mt-1">
              {stats.winningTrades} прибыльных, {stats.losingTrades} убыточных
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Прибыль/Убыток за сегодня</div>
          {stats && (
            <>
              <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm mt-1 ${stats.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {stats.totalPnLPercent >= 0 ? '+' : ''}
                {stats.totalPnLPercent.toFixed(2)}%
              </div>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Процент побед</div>
          <div className="text-2xl font-bold text-white">
            {stats?.winRate.toFixed(1) || '0.0'}%
          </div>
          <div className="text-gray-400 text-sm mt-1">За последние 30 дней</div>
        </Card>
      </div>

      {/* Market Price */}
      {ticker && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{selectedSymbol}</h2>
              <div className="text-3xl font-bold text-white">
                ${ticker.lastPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${ticker.priceChangePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {ticker.priceChangePercent >= 0 ? '+' : ''}
                {ticker.priceChangePercent.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {ticker.priceChange >= 0 ? '+' : ''}
                ${ticker.priceChange.toFixed(2)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Обзор рынка</h2>
        <CandlestickChart />
      </Card>

      {/* Recent trades */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Последние сделки</h2>
        <div className="space-y-2">
          {recentTrades.length > 0 ? (
            recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg"
              >
                <div>
                  <div className="font-medium text-white">{trade.symbol}</div>
                  <div className="text-sm text-gray-400">
                    {format(new Date(trade.closedAt), 'd MMM, HH:mm', { locale: require('date-fns/locale/ru') })}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                  <div className={`text-sm ${trade.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {trade.pnlPercent >= 0 ? '+' : ''}
                    {trade.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">Пока нет сделок</div>
          )}
        </div>
      </Card>
    </div>
  )
}
