/**
 * Dashboard page component - main trading interface.
 * Displays market data, charts, order book, trade history, and trading controls.
 */
import { useMarketStore } from '../store/marketStore'
import { useTradingStore } from '../store/tradingStore'
import { useMarketData } from '../hooks/useMarketData'
import { useAllTickers } from '../hooks/useAllTickers'
import { useTrading } from '../hooks/useTrading'
import { Card } from '../components/ui/Card'
import { CandlestickChart } from '../components/charts/CandlestickChart'
import { MarketList } from '../components/analytics/MarketList'
import { OrderBook } from '../components/analytics/OrderBook'
import { TradeHistory } from '../components/analytics/TradeHistory'
import { TradePanel } from '../components/trading/TradePanel'
import { BarChart3 } from 'lucide-react'

// Available timeframe options for chart display
const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
]

/**
 * Dashboard component - main trading interface page.
 * Automatically loads market data, tickers, and trading information on mount.
 */
export default function Dashboard() {
  useMarketData()
  useAllTickers()
  useTrading()

  const { ticker, selectedSymbol, selectedTimeframe, setSelectedTimeframe, setSelectedSymbol } = useMarketStore()
  const { balance, stats } = useTradingStore()

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Minimal Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {ticker && (
            <div className="text-xs">
              <span className="text-gray-400">{selectedSymbol.replace('USDT', '/USDT')}</span>
              <span className="ml-2 text-white font-semibold">${ticker.lastPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`ml-1.5 text-[10px] ${ticker.priceChangePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {ticker.priceChangePercent >= 0 ? '+' : ''}
                {ticker.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  selectedTimeframe === tf.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-bg-elevated'
                }`}
                tabIndex={0}
                aria-label={`Выбрать таймфрейм ${tf.label}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Balance */}
          <div className="text-xs">
            <span className="text-gray-400">Баланс:</span>
            <span className="ml-1.5 text-white font-semibold">
              ${balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {stats && (
              <span className={`ml-1 text-[10px] ${stats.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                ({stats.totalPnLPercent >= 0 ? '+' : ''}
                {stats.totalPnLPercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left Sidebar - Market List */}
        <div className="w-72 flex-shrink-0">
          <MarketList onSymbolSelect={handleSymbolSelect} />
        </div>

        {/* Center - Chart and Trade History */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <Card className="flex-1 p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {selectedSymbol.replace('USDT', '/USDT')}
              </h2>
            </div>
            <div className="flex-1 min-h-0">
              <CandlestickChart />
            </div>
          </Card>

          {/* Bottom - Trade History */}
          <div className="h-56 flex-shrink-0">
            <TradeHistory />
          </div>
        </div>

        {/* Right Sidebar - Trade Panel and Order Book */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          {/* Trade Panel */}
          <div className="h-[520px] flex-shrink-0">
            <TradePanel />
          </div>

          {/* Order Book */}
          <div className="flex-1 min-h-0">
            <OrderBook />
          </div>
        </div>
      </div>
    </div>
  )
}
