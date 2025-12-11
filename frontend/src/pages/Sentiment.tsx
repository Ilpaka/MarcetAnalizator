import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'
import { FearGreedIndex } from '../types/sentiment'

// Функция для валидации и приведения classification к нужному типу
const validateClassification = (classification: string): FearGreedIndex['classification'] => {
  const validClassifications: FearGreedIndex['classification'][] = [
    'Extreme Fear',
    'Fear',
    'Neutral',
    'Greed',
    'Extreme Greed',
  ]
  
  if (validClassifications.includes(classification as FearGreedIndex['classification'])) {
    return classification as FearGreedIndex['classification']
  }
  
  // Если значение не соответствует ожидаемым, возвращаем 'Neutral' по умолчанию
  return 'Neutral'
}

export default function Sentiment() {
  const [fearGreedIndex, setFearGreedIndex] = useState<FearGreedIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFearGreedIndex = async () => {
      try {
        setLoading(true)
        setError(null)
        const index = await App.GetFearGreedIndex()
        if (index) {
          // Обработка timestamp - может быть объектом time.Time из Go или строкой
          let timestamp = Date.now()
          if (index.timestamp) {
            try {
              if (typeof index.timestamp === 'string') {
                timestamp = new Date(index.timestamp).getTime()
              } else if (typeof index.timestamp === 'object' && index.timestamp !== null) {
                // Если это объект time.Time из Go (может иметь поле seconds или другие поля)
                const ts = index.timestamp as any
                if (ts.seconds !== undefined) {
                  timestamp = ts.seconds * 1000 + (ts.nanos || 0) / 1000000
                } else if (ts.Seconds !== undefined) {
                  timestamp = ts.Seconds * 1000 + (ts.Nanos || 0) / 1000000
                } else {
                  // Попробуем преобразовать через JSON
                  const jsonStr = JSON.stringify(index.timestamp)
                  const parsed = JSON.parse(jsonStr)
                  if (parsed) {
                    timestamp = new Date(parsed).getTime() || Date.now()
                  }
                }
              } else if (typeof index.timestamp === 'number') {
                timestamp = index.timestamp
              }
            } catch (e) {
              console.warn('Failed to parse timestamp:', e)
              timestamp = Date.now()
            }
          }
          
          setFearGreedIndex({
            value: index.value || 0,
            classification: validateClassification(index.classification || 'Neutral'),
            timestamp: timestamp,
          })
        }
      } catch (err) {
        console.error('Ошибка загрузки индекса страха и жадности:', err)
        setError('Не удалось загрузить индекс страха и жадности')
      } finally {
        setLoading(false)
      }
    }

    loadFearGreedIndex()
    const intervalId = setInterval(loadFearGreedIndex, 60000) // Обновляем каждую минуту

    return () => clearInterval(intervalId)
  }, [])

  const getIndexColor = (value: number) => {
    if (value >= 75) return 'text-profit' // Extreme Greed
    if (value >= 55) return 'text-green-400' // Greed
    if (value >= 45) return 'text-gray-400' // Neutral
    if (value >= 25) return 'text-yellow-400' // Fear
    return 'text-loss' // Extreme Fear
  }

  const getIndexBgColor = (value: number) => {
    if (value >= 75) return 'bg-profit' // Extreme Greed
    if (value >= 55) return 'bg-green-500' // Greed
    if (value >= 45) return 'bg-gray-500' // Neutral
    if (value >= 25) return 'bg-yellow-500' // Fear
    return 'bg-loss' // Extreme Fear
  }

  const getIndexLabel = (classification: string) => {
    const labels: Record<string, string> = {
      'Extreme Fear': 'Экстремальный страх',
      'Fear': 'Страх',
      'Neutral': 'Нейтрально',
      'Greed': 'Жадность',
      'Extreme Greed': 'Экстремальная жадность',
    }
    return labels[classification] || classification
  }

  const getRecommendation = (value: number) => {
    if (value >= 75) {
      return {
        text: 'Рынок перегрет. Рассмотрите возможность фиксации прибыли.',
        color: 'text-yellow-400',
      }
    }
    if (value >= 55) {
      return {
        text: 'Рынок показывает признаки жадности. Будьте осторожны.',
        color: 'text-yellow-300',
      }
    }
    if (value >= 45) {
      return {
        text: 'Рынок в нейтральной зоне. Следите за техническими индикаторами.',
        color: 'text-gray-300',
      }
    }
    if (value >= 25) {
      return {
        text: 'Рынок показывает страх. Возможны хорошие точки входа.',
        color: 'text-green-300',
      }
    }
    return {
      text: 'Экстремальный страх. Потенциальная возможность для покупки.',
      color: 'text-green-400',
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Индекс страха и жадности</h1>
        <p className="text-gray-400 mt-1">Текущие рыночные настроения на основе индекса страха и жадности</p>
      </div>

      {loading && (
        <Card className="p-6">
          <div className="text-center text-gray-400 py-8">
            Загрузка данных...
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6">
          <div className="text-center text-loss py-8">
            {error}
          </div>
        </Card>
      )}

      {!loading && !error && fearGreedIndex && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Index Display */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-white">Текущий индекс</h2>
            <div className="space-y-6">
              {/* Large Index Value */}
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${getIndexColor(fearGreedIndex.value)}`}>
                  {fearGreedIndex.value}
                </div>
                <div className={`text-2xl font-semibold ${getIndexColor(fearGreedIndex.value)}`}>
                  {getIndexLabel(fearGreedIndex.classification)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Страх</span>
                  <span>Жадность</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 ${getIndexBgColor(fearGreedIndex.value)}`}
                    style={{ width: `${fearGreedIndex.value}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white opacity-50"
                    style={{ left: `${fearGreedIndex.value}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>25</span>
                  <span>45</span>
                  <span>55</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-center text-sm text-gray-400 pt-4 border-t border-border-primary">
                Обновлено: {new Date(fearGreedIndex.timestamp).toLocaleString('ru-RU')}
              </div>
            </div>
          </Card>

          {/* Interpretation and Recommendation */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Интерпретация</h2>
            <div className="space-y-4">
              {/* Recommendation */}
              <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Рекомендация</h3>
                <p className={`text-base ${getRecommendation(fearGreedIndex.value).color}`}>
                  {getRecommendation(fearGreedIndex.value).text}
                </p>
              </div>

              {/* Index Levels */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400">Уровни индекса:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded bg-bg-secondary">
                    <span className="text-loss">0-24: Экстремальный страх</span>
                    <span className="text-gray-500">Покупка</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-secondary">
                    <span className="text-yellow-400">25-44: Страх</span>
                    <span className="text-gray-500">Осторожная покупка</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-secondary">
                    <span className="text-gray-400">45-54: Нейтрально</span>
                    <span className="text-gray-500">Наблюдение</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-secondary">
                    <span className="text-green-400">55-74: Жадность</span>
                    <span className="text-gray-500">Осторожность</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-secondary">
                    <span className="text-profit">75-100: Экстремальная жадность</span>
                    <span className="text-gray-500">Фиксация прибыли</span>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="pt-4 border-t border-border-primary">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Текущий статус:</span>
                  <span className={`font-semibold ${getIndexColor(fearGreedIndex.value)}`}>
                    {getIndexLabel(fearGreedIndex.classification)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Historical Context */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-white">О индексе</h2>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>
                Индекс страха и жадности (Fear & Greed Index) — это индикатор, который измеряет эмоции 
                и настроения участников рынка криптовалют. Индекс варьируется от 0 до 100, где:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong className="text-loss">0-24 (Экстремальный страх):</strong> Рынок перепродан, возможны хорошие точки входа</li>
                <li><strong className="text-yellow-400">25-44 (Страх):</strong> Рынок показывает признаки страха, возможны возможности для покупки</li>
                <li><strong className="text-gray-400">45-54 (Нейтрально):</strong> Рынок в равновесии, следите за техническими индикаторами</li>
                <li><strong className="text-green-400">55-74 (Жадность):</strong> Рынок показывает признаки жадности, будьте осторожны</li>
                <li><strong className="text-profit">75-100 (Экстремальная жадность):</strong> Рынок перегрет, рассмотрите фиксацию прибыли</li>
              </ul>
              <p className="pt-2 text-xs text-gray-400">
                Данные предоставляются API alternative.me и обновляются ежедневно.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
