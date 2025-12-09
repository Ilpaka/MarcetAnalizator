import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useMarketStore } from '../store/marketStore'
import { useAllTickers } from '../hooks/useAllTickers'
import { Brain, TrendingUp, Activity, BarChart3, ChevronDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
// @ts-ignore
import * as App from '../../wailsjs/go/main/App'

const TIMEFRAMES = [
  { label: '1m', value: '1m', description: 'Минутный (для тестов)' },
  { label: '5m', value: '5m', description: '5 минут' },
  { label: '15m', value: '15m', description: '15 минут' },
  { label: '1h', value: '1h', description: '1 час' },
  { label: '4h', value: '4h', description: '4 часа' },
  { label: '1d', value: '1d', description: '1 день' },
]

interface ModelMetadata {
  exists: boolean
  symbol: string
  timeframe: string
  mae: number
  rmse: number
  mape: number
  direction_accuracy: number
  trained_at: number
  model_path: string
}

interface TrainingProgress {
  epoch: number
  train_loss: number
  val_loss: number
  completed: boolean
  message: string
  progress?: number
  total_epochs?: number
  train_losses?: number[]
  val_losses?: number[]
}

interface PricePrediction {
  predicted_price: number
  current_price: number
  confidence: number
  confidence_interval_lower: number
  confidence_interval_upper: number
  change_pct?: number
  direction?: string
  expected_move?: number
  timestamp: number
  model_used: string
}

export default function PredictionTesting() {
  const { selectedSymbol, setSelectedSymbol, allTickers } = useMarketStore()
  useAllTickers() // Load tickers
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null)
  const [trainingLossHistory, setTrainingLossHistory] = useState<{epoch: number, train: number, val: number}[]>([])
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null)
  const [prediction, setPrediction] = useState<PricePrediction | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Training parameters
  const [lookback, setLookback] = useState(60)
  const [hiddenSize, setHiddenSize] = useState(64)
  const [numLayers, setNumLayers] = useState(2)
  const [epochs, setEpochs] = useState(30)
  const [batchSize, setBatchSize] = useState(32)
  const [learningRate, setLearningRate] = useState(0.001)
  
  // UI state for dropdowns
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false)
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const [showTrainingParams, setShowTrainingParams] = useState(false)
  
  // Filter USDT pairs and sort by volume
  const usdtTickers = allTickers
    .filter(t => t.symbol.endsWith('USDT'))
    .sort((a, b) => b.volume - a.volume)

  // Load model metadata on mount and when symbol/timeframe changes
  useEffect(() => {
    loadModelMetadata()
  }, [selectedSymbol, selectedTimeframe])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCryptoDropdown(false)
      setShowTimeframeDropdown(false)
    }
    if (showCryptoDropdown || showTimeframeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCryptoDropdown, showTimeframeDropdown])

  // Poll training status when training is active or just completed
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return
    if (!isTraining && !trainingProgress) return // Only poll if training is active or we have progress

    let wasCompleted = false
    let pollCount = 0
    const maxPollAfterCompletion = 5 // Poll 5 more times after completion to ensure we get final data

    const pollInterval = setInterval(async () => {
      try {
        const status = await App.GetTrainingStatus(selectedSymbol, selectedTimeframe)
        
        // Check if training is active or was just completed
        if (status.training || (status.completed && !wasCompleted) || (status.epoch && status.epoch > 0)) {
          const progress: TrainingProgress = {
            epoch: (status.epoch as number) || 0,
            train_loss: (status.train_loss as number) || 0,
            val_loss: (status.val_loss as number) || 0,
            completed: (status.completed as boolean) || false,
            message: (status.message as string) || '',
            progress: (status.progress as number) || 0,
            total_epochs: (status.total_epochs as number) || 30,
            train_losses: (status.train_losses as number[]) || [],
            val_losses: (status.val_losses as number[]) || [],
          }
          setTrainingProgress(progress)
          
          // Update loss history for chart - always update if we have data
          if (status.train_losses && status.val_losses && Array.isArray(status.train_losses) && status.train_losses.length > 0) {
            const history = status.train_losses.map((train: number, idx: number) => ({
              epoch: idx + 1,
              train,
              val: (status.val_losses as number[])?.[idx] || 0
            }))
            setTrainingLossHistory(history)
          }
          
          // If training just completed
          if (status.completed && !wasCompleted) {
            wasCompleted = true
            setIsTraining(false)
            
            // Show success notification
            if (window.Notification && Notification.permission === 'granted') {
              new Notification('Обучение завершено!', {
                body: `Модель ${selectedSymbol}/${selectedTimeframe} успешно обучена`,
                icon: '/icon.png'
              })
            } else {
              // Fallback: use alert
              alert(`✅ Обучение завершено!\n\nМодель ${selectedSymbol}/${selectedTimeframe} успешно обучена.\nТеперь вы можете использовать функцию предсказания.`)
            }
            
            // Reload metadata to enable prediction button
            await loadModelMetadata()
          }
        } else if (status.completed && !wasCompleted) {
          // Handle case when training completed before polling started
          wasCompleted = true
          setIsTraining(false)
          await loadModelMetadata()
        }
        
        // Stop polling after completion if we've polled enough times
        if (wasCompleted) {
          pollCount++
          if (pollCount >= maxPollAfterCompletion) {
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error('Failed to get training status:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [isTraining, selectedSymbol, selectedTimeframe])

  const loadModelMetadata = async () => {
    if (!selectedSymbol || !selectedTimeframe) return

    try {
      const metadata = await App.GetModelMetadata(selectedSymbol, selectedTimeframe)
      // Type assertion with proper mapping
      const typedMetadata: ModelMetadata = {
        exists: metadata.exists as boolean || false,
        symbol: (metadata.symbol as string) || selectedSymbol,
        timeframe: (metadata.timeframe as string) || selectedTimeframe,
        mae: (metadata.mae as number) || 0,
        rmse: (metadata.rmse as number) || 0,
        mape: (metadata.mape as number) || 0,
        direction_accuracy: (metadata.direction_accuracy as number) || 0,
        trained_at: (metadata.trained_at as number) || 0,
        model_path: (metadata.model_path as string) || '',
      }
      setModelMetadata(typedMetadata)
      setError(null)
    } catch (err) {
      console.error('Failed to load model metadata:', err)
      setModelMetadata(null)
    }
  }

  const handleTrainModel = async () => {
    if (!selectedSymbol || !selectedTimeframe) {
      setError('Выберите символ и таймфрейм')
      return
    }

    // Request notification permission
    if (window.Notification && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    setIsTraining(true)
    setError(null)
    setTrainingProgress(null)
    setTrainingLossHistory([])

    try {
      // Start training with progress updates
      await App.TrainModel(
        selectedSymbol,
        selectedTimeframe,
        lookback,
        hiddenSize,
        numLayers,
        epochs,
        batchSize,
        learningRate,
        0.2 // val_split
      )

      // Training started - polling will handle completion
      // Don't set isTraining to false here, let polling handle it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при обучении модели')
      console.error('Training error:', err)
      setIsTraining(false)
    }
  }

  const handlePredictPrice = async () => {
    if (!selectedSymbol || !selectedTimeframe) {
      setError('Выберите символ и таймфрейм')
      return
    }

    if (!modelMetadata?.exists) {
      setError('Модель не обучена. Сначала обучите модель.')
      return
    }

    setIsPredicting(true)
    setError(null)

    try {
      const result = await App.PredictPrice(selectedSymbol, selectedTimeframe)
      // Type assertion with proper mapping
      if (result.error) {
        setError(result.error as string)
        setPrediction(null)
      } else {
        // Calculate change_pct if not provided
        const predicted = (result.predicted_price as number) || 0
        const current = (result.current_price as number) || 0
        const change_pct = result.change_pct !== undefined 
          ? (result.change_pct as number)
          : (current > 0 ? ((predicted - current) / current) * 100 : 0)
        
        const typedPrediction: PricePrediction = {
          predicted_price: predicted,
          current_price: current,
          confidence: (result.confidence as number) || 0,
          confidence_interval_lower: (result.confidence_interval_lower as number) || 0,
          confidence_interval_upper: (result.confidence_interval_upper as number) || 0,
          change_pct: change_pct,
          direction: (result.direction as string) || 'NEUTRAL',
          expected_move: (result.expected_move as number) || 0,
          timestamp: (result.timestamp as number) || Date.now(),
          model_used: (result.model_used as string) || 'LSTM',
        }
        setPrediction(typedPrediction)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при предсказании цены')
      console.error('Prediction error:', err)
      setPrediction(null)
    } finally {
      setIsPredicting(false)
    }
  }

  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return price.toFixed(8)
  }

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '--'
    return new Date(timestamp).toLocaleString('ru-RU')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-secondary flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Тестирование предсказаний</h1>
          <p className="text-sm text-gray-400 mt-1">Обучение и тестирование LSTM модели для прогнозирования цен</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Symbol Selection */}
          <Card className="p-4 flex-shrink-0">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Настройки
            </h2>
            <div className="space-y-3">
              {/* Crypto Selection Dropdown */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-2">Криптовалюта</label>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCryptoDropdown(!showCryptoDropdown)
                  }}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                  <span>{selectedSymbol || 'Выберите криптовалюту'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCryptoDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCryptoDropdown && (
                  <div 
                    className="absolute z-10 w-full mt-1 bg-bg-tertiary border border-border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {usdtTickers.length > 0 ? (
                      usdtTickers.slice(0, 50).map((ticker) => (
                        <button
                          key={ticker.symbol}
                          onClick={() => {
                            setSelectedSymbol(ticker.symbol)
                            setShowCryptoDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-elevated transition-colors ${
                            selectedSymbol === ticker.symbol ? 'bg-primary-600 text-white' : 'text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ticker.symbol}</span>
                            <span className="text-xs opacity-75">${ticker.lastPrice.toLocaleString()}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">Загрузка...</div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeframe Dropdown */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-2">Таймфрейм</label>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTimeframeDropdown(!showTimeframeDropdown)
                  }}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-white text-sm flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                  <span>{TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || selectedTimeframe}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTimeframeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTimeframeDropdown && (
                  <div 
                    className="absolute z-10 w-full mt-1 bg-bg-tertiary border border-border-primary rounded-lg shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.value}
                        onClick={() => {
                          setSelectedTimeframe(tf.value)
                          setShowTimeframeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-elevated transition-colors ${
                          selectedTimeframe === tf.value ? 'bg-primary-600 text-white' : 'text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{tf.label}</div>
                        <div className="text-xs opacity-75">{tf.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Training Parameters Collapsible */}
              <div>
                <button
                  onClick={() => setShowTrainingParams(!showTrainingParams)}
                  className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span>Параметры обучения</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTrainingParams ? 'rotate-180' : ''}`} />
                </button>
                {showTrainingParams && (
                  <div className="mt-2 space-y-2 pl-2 border-l-2 border-border-primary">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Lookback</label>
                      <input
                        type="number"
                        value={lookback}
                        onChange={(e) => setLookback(parseInt(e.target.value) || 60)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="10"
                        max="200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Hidden Size</label>
                      <input
                        type="number"
                        value={hiddenSize}
                        onChange={(e) => setHiddenSize(parseInt(e.target.value) || 64)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="8"
                        max="256"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Слои</label>
                      <input
                        type="number"
                        value={numLayers}
                        onChange={(e) => setNumLayers(parseInt(e.target.value) || 2)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="1"
                        max="5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Эпохи</label>
                      <input
                        type="number"
                        value={epochs}
                        onChange={(e) => setEpochs(parseInt(e.target.value) || 30)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Batch Size</label>
                      <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 32)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="1"
                        max="128"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Learning Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={learningRate}
                        onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.001)}
                        className="w-full px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-white text-xs"
                        min="0.0001"
                        max="0.1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-loss/20 border border-loss/50 rounded-lg text-loss text-sm">
                  {error}
                </div>
              )}
            </div>
          </Card>

          {/* Training Controls */}
          <Card className="p-4 flex-shrink-0">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              Обучение модели
            </h2>
            <div className="space-y-4">
              <Button
                variant="primary"
                onClick={handleTrainModel}
                disabled={isTraining || !selectedSymbol || !selectedTimeframe}
                className="w-full"
                size="lg"
              >
                {isTraining ? 'Обучение...' : 'Обучить модель'}
              </Button>

              {trainingProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Эпоха: {trainingProgress.epoch} / {trainingProgress.total_epochs || 30}
                    </span>
                    <span className="text-xs text-primary-500 font-semibold">
                      {trainingProgress.progress || Math.round((trainingProgress.epoch / (trainingProgress.total_epochs || 30)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${trainingProgress.progress || Math.round((trainingProgress.epoch / (trainingProgress.total_epochs || 30)) * 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Train Loss:</span>
                      <span className="ml-1 text-white font-mono">
                        {trainingProgress.train_loss.toFixed(6)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Val Loss:</span>
                      <span className="ml-1 text-white font-mono">
                        {trainingProgress.val_loss.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  {trainingProgress.message && (
                    <div className="text-xs text-primary-400">
                      {trainingProgress.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Prediction Controls */}
          <Card className="p-4 flex-shrink-0">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Предсказание
            </h2>
            <Button
              variant="primary"
              onClick={handlePredictPrice}
              disabled={isPredicting || !modelMetadata?.exists || isTraining}
              className="w-full"
              size="lg"
            >
              {isPredicting ? 'Предсказание...' : 'Предсказать цену'}
            </Button>
          </Card>

          {/* Model Metadata */}
          {modelMetadata && (
            <Card className="p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Метрики модели
              </h2>
              {modelMetadata.exists ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">MAE</span>
                    <span className="text-sm font-semibold text-white">
                      ${modelMetadata.mae.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">RMSE</span>
                    <span className="text-sm font-semibold text-white">
                      ${modelMetadata.rmse.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">MAPE</span>
                    <span className="text-sm font-semibold text-white">
                      {modelMetadata.mape.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Точность направления</span>
                    <span className="text-sm font-semibold text-white">
                      {modelMetadata.direction_accuracy.toFixed(2)}%
                    </span>
                  </div>
                  <div className="pt-3 border-t border-border-primary">
                    <div className="text-xs text-gray-400 mb-1">Обучена:</div>
                    <div className="text-xs text-white">
                      {formatDate(modelMetadata.trained_at)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4 text-sm">
                  Модель не обучена
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Training Visualization */}
          {(isTraining || trainingLossHistory.length > 0) && (
            <Card className="p-4 flex-shrink-0">
              <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                График обучения
                {isTraining && (
                  <span className="ml-2 text-xs text-primary-400 animate-pulse">
                    (обучение...)
                  </span>
                )}
              </h2>
              {trainingLossHistory.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trainingLossHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="epoch" 
                        stroke="#9CA3AF"
                        style={{ fontSize: '10px' }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        style={{ fontSize: '10px' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="train" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Train Loss"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="val" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        name="Val Loss"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                    <div>Ожидание данных обучения...</div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Prediction Results */}
          {prediction && (
            <Card className="p-6 flex-shrink-0">
              <h2 className="text-xl font-semibold mb-4 text-white">Результат предсказания</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Текущая цена</div>
                  <div className="text-2xl font-bold text-white">
                    ${formatPrice(prediction.current_price)}
                  </div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Предсказанная цена</div>
                  <div className="text-2xl font-bold text-primary-500">
                    ${formatPrice(prediction.predicted_price)}
                  </div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Уверенность</div>
                  <div className="text-2xl font-bold text-white">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Изменение</div>
                  <div className={`text-2xl font-bold ${
                    (prediction.change_pct || 0) >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {(prediction.change_pct || 0) >= 0 ? '+' : ''}
                    {(prediction.change_pct !== undefined 
                      ? prediction.change_pct 
                      : ((prediction.predicted_price - prediction.current_price) / prediction.current_price * 100)
                    ).toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-bg-tertiary rounded-lg col-span-2">
                  <div className="text-gray-400 text-sm mb-1">Доверительный интервал</div>
                  <div className="text-lg font-semibold text-white">
                    ${formatPrice(prediction.confidence_interval_lower)} - ${formatPrice(prediction.confidence_interval_upper)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border-primary">
                <div className="text-xs text-gray-400">
                  Модель: {prediction.model_used} | Время: {formatDate(prediction.timestamp)}
                </div>
              </div>
            </Card>
          )}

          {/* Placeholder when no prediction */}
          {!prediction && (
            <Card className="p-6 flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Нет предсказаний</p>
                <p className="text-sm">Обучите модель и нажмите "Предсказать цену"</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

