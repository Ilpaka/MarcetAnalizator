import { useState, useMemo } from 'react'
import { useMarketStore } from '../../store/marketStore'
import { Search, TrendingUp, TrendingDown } from 'lucide-react'

type SortField = 'symbol' | 'lastPrice' | 'priceChangePercent' | 'volume'
type SortDirection = 'asc' | 'desc'

const formatPrice = (price: number): string => {
  if (price >= 1) {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return price.toFixed(8)
}

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`
  }
  return volume.toFixed(2)
}

interface MarketListProps {
  onSymbolSelect?: (symbol: string) => void
}

export const MarketList = ({ onSymbolSelect }: MarketListProps) => {
  const { allTickers, selectedSymbol, setSelectedSymbol } = useMarketStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('volume')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAndSortedTickers = useMemo(() => {
    let filtered = allTickers.filter((ticker) => {
      const matchesSearch = ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })

    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case 'symbol':
          aValue = a.symbol
          bValue = b.symbol
          break
        case 'lastPrice':
          aValue = a.lastPrice
          bValue = b.lastPrice
          break
        case 'priceChangePercent':
          aValue = a.priceChangePercent
          bValue = b.priceChangePercent
          break
        case 'volume':
          aValue = a.volume
          bValue = b.volume
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return filtered
  }, [allTickers, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
    onSymbolSelect?.(symbol)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <TrendingUp className="w-3 h-3 ml-1" />
    ) : (
      <TrendingDown className="w-3 h-3 ml-1" />
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-border-primary">
      {/* Header */}
      <div className="p-3 border-b border-border-primary flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            tabIndex={0}
            aria-label="Поиск торговых пар"
          />
        </div>
        <div className="text-xs text-gray-500">
          Всего: {filteredAndSortedTickers.length}
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-1.5 px-3 py-1.5 text-[10px] text-gray-400 border-b border-border-primary font-medium flex-shrink-0">
        <div 
          className="col-span-3 flex items-center cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('symbol')}
          tabIndex={0}
          role="button"
          aria-label="Сортировать по символу"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSort('symbol')
            }
          }}
        >
          Пара
          <SortIcon field="symbol" />
        </div>
        <div 
          className="col-span-2 text-right flex items-center justify-end cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('lastPrice')}
          tabIndex={0}
          role="button"
          aria-label="Сортировать по цене"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSort('lastPrice')
            }
          }}
        >
          Цена
          <SortIcon field="lastPrice" />
        </div>
        <div 
          className="col-span-2 text-right flex items-center justify-end cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('priceChangePercent')}
          tabIndex={0}
          role="button"
          aria-label="Сортировать по изменению"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSort('priceChangePercent')
            }
          }}
        >
          Изменение
          <SortIcon field="priceChangePercent" />
        </div>
        <div 
          className="col-span-5 text-right flex items-center justify-end cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('volume')}
          tabIndex={0}
          role="button"
          aria-label="Сортировать по объему"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSort('volume')
            }
          }}
        >
          Объем (24ч)
          <SortIcon field="volume" />
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredAndSortedTickers.length > 0 ? (
          filteredAndSortedTickers.map((ticker) => {
            const isSelected = ticker.symbol === selectedSymbol
            const isPositive = ticker.priceChangePercent >= 0

            return (
              <div
                key={ticker.symbol}
                onClick={() => handleSymbolClick(ticker.symbol)}
                className={`grid grid-cols-12 gap-1.5 px-3 py-1.5 text-xs border-b border-border-primary cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-primary-900/30 hover:bg-primary-900/40' 
                    : 'hover:bg-bg-tertiary'
                }`}
                tabIndex={0}
                role="button"
                aria-label={`Выбрать пару ${ticker.symbol}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSymbolClick(ticker.symbol)
                  }
                }}
              >
                <div className="col-span-3 font-medium text-white truncate">
                  {ticker.symbol.replace('USDT', '/USDT')}
                </div>
                <div className="col-span-2 text-right text-white font-mono text-[11px] truncate">
                  {formatPrice(ticker.lastPrice)}
                </div>
                <div className={`col-span-2 text-right font-mono text-[11px] ${isPositive ? 'text-profit' : 'text-loss'}`}>
                  {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
                </div>
                <div className="col-span-5 text-right text-gray-400 font-mono text-[11px] truncate">
                  {formatVolume(ticker.volume)}
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400">
            Нет данных
          </div>
        )}
      </div>
    </div>
  )
}

