import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

export default function Sentiment() {
  const [sentiment, setSentiment] = useState({
    overallScore: 0,
    positive: 0.33,
    negative: 0.33,
    neutral: 0.34,
  })

  useEffect(() => {
    const loadSentiment = async () => {
      try {
        const score = await App.GetSentimentScore()
        setSentiment({
          overallScore: score.overallScore || 0,
          positive: score.positive || 0.33,
          negative: score.negative || 0.33,
          neutral: score.neutral || 0.34,
        })
      } catch (error) {
        console.error('Ошибка загрузки настроений:', error)
      }
    }

    loadSentiment()
    const intervalId = setInterval(loadSentiment, 10000)

    return () => clearInterval(intervalId)
  }, [])

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-profit'
    if (score < -0.3) return 'text-loss'
    return 'text-gray-400'
  }

  const getSentimentLabel = (score: number) => {
    if (score > 0.5) return 'Очень бычье'
    if (score > 0.2) return 'Бычье'
    if (score > -0.2) return 'Нейтральное'
    if (score > -0.5) return 'Медвежье'
    return 'Очень медвежье'
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Анализ настроений</h1>
        <p className="text-gray-400 mt-1">Анализ настроений рынка и социальных сетей</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Sentiment */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Общее настроение</h2>
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getSentimentColor(sentiment.overallScore)}`}>
                {sentiment.overallScore >= 0 ? '+' : ''}
                {(sentiment.overallScore * 100).toFixed(1)}%
              </div>
              <div className="text-gray-400">{getSentimentLabel(sentiment.overallScore)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Позитивное</span>
                <span className="text-profit font-semibold">
                  {(sentiment.positive * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-2">
                <div
                  className="bg-profit h-2 rounded-full"
                  style={{ width: `${sentiment.positive * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Нейтральное</span>
                <span className="text-gray-300 font-semibold">
                  {(sentiment.neutral * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{ width: `${sentiment.neutral * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Негативное</span>
                <span className="text-loss font-semibold">
                  {(sentiment.negative * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-2">
                <div
                  className="bg-loss h-2 rounded-full"
                  style={{ width: `${sentiment.negative * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* News Feed */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Лента новостей</h2>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              Лента новостей будет отображаться здесь
            </div>
          </div>
        </Card>

        {/* Social Mentions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Упоминания в соцсетях</h2>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              Упоминания в соцсетях будут отображаться здесь
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
