import { Card } from '../ui/Card'
import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { IntervalStats as IntervalStatsType } from './IntervalStrategyPanel'

interface IntervalStatsProps {
  stats: IntervalStatsType | null
}

export function IntervalStats({ stats }: IntervalStatsProps) {
  if (!stats) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-white">Статистика</h2>
        </div>
        <div className="text-center text-gray-400 py-4">Нет данных</div>
      </Card>
    )
  }

  const winRate = stats.successfulTrades + stats.failedTrades > 0
    ? (stats.successfulTrades / (stats.successfulTrades + stats.failedTrades) * 100).toFixed(1)
    : '0.0'

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-white">Статистика</h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Активных интервалов</span>
          <span className="text-base font-semibold text-white">
            {Object.keys(stats.activeIntervals).length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Всего пересечений</span>
          <span className="text-base font-semibold text-white">{stats.totalCrosses}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Успешных сделок</span>
          <span className="text-base font-semibold text-profit">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            {stats.successfulTrades}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Неудачных сделок</span>
          <span className="text-base font-semibold text-loss">
            <TrendingDown className="w-4 h-4 inline mr-1" />
            {stats.failedTrades}
          </span>
        </div>
        <div className="pt-3 border-t border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Винрейт</span>
            <span className="text-lg font-bold text-primary-500">{winRate}%</span>
          </div>
          {stats.bestSymbol && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Лучший символ</span>
              <span className="text-sm font-semibold text-white">{stats.bestSymbol}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

