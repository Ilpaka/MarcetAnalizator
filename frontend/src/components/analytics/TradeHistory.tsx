import { useMarketStore } from '../../store/marketStore'
import { useTradingStore, Order } from '../../store/tradingStore'
import { Trade } from '../../types/trading'
import { refreshTradingData } from '../../hooks/useTrading'
import { Card } from '../ui/Card'
import { X } from 'lucide-react'
// @ts-ignore
import * as App from '../../../wailsjs/go/main/App'

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

const formatTime = (timestamp: number): string => {
  if (!timestamp) return '--'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const handleCancelOrder = async (orderId: string) => {
  try {
    await App.CancelOrder(orderId)
    refreshTradingData()
  } catch (error) {
    console.error('Ошибка при отмене ордера:', error)
    alert('Ошибка при отмене ордера')
  }
}

// Тип для объединения Order и Trade
type TradeHistoryItem = (Order & { type: 'order' }) | (Trade & { type: 'trade' })

const getItemTime = (item: TradeHistoryItem): number => {
  if (item.type === 'order') {
    return item.filledAt || 0
  } else {
    return item.closedAt || 0
  }
}

export const TradeHistory = () => {
  const { selectedSymbol } = useMarketStore()
  const { orders, trades } = useTradingStore()

  // Фильтруем ордера и сделки для выбранного символа
  const symbolOrders = orders.filter(o => o.symbol === selectedSymbol)
  const symbolTrades = trades.filter(t => t.symbol === selectedSymbol)

  // Открытые лимитные ордера
  const openOrders = symbolOrders.filter(o => 
    (o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED')
  )

  // Закрытые сделки (выполненные ордера и закрытые позиции)
  const closedTrades: TradeHistoryItem[] = [
    ...symbolOrders.filter(o => o.status === 'FILLED').map(o => ({ ...o, type: 'order' as const })),
    ...symbolTrades.map(t => ({ ...t, type: 'trade' as const }))
  ].sort((a, b) => {
    const aTime = getItemTime(a)
    const bTime = getItemTime(b)
    return bTime - aTime
  })

  if (!selectedSymbol) {
    return (
      <Card className="p-3 h-full flex items-center justify-center">
        <div className="text-gray-400 text-xs">Выберите торговую пару</div>
      </Card>
    )
  }

  return (
    <Card className="p-3 h-full flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-white mb-3 flex-shrink-0">История сделок</h3>
      
      {/* Open Orders Section */}
      {openOrders.length > 0 && (
        <div className="mb-3 flex-shrink-0">
          <div className="text-[10px] text-gray-400 mb-1.5">Открытые лимитные ордера</div>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {openOrders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-12 gap-1.5 py-1 px-2 bg-bg-tertiary rounded text-[10px] border border-border-primary"
              >
                <div className={`col-span-2 text-right font-mono truncate ${order.side === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                  {order.side === 'BUY' ? 'КУП' : 'ПРОД'}
                </div>
                <div className="col-span-2 text-right text-white font-mono truncate">
                  {formatPrice(order.price)}
                </div>
                <div className="col-span-2 text-right text-gray-300 font-mono truncate">
                  {formatQuantity(order.quantity)}
                </div>
                <div className="col-span-2 text-right text-gray-400 font-mono truncate">
                  {formatQuantity(order.filledQty)}
                </div>
                <div className="col-span-3 text-right text-gray-500 font-mono truncate">
                  {formatTime(order.createdAt)}
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="p-0.5 hover:bg-bg-elevated rounded transition-colors"
                    tabIndex={0}
                    aria-label="Отменить ордер"
                  >
                    <X className="w-3 h-3 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 gap-1.5 pb-1.5 border-b border-border-primary text-[10px] text-gray-400 font-medium flex-shrink-0">
        <div className="col-span-2 text-right">Тип</div>
        <div className="col-span-2 text-right">Цена</div>
        <div className="col-span-2 text-right">Кол-во</div>
        <div className="col-span-2 text-right">Сумма</div>
        <div className="col-span-4 text-right">Время</div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div className="space-y-0">
          {closedTrades.length > 0 ? (
            closedTrades.map((item) => {
              const isOrder = item.type === 'order'
              const isBuy = item.side === 'BUY' || item.side === 'LONG'
              const price = isOrder ? item.price : (item.exitPrice || item.entryPrice)
              const quantity = item.quantity
              const time = getItemTime(item)
              
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-1.5 py-0.5 text-[10px] border-b border-border-primary hover:bg-bg-tertiary transition-colors"
                >
                  <div className={`col-span-2 text-right font-mono truncate ${isBuy ? 'text-profit' : 'text-loss'}`}>
                    {isBuy ? 'КУП' : 'ПРОД'}
                  </div>
                  <div className={`col-span-2 text-right font-mono truncate ${isBuy ? 'text-profit' : 'text-loss'}`}>
                    {formatPrice(price)}
                  </div>
                  <div className="col-span-2 text-right text-gray-300 font-mono truncate">
                    {formatQuantity(quantity)}
                  </div>
                  <div className="col-span-2 text-right text-gray-400 font-mono truncate">
                    {formatQuantity(price * quantity)}
                  </div>
                  <div className="col-span-4 text-right text-gray-500 font-mono truncate">
                    {formatTime(time)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
              Нет сделок
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
