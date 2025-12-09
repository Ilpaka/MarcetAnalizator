import { useState, useEffect, useMemo } from 'react'
import { useMarketStore } from '../../store/marketStore'
import { useTradingStore } from '../../store/tradingStore'
import { refreshTradingData } from '../../hooks/useTrading'
import { Card } from '../ui/Card'
// @ts-ignore
import * as App from '../../../wailsjs/go/main/App'

type OrderSide = 'BUY' | 'SELL'
type OrderType = 'LIMIT' | 'MARKET'

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

export const TradePanel = () => {
  const { ticker, selectedSymbol } = useMarketStore()
  const { balance, positions } = useTradingStore()
  
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('LIMIT')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [orderValue, setOrderValue] = useState('')
  const [sliderValue, setSliderValue] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentPrice = ticker?.lastPrice || 0
  const baseAsset = selectedSymbol.replace('USDT', '')
  
  // Получаем текущую позицию для расчета доступного баланса
  const currentPosition = positions.find(p => p.symbol === selectedSymbol)
  const availableBalance = orderSide === 'BUY' 
    ? balance 
    : (currentPosition ? currentPosition.quantity * currentPosition.entryPrice : 0)

  // Устанавливаем цену по умолчанию при изменении тикера или символа
  useEffect(() => {
    if (currentPrice > 0) {
      if (!price || orderType === 'MARKET') {
        setPrice(currentPrice.toFixed(2))
      }
    }
  }, [currentPrice, selectedSymbol, orderType])

  // Вычисляем Order Value на основе Quantity и Price
  useEffect(() => {
    if (quantity && price) {
      const value = parseFloat(quantity) * parseFloat(price)
      setOrderValue(value.toFixed(2))
    } else {
      setOrderValue('')
    }
  }, [quantity, price])

  // Вычисляем Quantity на основе Order Value и Price
  useEffect(() => {
    if (orderValue && price && !quantity) {
      const qty = parseFloat(orderValue) / parseFloat(price)
      setQuantity(qty.toFixed(8))
    }
  }, [orderValue, price, quantity])

  // Обновляем слайдер при изменении quantity
  useEffect(() => {
    if (availableBalance > 0 && price) {
      const maxQty = availableBalance / parseFloat(price)
      const currentQty = parseFloat(quantity) || 0
      const percent = maxQty > 0 ? (currentQty / maxQty) * 100 : 0
      setSliderValue(Math.min(100, Math.max(0, percent)))
    }
  }, [quantity, availableBalance, price])

  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    if (availableBalance > 0 && price) {
      const maxQty = availableBalance / parseFloat(price)
      const qty = (maxQty * value) / 100
      setQuantity(qty.toFixed(8))
    }
  }

  const handleQuickAmount = (percent: number) => {
    setSliderValue(percent)
    if (availableBalance > 0 && price) {
      const maxQty = availableBalance / parseFloat(price)
      const qty = (maxQty * percent) / 100
      setQuantity(qty.toFixed(8))
    }
  }

  const handleSubmit = async () => {
    if (!price || !quantity || parseFloat(quantity) <= 0) {
      alert('Заполните все поля')
      return
    }

    setIsSubmitting(true)
    try {
      const orderPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price)
      const orderQty = parseFloat(quantity)

      if (orderSide === 'BUY') {
        const cost = orderPrice * orderQty
        if (cost > balance) {
          alert('Недостаточно средств')
          setIsSubmitting(false)
          return
        }
        await App.PlaceOrder(selectedSymbol, 'BUY', orderType, orderPrice, orderQty)
      } else {
        if (!currentPosition || orderQty > currentPosition.quantity) {
          alert('Недостаточно монет для продажи')
          setIsSubmitting(false)
          return
        }
        await App.PlaceOrder(selectedSymbol, 'SELL', orderType, orderPrice, orderQty)
      }

      // Обновляем данные торговли
      refreshTradingData()

      // Сброс формы
      setQuantity('')
      setOrderValue('')
      setSliderValue(0)
      
      // Для лимитных ордеров сбрасываем цену, для рыночных оставляем текущую
      if (orderType === 'LIMIT') {
        setPrice('')
      }
    } catch (error) {
      console.error('Ошибка при размещении ордера:', error)
      alert('Ошибка при размещении ордера: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const maxBuyAmount = useMemo(() => {
    if (!price || availableBalance <= 0) return 0
    return availableBalance / parseFloat(price)
  }, [price, availableBalance])

  return (
    <Card className="flex flex-col h-full p-4 gap-3">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Trade</h3>
      </div>

      {/* Tabs Section */}
      <div className="flex items-center flex-shrink-0">
        <button className="text-sm font-medium text-white border-b-2 border-primary-500 pb-2">
          Spot
        </button>
      </div>

      {/* Buy/Sell Toggle Section */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => setOrderSide('BUY')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
            orderSide === 'BUY'
              ? 'bg-profit text-white shadow-md'
              : 'bg-bg-tertiary text-gray-400 hover:bg-bg-elevated hover:text-white'
          }`}
          tabIndex={0}
          aria-label="Купить"
        >
          Купить
        </button>
        <button
          onClick={() => setOrderSide('SELL')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
            orderSide === 'SELL'
              ? 'bg-loss text-white shadow-md'
              : 'bg-bg-tertiary text-gray-400 hover:bg-bg-elevated hover:text-white'
          }`}
          tabIndex={0}
          aria-label="Продать"
        >
          Продать
        </button>
      </div>

      {/* Order Type Section */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => setOrderType('LIMIT')}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-200 ${
            orderType === 'LIMIT'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-bg-tertiary text-gray-400 hover:bg-bg-elevated hover:text-white'
          }`}
          tabIndex={0}
          aria-label="Лимитный ордер"
        >
          Limit
        </button>
        <button
          onClick={() => setOrderType('MARKET')}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-200 ${
            orderType === 'MARKET'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-bg-tertiary text-gray-400 hover:bg-bg-elevated hover:text-white'
          }`}
          tabIndex={0}
          aria-label="Рыночный ордер"
        >
          Market
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
        {/* Available Balance */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <label className="text-xs text-gray-400">Доступный баланс</label>
          <div className="text-sm text-white font-mono">
            {orderSide === 'BUY' 
              ? `${formatPrice(balance)} USDT`
              : currentPosition 
                ? `${formatQuantity(currentPosition.quantity)} ${baseAsset}`
                : '-- USDT'
            }
          </div>
        </div>

        {/* Price Input */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <label className="text-xs text-gray-400">Цена</label>
          <div className="relative flex">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === 'MARKET'}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-all"
              placeholder="0.00"
              tabIndex={0}
              aria-label="Цена"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              USDT
            </span>
          </div>
          {orderType === 'MARKET' && (
            <div className="text-xs text-gray-500">Рыночная: {formatPrice(currentPrice)}</div>
          )}
        </div>

        {/* Quantity Input */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <label className="text-xs text-gray-400">Количество</label>
          <div className="relative flex">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="0.00"
              tabIndex={0}
              aria-label="Количество"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {baseAsset}
            </span>
          </div>
        </div>

        {/* Percentage Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {[0, 25, 50, 75, 100].map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAmount(val)}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                sliderValue >= val - 5 && sliderValue <= val + 5
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-bg-tertiary text-gray-400 hover:bg-bg-elevated hover:text-white'
              }`}
              tabIndex={0}
              aria-label={`${val}%`}
            >
              {val === 0 ? '0' : val === 100 ? '100%' : `${val}%`}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary-500"
            tabIndex={0}
            aria-label="Процент от доступного баланса"
          />
        </div>

        {/* Order Value */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <label className="text-xs text-gray-400">Сумма ордера</label>
          <div className="relative flex">
            <input
              type="number"
              value={orderValue}
              onChange={(e) => setOrderValue(e.target.value)}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="0.00"
              tabIndex={0}
              aria-label="Сумма ордера"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              USDT
            </span>
          </div>
        </div>

        {/* Max Buying Amount */}
        {orderSide === 'BUY' && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <label className="text-xs text-gray-400">Макс. покупка</label>
            <div className="relative flex">
              <input
                type="text"
                value={maxBuyAmount > 0 ? formatQuantity(maxBuyAmount) : '--'}
                readOnly
                className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-gray-400 font-mono text-sm cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                {baseAsset}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button - Fixed at bottom */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border-primary flex-shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !price || !quantity || parseFloat(quantity) <= 0}
          className={`w-full py-4 px-4 rounded-lg text-base font-bold text-white transition-all duration-200 ${
            orderSide === 'BUY'
              ? 'bg-profit hover:bg-green-600 active:bg-green-700 disabled:bg-gray-600'
              : 'bg-loss hover:bg-red-600 active:bg-red-700 disabled:bg-gray-600'
          } disabled:cursor-not-allowed disabled:opacity-50 ${
            !isSubmitting && price && quantity && parseFloat(quantity) > 0
              ? 'shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              : ''
          }`}
          tabIndex={0}
          aria-label={orderSide === 'BUY' ? 'Купить' : 'Продать'}
        >
          {isSubmitting 
            ? 'Обработка...' 
            : orderSide === 'BUY' 
              ? `Купить ${baseAsset}` 
              : `Продать ${baseAsset}`
          }
        </button>
      </div>
    </Card>
  )
}

