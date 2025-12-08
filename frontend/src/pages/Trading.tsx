import { useState } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { useMarketStore } from '../store/marketStore'
import { useTrading } from '../hooks/useTrading'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { format } from 'date-fns'

export default function Trading() {
  useTrading()
  const { positions, trades, balance } = useTradingStore()
  const { selectedSymbol } = useMarketStore()
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Торговля</h1>
        <p className="text-gray-400 mt-1">Управление позициями и размещение ордеров</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Разместить ордер</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Символ</label>
              <input
                type="text"
                value={selectedSymbol}
                readOnly
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Направление</label>
              <div className="flex gap-2">
                <Button
                  variant={orderSide === 'BUY' ? 'primary' : 'secondary'}
                  onClick={() => setOrderSide('BUY')}
                  className="flex-1"
                >
                  КУПИТЬ
                </Button>
                <Button
                  variant={orderSide === 'SELL' ? 'primary' : 'secondary'}
                  onClick={() => setOrderSide('SELL')}
                  className="flex-1"
                >
                  ПРОДАТЬ
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Количество</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white"
              />
            </div>

            <Button variant="primary" className="w-full" size="lg">
              Разместить {orderSide === 'BUY' ? 'ордер на покупку' : 'ордер на продажу'}
            </Button>
          </div>
        </Card>

        {/* Positions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Открытые позиции</h2>
          <div className="space-y-3">
            {positions.length > 0 ? (
              positions.map((pos, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-bg-tertiary rounded-lg border border-border-primary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{pos.symbol}</span>
                    <span className={`text-sm font-semibold ${pos.side === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                      {pos.side === 'BUY' ? 'ПОКУПКА' : 'ПРОДАЖА'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Вход:</span>
                      <span className="text-white ml-2">${pos.entryPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Кол-во:</span>
                      <span className="text-white ml-2">{pos.quantity.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Прибыль:</span>
                      <span className={`ml-2 ${pos.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Прибыль%:</span>
                      <span className={`ml-2 ${pos.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {pos.pnlPercent >= 0 ? '+' : ''}
                        {pos.pnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">Нет открытых позиций</div>
            )}
          </div>
        </Card>

        {/* Balance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Счет</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Доступный баланс</div>
              <div className="text-2xl font-bold text-white">
                ${balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Всего позиций</div>
              <div className="text-xl font-semibold text-white">{positions.length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Trade History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">История сделок</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-3 px-4 text-sm text-gray-400">Символ</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Направление</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Вход</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Выход</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Количество</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Прибыль</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400">Дата</th>
              </tr>
            </thead>
            <tbody>
              {trades.length > 0 ? (
                trades.slice().reverse().map((trade) => (
                  <tr key={trade.id} className="border-b border-border-primary">
                    <td className="py-3 px-4 text-white">{trade.symbol}</td>
                    <td className={`py-3 px-4 ${trade.side === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                      {trade.side === 'BUY' ? 'ПОКУПКА' : 'ПРОДАЖА'}
                    </td>
                    <td className="py-3 px-4 text-white">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-white">${trade.exitPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-white">{trade.quantity.toFixed(4)}</td>
                    <td className={`py-3 px-4 ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {format(new Date(trade.closedAt), 'd MMM yyyy, HH:mm', { locale: require('date-fns/locale/ru') })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Пока нет сделок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
