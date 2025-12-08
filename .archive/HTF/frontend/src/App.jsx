import { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  GetCryptoData, 
  GetAvailableSymbols, 
  StartRealtime, 
  StopRealtime,
  GetMLPrediction,
  GetMLModelInfo,
  CheckMLServiceHealth
} from '../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';
import { createChart } from 'lightweight-charts';

function App() {
  // Основные states
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC_USD');
  const [resolution, setResolution] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  
  // ML states
  const [mlPrediction, setMlPrediction] = useState(null);
  const [mlModelInfo, setMlModelInfo] = useState(null);
  const [mlServiceOnline, setMlServiceOnline] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  
  // Refs для графика
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const chartDataRef = useRef([]);
  const priceLineRef = useRef(null);

  // Инициализация графика
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#3f3f3f',
      },
      timeScale: {
        borderColor: '#3f3f3f',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    loadSymbols();
    loadChartData();

    return () => {
      window.removeEventListener('resize', handleResize);
      handleStopRealtime();
      chart.remove();
    };
  }, []);

  // Подписка на WebSocket события
  useEffect(() => {
    console.log('📡 Подписываюсь на событие candle:update');
    
    const unsubscribe = EventsOn('candle:update', (newCandle) => {
      console.log('📥 ПОЛУЧЕНО СОБЫТИЕ candle:update:', newCandle);
      handleCandleUpdate(newCandle);
    });

    return () => {
      console.log('🔌 Отписываюсь от candle:update');
      EventsOff('candle:update');
    };
  }, [stats]);

  // Проверка ML сервиса
  useEffect(() => {
    checkMLService();
    const interval = setInterval(checkMLService, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkMLService = async () => {
    try {
      const online = await CheckMLServiceHealth();
      setMlServiceOnline(online);
      
      if (online) {
        const info = await GetMLModelInfo();
        setMlModelInfo(info);
      }
    } catch (err) {
      setMlServiceOnline(false);
    }
  };

  const loadSymbols = async () => {
    try {
      const symbolsList = await GetAvailableSymbols();
      setSymbols(symbolsList);
    } catch (err) {
      console.error('Ошибка загрузки символов:', err);
    }
  };

  const loadChartData = async () => {
    if (!candleSeriesRef.current) return;

    setLoading(true);
    setError('');

    try {
      console.log(`🔍 Загрузка данных: ${selectedSymbol}, ${resolution}`);
      
      const data = await GetCryptoData(selectedSymbol, resolution, 200); // Больше данных для ML
      
      if (!data || data.length === 0) {
        setError('Нет данных для отображения');
        return;
      }

      const sortedData = [...data].sort((a, b) => a.time - b.time);

      const chartData = sortedData.map(candle => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      chartDataRef.current = chartData;

      const firstPrice = sortedData[0].close;
      const lastPrice = sortedData[sortedData.length - 1].close;
      const change = lastPrice - firstPrice;
      const changePercent = ((change / firstPrice) * 100).toFixed(2);

      setStats({
        count: chartData.length,
        currentPrice: lastPrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent,
        high: Math.max(...sortedData.map(c => c.high)).toFixed(2),
        low: Math.min(...sortedData.map(c => c.low)).toFixed(2),
      });

      candleSeriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();

      console.log('✅ График загружен:', chartData.length, 'свечей');

    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(`Ошибка: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCandleUpdate = (newCandle) => {
    if (!candleSeriesRef.current || !chartDataRef.current || chartDataRef.current.length === 0) {
      console.warn('⚠️ График не готов для обновлений');
      return;
    }

    console.log('🔄 Обрабатываю обновление свечи:', newCandle);
    setUpdateCount(prev => prev + 1);

    const updatedData = [...chartDataRef.current];
    const lastIndex = updatedData.length - 1;

    if (lastIndex >= 0 && updatedData[lastIndex].time === newCandle.time) {
      updatedData[lastIndex] = {
        time: newCandle.time,
        open: newCandle.open,
        high: newCandle.high,
        low: newCandle.low,
        close: newCandle.close,
      };
      console.log('✏️ Обновлена последняя свеча:', updatedData[lastIndex]);
    } else {
      updatedData.push({
        time: newCandle.time,
        open: newCandle.open,
        high: newCandle.high,
        low: newCandle.low,
        close: newCandle.close,
      });
      console.log('➕ Добавлена новая свеча:', updatedData[updatedData.length - 1]);
    }

    chartDataRef.current = updatedData;
    
    try {
      candleSeriesRef.current.update(updatedData[updatedData.length - 1]);
      console.log('✅ График обновлен успешно');
    } catch (err) {
      console.error('❌ Ошибка обновления графика:', err);
    }

    if (stats) {
      setStats(prevStats => ({
        ...prevStats,
        currentPrice: newCandle.close.toFixed(2),
        high: Math.max(parseFloat(prevStats.high), newCandle.high).toFixed(2),
        low: Math.min(parseFloat(prevStats.low), newCandle.low).toFixed(2),
      }));
    }
  };

  const handleGetPrediction = async () => {
    if (!mlServiceOnline) {
      setError('ML сервис недоступен. Запустите: cd ml-service && python -m app.main');
      return;
    }
    
    setMlLoading(true);
    setError('');
    setMlPrediction(null);
    
    try {
      console.log('🤖 Запрашиваю ML предсказание...');
      const prediction = await GetMLPrediction(selectedSymbol, resolution);
      setMlPrediction(prediction);
      
      // Удаляем старую линию предсказания
      if (priceLineRef.current && candleSeriesRef.current) {
        try {
          candleSeriesRef.current.removePriceLine(priceLineRef.current);
        } catch (e) {
          // Ignore if line doesn't exist
        }
      }
      
      // Добавляем новую линию предсказания
      if (chartRef.current && candleSeriesRef.current) {
        const priceLine = candleSeriesRef.current.createPriceLine({
          price: prediction.predicted_price,
          color: prediction.direction === 'UP' ? '#26a69a' : '#ef5350',
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `ML: $${prediction.predicted_price.toFixed(2)}`,
        });
        
        priceLineRef.current = priceLine;
        
        // Удаляем через 60 секунд
        setTimeout(() => {
          if (candleSeriesRef.current && priceLineRef.current) {
            try {
              candleSeriesRef.current.removePriceLine(priceLineRef.current);
              priceLineRef.current = null;
            } catch (e) {
              // Ignore
            }
          }
        }, 60000);
      }
      
      console.log('✅ Получено предсказание:', prediction);
      
    } catch (err) {
      console.error('❌ Ошибка ML предсказания:', err);
      setError(`ML ошибка: ${err.message || err}`);
    } finally {
      setMlLoading(false);
    }
  };

  const handleStartRealtime = async () => {
    try {
      console.log('🔌 Запуск real-time...');
      await StartRealtime(selectedSymbol, resolution);
      setRealtimeActive(true);
      setUpdateCount(0);
      console.log('✅ Real-time активен');
    } catch (err) {
      console.error('❌ Ошибка запуска real-time:', err);
      setError(`Ошибка WebSocket: ${err}`);
    }
  };

  const handleStopRealtime = async () => {
    try {
      await StopRealtime();
      setRealtimeActive(false);
      console.log('🛑 Real-time остановлен');
    } catch (err) {
      console.error('Ошибка остановки real-time:', err);
    }
  };

  const handleToggleRealtime = () => {
    if (realtimeActive) {
      handleStopRealtime();
    } else {
      handleStartRealtime();
    }
  };

  const handleSymbolChange = (e) => {
    setSelectedSymbol(e.target.value);
    setMlPrediction(null);
    handleStopRealtime();
  };

  const handleResolutionChange = (e) => {
    setResolution(e.target.value);
    setMlPrediction(null);
    handleStopRealtime();
  };

  const handleRefresh = () => {
    handleStopRealtime();
    setMlPrediction(null);
    if (priceLineRef.current && candleSeriesRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(priceLineRef.current);
        priceLineRef.current = null;
      } catch (e) {
        // Ignore
      }
    }
    loadChartData();
  };

  useEffect(() => {
    if (candleSeriesRef.current && !realtimeActive) {
      loadChartData();
    }
  }, [selectedSymbol, resolution]);

  return (
    <div className="app">
      <header className="header">
        <h1>₿ Crypto Trading Chart - AI Powered</h1>
        <p>Live WebSocket + ML Predictions</p>
      </header>

      <div className="controls">
        <div className="control-group">
          <label>Криптовалюта:</label>
          <select value={selectedSymbol} onChange={handleSymbolChange}>
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>
                {symbol.replace('_USD', '/USDT')}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Таймфрейм:</label>
          <select value={resolution} onChange={handleResolutionChange}>
            <option value="1">1 минута</option>
            <option value="5">5 минут</option>
            <option value="15">15 минут</option>
            <option value="60">1 час</option>
            <option value="D">День</option>
          </select>
        </div>

        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? '⏳ Загрузка...' : '🔄 Обновить'}
        </button>

        <button 
          className={`realtime-btn ${realtimeActive ? 'active' : ''}`}
          onClick={handleToggleRealtime}
        >
          {realtimeActive ? `🔴 Остановить (${updateCount})` : '▶️ Real-time'}
        </button>

        <button 
          className={`ml-btn ${mlServiceOnline ? 'online' : 'offline'}`}
          onClick={handleGetPrediction}
          disabled={mlLoading || !mlServiceOnline}
        >
          {mlLoading ? '🧠 Думаю...' : mlServiceOnline ? '🤖 ML Прогноз' : '⚠️ ML Offline'}
        </button>
      </div>

      {stats && (
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Цена:</span>
            <span className="stat-value">${stats.currentPrice}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Изменение:</span>
            <span className={`stat-value ${parseFloat(stats.change) >= 0 ? 'positive' : 'negative'}`}>
              {stats.change > 0 ? '+' : ''}{stats.change} ({stats.changePercent}%)
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max:</span>
            <span className="stat-value">${stats.high}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Min:</span>
            <span className="stat-value">${stats.low}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Статус:</span>
            <span className={`stat-value ${realtimeActive ? 'positive' : ''}`}>
              {realtimeActive ? '🟢 Live' : '⚪ Offline'}
            </span>
          </div>
        </div>
      )}

      {mlPrediction && (
        <div className="ml-prediction">
          <div className="ml-header">
            <h3>🤖 ML Предсказание</h3>
            <span className={`ml-confidence ${mlPrediction.confidence > 70 ? 'high' : 'low'}`}>
              Уверенность: {mlPrediction.confidence.toFixed(0)}%
            </span>
          </div>
          
          <div className="ml-details">
            <div className="ml-item">
              <span className="ml-label">Текущая цена:</span>
              <span className="ml-value">${mlPrediction.current_price.toFixed(2)}</span>
            </div>
            
            <div className="ml-item">
              <span className="ml-label">Прогноз:</span>
              <span className={`ml-value ${mlPrediction.direction === 'UP' ? 'positive' : 'negative'}`}>
                ${mlPrediction.predicted_price.toFixed(2)}
                <span className="ml-arrow">
                  {mlPrediction.direction === 'UP' ? ' ↗' : ' ↘'}
                </span>
              </span>
            </div>
            
            <div className="ml-item">
              <span className="ml-label">Изменение:</span>
              <span className={`ml-value ${mlPrediction.change_percent > 0 ? 'positive' : 'negative'}`}>
                {mlPrediction.change_percent > 0 ? '+' : ''}{mlPrediction.change_percent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {mlModelInfo && mlModelInfo.loaded && (
        <div className="ml-info">
          <span>📊 Модель: {mlModelInfo.symbol} ({mlModelInfo.interval})</span>
          <span>📈 Точность направления: {mlModelInfo.direction_accuracy?.toFixed(1)}%</span>
          <span>📉 MAE: ${mlModelInfo.mae?.toFixed(2)}</span>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="chart-container" ref={chartContainerRef}></div>

      <footer className="footer">
        <p>📡 WebSocket стриминг от Binance • Обновлений: {updateCount}</p>
        {mlServiceOnline && <p>🤖 ML Service: Online</p>}
      </footer>
    </div>
  );
}

export default App;
