import { Card } from '../ui/Card'
import { PriceInterval } from './IntervalStrategyPanel'

interface ActiveIntervalsProps {
  intervals: PriceInterval[]
}

export function ActiveIntervals({ intervals }: ActiveIntervalsProps) {
  if (intervals.length === 0) {
    return (
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Активные интервалы</h2>
        <div className="text-center text-gray-400 py-4">Нет активных интервалов</div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Активные интервалы</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {intervals.map((interval) => (
          <div
            key={interval.symbol}
            className="p-3 bg-bg-tertiary rounded-lg border border-border-primary"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                {interval.symbol.replace('USDT', '/USDT')}
              </span>
              <span className="text-xs px-2 py-1 bg-primary-600/20 text-primary-400 rounded">
                Активен
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Верх:</span>
                <span className="text-profit font-semibold">${interval.upper.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Медиана:</span>
                <span className="text-yellow-400 font-semibold">${interval.median.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Низ:</span>
                <span className="text-loss font-semibold">${interval.lower.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-border-primary mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ширина:</span>
                  <span className="text-white font-semibold">{interval.width.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Волатильность:</span>
                  <span className="text-primary-500 font-semibold">{interval.volatility.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

