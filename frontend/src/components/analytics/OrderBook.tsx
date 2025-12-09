import { useMarketStore } from '../../store/marketStore'
import { Card } from '../ui/Card'

interface OrderBookEntry {
  price: number
  quantity: number
  total: number
}

// Mock data - в реальном приложении это должно приходить с бэкенда
const generateMockOrderBook = (currentPrice: number): { bids: OrderBookEntry[], asks: OrderBookEntry[] } => {
  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []
  
  let bidPrice = currentPrice * 0.999
  let askPrice = currentPrice * 1.001
  let bidTotal = 0
  let askTotal = 0

  for (let i = 0; i < 20; i++) {
    const bidQty = Math.random() * 10 + 0.1
    const askQty = Math.random() * 10 + 0.1
    
    bidTotal += bidQty
    askTotal += askQty

    bids.push({
      price: bidPrice,
      quantity: bidQty,
      total: bidTotal,
    })

    asks.push({
      price: askPrice,
      quantity: askQty,
      total: askTotal,
    })

    bidPrice *= 0.9995
    askPrice *= 1.0005
  }

  return { bids: bids.reverse(), asks }
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

export const OrderBook = () => {
  const { ticker } = useMarketStore()
  
  if (!ticker) {
    return (
      <Card className="p-4 h-full flex items-center justify-center">
        <div className="text-gray-400">Выберите торговую пару</div>
      </Card>
    )
  }

  const { bids, asks } = generateMockOrderBook(ticker.lastPrice)
  const maxTotal = Math.max(
    bids[bids.length - 1]?.total || 0,
    asks[asks.length - 1]?.total || 0
  )

  return (
    <Card className="p-3 h-full flex flex-col overflow-hidden">
      <h3 className="text-sm font-semibold text-white mb-3 flex-shrink-0">Стакан заявок</h3>
      
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="grid grid-cols-12 gap-1.5 pb-1.5 border-b border-border-primary text-[10px] text-gray-400 font-medium flex-shrink-0">
          <div className="col-span-4 text-right">Цена</div>
          <div className="col-span-4 text-right">Кол-во</div>
          <div className="col-span-4 text-right">Всего</div>
        </div>

        {/* Asks (Продажи) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <div className="space-y-0">
            {asks.map((ask, index) => {
              const widthPercent = (ask.total / maxTotal) * 100
              return (
                <div
                  key={`ask-${index}`}
                  className="relative grid grid-cols-12 gap-1.5 py-0.5 text-[10px] hover:bg-bg-tertiary cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  aria-label={`Продажа по цене ${ask.price}`}
                >
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-loss/20"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="col-span-4 text-right text-loss font-mono relative z-10 truncate">
                    {formatPrice(ask.price)}
                  </div>
                  <div className="col-span-4 text-right text-gray-300 font-mono relative z-10 truncate">
                    {formatQuantity(ask.quantity)}
                  </div>
                  <div className="col-span-4 text-right text-gray-400 font-mono relative z-10 truncate">
                    {formatQuantity(ask.total)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Price */}
        <div className="py-2 border-y border-border-primary my-1.5 flex-shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">Текущая цена</div>
            <div className="text-base font-bold text-white font-mono">
              {formatPrice(ticker.lastPrice)}
            </div>
            <div className={`text-xs mt-0.5 ${ticker.priceChangePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {ticker.priceChangePercent >= 0 ? '+' : ''}
              {ticker.priceChangePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Bids (Покупки) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <div className="space-y-0">
            {bids.map((bid, index) => {
              const widthPercent = (bid.total / maxTotal) * 100
              return (
                <div
                  key={`bid-${index}`}
                  className="relative grid grid-cols-12 gap-1.5 py-0.5 text-[10px] hover:bg-bg-tertiary cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  aria-label={`Покупка по цене ${bid.price}`}
                >
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-profit/20"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="col-span-4 text-right text-profit font-mono relative z-10 truncate">
                    {formatPrice(bid.price)}
                  </div>
                  <div className="col-span-4 text-right text-gray-300 font-mono relative z-10 truncate">
                    {formatQuantity(bid.quantity)}
                  </div>
                  <div className="col-span-4 text-right text-gray-400 font-mono relative z-10 truncate">
                    {formatQuantity(bid.total)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}

