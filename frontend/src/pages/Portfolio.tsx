import { useEffect, useState } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { Card } from '../components/ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

interface Holding {
  symbol: string
  baseAsset: string
  quantity: number
  entryPrice: number
  currentPrice: number
  value: number
  unrealizedPnL: number
  unrealizedPnLPct: number
}

const formatPrice = (price: number): string => {
  if (price >= 1) {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return price.toFixed(8)
}

const formatQuantity = (qty: number): string => {
  if (qty >= 1000) {
    return qty.toFixed(2)
  }
  if (qty >= 1) {
    return qty.toFixed(4)
  }
  return qty.toFixed(8)
}

export default function Portfolio() {
  const { balance } = useTradingStore()
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalPnL, setTotalPnL] = useState(0)
  const [totalPnLPct, setTotalPnLPct] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true)
        const portfolio = await App.GetPortfolio()
        
        const holdingsList = (portfolio.holdings as any[]).map((h: any) => ({
          symbol: h.symbol,
          baseAsset: h.baseAsset,
          quantity: h.quantity,
          entryPrice: h.entryPrice,
          currentPrice: h.currentPrice,
          value: h.value,
          unrealizedPnL: h.unrealizedPnL,
          unrealizedPnLPct: h.unrealizedPnLPct,
        }))

        setHoldings(holdingsList)

        const total = holdingsList.reduce((sum, h) => sum + h.value, 0) + (portfolio.balance as number)
        const totalPnLValue = holdingsList.reduce((sum, h) => sum + h.unrealizedPnL, 0)
        const initialBalance = 50000
        const totalPnLPctValue = ((total - initialBalance) / initialBalance) * 100

        setTotalValue(total)
        setTotalPnL(totalPnLValue)
        setTotalPnLPct(totalPnLPctValue)
      } catch (error) {
        console.error('Ошибка при загрузке портфеля:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPortfolio()
    const interval = setInterval(loadPortfolio, 5000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Загрузка портфеля...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Портфель</h1>
        <p className="text-gray-400 mt-1">Обзор ваших активов и позиций</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Общая стоимость</div>
          <div className="text-2xl font-bold text-white">
            ${formatPrice(totalValue)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Доступный баланс</div>
          <div className="text-2xl font-bold text-white">
            ${formatPrice(balance)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Нереализованная прибыль/убыток</div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
          </div>
          <div className={`text-sm mt-1 ${totalPnLPct >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPnLPct >= 0 ? '+' : ''}
            {totalPnLPct.toFixed(2)}%
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-gray-400 text-sm mb-1">Активных позиций</div>
          <div className="text-2xl font-bold text-white">{holdings.length}</div>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Мои активы</h2>
        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-3 px-4 text-sm text-gray-400">Актив</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Количество</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Цена входа</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Текущая цена</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Стоимость</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Прибыль/Убыток</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-400">Прибыль %</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const isPositive = holding.unrealizedPnL >= 0
                  return (
                    <tr key={holding.symbol} className="border-b border-border-primary hover:bg-bg-tertiary transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{holding.baseAsset}</div>
                        <div className="text-xs text-gray-400">{holding.symbol}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        {formatQuantity(holding.quantity)}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        ${formatPrice(holding.entryPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        ${formatPrice(holding.currentPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        ${formatPrice(holding.value)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${isPositive ? 'text-profit' : 'text-loss'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {isPositive ? '+' : ''}${formatPrice(holding.unrealizedPnL)}
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${isPositive ? 'text-profit' : 'text-loss'}`}>
                        {isPositive ? '+' : ''}
                        {holding.unrealizedPnLPct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <div className="text-lg mb-2">Портфель пуст</div>
            <div className="text-sm">Начните торговлю на странице Dashboard</div>
          </div>
        )}
      </Card>
    </div>
  )
}

