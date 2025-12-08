🚀 Crypto Trading Bot Development Plan
Wails (Go) + ReactJS + ML Prediction SystemPROJECT OVERVIEWОписание проекта
Разработка desktop-приложения для автоматической торговли криптовалютой с предсказанием движения цены на основе технического анализа, машинного обучения и анализа настроений (включая мониторинг заявлений Трампа).Технологический стек

Backend: Go 1.21+ с Wails v2
Frontend: ReactJS 18+ с TypeScript
ML Service: Python 3.11+ (gRPC)
Database: SQLite (локально) + Redis (кеш)
Charts: TradingView Lightweight Charts
UI Framework: Tailwind CSS + shadcn/ui
Ключевые функции

Real-time отображение графиков криптовалют (Binance API)
Предсказание направления цены на разные таймфреймы (5m, 15m, 1h, 4h, 1d)
Автономный торговый бот с paper trading
Анализ настроений (Twitter/X, новости, Fear & Greed Index)
Мониторинг заявлений Трампа с оценкой влияния на рынок
Профессиональный dashboard с аналитикой

ARCHITECTUREОбщая архитектура системы┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAILS APPLICATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (ReactJS)                           │    │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────┤    │
│  │  Charts  │ Trading  │ Signals  │Analytics │ Settings │  Bot Panel  │    │
│  │  Module  │  Panel   │  Panel   │  Module  │  Module  │             │    │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘    │
│       │          │          │          │          │            │            │
│       └──────────┴──────────┴──────────┴──────────┴────────────┘            │
│                                    │                                         │
│                            Wails Bindings                                    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                          BACKEND (Go)                                │    │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────┤    │
│  │ Binance  │Technical │ Trading  │   Risk   │ Sentiment│   Data      │    │
│  │   API    │Indicators│  Engine  │ Manager  │ Analyzer │  Storage    │    │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘    │
│       │          │          │          │          │            │            │
└───────┼──────────┼──────────┼──────────┼──────────┼────────────┼────────────┘
        │          │          │          │          │            │
        │          │          │          │          │            │
┌───────┴──────────┴──────────┴──────────┴──────────┴────────────┴────────────┐
│                           EXTERNAL SERVICES                                  │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   Binance    │  Twitter/X   │  CryptoPanic │  Python ML   │   Fear&Greed    │
│   WebSocket  │     API      │     API      │   Service    │     Index       │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘Структура проектаcrypto-trading-bot/
├── main.go                          # Wails entry point
├── app.go                           # Main application struct
├── wails.json                       # Wails configuration
├── go.mod
├── go.sum
│
├── internal/
│   ├── binance/
│   │   ├── client.go                # REST API client
│   │   ├── websocket.go             # WebSocket connection
│   │   ├── models.go                # Data models
│   │   └── orderbook.go             # Order book handling
│   │
│   ├── indicators/
│   │   ├── ema.go                   # Exponential Moving Average
│   │   ├── sma.go                   # Simple Moving Average
│   │   ├── rsi.go                   # Relative Strength Index
│   │   ├── macd.go                  # MACD
│   │   ├── bollinger.go             # Bollinger Bands
│   │   ├── atr.go                   # Average True Range
│   │   ├── obv.go                   # On-Balance Volume
│   │   ├── stoch_rsi.go             # Stochastic RSI
│   │   └── indicators_test.go       # Unit tests
│   │
│   ├── trading/
│   │   ├── engine.go                # Main trading engine
│   │   ├── paper_trader.go          # Paper trading implementation
│   │   ├── position.go              # Position management
│   │   ├── order.go                 # Order handling
│   │   └── backtest.go              # Backtesting engine
│   │
│   ├── risk/
│   │   ├── manager.go               # Risk management
│   │   ├── position_sizing.go       # Position size calculation
│   │   └── stop_loss.go             # Stop loss strategies
│   │
│   ├── signals/
│   │   ├── technical.go             # Technical analysis signals
│   │   ├── ml_client.go             # ML service gRPC client
│   │   ├── sentiment.go             # Sentiment signals
│   │   ├── ensemble.go              # Signal combination
│   │   └── multi_timeframe.go       # Multi-timeframe analysis
│   │
│   ├── sentiment/
│   │   ├── twitter.go               # Twitter/X API client
│   │   ├── trump_analyzer.go        # Trump-specific analysis
│   │   ├── news.go                  # News aggregation
│   │   ├── fear_greed.go            # Fear & Greed Index
│   │   └── nlp_client.go            # NLP service client
│   │
│   ├── storage/
│   │   ├── sqlite.go                # SQLite database
│   │   ├── redis.go                 # Redis cache
│   │   ├── migrations/              # Database migrations
│   │   └── models.go                # Database models
│   │
│   ├── bot/
│   │   ├── autonomous.go            # Autonomous trading bot
│   │   ├── strategy.go              # Trading strategies
│   │   ├── scheduler.go             # Task scheduling
│   │   └── notifications.go         # Alert system
│   │
│   └── config/
│       ├── config.go                # Configuration
│       └── defaults.go              # Default values
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main App component
│   │   ├── main.tsx                 # Entry point
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   │
│   │   │   ├── charts/
│   │   │   │   ├── CandlestickChart.tsx
│   │   │   │   ├── VolumeChart.tsx
│   │   │   │   ├── IndicatorOverlay.tsx
│   │   │   │   ├── PredictionOverlay.tsx
│   │   │   │   └── ChartControls.tsx
│   │   │   │
│   │   │   ├── trading/
│   │   │   │   ├── TradingPanel.tsx
│   │   │   │   ├── OrderForm.tsx
│   │   │   │   ├── PositionsList.tsx
│   │   │   │   ├── TradeHistory.tsx
│   │   │   │   └── QuickTrade.tsx
│   │   │   │
│   │   │   ├── signals/
│   │   │   │   ├── SignalDashboard.tsx
│   │   │   │   ├── TechnicalSignals.tsx
│   │   │   │   ├── MLPredictions.tsx
│   │   │   │   ├── SentimentGauge.tsx
│   │   │   │   └── SignalStrength.tsx
│   │   │   │
│   │   │   ├── bot/
│   │   │   │   ├── BotControlPanel.tsx
│   │   │   │   ├── BotStatus.tsx
│   │   │   │   ├── StrategySelector.tsx
│   │   │   │   ├── BotSettings.tsx
│   │   │   │   ├── AutoTradeLog.tsx
│   │   │   │   └── PerformanceMetrics.tsx
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   ├── EquityCurve.tsx
│   │   │   │   ├── DrawdownChart.tsx
│   │   │   │   ├── WinRateStats.tsx
│   │   │   │   ├── ProfitCalendar.tsx
│   │   │   │   └── TradeDistribution.tsx
│   │   │   │
│   │   │   ├── sentiment/
│   │   │   │   ├── SentimentPanel.tsx
│   │   │   │   ├── TrumpMonitor.tsx
│   │   │   │   ├── NewsFeed.tsx
│   │   │   │   ├── FearGreedIndex.tsx
│   │   │   │   └── SocialMentions.tsx
│   │   │   │
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Tooltip.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Progress.tsx
│   │   │       ├── Switch.tsx
│   │   │       ├── Slider.tsx
│   │   │       └── ...shadcn components
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trading.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── BotControl.tsx
│   │   │   ├── Sentiment.tsx
│   │   │   ├── Backtest.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useMarketData.ts
│   │   │   ├── useIndicators.ts
│   │   │   ├── usePredictions.ts
│   │   │   ├── useBot.ts
│   │   │   ├── useTrades.ts
│   │   │   └── useSentiment.ts
│   │   │
│   │   ├── store/
│   │   │   ├── index.ts             # Zustand store
│   │   │   ├── marketSlice.ts
│   │   │   ├── tradingSlice.ts
│   │   │   ├── botSlice.ts
│   │   │   └── settingsSlice.ts
│   │   │
│   │   ├── services/
│   │   │   ├── wailsBindings.ts     # Wails Go bindings
│   │   │   └── api.ts
│   │   │
│   │   ├── types/
│   │   │   ├── market.ts
│   │   │   ├── trading.ts
│   │   │   ├── signals.ts
│   │   │   ├── bot.ts
│   │   │   └── sentiment.ts
│   │   │
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── calculations.ts
│   │       └── constants.ts
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── ml_service/
│   ├── main.py                      # gRPC server entry
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   ├── models/
│   │   ├── lstm_model.py            # LSTM implementation
│   │   ├── xgboost_model.py         # XGBoost implementation
│   │   ├── ensemble.py              # Model ensemble
│   │   └── trainer.py               # Training pipeline
│   │
│   ├── features/
│   │   ├── engineering.py           # Feature engineering
│   │   ├── technical.py             # Technical features
│   │   └── preprocessing.py         # Data preprocessing
│   │
│   ├── sentiment/
│   │   ├── finbert.py               # FinBERT sentiment
│   │   ├── trump_analyzer.py        # Trump-specific NLP
│   │   └── aggregator.py            # Sentiment aggregation
│   │
│   ├── proto/
│   │   └── prediction.proto         # gRPC definitions
│   │
│   └── trained_models/              # Saved model weights
│
├── scripts/
│   ├── setup.sh                     # Setup script
│   ├── train_models.py              # Model training script
│   └── download_data.py             # Historical data download
│
└── docs/
    ├── API.md
    ├── TRADING_STRATEGIES.md
    └── ML_MODELS.mdPHASE 1: PROJECT SETUP & CORE INFRASTRUCTUREStep 1.1: Initialize Wails Projectbash# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Create new project
wails init -n crypto-trading-bot -t react-ts

# Navigate to project
cd crypto-trading-botStep 1.2: Configure Go DependenciesСоздай go.mod с зависимостями:gomodule crypto-trading-bot

go 1.21

require (
    github.com/wailsapp/wails/v2 v2.7.0
    github.com/adshao/go-binance/v2 v2.4.5
    github.com/gorilla/websocket v1.5.1
    github.com/mattn/go-sqlite3 v1.14.19
    github.com/redis/go-redis/v9 v9.3.1
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.32.0
    github.com/robfig/cron/v3 v3.0.1
    github.com/sirupsen/logrus v1.9.3
    github.com/spf13/viper v1.18.2
)Step 1.3: Configure Frontend DependenciesОбнови frontend/package.json:json{
  "name": "crypto-trading-bot-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "lightweight-charts": "^4.1.1",
    "zustand": "^4.4.7",
    "immer": "^10.0.3",
    "@tanstack/react-query": "^5.17.0",
    "lucide-react": "^0.303.0",
    "recharts": "^2.10.3",
    "date-fns": "^3.2.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}Step 1.4: Configure Tailwind CSSСоздай frontend/tailwind.config.js:javascript/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trading colors
        'profit': '#22c55e',
        'loss': '#ef4444',
        'neutral': '#6b7280',
        
        // UI colors
        'primary': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        
        // Chart colors
        'chart': {
          'up': '#22c55e',
          'down': '#ef4444',
          'volume': '#3b82f6',
          'ma': '#f59e0b',
          'bb': '#8b5cf6',
        },
        
        // Background
        'bg': {
          'primary': '#0f0f0f',
          'secondary': '#1a1a1a',
          'tertiary': '#252525',
          'elevated': '#2a2a2a',
        },
        
        // Border
        'border': {
          'primary': '#333333',
          'secondary': '#444444',
        }
      },
      
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgb(34 197 94 / 0.5)' },
          '100%': { boxShadow: '0 0 20px rgb(34 197 94 / 0.8)' },
        }
      }
    },
  },
  plugins: [],
}PHASE 2: BINANCE API INTEGRATIONStep 2.1: Binance Client ImplementationСоздай internal/binance/client.go:gopackage binance

import (
    "context"
    "time"
    
    "github.com/adshao/go-binance/v2"
)

type Client struct {
    client *binance.Client
    ctx    context.Context
}

type Kline struct {
    OpenTime  int64   `json:"openTime"`
    Open      float64 `json:"open"`
    High      float64 `json:"high"`
    Low       float64 `json:"low"`
    Close     float64 `json:"close"`
    Volume    float64 `json:"volume"`
    CloseTime int64   `json:"closeTime"`
}

type Ticker struct {
    Symbol             string  `json:"symbol"`
    PriceChange        float64 `json:"priceChange"`
    PriceChangePercent float64 `json:"priceChangePercent"`
    LastPrice          float64 `json:"lastPrice"`
    Volume             float64 `json:"volume"`
    QuoteVolume        float64 `json:"quoteVolume"`
}

func NewClient() *Client {
    return &Client{
        client: binance.NewClient("", ""), // Public API, no keys needed for market data
        ctx:    context.Background(),
    }
}

// GetKlines retrieves historical candlestick data
// symbol: e.g., "BTCUSDT"
// interval: e.g., "1m", "5m", "15m", "1h", "4h", "1d"
// limit: max 1000
func (c *Client) GetKlines(symbol, interval string, limit int) ([]Kline, error) {
    klines, err := c.client.NewKlinesService().
        Symbol(symbol).
        Interval(interval).
        Limit(limit).
        Do(c.ctx)
    
    if err != nil {
        return nil, err
    }
    
    result := make([]Kline, len(klines))
    for i, k := range klines {
        result[i] = Kline{
            OpenTime:  k.OpenTime,
            Open:      parseFloat(k.Open),
            High:      parseFloat(k.High),
            Low:       parseFloat(k.Low),
            Close:     parseFloat(k.Close),
            Volume:    parseFloat(k.Volume),
            CloseTime: k.CloseTime,
        }
    }
    
    return result, nil
}

// GetTicker24h retrieves 24hr ticker statistics
func (c *Client) GetTicker24h(symbol string) (*Ticker, error) {
    ticker, err := c.client.NewListPriceChangeStatsService().
        Symbol(symbol).
        Do(c.ctx)
    
    if err != nil {
        return nil, err
    }
    
    if len(ticker) == 0 {
        return nil, fmt.Errorf("no ticker data for %s", symbol)
    }
    
    t := ticker[0]
    return &Ticker{
        Symbol:             t.Symbol,
        PriceChange:        parseFloat(t.PriceChange),
        PriceChangePercent: parseFloat(t.PriceChangePercent),
        LastPrice:          parseFloat(t.LastPrice),
        Volume:             parseFloat(t.Volume),
        QuoteVolume:        parseFloat(t.QuoteVolume),
    }, nil
}

// GetAllTickers retrieves all tickers
func (c *Client) GetAllTickers() ([]Ticker, error) {
    prices, err := c.client.NewListPricesService().Do(c.ctx)
    if err != nil {
        return nil, err
    }
    
    result := make([]Ticker, len(prices))
    for i, p := range prices {
        result[i] = Ticker{
            Symbol:    p.Symbol,
            LastPrice: parseFloat(p.Price),
        }
    }
    
    return result, nil
}

func parseFloat(s string) float64 {
    f, _ := strconv.ParseFloat(s, 64)
    return f
}Step 2.2: WebSocket ImplementationСоздай internal/binance/websocket.go:gopackage binance

import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
    "time"
    
    "github.com/gorilla/websocket"
    log "github.com/sirupsen/logrus"
)

type WSClient struct {
    conn        *websocket.Conn
    url         string
    subscribers map[string][]chan interface{}
    mu          sync.RWMutex
    done        chan struct{}
    reconnect   bool
}

type KlineWSMessage struct {
    EventType string `json:"e"`
    EventTime int64  `json:"E"`
    Symbol    string `json:"s"`
    Kline     struct {
        StartTime    int64  `json:"t"`
        CloseTime    int64  `json:"T"`
        Symbol       string `json:"s"`
        Interval     string `json:"i"`
        Open         string `json:"o"`
        Close        string `json:"c"`
        High         string `json:"h"`
        Low          string `json:"l"`
        Volume       string `json:"v"`
        TradeCount   int    `json:"n"`
        IsFinal      bool   `json:"x"`
        QuoteVolume  string `json:"q"`
    } `json:"k"`
}

type TickerWSMessage struct {
    EventType          string `json:"e"`
    EventTime          int64  `json:"E"`
    Symbol             string `json:"s"`
    PriceChange        string `json:"p"`
    PriceChangePercent string `json:"P"`
    LastPrice          string `json:"c"`
    Volume             string `json:"v"`
    QuoteVolume        string `json:"q"`
}

func NewWSClient() *WSClient {
    return &WSClient{
        url:         "wss://stream.binance.com:9443/ws",
        subscribers: make(map[string][]chan interface{}),
        done:        make(chan struct{}),
        reconnect:   true,
    }
}

// Connect establishes WebSocket connection
func (ws *WSClient) Connect() error {
    var err error
    ws.conn, _, err = websocket.DefaultDialer.Dial(ws.url, nil)
    if err != nil {
        return fmt.Errorf("websocket dial error: %w", err)
    }
    
    go ws.readLoop()
    go ws.pingLoop()
    
    log.Info("WebSocket connected to Binance")
    return nil
}

// SubscribeKline subscribes to kline/candlestick stream
// symbol: lowercase, e.g., "btcusdt"
// interval: e.g., "1m", "5m", "1h"
func (ws *WSClient) SubscribeKline(symbol, interval string) (chan *KlineWSMessage, error) {
    stream := fmt.Sprintf("%s@kline_%s", symbol, interval)
    
    // Subscribe message
    msg := map[string]interface{}{
        "method": "SUBSCRIBE",
        "params": []string{stream},
        "id":     time.Now().UnixNano(),
    }
    
    if err := ws.conn.WriteJSON(msg); err != nil {
        return nil, err
    }
    
    ch := make(chan *KlineWSMessage, 100)
    ws.mu.Lock()
    ws.subscribers[stream] = append(ws.subscribers[stream], ch)
    ws.mu.Unlock()
    
    return ch, nil
}

// SubscribeTicker subscribes to 24hr ticker stream
func (ws *WSClient) SubscribeTicker(symbol string) (chan *TickerWSMessage, error) {
    stream := fmt.Sprintf("%s@ticker", symbol)
    
    msg := map[string]interface{}{
        "method": "SUBSCRIBE",
        "params": []string{stream},
        "id":     time.Now().UnixNano(),
    }
    
    if err := ws.conn.WriteJSON(msg); err != nil {
        return nil, err
    }
    
    ch := make(chan *TickerWSMessage, 100)
    ws.mu.Lock()
    ws.subscribers[stream] = append(ws.subscribers[stream], ch)
    ws.mu.Unlock()
    
    return ch, nil
}

// SubscribeAllTickers subscribes to all market tickers
func (ws *WSClient) SubscribeAllTickers() (chan *TickerWSMessage, error) {
    stream := "!ticker@arr"
    
    msg := map[string]interface{}{
        "method": "SUBSCRIBE",
        "params": []string{stream},
        "id":     time.Now().UnixNano(),
    }
    
    if err := ws.conn.WriteJSON(msg); err != nil {
        return nil, err
    }
    
    ch := make(chan *TickerWSMessage, 1000)
    ws.mu.Lock()
    ws.subscribers[stream] = append(ws.subscribers[stream], ch)
    ws.mu.Unlock()
    
    return ch, nil
}

func (ws *WSClient) readLoop() {
    defer func() {
        if ws.reconnect {
            ws.handleReconnect()
        }
    }()
    
    for {
        select {
        case <-ws.done:
            return
        default:
            _, message, err := ws.conn.ReadMessage()
            if err != nil {
                log.Errorf("WebSocket read error: %v", err)
                return
            }
            
            ws.handleMessage(message)
        }
    }
}

func (ws *WSClient) handleMessage(data []byte) {
    // Try to parse as kline message
    var kline KlineWSMessage
    if err := json.Unmarshal(data, &kline); err == nil && kline.EventType == "kline" {
        stream := fmt.Sprintf("%s@kline_%s", strings.ToLower(kline.Symbol), kline.Kline.Interval)
        ws.broadcast(stream, &kline)
        return
    }
    
    // Try to parse as ticker message
    var ticker TickerWSMessage
    if err := json.Unmarshal(data, &ticker); err == nil && ticker.EventType == "24hrTicker" {
        stream := fmt.Sprintf("%s@ticker", strings.ToLower(ticker.Symbol))
        ws.broadcast(stream, &ticker)
        return
    }
}

func (ws *WSClient) broadcast(stream string, msg interface{}) {
    ws.mu.RLock()
    defer ws.mu.RUnlock()
    
    if subs, ok := ws.subscribers[stream]; ok {
        for _, ch := range subs {
            select {
            case ch <- msg:
            default:
                // Channel full, skip
            }
        }
    }
}

func (ws *WSClient) pingLoop() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ws.done:
            return
        case <-ticker.C:
            if err := ws.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                log.Errorf("Ping error: %v", err)
                return
            }
        }
    }
}

func (ws *WSClient) handleReconnect() {
    log.Info("Attempting WebSocket reconnect...")
    time.Sleep(5 * time.Second)
    
    if err := ws.Connect(); err != nil {
        log.Errorf("Reconnect failed: %v", err)
        ws.handleReconnect()
    }
}

func (ws *WSClient) Close() {
    ws.reconnect = false
    close(ws.done)
    if ws.conn != nil {
        ws.conn.Close()
    }
}PHASE 3: TECHNICAL INDICATORSStep 3.1: Base Indicator InterfaceСоздай internal/indicators/types.go:gopackage indicators

// Indicator interface for all technical indicators
type Indicator interface {
    Update(price float64) float64
    Value() float64
    Reset()
}

// MultiValueIndicator for indicators returning multiple values
type MultiValueIndicator interface {
    Update(high, low, close, volume float64)
    Values() map[string]float64
    Reset()
}

// Signal represents a trading signal
type Signal struct {
    Type       string  // "BUY", "SELL", "HOLD"
    Strength   float64 // 0-1
    Indicator  string
    Reason     string
    Timestamp  int64
}

// IndicatorResult holds indicator values for a single candle
type IndicatorResult struct {
    Timestamp int64              `json:"timestamp"`
    Values    map[string]float64 `json:"values"`
}Step 3.2: EMA (Exponential Moving Average)Создай internal/indicators/ema.go:gopackage indicators

type EMA struct {
    period    int
    smoothing float64
    value     float64
    count     int
}

func NewEMA(period int) *EMA {
    return &EMA{
        period:    period,
        smoothing: 2.0 / float64(period+1),
    }
}

func (e *EMA) Update(price float64) float64 {
    e.count++
    
    if e.count == 1 {
        e.value = price
        return e.value
    }
    
    e.value = price*e.smoothing + e.value*(1-e.smoothing)
    return e.value
}

func (e *EMA) Value() float64 {
    return e.value
}

func (e *EMA) Reset() {
    e.value = 0
    e.count = 0
}

func (e *EMA) IsReady() bool {
    return e.count >= e.period
}Step 3.3: RSI (Relative Strength Index)Создай internal/indicators/rsi.go:gopackage indicators

import "math"

type RSI struct {
    period    int
    avgGain   float64
    avgLoss   float64
    prevPrice float64
    count     int
    gains     []float64
    losses    []float64
    value     float64
}

func NewRSI(period int) *RSI {
    return &RSI{
        period: period,
        gains:  make([]float64, 0, period),
        losses: make([]float64, 0, period),
    }
}

func (r *RSI) Update(price float64) float64 {
    if r.count == 0 {
        r.prevPrice = price
        r.count++
        r.value = 50.0
        return r.value
    }
    
    change := price - r.prevPrice
    gain := math.Max(change, 0)
    loss := math.Abs(math.Min(change, 0))
    
    r.prevPrice = price
    r.count++
    
    // Initial period - collect data
    if r.count <= r.period {
        r.gains = append(r.gains, gain)
        r.losses = append(r.losses, loss)
        
        if r.count == r.period {
            // Calculate initial averages
            r.avgGain = sum(r.gains) / float64(r.period)
            r.avgLoss = sum(r.losses) / float64(r.period)
        } else {
            r.value = 50.0
            return r.value
        }
    } else {
        // Smoothed moving average
        r.avgGain = (r.avgGain*float64(r.period-1) + gain) / float64(r.period)
        r.avgLoss = (r.avgLoss*float64(r.period-1) + loss) / float64(r.period)
    }
    
    if r.avgLoss == 0 {
        r.value = 100.0
        return r.value
    }
    
    rs := r.avgGain / r.avgLoss
    r.value = 100.0 - (100.0 / (1.0 + rs))
    
    return r.value
}

func (r *RSI) Value() float64 {
    return r.value
}

func (r *RSI) IsOverbought() bool {
    return r.value >= 70
}

func (r *RSI) IsOversold() bool {
    return r.value <= 30
}

func (r *RSI) Signal() Signal {
    if r.value <= 30 {
        return Signal{
            Type:      "BUY",
            Strength:  (30 - r.value) / 30,
            Indicator: "RSI",
            Reason:    "Oversold condition",
        }
    }
    if r.value >= 70 {
        return Signal{
            Type:      "SELL",
            Strength:  (r.value - 70) / 30,
            Indicator: "RSI",
            Reason:    "Overbought condition",
        }
    }
    return Signal{Type: "HOLD", Indicator: "RSI"}
}

func (r *RSI) Reset() {
    r.avgGain = 0
    r.avgLoss = 0
    r.prevPrice = 0
    r.count = 0
    r.gains = r.gains[:0]
    r.losses = r.losses[:0]
    r.value = 50
}

func sum(arr []float64) float64 {
    var s float64
    for _, v := range arr {
        s += v
    }
    return s
}Step 3.4: MACDСоздай internal/indicators/macd.go:gopackage indicators

type MACD struct {
    fastEMA   *EMA
    slowEMA   *EMA
    signalEMA *EMA
    macdLine  float64
    signal    float64
    histogram float64
    count     int
}

func NewMACD(fastPeriod, slowPeriod, signalPeriod int) *MACD {
    return &MACD{
        fastEMA:   NewEMA(fastPeriod),
        slowEMA:   NewEMA(slowPeriod),
        signalEMA: NewEMA(signalPeriod),
    }
}

// DefaultMACD creates MACD with standard 12, 26, 9 parameters
func DefaultMACD() *MACD {
    return NewMACD(12, 26, 9)
}

func (m *MACD) Update(price float64) (macdLine, signal, histogram float64) {
    m.count++
    
    fast := m.fastEMA.Update(price)
    slow := m.slowEMA.Update(price)
    
    m.macdLine = fast - slow
    m.signal = m.signalEMA.Update(m.macdLine)
    m.histogram = m.macdLine - m.signal
    
    return m.macdLine, m.signal, m.histogram
}

func (m *MACD) Values() (macdLine, signal, histogram float64) {
    return m.macdLine, m.signal, m.histogram
}

func (m *MACD) MACDLine() float64 {
    return m.macdLine
}

func (m *MACD) SignalLine() float64 {
    return m.signal
}

func (m *MACD) Histogram() float64 {
    return m.histogram
}

func (m *MACD) Signal() Signal {
    // Bullish crossover: MACD crosses above signal
    if m.macdLine > m.signal && m.histogram > 0 {
        return Signal{
            Type:      "BUY",
            Strength:  min(m.histogram/m.signal*10, 1.0),
            Indicator: "MACD",
            Reason:    "Bullish crossover",
        }
    }
    
    // Bearish crossover: MACD crosses below signal
    if m.macdLine < m.signal && m.histogram < 0 {
        return Signal{
            Type:      "SELL",
            Strength:  min(math.Abs(m.histogram/m.signal)*10, 1.0),
            Indicator: "MACD",
            Reason:    "Bearish crossover",
        }
    }
    
    return Signal{Type: "HOLD", Indicator: "MACD"}
}

func (m *MACD) Reset() {
    m.fastEMA.Reset()
    m.slowEMA.Reset()
    m.signalEMA.Reset()
    m.macdLine = 0
    m.signal = 0
    m.histogram = 0
    m.count = 0
}Step 3.5: Bollinger BandsСоздай internal/indicators/bollinger.go:gopackage indicators

import "math"

type BollingerBands struct {
    period     int
    multiplier float64
    prices     []float64
    upper      float64
    middle     float64
    lower      float64
}

func NewBollingerBands(period int, multiplier float64) *BollingerBands {
    return &BollingerBands{
        period:     period,
        multiplier: multiplier,
        prices:     make([]float64, 0, period),
    }
}

// DefaultBollingerBands creates BB with standard 20, 2.0 parameters
func DefaultBollingerBands() *BollingerBands {
    return NewBollingerBands(20, 2.0)
}

func (bb *BollingerBands) Update(price float64) (upper, middle, lower float64) {
    bb.prices = append(bb.prices, price)
    
    if len(bb.prices) > bb.period {
        bb.prices = bb.prices[1:]
    }
    
    if len(bb.prices) < bb.period {
        bb.middle = price
        bb.upper = price
        bb.lower = price
        return bb.upper, bb.middle, bb.lower
    }
    
    // Calculate SMA (middle band)
    bb.middle = sum(bb.prices) / float64(bb.period)
    
    // Calculate standard deviation
    var variance float64
    for _, p := range bb.prices {
        diff := p - bb.middle
        variance += diff * diff
    }
    stdDev := math.Sqrt(variance / float64(bb.period))
    
    // Calculate bands
    bb.upper = bb.middle + bb.multiplier*stdDev
    bb.lower = bb.middle - bb.multiplier*stdDev
    
    return bb.upper, bb.middle, bb.lower
}

func (bb *BollingerBands) Values() (upper, middle, lower float64) {
    return bb.upper, bb.middle, bb.lower
}

func (bb *BollingerBands) Upper() float64 {
    return bb.upper
}

func (bb *BollingerBands) Middle() float64 {
    return bb.middle
}

func (bb *BollingerBands) Lower() float64 {
    return bb.lower
}

// PercentB returns where price is relative to bands (0 = lower, 1 = upper)
func (bb *BollingerBands) PercentB(price float64) float64 {
    if bb.upper == bb.lower {
        return 0.5
    }
    return (price - bb.lower) / (bb.upper - bb.lower)
}

// Bandwidth returns the width of bands relative to middle
func (bb *BollingerBands) Bandwidth() float64 {
    if bb.middle == 0 {
        return 0
    }
    return (bb.upper - bb.lower) / bb.middle
}

func (bb *BollingerBands) Signal(price float64) Signal {
    percentB := bb.PercentB(price)
    
    // Price near or below lower band - potential buy
    if percentB <= 0.05 {
        return Signal{
            Type:      "BUY",
            Strength:  1 - percentB*20,
            Indicator: "BollingerBands",
            Reason:    "Price at lower band",
        }
    }
    
    // Price near or above upper band - potential sell
    if percentB >= 0.95 {
        return Signal{
            Type:      "SELL",
            Strength:  (percentB - 0.95) * 20,
            Indicator: "BollingerBands",
            Reason:    "Price at upper band",
        }
    }
    
    return Signal{Type: "HOLD", Indicator: "BollingerBands"}
}

func (bb *BollingerBands) Reset() {
    bb.prices = bb.prices[:0]
    bb.upper = 0
    bb.middle = 0
    bb.lower = 0
}Step 3.6: ATR (Average True Range)Создай internal/indicators/atr.go:gopackage indicators

import "math"

type ATR struct {
    period    int
    prevClose float64
    trValues  []float64
    value     float64
    count     int
}

func NewATR(period int) *ATR {
    return &ATR{
        period:   period,
        trValues: make([]float64, 0, period),
    }
}

func (a *ATR) Update(high, low, close float64) float64 {
    var trueRange float64
    
    if a.count == 0 {
        trueRange = high - low
    } else {
        // True Range = max(H-L, |H-prevClose|, |L-prevClose|)
        trueRange = math.Max(
            high-low,
            math.Max(
                math.Abs(high-a.prevClose),
                math.Abs(low-a.prevClose),
            ),
        )
    }
    
    a.prevClose = close
    a.count++
    
    a.trValues = append(a.trValues, trueRange)
    if len(a.trValues) > a.period {
        a.trValues = a.trValues[1:]
    }
    
    if len(a.trValues) < a.period {
        a.value = sum(a.trValues) / float64(len(a.trValues))
        return a.value
    }
    
    // Smoothed ATR
    if a.count == a.period {
        a.value = sum(a.trValues) / float64(a.period)
    } else {
        a.value = (a.value*float64(a.period-1) + trueRange) / float64(a.period)
    }
    
    return a.value
}

func (a *ATR) Value() float64 {
    return a.value
}

// StopLoss calculates stop loss distance using ATR multiplier
func (a *ATR) StopLoss(multiplier float64) float64 {
    return a.value * multiplier
}

func (a *ATR) Reset() {
    a.prevClose = 0
    a.trValues = a.trValues[:0]
    a.value = 0
    a.count = 0
}Step 3.7: Stochastic RSIСоздай internal/indicators/stoch_rsi.go:gopackage indicators

type StochRSI struct {
    rsi        *RSI
    period     int
    smoothK    int
    smoothD    int
    rsiValues  []float64
    kValues    []float64
    k          float64
    d          float64
}

func NewStochRSI(rsiPeriod, stochPeriod, smoothK, smoothD int) *StochRSI {
    return &StochRSI{
        rsi:       NewRSI(rsiPeriod),
        period:    stochPeriod,
        smoothK:   smoothK,
        smoothD:   smoothD,
        rsiValues: make([]float64, 0, stochPeriod),
        kValues:   make([]float64, 0, smoothD),
    }
}

// DefaultStochRSI creates with standard 14, 14, 3, 3 parameters
func DefaultStochRSI() *StochRSI {
    return NewStochRSI(14, 14, 3, 3)
}

func (s *StochRSI) Update(price float64) (k, d float64) {
    rsiValue := s.rsi.Update(price)
    
    s.rsiValues = append(s.rsiValues, rsiValue)
    if len(s.rsiValues) > s.period {
        s.rsiValues = s.rsiValues[1:]
    }
    
    if len(s.rsiValues) < s.period {
        s.k = 50
        s.d = 50
        return s.k, s.d
    }
    
    // Calculate Stochastic of RSI
    minRSI := minSlice(s.rsiValues)
    maxRSI := maxSlice(s.rsiValues)
    
    if maxRSI-minRSI == 0 {
        s.k = 50
    } else {
        rawK := ((rsiValue - minRSI) / (maxRSI - minRSI)) * 100
        
        // Smooth %K
        s.kValues = append(s.kValues, rawK)
        if len(s.kValues) > s.smoothK {
            s.kValues = s.kValues[1:]
        }
        s.k = sum(s.kValues) / float64(len(s.kValues))
    }
    
    // %D is SMA of %K (already smoothed)
    s.d = s.k // Simplified, can add separate smoothing
    
    return s.k, s.d
}

func (s *StochRSI) Values() (k, d float64) {
    return s.k, s.d
}

func (s *StochRSI) Signal() Signal {
    // Oversold: K < 20
    if s.k < 20 {
        return Signal{
            Type:      "BUY",
            Strength:  (20 - s.k) / 20,
            Indicator: "StochRSI",
            Reason:    "Oversold condition",
        }
    }
    
    // Overbought: K > 80
    if s.k > 80 {
        return Signal{
            Type:      "SELL",
            Strength:  (s.k - 80) / 20,
            Indicator: "StochRSI",
            Reason:    "Overbought condition",
        }
    }
    
    return Signal{Type: "HOLD", Indicator: "StochRSI"}
}

func (s *StochRSI) Reset() {
    s.rsi.Reset()
    s.rsiValues = s.rsiValues[:0]
    s.kValues = s.kValues[:0]
    s.k = 50
    s.d = 50
}

func minSlice(arr []float64) float64 {
    if len(arr) == 0 {
        return 0
    }
    m := arr[0]
    for _, v := range arr[1:] {
        if v < m {
            m = v
        }
    }
    return m
}

func maxSlice(arr []float64) float64 {
    if len(arr) == 0 {
        return 0
    }
    m := arr[0]
    for _, v := range arr[1:] {
        if v > m {
            m = v
        }
    }
    return m
}Step 3.8: OBV (On-Balance Volume)Создай internal/indicators/obv.go:gopackage indicators

type OBV struct {
    value     float64
    prevClose float64
    prevOBV   float64
    count     int
}

func NewOBV() *OBV {
    return &OBV{}
}

func (o *OBV) Update(close, volume float64) float64 {
    if o.count == 0 {
        o.prevClose = close
        o.value = volume
        o.count++
        return o.value
    }
    
    o.prevOBV = o.value
    
    if close > o.prevClose {
        o.value += volume
    } else if close < o.prevClose {
        o.value -= volume
    }
    // If close == prevClose, OBV unchanged
    
    o.prevClose = close
    o.count++
    
    return o.value
}

func (o *OBV) Value() float64 {
    return o.value
}

// Trend returns the direction of OBV movement
func (o *OBV) Trend() string {
    if o.value > o.prevOBV {
        return "UP"
    } else if o.value < o.prevOBV {
        return "DOWN"
    }
    return "FLAT"
}

func (o *OBV) Reset() {
    o.value = 0
    o.prevClose = 0
    o.prevOBV = 0
    o.count = 0
}Step 3.9: Indicator ManagerСоздай internal/indicators/manager.go:gopackage indicators

import (
    "sync"
)

// IndicatorSet holds all indicators for a symbol/timeframe combination
type IndicatorSet struct {
    EMA9       *EMA
    EMA21      *EMA
    EMA50      *EMA
    EMA200     *EMA
    RSI14      *RSI
    RSI7       *RSI
    MACD       *MACD
    BB         *BollingerBands
    ATR14      *ATR
    StochRSI   *StochRSI
    OBV        *OBV
    mu         sync.RWMutex
}

func NewIndicatorSet() *IndicatorSet {
    return &IndicatorSet{
        EMA9:     NewEMA(9),
        EMA21:    NewEMA(21),
        EMA50:    NewEMA(50),
        EMA200:   NewEMA(200),
        RSI14:    NewRSI(14),
        RSI7:     NewRSI(7),
        MACD:     DefaultMACD(),
        BB:       DefaultBollingerBands(),
        ATR14:    NewATR(14),
        StochRSI: DefaultStochRSI(),
        OBV:      NewOBV(),
    }
}

// UpdateAll updates all indicators with new candle data
func (is *IndicatorSet) UpdateAll(high, low, close, volume float64) *IndicatorValues {
    is.mu.Lock()
    defer is.mu.Unlock()
    
    // Update all indicators
    ema9 := is.EMA9.Update(close)
    ema21 := is.EMA21.Update(close)
    ema50 := is.EMA50.Update(close)
    ema200 := is.EMA200.Update(close)
    
    rsi14 := is.RSI14.Update(close)
    rsi7 := is.RSI7.Update(close)
    
    macdLine, macdSignal, macdHist := is.MACD.Update(close)
    
    bbUpper, bbMiddle, bbLower := is.BB.Update(close)
    
    atr := is.ATR14.Update(high, low, close)
    
    stochK, stochD := is.StochRSI.Update(close)
    
    obv := is.OBV.Update(close, volume)
    
    return &IndicatorValues{
        EMA9:       ema9,
        EMA21:      ema21,
        EMA50:      ema50,
        EMA200:     ema200,
        RSI14:      rsi14,
        RSI7:       rsi7,
        MACDLine:   macdLine,
        MACDSignal: macdSignal,
        MACDHist:   macdHist,
        BBUpper:    bbUpper,
        BBMiddle:   bbMiddle,
        BBLower:    bbLower,
        BBPercentB: is.BB.PercentB(close),
        ATR14:      atr,
        StochRSI_K: stochK,
        StochRSI_D: stochD,
        OBV:        obv,
    }
}

// GetSignals returns all current signals
func (is *IndicatorSet) GetSignals(price float64) []Signal {
    is.mu.RLock()
    defer is.mu.RUnlock()
    
    signals := []Signal{
        is.RSI14.Signal(),
        is.RSI7.Signal(),
        is.MACD.Signal(),
        is.BB.Signal(price),
        is.StochRSI.Signal(),
    }
    
    // EMA crossover signals
    if is.EMA9.Value() > is.EMA21.Value() {
        signals = append(signals, Signal{
            Type:      "BUY",
            Strength:  0.6,
            Indicator: "EMA",
            Reason:    "EMA9 above EMA21",
        })
    } else if is.EMA9.Value() < is.EMA21.Value() {
        signals = append(signals, Signal{
            Type:      "SELL",
            Strength:  0.6,
            Indicator: "EMA",
            Reason:    "EMA9 below EMA21",
        })
    }
    
    return signals
}

func (is *IndicatorSet) Reset() {
    is.mu.Lock()
    defer is.mu.Unlock()
    
    is.EMA9.Reset()
    is.EMA21.Reset()
    is.EMA50.Reset()
    is.EMA200.Reset()
    is.RSI14.Reset()
    is.RSI7.Reset()
    is.MACD.Reset()
    is.BB.Reset()
    is.ATR14.Reset()
    is.StochRSI.Reset()
    is.OBV.Reset()
}

// IndicatorValues holds all calculated values
type IndicatorValues struct {
    EMA9       float64 `json:"ema9"`
    EMA21      float64 `json:"ema21"`
    EMA50      float64 `json:"ema50"`
    EMA200     float64 `json:"ema200"`
    RSI14      float64 `json:"rsi14"`
    RSI7       float64 `json:"rsi7"`
    MACDLine   float64 `json:"macdLine"`
    MACDSignal float64 `json:"macdSignal"`
    MACDHist   float64 `json:"macdHist"`
    BBUpper    float64 `json:"bbUpper"`
    BBMiddle   float64 `json:"bbMiddle"`
    BBLower    float64 `json:"bbLower"`
    BBPercentB float64 `json:"bbPercentB"`
    ATR14      float64 `json:"atr14"`
    StochRSI_K float64 `json:"stochRsiK"`
    StochRSI_D float64 `json:"stochRsiD"`
    OBV        float64 `json:"obv"`
}

// IndicatorManager manages indicators for multiple symbols/timeframes
type IndicatorManager struct {
    sets map[string]*IndicatorSet // key: "symbol:timeframe"
    mu   sync.RWMutex
}

func NewIndicatorManager() *IndicatorManager {
    return &IndicatorManager{
        sets: make(map[string]*IndicatorSet),
    }
}

func (im *IndicatorManager) GetOrCreate(symbol, timeframe string) *IndicatorSet {
    key := symbol + ":" + timeframe
    
    im.mu.RLock()
    if set, ok := im.sets[key]; ok {
        im.mu.RUnlock()
        return set
    }
    im.mu.RUnlock()
    
    im.mu.Lock()
    defer im.mu.Unlock()
    
    // Double-check after acquiring write lock
    if set, ok := im.sets[key]; ok {
        return set
    }
    
    set := NewIndicatorSet()
    im.sets[key] = set
    return set
}PHASE 4: ML SERVICE (Python)Step 4.1: gRPC Protocol DefinitionСоздай ml_service/proto/prediction.proto:protobufsyntax = "proto3";

package prediction;

option go_package = "crypto-trading-bot/internal/ml/proto";

service PredictionService {
    // Get price direction prediction
    rpc Predict(PredictionRequest) returns (PredictionResponse);
    
    // Get predictions for multiple timeframes
    rpc PredictMultiTimeframe(MultiTimeframeRequest) returns (MultiTimeframeResponse);
    
    // Get sentiment analysis
    rpc AnalyzeSentiment(SentimentRequest) returns (SentimentResponse);
    
    // Analyze Trump tweet
    rpc AnalyzeTrumpTweet(TweetRequest) returns (TweetAnalysisResponse);
    
    // Health check
    rpc HealthCheck(Empty) returns (HealthResponse);
}

message Empty {}

message HealthResponse {
    bool healthy = 1;
    string version = 2;
    repeated string loaded_models = 3;
}

message PredictionRequest {
    string symbol = 1;
    string timeframe = 2;
    repeated Candle candles = 3;
    IndicatorValues indicators = 4;
    float sentiment_score = 5;
}

message Candle {
    int64 timestamp = 1;
    double open = 2;
    double high = 3;
    double low = 4;
    double close = 5;
    double volume = 6;
}

message IndicatorValues {
    double ema9 = 1;
    double ema21 = 2;
    double ema50 = 3;
    double ema200 = 4;
    double rsi14 = 5;
    double rsi7 = 6;
    double macd_line = 7;
    double macd_signal = 8;
    double macd_hist = 9;
    double bb_upper = 10;
    double bb_middle = 11;
    double bb_lower = 12;
    double bb_percent_b = 13;
    double atr14 = 14;
    double stoch_rsi_k = 15;
    double stoch_rsi_d = 16;
    double obv = 17;
}

message PredictionResponse {
    string direction = 1;         // "UP", "DOWN", "NEUTRAL"
    double probability = 2;        // 0-1
    double confidence = 3;         // 0-1
    double expected_move = 4;      // Expected price change %
    string model_used = 5;
    int64 timestamp = 6;
}

message MultiTimeframeRequest {
    string symbol = 1;
    repeated string timeframes = 2;
    map<string, CandleArray> candles_by_timeframe = 3;
    float sentiment_score = 4;
}

message CandleArray {
    repeated Candle candles = 1;
}

message MultiTimeframeResponse {
    map<string, PredictionResponse> predictions = 1;
    ConsensusResult consensus = 2;
}

message ConsensusResult {
    string direction = 1;
    double alignment = 2;      // How many timeframes agree (0-1)
    double confidence = 3;
    bool actionable = 4;       // True if alignment > threshold
}

message SentimentRequest {
    repeated string texts = 1;
    string source = 2;         // "twitter", "news", "reddit"
}

message SentimentResponse {
    double overall_score = 1;   // -1 to 1
    double positive = 2;
    double negative = 3;
    double neutral = 4;
    repeated TextSentiment individual = 5;
}

message TextSentiment {
    string text = 1;
    double score = 2;
    string label = 3;
}

message TweetRequest {
    string tweet_text = 1;
    string author = 2;
    int64 timestamp = 3;
}

message TweetAnalysisResponse {
    double impact_score = 1;     // 0-1, how impactful for crypto
    double sentiment = 2;        // -1 to 1
    double signal = 3;           // Combined impact * sentiment
    repeated string keywords = 4;
    string analysis = 5;
    bool is_crypto_related = 6;
    bool is_market_related = 7;
}Step 4.2: Python ML Service MainСоздай ml_service/main.py:pythonimport asyncio
import logging
from concurrent import futures
import grpc
from grpc_reflection.v1alpha import reflection

import prediction_pb2
import prediction_pb2_grpc
from models.lstm_model import LSTMPredictor
from models.xgboost_model import XGBoostPredictor
from models.ensemble import EnsemblePredictor
from sentiment.finbert import FinBERTAnalyzer
from sentiment.trump_analyzer import TrumpAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PredictionServicer(prediction_pb2_grpc.PredictionServiceServicer):
    def __init__(self):
        logger.info("Initializing ML models...")
        
        # Initialize models
        self.lstm = LSTMPredictor()
        self.xgboost = XGBoostPredictor()
        self.ensemble = EnsemblePredictor(self.lstm, self.xgboost)
        
        # Initialize sentiment analyzers
        self.finbert = FinBERTAnalyzer()
        self.trump_analyzer = TrumpAnalyzer()
        
        logger.info("ML models initialized successfully")
    
    def HealthCheck(self, request, context):
        return prediction_pb2.HealthResponse(
            healthy=True,
            version="1.0.0",
            loaded_models=["LSTM", "XGBoost", "FinBERT"]
        )
    
    def Predict(self, request, context):
        try:
            # Convert protobuf to numpy arrays
            candles = self._parse_candles(request.candles)
            indicators = self._parse_indicators(request.indicators)
            
            # Get prediction from ensemble
            result = self.ensemble.predict(
                candles=candles,
                indicators=indicators,
                sentiment_score=request.sentiment_score,
                timeframe=request.timeframe
            )
            
            return prediction_pb2.PredictionResponse(
                direction=result['direction'],
                probability=result['probability'],
                confidence=result['confidence'],
                expected_move=result['expected_move'],
                model_used=result['model'],
                timestamp=int(time.time() * 1000)
            )
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.PredictionResponse()
    
    def PredictMultiTimeframe(self, request, context):
        try:
            predictions = {}
            
            for tf in request.timeframes:
                candles = self._parse_candles(
                    request.candles_by_timeframe[tf].candles
                )
                
                result = self.ensemble.predict(
                    candles=candles,
                    indicators=None,  # Will be calculated internally
                    sentiment_score=request.sentiment_score,
                    timeframe=tf
                )
                
                predictions[tf] = prediction_pb2.PredictionResponse(
                    direction=result['direction'],
                    probability=result['probability'],
                    confidence=result['confidence'],
                    expected_move=result['expected_move'],
                    model_used=result['model']
                )
            
            # Calculate consensus
            consensus = self._calculate_consensus(predictions)
            
            return prediction_pb2.MultiTimeframeResponse(
                predictions=predictions,
                consensus=consensus
            )
            
        except Exception as e:
            logger.error(f"Multi-timeframe prediction error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.MultiTimeframeResponse()
    
    def AnalyzeSentiment(self, request, context):
        try:
            results = self.finbert.analyze_batch(request.texts)
            
            individual = [
                prediction_pb2.TextSentiment(
                    text=r['text'],
                    score=r['score'],
                    label=r['label']
                )
                for r in results['individual']
            ]
            
            return prediction_pb2.SentimentResponse(
                overall_score=results['overall_score'],
                positive=results['positive'],
                negative=results['negative'],
                neutral=results['neutral'],
                individual=individual
            )
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.SentimentResponse()
    
    def AnalyzeTrumpTweet(self, request, context):
        try:
            result = self.trump_analyzer.analyze(
                tweet_text=request.tweet_text,
                timestamp=request.timestamp
            )
            
            return prediction_pb2.TweetAnalysisResponse(
                impact_score=result['impact_score'],
                sentiment=result['sentiment'],
                signal=result['signal'],
                keywords=result['keywords'],
                analysis=result['analysis'],
                is_crypto_related=result['is_crypto_related'],
                is_market_related=result['is_market_related']
            )
            
        except Exception as e:
            logger.error(f"Trump tweet analysis error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.TweetAnalysisResponse()
    
    def _parse_candles(self, candles):
        import numpy as np
        return np.array([
            [c.open, c.high, c.low, c.close, c.volume]
            for c in candles
        ])
    
    def _parse_indicators(self, ind):
        if ind is None:
            return None
        return {
            'ema9': ind.ema9,
            'ema21': ind.ema21,
            'ema50': ind.ema50,
            'ema200': ind.ema200,
            'rsi14': ind.rsi14,
            'rsi7': ind.rsi7,
            'macd_line': ind.macd_line,
            'macd_signal': ind.macd_signal,
            'macd_hist': ind.macd_hist,
            'bb_upper': ind.bb_upper,
            'bb_middle': ind.bb_middle,
            'bb_lower': ind.bb_lower,
            'bb_percent_b': ind.bb_percent_b,
            'atr14': ind.atr14,
            'stoch_rsi_k': ind.stoch_rsi_k,
            'stoch_rsi_d': ind.stoch_rsi_d,
            'obv': ind.obv,
        }
    
    def _calculate_consensus(self, predictions):
        up_count = 0
        down_count = 0
        total_confidence = 0
        
        weights = {
            '5m': 0.15,
            '15m': 0.20,
            '1h': 0.25,
            '4h': 0.25,
            '1d': 0.15
        }
        
        for tf, pred in predictions.items():
            weight = weights.get(tf, 0.2)
            if pred.direction == "UP":
                up_count += 1
                total_confidence += pred.confidence * weight
            elif pred.direction == "DOWN":
                down_count += 1
                total_confidence -= pred.confidence * weight
        
        total = len(predictions)
        alignment = max(up_count, down_count) / total if total > 0 else 0
        
        return prediction_pb2.ConsensusResult(
            direction="UP" if up_count > down_count else "DOWN",
            alignment=alignment,
            confidence=abs(total_confidence),
            actionable=alignment >= 0.7
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_pb2_grpc.add_PredictionServiceServicer_to_server(
        PredictionServicer(), server
    )
    
    # Enable reflection for debugging
    SERVICE_NAMES = (
        prediction_pb2.DESCRIPTOR.services_by_name['PredictionService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)
    
    server.add_insecure_port('[::]:50051')
    logger.info("ML Service starting on port 50051...")
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    serve()Step 4.3: LSTM ModelСоздай ml_service/models/lstm_model.py:pythonimport numpy as np
import torch
import torch.nn as nn
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class LSTMNetwork(nn.Module):
    def __init__(
        self,
        input_size: int = 15,
        hidden_size: int = 128,
        num_layers: int = 2,
        output_size: int = 3,  # UP, NEUTRAL, DOWN
        dropout: float = 0.2
    ):
        super().__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        self.dropout = nn.Dropout(dropout)
        
        self.fc1 = nn.Linear(hidden_size, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, output_size)
        
        self.relu = nn.ReLU()
        self.softmax = nn.Softmax(dim=1)
    
    def forward(self, x):
        # x shape: (batch, sequence, features)
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # Use last hidden state
        out = lstm_out[:, -1, :]  # (batch, hidden_size)
        
        out = self.dropout(out)
        out = self.relu(self.fc1(out))
        out = self.dropout(out)
        out = self.relu(self.fc2(out))
        out = self.fc3(out)
        
        return self.softmax(out)


class LSTMPredictor:
    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.sequence_length = 60
        self.feature_columns = [
            'returns', 'volume_change', 'rsi', 'macd', 'macd_signal',
            'bb_position', 'ema_cross', 'atr_normalized', 'stoch_rsi',
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'sentiment', 'obv_change'
        ]
        
        self.model = LSTMNetwork(
            input_size=len(self.feature_columns),
            hidden_size=128,
            num_layers=2,
            output_size=3
        ).to(self.device)
        
        if model_path:
            self._load_model(model_path)
        
        self.model.eval()
        logger.info(f"LSTM model initialized on {self.device}")
    
    def _load_model(self, path: str):
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        logger.info(f"Loaded model from {path}")
    
    def _prepare_features(
        self,
        candles: np.ndarray,
        indicators: Optional[Dict] = None,
        sentiment_score: float = 0.0
    ) -> torch.Tensor:
        """
        Prepare feature matrix from candles and indicators
        candles shape: (N, 5) - [open, high, low, close, volume]
        """
        if len(candles) < self.sequence_length:
            # Pad with first values if not enough data
            pad_size = self.sequence_length - len(candles)
            padding = np.repeat(candles[:1], pad_size, axis=0)
            candles = np.vstack([padding, candles])
        
        # Take last sequence_length candles
        candles = candles[-self.sequence_length:]
        
        opens = candles[:, 0]
        highs = candles[:, 1]
        lows = candles[:, 2]
        closes = candles[:, 3]
        volumes = candles[:, 4]
        
        # Calculate features
        features = []
        
        # Returns
        returns = np.diff(closes, prepend=closes[0]) / (closes + 1e-8)
        features.append(returns)
        
        # Volume change
        vol_change = np.diff(volumes, prepend=volumes[0]) / (volumes + 1e-8)
        features.append(np.clip(vol_change, -1, 1))
        
        # RSI (simplified)
        rsi = self._calculate_rsi(closes, 14) / 100
        features.append(rsi)
        
        # MACD
        ema12 = self._ema(closes, 12)
        ema26 = self._ema(closes, 26)
        macd = (ema12 - ema26) / (closes + 1e-8)
        features.append(macd)
        
        macd_signal = self._ema(macd, 9)
        features.append(macd_signal)
        
        # Bollinger position
        sma20 = self._sma(closes, 20)
        std20 = self._rolling_std(closes, 20)
        bb_upper = sma20 + 2 * std20
        bb_lower = sma20 - 2 * std20
        bb_position = (closes - bb_lower) / (bb_upper - bb_lower + 1e-8)
        features.append(np.clip(bb_position, 0, 1))
        
        # EMA cross
        ema9 = self._ema(closes, 9)
        ema21 = self._ema(closes, 21)
        ema_cross = (ema9 - ema21) / (closes + 1e-8)
        features.append(ema_cross)
        
        # ATR normalized
        tr = np.maximum(highs - lows, np.abs(highs - np.roll(closes, 1)))
        tr = np.maximum(tr, np.abs(lows - np.roll(closes, 1)))
        atr = self._sma(tr, 14)
        atr_norm = atr / (closes + 1e-8)
        features.append(atr_norm)
        
        # Stochastic RSI
        stoch_rsi = self._stochastic_rsi(closes, 14, 14)
        features.append(stoch_rsi)
        
        # Time features (assuming hourly data, adjust as needed)
        hours = np.arange(len(closes)) % 24
        features.append(np.sin(2 * np.pi * hours / 24))
        features.append(np.cos(2 * np.pi * hours / 24))
        
        days = (np.arange(len(closes)) // 24) % 7
        features.append(np.sin(2 * np.pi * days / 7))
        features.append(np.cos(2 * np.pi * days / 7))
        
        # Sentiment (constant for now, will be updated with real data)
        features.append(np.full(len(closes), sentiment_score))
        
        # OBV change
        obv = self._calculate_obv(closes, volumes)
        obv_change = np.diff(obv, prepend=obv[0]) / (np.abs(obv) + 1e-8)
        features.append(np.clip(obv_change, -1, 1))
        
        # Stack features
        feature_matrix = np.stack(features, axis=1)  # (sequence_length, num_features)
        
        # Normalize
        feature_matrix = (feature_matrix - feature_matrix.mean(axis=0)) / (feature_matrix.std(axis=0) + 1e-8)
        
        # Convert to tensor
        tensor = torch.FloatTensor(feature_matrix).unsqueeze(0).to(self.device)
        
        return tensor
    
    def predict(
        self,
        candles: np.ndarray,
        indicators: Optional[Dict] = None,
        sentiment_score: float = 0.0,
        timeframe: str = "1h"
    ) -> Dict[str, Any]:
        """Make prediction on prepared data"""
        
        with torch.no_grad():
            features = self._prepare_features(candles, indicators, sentiment_score)
            output = self.model(features)
            
            probabilities = output.cpu().numpy()[0]
            
            # Classes: [DOWN, NEUTRAL, UP]
            direction_idx = np.argmax(probabilities)
            directions = ["DOWN", "NEUTRAL", "UP"]
            
            # Calculate expected move based on ATR and direction
            closes = candles[-self.sequence_length:, 3]
            atr = self._calculate_atr(candles[-self.sequence_length:], 14)
            
            expected_move = atr[-1] / closes[-1] * 100  # As percentage
            if direction_idx == 0:
                expected_move = -expected_move
            elif direction_idx == 1:
                expected_move = expected_move * 0.2  # Smaller move for neutral
            
            return {
                'direction': directions[direction_idx],
                'probability': float(probabilities[direction_idx]),
                'confidence': float(max(probabilities) - 1/3),  # Confidence above random
                'expected_move': float(expected_move),
                'model': 'LSTM',
                'probabilities': {
                    'down': float(probabilities[0]),
                    'neutral': float(probabilities[1]),
                    'up': float(probabilities[2])
                }
            }
    
    @staticmethod
    def _ema(data, period):
        alpha = 2 / (period + 1)
        result = np.zeros_like(data)
        result[0] = data[0]
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i-1]
        return result
    
    @staticmethod
    def _sma(data, period):
        result = np.zeros_like(data)
        for i in range(len(data)):
            start = max(0, i - period + 1)
            result[i] = np.mean(data[start:i+1])
        return result
    
    @staticmethod
    def _rolling_std(data, period):
        result = np.zeros_like(data)
        for i in range(len(data)):
            start = max(0, i - period + 1)
            result[i] = np.std(data[start:i+1])
        return result
    
    @staticmethod
    def _calculate_rsi(closes, period):
        deltas = np.diff(closes, prepend=closes[0])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = LSTMPredictor._sma(gains, period)
        avg_loss = LSTMPredictor._sma(losses, period)
        
        rs = avg_gain / (avg_loss + 1e-8)
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def _stochastic_rsi(closes, rsi_period, stoch_period):
        rsi = LSTMPredictor._calculate_rsi(closes, rsi_period)
        
        result = np.zeros_like(rsi)
        for i in range(len(rsi)):
            start = max(0, i - stoch_period + 1)
            window = rsi[start:i+1]
            min_rsi = np.min(window)
            max_rsi = np.max(window)
            if max_rsi - min_rsi == 0:
                result[i] = 0.5
            else:
                result[i] = (rsi[i] - min_rsi) / (max_rsi - min_rsi)
        return result
    
    @staticmethod
    def _calculate_obv(closes, volumes):
        obv = np.zeros_like(closes)
        obv[0] = volumes[0]
        for i in range(1, len(closes)):
            if closes[i] > closes[i-1]:
                obv[i] = obv[i-1] + volumes[i]
            elif closes[i] < closes[i-1]:
                obv[i] = obv[i-1] - volumes[i]
            else:
                obv[i] = obv[i-1]
        return obv
    
    @staticmethod
    def _calculate_atr(candles, period):
        highs = candles[:, 1]
        lows = candles[:, 2]
        closes = candles[:, 3]
        
        tr = np.maximum(highs - lows, np.abs(highs - np.roll(closes, 1)))
        tr = np.maximum(tr, np.abs(lows - np.roll(closes, 1)))
        tr[0] = highs[0] - lows[0]
        
        return LSTMPredictor._sma(tr, period)Step 4.4: XGBoost ModelСоздай ml_service/models/xgboost_model.py:pythonimport numpy as np
import xgboost as xgb
from typing import Dict, Any, Optional
import logging
import joblib

logger = logging.getLogger(__name__)


class XGBoostPredictor:
    def __init__(self, model_path: Optional[str] = None):
        self.feature_names = [
            'returns_1', 'returns_5', 'returns_10', 'returns_20',
            'volume_ratio_5', 'volume_ratio_20',
            'rsi_7', 'rsi_14',
            'macd', 'macd_signal', 'macd_hist',
            'bb_position', 'bb_width',
            'ema_cross_9_21', 'ema_cross_21_50',
            'atr_ratio',
            'stoch_rsi_k', 'stoch_rsi_d',
            'hour_sin', 'hour_cos',
            'day_sin', 'day_cos',
            'sentiment'
        ]
        
        if model_path:
            self.model = joblib.load(model_path)
            logger.info(f"Loaded XGBoost model from {model_path}")
        else:
            # Initialize with default parameters for later training
            self.model = xgb.XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                objective='multi:softprob',
                num_class=3,
                random_state=42,
                use_label_encoder=False,
                eval_metric='mlogloss'
            )
            logger.info("Initialized XGBoost model with default parameters")
    
    def _extract_features(
        self,
        candles: np.ndarray,
        sentiment_score: float = 0.0
    ) -> np.ndarray:
        """Extract features from candles for XGBoost"""
        
        if len(candles) < 50:
            # Pad if needed
            pad_size = 50 - len(candles)
            padding = np.repeat(candles[:1], pad_size, axis=0)
            candles = np.vstack([padding, candles])
        
        opens = candles[:, 0]
        highs = candles[:, 1]
        lows = candles[:, 2]
        closes = candles[:, 3]
        volumes = candles[:, 4]
        
        # Use last candle for prediction
        current_close = closes[-1]
        current_volume = volumes[-1]
        
        features = []
        
        # Returns at different lookbacks
        for period in [1, 5, 10, 20]:
            if len(closes) > period:
                ret = (current_close - closes[-period-1]) / closes[-period-1]
            else:
                ret = 0
            features.append(ret)
        
        # Volume ratios
        vol_ma5 = np.mean(volumes[-5:])
        vol_ma20 = np.mean(volumes[-20:])
        features.append(current_volume / (vol_ma5 + 1e-8))
        features.append(current_volume / (vol_ma20 + 1e-8))
        
        # RSI
        features.append(self._calculate_rsi(closes, 7)[-1] / 100)
        features.append(self._calculate_rsi(closes, 14)[-1] / 100)
        
        # MACD
        ema12 = self._ema(closes, 12)[-1]
        ema26 = self._ema(closes, 26)[-1]
        macd = (ema12 - ema26) / current_close
        macd_signal = self._ema(np.array([ema12 - ema26 for _ in range(9)]), 9)[-1] / current_close
        features.append(macd)
        features.append(macd_signal)
        features.append(macd - macd_signal)
        
        # Bollinger Bands
        sma20 = np.mean(closes[-20:])
        std20 = np.std(closes[-20:])
        bb_upper = sma20 + 2 * std20
        bb_lower = sma20 - 2 * std20
        bb_position = (current_close - bb_lower) / (bb_upper - bb_lower + 1e-8)
        bb_width = (bb_upper - bb_lower) / sma20
        features.append(np.clip(bb_position, 0, 1))
        features.append(bb_width)
        
        # EMA crosses
        ema9 = self._ema(closes, 9)[-1]
        ema21 = self._ema(closes, 21)[-1]
        ema50 = self._ema(closes, 50)[-1]
        features.append((ema9 - ema21) / current_close)
        features.append((ema21 - ema50) / current_close)
        
        # ATR ratio
        tr = np.maximum(highs[-14:] - lows[-14:], 
                       np.abs(highs[-14:] - np.roll(closes[-14:], 1)))
        atr = np.mean(tr)
        features.append(atr / current_close)
        
        # Stochastic RSI
        rsi = self._calculate_rsi(closes, 14)
        rsi_window = rsi[-14:]
        min_rsi = np.min(rsi_window)
        max_rsi = np.max(rsi_window)
        stoch_k = (rsi[-1] - min_rsi) / (max_rsi - min_rsi + 1e-8)
        stoch_d = np.mean([stoch_k])  # Simplified
        features.append(stoch_k)
        features.append(stoch_d)
        
        # Time features (using index as proxy)
        hour = len(closes) % 24
        day = (len(closes) // 24) % 7
        features.append(np.sin(2 * np.pi * hour / 24))
        features.append(np.cos(2 * np.pi * hour / 24))
        features.append(np.sin(2 * np.pi * day / 7))
        features.append(np.cos(2 * np.pi * day / 7))
        
        # Sentiment
        features.append(sentiment_score)
        
        return np.array(features).reshape(1, -1)
    
    def predict(
        self,
        candles: np.ndarray,
        indicators: Optional[Dict] = None,
        sentiment_score: float = 0.0,
        timeframe: str = "1h"
    ) -> Dict[str, Any]:
        """Make prediction using XGBoost"""
        
        features = self._extract_features(candles, sentiment_score)
        
        # Get probabilities
        try:
            probabilities = self.model.predict_proba(features)[0]
        except:
            # Model not trained yet, return neutral
            probabilities = np.array([0.33, 0.34, 0.33])
        
        # Classes: [DOWN, NEUTRAL, UP]
        direction_idx = np.argmax(probabilities)
        directions = ["DOWN", "NEUTRAL", "UP"]
        
        # Expected move based on historical volatility
        closes = candles[:, 3]
        volatility = np.std(np.diff(closes) / closes[:-1]) * 100
        
        expected_move = volatility * 2  # 2 std devs
        if direction_idx == 0:
            expected_move = -expected_move
        elif direction_idx == 1:
            expected_move = expected_move * 0.3
        
        return {
            'direction': directions[direction_idx],
            'probability': float(probabilities[direction_idx]),
            'confidence': float(max(probabilities) - 1/3),
            'expected_move': float(expected_move),
            'model': 'XGBoost',
            'probabilities': {
                'down': float(probabilities[0]),
                'neutral': float(probabilities[1]),
                'up': float(probabilities[2])
            },
            'feature_importance': self._get_feature_importance()
        }
    
    def _get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance if model is trained"""
        try:
            importance = self.model.feature_importances_
            return dict(zip(self.feature_names, importance.tolist()))
        except:
            return {}
    
    @staticmethod
    def _ema(data, period):
        alpha = 2 / (period + 1)
        result = np.zeros_like(data, dtype=float)
        result[0] = data[0]
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i-1]
        return result
    
    @staticmethod
    def _calculate_rsi(closes, period):
        deltas = np.diff(closes, prepend=closes[0])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.zeros_like(gains)
        avg_loss = np.zeros_like(losses)
        
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])
        
        for i in range(period + 1, len(gains)):
            avg_gain[i] = (avg_gain[i-1] * (period-1) + gains[i]) / period
            avg_loss[i] = (avg_loss[i-1] * (period-1) + losses[i]) / period
        
        rs = avg_gain / (avg_loss + 1e-8)
        rsi = 100 - (100 / (1 + rs))
        return rsiStep 4.5: Ensemble ModelСоздай ml_service/models/ensemble.py:pythonimport numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class EnsemblePredictor:
    def __init__(self, lstm_predictor, xgboost_predictor):
        self.lstm = lstm_predictor
        self.xgboost = xgboost_predictor
        
        # Weights for different timeframes
        self.weights = {
            '5m': {'lstm': 0.4, 'xgboost': 0.6},
            '15m': {'lstm': 0.45, 'xgboost': 0.55},
            '1h': {'lstm': 0.5, 'xgboost': 0.5},
            '4h': {'lstm': 0.55, 'xgboost': 0.45},
            '1d': {'lstm': 0.6, 'xgboost': 0.4},
        }
        
        logger.info("Ensemble predictor initialized")
    
    def predict(
        self,
        candles: np.ndarray,
        indicators: Optional[Dict] = None,
        sentiment_score: float = 0.0,
        timeframe: str = "1h"
    ) -> Dict[str, Any]:
        """
        Combine predictions from LSTM and XGBoost
        """
        
        # Get individual predictions
        lstm_result = self.lstm.predict(candles, indicators, sentiment_score, timeframe)
        xgb_result = self.xgboost.predict(candles, indicators, sentiment_score, timeframe)
        
        # Get weights for this timeframe
        weights = self.weights.get(timeframe, {'lstm': 0.5, 'xgboost': 0.5})
        
        # Combine probabilities
        combined_probs = {
            'down': (
                lstm_result['probabilities']['down'] * weights['lstm'] +
                xgb_result['probabilities']['down'] * weights['xgboost']
            ),
            'neutral': (
                lstm_result['probabilities']['neutral'] * weights['lstm'] +
                xgb_result['probabilities']['neutral'] * weights['xgboost']
            ),
            'up': (
                lstm_result['probabilities']['up'] * weights['lstm'] +
                xgb_result['probabilities']['up'] * weights['xgboost']
            )
        }
        
        # Determine direction
        direction_map = {'down': 'DOWN', 'neutral': 'NEUTRAL', 'up': 'UP'}
        best_direction = max(combined_probs, key=combined_probs.get)
        
        # Calculate confidence
        max_prob = combined_probs[best_direction]
        confidence = max_prob - 1/3  # Above random baseline
        
        # Combine expected moves
        expected_move = (
            lstm_result['expected_move'] * weights['lstm'] +
            xgb_result['expected_move'] * weights['xgboost']
        )
        
        # Agreement bonus: if both models agree, boost confidence
        agreement = lstm_result['direction'] == xgb_result['direction']
        if agreement:
            confidence = min(confidence * 1.2, 0.9)
        
        return {
            'direction': direction_map[best_direction],
            'probability': float(max_prob),
            'confidence': float(confidence),
            'expected_move': float(expected_move),
            'model': 'Ensemble',
            'probabilities': combined_probs,
            'agreement': agreement,
            'individual_predictions': {
                'lstm': lstm_result,
                'xgboost': xgb_result
            }
        }Step 4.6: Sentiment AnalysisСоздай ml_service/sentiment/finbert.py:pythonimport torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Any
import logging
import numpy as np

logger = logging.getLogger(__name__)


class FinBERTAnalyzer:
    def __init__(self, model_name: str = "ProsusAI/finbert"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Loading FinBERT model: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        # Labels: positive, negative, neutral
        self.labels = ['positive', 'negative', 'neutral']
        
        logger.info(f"FinBERT loaded on {self.device}")
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of a single text"""
        
        with torch.no_grad():
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)
            
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        
        # Convert to score (-1 to 1)
        # positive - negative
        score = float(probs[0] - probs[1])
        
        label_idx = np.argmax(probs)
        
        return {
            'text': text[:100] + '...' if len(text) > 100 else text,
            'score': score,
            'label': self.labels[label_idx],
            'positive': float(probs[0]),
            'negative': float(probs[1]),
            'neutral': float(probs[2])
        }
    
    def analyze_batch(self, texts: List[str]) -> Dict[str, Any]:
        """Analyze sentiment of multiple texts"""
        
        if not texts:
            return {
                'overall_score': 0.0,
                'positive': 0.33,
                'negative': 0.33,
                'neutral': 0.34,
                'individual': []
            }
        
        results = [self.analyze(text) for text in texts]
        
        # Aggregate scores
        scores = [r['score'] for r in results]
        positives = [r['positive'] for r in results]
        negatives = [r['negative'] for r in results]
        neutrals = [r['neutral'] for r in results]
        
        return {
            'overall_score': float(np.mean(scores)),
            'positive': float(np.mean(positives)),
            'negative': float(np.mean(negatives)),
            'neutral': float(np.mean(neutrals)),
            'individual': results
        }Step 4.7: Trump Tweet AnalyzerСоздай ml_service/sentiment/trump_analyzer.py:pythonimport re
from typing import Dict, Any, List
from datetime import datetime
import logging
from .finbert import FinBERTAnalyzer

logger = logging.getLogger(__name__)


class TrumpAnalyzer:
    def __init__(self):
        self.finbert = FinBERTAnalyzer()
        
        # Keywords that indicate crypto relevance
        self.crypto_keywords = {
            'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'ethereum', 'eth',
            'blockchain', 'digital currency', 'digital asset', 'defi',
            'stablecoin', 'cbdc', 'central bank digital'
        }
        
        # Keywords that indicate market relevance
        self.market_keywords = {
            'tariff', 'tariffs', 'china', 'trade', 'fed', 'federal reserve',
            'interest rate', 'rates', 'economy', 'economic', 'dollar',
            'inflation', 'deflation', 'gdp', 'jobs', 'unemployment',
            'stock', 'market', 'wall street', 'treasury', 'debt',
            'sanctions', 'russia', 'oil', 'energy', 'tax', 'taxes'
        }
        
        # High-impact phrases
        self.high_impact_phrases = {
            'will be', 'i will', 'we will', 'im going to', "i'm going to",
            'effective immediately', 'starting', 'announcing', 'just signed',
            'breaking', 'big news', 'major', 'huge'
        }
        
        # Negative market sentiment phrases
        self.negative_phrases = {
            'disaster', 'terrible', 'worst', 'failing', 'failed', 'crash',
            'collapse', 'crisis', 'war', 'attack', 'threat', 'ban', 'banned'
        }
        
        # Positive market sentiment phrases
        self.positive_phrases = {
            'great', 'best', 'winning', 'success', 'boom', 'record',
            'historic', 'amazing', 'tremendous', 'deal', 'agreement'
        }
        
        logger.info("Trump analyzer initialized")
    
    def analyze(self, tweet_text: str, timestamp: int = None) -> Dict[str, Any]:
        """
        Analyze a Trump tweet for crypto market impact
        """
        text_lower = tweet_text.lower()
        
        # Check crypto relevance
        is_crypto_related = any(kw in text_lower for kw in self.crypto_keywords)
        
        # Check market relevance
        is_market_related = any(kw in text_lower for kw in self.market_keywords)
        
        # Find matched keywords
        found_keywords = []
        for kw in self.crypto_keywords | self.market_keywords:
            if kw in text_lower:
                found_keywords.append(kw)
        
        # Calculate base impact score
        if is_crypto_related:
            base_impact = 0.9  # Direct crypto mention = high impact
        elif is_market_related:
            base_impact = 0.6  # Market-related = medium impact
        else:
            base_impact = 0.2  # General tweet = low impact
        
        # Boost for high-impact phrases
        has_high_impact = any(phrase in text_lower for phrase in self.high_impact_phrases)
        if has_high_impact:
            base_impact = min(base_impact * 1.3, 1.0)
        
        # Get sentiment from FinBERT
        sentiment_result = self.finbert.analyze(tweet_text)
        sentiment_score = sentiment_result['score']
        
        # Adjust sentiment based on known phrases
        negative_count = sum(1 for phrase in self.negative_phrases if phrase in text_lower)
        positive_count = sum(1 for phrase in self.positive_phrases if phrase in text_lower)
        
        phrase_adjustment = (positive_count - negative_count) * 0.1
        sentiment_score = max(-1, min(1, sentiment_score + phrase_adjustment))
        
        # Calculate final signal
        signal = base_impact * sentiment_score
        
        # Generate analysis text
        analysis = self._generate_analysis(
            is_crypto_related,
            is_market_related,
            found_keywords,
            sentiment_score,
            base_impact
        )
        
        return {
            'impact_score': float(base_impact),
            'sentiment': float(sentiment_score),
            'signal': float(signal),
            'keywords': found_keywords,
            'analysis': analysis,
            'is_crypto_related': is_crypto_related,
            'is_market_related': is_market_related,
            'raw_sentiment': sentiment_result
        }
    
    def _generate_analysis(
        self,
        is_crypto: bool,
        is_market: bool,
        keywords: List[str],
        sentiment: float,
        impact: float
    ) -> str:
        """Generate human-readable analysis"""
        
        parts = []
        
        # Relevance
        if is_crypto:
            parts.append("Direct cryptocurrency mention detected.")
        elif is_market:
            parts.append("Market-relevant content detected.")
        else:
            parts.append("No direct market relevance.")
        
        # Keywords
        if keywords:
            parts.append(f"Key topics: {', '.join(keywords[:5])}.")
        
        # Sentiment
        if sentiment > 0.3:
            parts.append("Sentiment: Strongly positive.")
        elif sentiment > 0.1:
            parts.append("Sentiment: Mildly positive.")
        elif sentiment < -0.3:
            parts.append("Sentiment: Strongly negative.")
        elif sentiment < -0.1:
            parts.append("Sentiment: Mildly negative.")
        else:
            parts.append("Sentiment: Neutral.")
        
        # Impact
        if impact > 0.7:
            parts.append("Expected market impact: HIGH.")
        elif impact > 0.4:
            parts.append("Expected market impact: MEDIUM.")
        else:
            parts.append("Expected market impact: LOW.")
        
        return " ".join(parts)


class TrumpSignalAggregator:
    """Aggregates Trump signals over time with decay"""
    
    def __init__(self, half_life_hours: float = 4.0):
        self.signals = []
        self.half_life_hours = half_life_hours
    
    def add_signal(self, signal: Dict[str, Any], timestamp: datetime):
        """Add a new signal"""
        self.signals.append({
            'signal': signal,
            'timestamp': timestamp
        })
        
        # Keep only last 24 hours
        cutoff = datetime.now().timestamp() - 24 * 3600
        self.signals = [
            s for s in self.signals 
            if s['timestamp'].timestamp() > cutoff
        ]
    
    def get_aggregate_signal(self) -> float:
        """Get time-decayed aggregate signal"""
        
        if not self.signals:
            return 0.0
        
        now = datetime.now()
        total_signal = 0.0
        
        for entry in self.signals:
            age_hours = (now - entry['timestamp']).total_seconds() / 3600
            decay = 0.5 ** (age_hours / self.half_life_hours)
            total_signal += entry['signal']['signal'] * decay
        
        # Normalize to [-1, 1]
        return max(-1, min(1, total_signal))PHASE 5: AUTONOMOUS TRADING BOTStep 5.1: Trading EngineСоздай internal/trading/engine.go:gopackage trading

import (
    "sync"
    "time"
    
    log "github.com/sirupsen/logrus"
)

type TradingEngine struct {
    paperTrader   *PaperTrader
    riskManager   *RiskManager
    signalHandler *SignalHandler
    
    isRunning     bool
    stopChan      chan struct{}
    mu            sync.RWMutex
    
    config        *EngineConfig
    stats         *TradingStats
}

type EngineConfig struct {
    Symbol             string
    InitialBalance     float64
    MaxPositionSize    float64  // % of balance
    RiskPerTrade       float64  // % risk per trade
    DefaultStopLoss    float64  // % from entry
    DefaultTakeProfit  float64  // % from entry
    MinConfidence      float64  // Min signal confidence to trade
    MaxDailyTrades     int
    CooldownMinutes    int      // Min time between trades
}

type TradingStats struct {
    TotalTrades       int       `json:"totalTrades"`
    WinningTrades     int       `json:"winningTrades"`
    LosingTrades      int       `json:"losingTrades"`
    TotalPnL          float64   `json:"totalPnL"`
    TotalPnLPercent   float64   `json:"totalPnLPercent"`
    WinRate           float64   `json:"winRate"`
    AvgWin            float64   `json:"avgWin"`
    AvgLoss           float64   `json:"avgLoss"`
    ProfitFactor      float64   `json:"profitFactor"`
    MaxDrawdown       float64   `json:"maxDrawdown"`
    CurrentDrawdown   float64   `json:"currentDrawdown"`
    PeakBalance       float64   `json:"peakBalance"`
    DailyPnL          float64   `json:"dailyPnL"`
    TodayTrades       int       `json:"todayTrades"`
    LastTradeTime     time.Time `json:"lastTradeTime"`
    StartTime         time.Time `json:"startTime"`
    
    mu sync.RWMutex
}

func NewTradingEngine(config *EngineConfig) *TradingEngine {
    return &TradingEngine{
        paperTrader:   NewPaperTrader(config.InitialBalance),
        riskManager:   NewRiskManager(config),
        signalHandler: NewSignalHandler(),
        config:        config,
        stats:         &TradingStats{StartTime: time.Now()},
        stopChan:      make(chan struct{}),
    }
}

func (te *TradingEngine) Start() error {
    te.mu.Lock()
    defer te.mu.Unlock()
    
    if te.isRunning {
        return nil
    }
    
    te.isRunning = true
    te.stopChan = make(chan struct{})
    
    go te.mainLoop()
    
    log.Info("Trading engine started")
    return nil
}

func (te *TradingEngine) Stop() {
    te.mu.Lock()
    defer te.mu.Unlock()
    
    if !te.isRunning {
        return
    }
    
    close(te.stopChan)
    te.isRunning = false
    
    log.Info("Trading engine stopped")
}

func (te *TradingEngine) IsRunning() bool {
    te.mu.RLock()
    defer te.mu.RUnlock()
    return te.isRunning
}

func (te *TradingEngine) mainLoop() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-te.stopChan:
            return
        case <-ticker.C:
            te.processSignals()
            te.checkPositions()
        }
    }
}

func (te *TradingEngine) processSignals() {
    // Get latest signal
    signal := te.signalHandler.GetLatestSignal()
    if signal == nil {
        return
    }
    
    // Check if we can trade
    if !te.canTrade() {
        return
    }
    
    // Check signal confidence
    if signal.Confidence < te.config.MinConfidence {
        return
    }
    
    // Check if we already have a position
    if te.paperTrader.HasOpenPosition(te.config.Symbol) {
        // Maybe close or modify existing position
        te.handleExistingPosition(signal)
        return
    }
    
    // Open new position
    te.openPosition(signal)
}

func (te *TradingEngine) canTrade() bool {
    te.stats.mu.RLock()
    defer te.stats.mu.RUnlock()
    
    // Check daily trade limit
    if te.stats.TodayTrades >= te.config.MaxDailyTrades {
        return false
    }
    
    // Check cooldown
    timeSinceLast := time.Since(te.stats.LastTradeTime)
    if timeSinceLast < time.Duration(te.config.CooldownMinutes)*time.Minute {
        return false
    }
    
    return true
}

func (te *TradingEngine) openPosition(signal *Signal) {
    // Calculate position size
    balance := te.paperTrader.GetBalance()
    currentPrice := signal.Price
    
    stopLoss := te.calculateStopLoss(signal)
    positionSize := te.riskManager.CalculatePositionSize(balance, currentPrice, stopLoss)
    
    if positionSize <= 0 {
        return
    }
    
    // Create position
    position := &Position{
        Symbol:     te.config.Symbol,
        Side:       signal.Direction,
        EntryPrice: currentPrice,
        Quantity:   positionSize,
        StopLoss:   stopLoss,
        TakeProfit: te.calculateTakeProfit(signal),
        OpenedAt:   time.Now(),
        SignalID:   signal.ID,
    }
    
    // Execute trade
    err := te.paperTrader.OpenPosition(position)
    if err != nil {
        log.Errorf("Failed to open position: %v", err)
        return
    }
    
    te.updateStats(nil) // Update stats after opening
    
    log.WithFields(log.Fields{
        "symbol":     position.Symbol,
        "side":       position.Side,
        "entry":      position.EntryPrice,
        "quantity":   position.Quantity,
        "stopLoss":   position.StopLoss,
        "takeProfit": position.TakeProfit,
    }).Info("Position opened")
}

func (te *TradingEngine) handleExistingPosition(signal *Signal) {
    position := te.paperTrader.GetPosition(te.config.Symbol)
    if position == nil {
        return
    }
    
    // Check for reversal signal
    if signal.Direction != position.Side && signal.Confidence > 0.7 {
        // Close current position and open reverse
        te.closePosition(position, "Signal reversal")
        te.openPosition(signal)
        return
    }
    
    // Update stop loss to breakeven if in profit
    currentPrice := signal.Price
    pnlPercent := te.calculatePnLPercent(position, currentPrice)
    
    if pnlPercent > 1.0 { // 1% profit
        // Move stop to breakeven
        if position.Side == "LONG" && position.StopLoss < position.EntryPrice {
            position.StopLoss = position.EntryPrice
            log.Info("Stop loss moved to breakeven")
        } else if position.Side == "SHORT" && position.StopLoss > position.EntryPrice {
            position.StopLoss = position.EntryPrice
            log.Info("Stop loss moved to breakeven")
        }
    }
}

func (te *TradingEngine) checkPositions() {
    positions := te.paperTrader.GetAllPositions()
    currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)
    
    for _, pos := range positions {
        // Check stop loss
        if te.isStopLossHit(pos, currentPrice) {
            te.closePosition(pos, "Stop loss hit")
            continue
        }
        
        // Check take profit
        if te.isTakeProfitHit(pos, currentPrice) {
            te.closePosition(pos, "Take profit hit")
            continue
        }
    }
}

func (te *TradingEngine) closePosition(pos *Position, reason string) {
    currentPrice := te.signalHandler.GetCurrentPrice(te.config.Symbol)
    
    trade, err := te.paperTrader.ClosePosition(pos.Symbol, currentPrice, reason)
    if err != nil {
        log.Errorf("Failed to close position: %v", err)
        return
    }
    
    te.updateStats(trade)
    
    log.WithFields(log.Fields{
        "symbol":   trade.Symbol,
        "pnl":      trade.PnL,
        "pnl%":     trade.PnLPercent,
        "reason":   trade.Reason,
        "duration": trade.Duration,
    }).Info("Position closed")
}

func (te *TradingEngine) isStopLossHit(pos *Position, price float64) bool {
    if pos.Side == "LONG" {
        return price <= pos.StopLoss
    }
    return price >= pos.StopLoss
}

func (te *TradingEngine) isTakeProfitHit(pos *Position, price float64) bool {
    if pos.Side == "LONG" {
        return price >= pos.TakeProfit
    }
    return price <= pos.TakeProfit
}

func (te *TradingEngine) calculateStopLoss(signal *Signal) float64 {
    atr := signal.ATR
    if atr == 0 {
        atr = signal.Price * te.config.DefaultStopLoss / 100
    }
    
    if signal.Direction == "LONG" {
        return signal.Price - 2*atr
    }
    return signal.Price + 2*atr
}

func (te *TradingEngine) calculateTakeProfit(signal *Signal) float64 {
    atr := signal.ATR
    if atr == 0 {
        atr = signal.Price * te.config.DefaultTakeProfit / 100
    }
    
    if signal.Direction == "LONG" {
        return signal.Price + 3*atr // 1.5:1 RR ratio
    }
    return signal.Price - 3*atr
}

func (te *TradingEngine) calculatePnLPercent(pos *Position, currentPrice float64) float64 {
    if pos.Side == "LONG" {
        return (currentPrice - pos.EntryPrice) / pos.EntryPrice * 100
    }
    return (pos.EntryPrice - currentPrice) / pos.EntryPrice * 100
}

func (te *TradingEngine) updateStats(trade *Trade) {
    te.stats.mu.Lock()
    defer te.stats.mu.Unlock()
    
    if trade != nil {
        te.stats.TotalTrades++
        te.stats.TotalPnL += trade.PnL
        te.stats.TodayTrades++
        te.stats.LastTradeTime = time.Now()
        
        if trade.PnL > 0 {
            te.stats.WinningTrades++
            te.stats.AvgWin = (te.stats.AvgWin*float64(te.stats.WinningTrades-1) + trade.PnLPercent) / float64(te.stats.WinningTrades)
        } else {
            te.stats.LosingTrades++
            te.stats.AvgLoss = (te.stats.AvgLoss*float64(te.stats.LosingTrades-1) + trade.PnLPercent) / float64(te.stats.LosingTrades)
        }
        
        if te.stats.TotalTrades > 0 {
            te.stats.WinRate = float64(te.stats.WinningTrades) / float64(te.stats.TotalTrades) * 100
        }
    }
    
    // Update balance-related stats
    balance := te.paperTrader.GetBalance()
    initialBalance := te.paperTrader.GetInitialBalance()
    
    te.stats.TotalPnLPercent = (balance - initialBalance) / initialBalance * 100
    
    if balance > te.stats.PeakBalance {
        te.stats.PeakBalance = balance
    }
    
    if te.stats.PeakBalance > 0 {
        te.stats.CurrentDrawdown = (te.stats.PeakBalance - balance) / te.stats.PeakBalance * 100
        if te.stats.CurrentDrawdown > te.stats.MaxDrawdown {
            te.stats.MaxDrawdown = te.stats.CurrentDrawdown
        }
    }
    
    // Profit factor
    if te.stats.AvgLoss != 0 && te.stats.LosingTrades > 0 {
        totalWins := te.stats.AvgWin * float64(te.stats.WinningTrades)
        totalLosses := -te.stats.AvgLoss * float64(te.stats.LosingTrades)
        if totalLosses != 0 {
            te.stats.ProfitFactor = totalWins / totalLosses
        }
    }
}

func (te *TradingEngine) GetStats() TradingStats {
    te.stats.mu.RLock()
    defer te.stats.mu.RUnlock()
    return *te.stats
}

func (te *TradingEngine) GetBalance() float64 {
    return te.paperTrader.GetBalance()
}

func (te *TradingEngine) GetPositions() []Position {
    return te.paperTrader.GetAllPositions()
}

func (te *TradingEngine) GetTradeHistory() []Trade {
    return te.paperTrader.GetTradeHistory()
}Step 5.2: Paper TraderСоздай internal/trading/paper_trader.go:gopackage trading

import (
    "fmt"
    "sync"
    "time"
    
    "github.com/google/uuid"
)

type PaperTrader struct {
    initialBalance float64
    balance        float64
    positions      map[string]*Position
    trades         []Trade
    mu             sync.RWMutex
}

type Position struct {
    ID         string    `json:"id"`
    Symbol     string    `json:"symbol"`
    Side       string    `json:"side"` // "LONG" or "SHORT"
    EntryPrice float64   `json:"entryPrice"`
    Quantity   float64   `json:"quantity"`
    StopLoss   float64   `json:"stopLoss"`
    TakeProfit float64   `json:"takeProfit"`
    OpenedAt   time.Time `json:"openedAt"`
    SignalID   string    `json:"signalId"`
    
    // Calculated fields
    UnrealizedPnL    float64 `json:"unrealizedPnL"`
    UnrealizedPnLPct float64 `json:"unrealizedPnLPct"`
}

type Trade struct {
    ID         string        `json:"id"`
    Symbol     string        `json:"symbol"`
    Side       string        `json:"side"`
    EntryPrice float64       `json:"entryPrice"`
    ExitPrice  float64       `json:"exitPrice"`
    Quantity   float64       `json:"quantity"`
    PnL        float64       `json:"pnl"`
    PnLPercent float64       `json:"pnlPercent"`
    Duration   time.Duration `json:"duration"`
    OpenedAt   time.Time     `json:"openedAt"`
    ClosedAt   time.Time     `json:"closedAt"`
    Reason     string        `json:"reason"` // "TP", "SL", "Signal Reversal", "Manual"
    SignalID   string        `json:"signalId"`
}

func NewPaperTrader(initialBalance float64) *PaperTrader {
    return &PaperTrader{
        initialBalance: initialBalance,
        balance:        initialBalance,
        positions:      make(map[string]*Position),
        trades:         make([]Trade, 0),
    }
}

func (pt *PaperTrader) OpenPosition(pos *Position) error {
    pt.mu.Lock()
    defer pt.mu.Unlock()
    
    // Check if position already exists
    if _, exists := pt.positions[pos.Symbol]; exists {
        return fmt.Errorf("position already exists for %s", pos.Symbol)
    }
    
    // Calculate required margin
    cost := pos.EntryPrice * pos.Quantity
    
    // Check balance
    if cost > pt.balance {
        return fmt.Errorf("insufficient balance: need %.2f, have %.2f", cost, pt.balance)
    }
    
    // Generate ID
    pos.ID = uuid.New().String()
    
    // Deduct from balance (simulating margin)
    pt.balance -= cost
    
    // Store position
    pt.positions[pos.Symbol] = pos
    
    return nil
}

func (pt *PaperTrader) ClosePosition(symbol string, exitPrice float64, reason string) (*Trade, error) {
    pt.mu.Lock()
    defer pt.mu.Unlock()
    
    pos, exists := pt.positions[symbol]
    if !exists {
        return nil, fmt.Errorf("no position for %s", symbol)
    }
    
    // Calculate PnL
    var pnl float64
    if pos.Side == "LONG" {
        pnl = (exitPrice - pos.EntryPrice) * pos.Quantity
    } else {
        pnl = (pos.EntryPrice - exitPrice) * pos.Quantity
    }
    
    pnlPercent := pnl / (pos.EntryPrice * pos.Quantity) * 100
    
    // Create trade record
    trade := Trade{
        ID:         uuid.New().String(),
        Symbol:     pos.Symbol,
        Side:       pos.Side,
        EntryPrice: pos.EntryPrice,
        ExitPrice:  exitPrice,
        Quantity:   pos.Quantity,
        PnL:        pnl,
        PnLPercent: pnlPercent,
        Duration:   time.Since(pos.OpenedAt),
        OpenedAt:   pos.OpenedAt,
        ClosedAt:   time.Now(),
        Reason:     reason,
        SignalID:   pos.SignalID,
    }
    
    // Return capital + PnL
    pt.balance += pos.EntryPrice*pos.Quantity + pnl
    
    // Remove position
    delete(pt.positions, symbol)
    
    // Store trade
    pt.trades = append(pt.trades, trade)
    
    return &trade, nil
}

func (pt *PaperTrader) UpdatePosition(symbol string, currentPrice float64) {
    pt.mu.Lock()
    defer pt.mu.Unlock()
    
    pos, exists := pt.positions[symbol]
    if !exists {
        return
    }
    
    // Calculate unrealized PnL
    if pos.Side == "LONG" {
        pos.UnrealizedPnL = (currentPrice - pos.EntryPrice) * pos.Quantity
    } else {
        pos.UnrealizedPnL = (pos.EntryPrice - currentPrice) * pos.Quantity
    }
    
    pos.UnrealizedPnLPct = pos.UnrealizedPnL / (pos.EntryPrice * pos.Quantity) * 100
}

func (pt *PaperTrader) HasOpenPosition(symbol string) bool {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    _, exists := pt.positions[symbol]
    return exists
}

func (pt *PaperTrader) GetPosition(symbol string) *Position {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    
    if pos, exists := pt.positions[symbol]; exists {
        copy := *pos
        return &copy
    }
    return nil
}

func (pt *PaperTrader) GetAllPositions() []Position {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    
    positions := make([]Position, 0, len(pt.positions))
    for _, pos := range pt.positions {
        positions = append(positions, *pos)
    }
    return positions
}

func (pt *PaperTrader) GetTradeHistory() []Trade {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    
    trades := make([]Trade, len(pt.trades))
    copy(trades, pt.trades)
    return trades
}

func (pt *PaperTrader) GetBalance() float64 {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    return pt.balance
}

func (pt *PaperTrader) GetInitialBalance() float64 {
    return pt.initialBalance
}

func (pt *PaperTrader) GetEquity() float64 {
    pt.mu.RLock()
    defer pt.mu.RUnlock()
    
    equity := pt.balance
    for _, pos := range pt.positions {
        equity += pos.EntryPrice*pos.Quantity + pos.UnrealizedPnL
    }
    return equity
}

func (pt *PaperTrader) Reset() {
    pt.mu.Lock()
    defer pt.mu.Unlock()
    
    pt.balance = pt.initialBalance
    pt.positions = make(map[string]*Position)
    pt.trades = make([]Trade, 0)
}Step 5.3: Risk ManagerСоздай internal/risk/manager.go:gopackage risk

import (
    "math"
    "sync"
    
    "crypto-trading-bot/internal/trading"
)

type RiskManager struct {
    config     *trading.EngineConfig
    dailyStats *DailyStats
    mu         sync.RWMutex
}

type DailyStats struct {
    Date          string
    TotalTrades   int
    TotalPnL      float64
    MaxDailyLoss  float64
    TradesWon     int
    TradesLost    int
}

func NewRiskManager(config *trading.EngineConfig) *RiskManager {
    return &RiskManager{
        config:     config,
        dailyStats: &DailyStats{},
    }
}

// CalculatePositionSize calculates the appropriate position size based on risk
func (rm *RiskManager) CalculatePositionSize(balance, entryPrice, stopLossPrice float64) float64 {
    rm.mu.RLock()
    defer rm.mu.RUnlock()
    
    // Risk amount per trade
    riskAmount := balance * rm.config.RiskPerTrade
    
    // Price risk (distance to stop loss)
    priceRisk := math.Abs(entryPrice - stopLossPrice)
    
    if priceRisk == 0 {
        return 0
    }
    
    // Position size based on risk
    positionSize := riskAmount / priceRisk
    
    // Apply max position size limit
    maxPositionValue := balance * rm.config.MaxPositionSize
    maxQuantity := maxPositionValue / entryPrice
    
    positionSize = math.Min(positionSize, maxQuantity)
    
    // Round to reasonable precision
    positionSize = math.Floor(positionSize*1000) / 1000
    
    return positionSize
}

// CanOpenPosition checks if a new position can be opened
func (rm *RiskManager) CanOpenPosition(balance, currentExposure float64) bool {
    rm.mu.RLock()
    defer rm.mu.RUnlock()
    
    // Check max exposure
    maxExposure := balance * rm.config.MaxPositionSize * 3 // Allow up to 3 positions
    if currentExposure >= maxExposure {
        return false
    }
    
    // Check daily loss limit
    if rm.dailyStats.TotalPnL < -balance*0.05 { // 5% daily loss limit
        return false
    }
    
    return true
}

// CalculateStopLoss calculates stop loss based on ATR or percentage
func (rm *RiskManager) CalculateStopLoss(entryPrice, atr float64, side string) float64 {
    var stopDistance float64
    
    if atr > 0 {
        stopDistance = atr * 2 // 2x ATR
    } else {
        stopDistance = entryPrice * rm.config.DefaultStopLoss
    }
    
    if side == "LONG" {
        return entryPrice - stopDistance
    }
    return entryPrice + stopDistance
}

// CalculateTakeProfit calculates take profit with configurable R:R ratio
func (rm *RiskManager) CalculateTakeProfit(entryPrice, stopLoss float64, side string, rrRatio float64) float64 {
    stopDistance := math.Abs(entryPrice - stopLoss)
    profitDistance := stopDistance * rrRatio
    
    if side == "LONG" {
        return entryPrice + profitDistance
    }
    return entryPrice - profitDistance
}

// UpdateDailyStats updates daily statistics after a trade
func (rm *RiskManager) UpdateDailyStats(pnl float64, won bool) {
    rm.mu.Lock()
    defer rm.mu.Unlock()
    
    rm.dailyStats.TotalTrades++
    rm.dailyStats.TotalPnL += pnl
    
    if won {
        rm.dailyStats.TradesWon++
    } else {
        rm.dailyStats.TradesLost++
    }
    
    if rm.dailyStats.TotalPnL < rm.dailyStats.MaxDailyLoss {
        rm.dailyStats.MaxDailyLoss = rm.dailyStats.TotalPnL
    }
}

// ResetDailyStats resets stats for a new day
func (rm *RiskManager) ResetDailyStats(date string) {
    rm.mu.Lock()
    defer rm.mu.Unlock()
    
    rm.dailyStats = &DailyStats{Date: date}
}

// GetDailyStats returns current daily statistics
func (rm *RiskManager) GetDailyStats() DailyStats {
    rm.mu.RLock()
    defer rm.mu.RUnlock()
    return *rm.dailyStats
}Step 5.4: Signal HandlerСоздай internal/signals/handler.go:gopackage signals

import (
    "sync"
    "time"
)

type Signal struct {
    ID          string    `json:"id"`
    Symbol      string    `json:"symbol"`
    Timeframe   string    `json:"timeframe"`
    Direction   string    `json:"direction"` // "LONG", "SHORT"
    Confidence  float64   `json:"confidence"`
    Probability float64   `json:"probability"`
    Price       float64   `json:"price"`
    ATR         float64   `json:"atr"`
    
    // Component signals
    TechnicalSignal  float64 `json:"technicalSignal"`
    MLSignal         float64 `json:"mlSignal"`
    SentimentSignal  float64 `json:"sentimentSignal"`
    
    // Metadata
    Timestamp   time.Time `json:"timestamp"`
    Reasons     []string  `json:"reasons"`
    Model       string    `json:"model"`
}

type SignalHandler struct {
    signals     map[string]*Signal // Key: symbol:timeframe
    prices      map[string]float64
    mu          sync.RWMutex
    subscribers []chan *Signal
}

func NewSignalHandler() *SignalHandler {
    return &SignalHandler{
        signals:     make(map[string]*Signal),
        prices:      make(map[string]float64),
        subscribers: make([]chan *Signal, 0),
    }
}

func (sh *SignalHandler) UpdateSignal(signal *Signal) {
    sh.mu.Lock()
    defer sh.mu.Unlock()
    
    key := signal.Symbol + ":" + signal.Timeframe
    sh.signals[key] = signal
    
    // Notify subscribers
    for _, ch := range sh.subscribers {
        select {
        case ch <- signal:
        default:
            // Channel full, skip
        }
    }
}

func (sh *SignalHandler) UpdatePrice(symbol string, price float64) {
    sh.mu.Lock()
    defer sh.mu.Unlock()
    sh.prices[symbol] = price
}

func (sh *SignalHandler) GetLatestSignal() *Signal {
    sh.mu.RLock()
    defer sh.mu.RUnlock()
    
    var latest *Signal
    for _, sig := range sh.signals {
        if latest == nil || sig.Timestamp.After(latest.Timestamp) {
            latest = sig
        }
    }
    
    return latest
}

func (sh *SignalHandler) GetSignal(symbol, timeframe string) *Signal {
    sh.mu.RLock()
    defer sh.mu.RUnlock()
    
    key := symbol + ":" + timeframe
    if sig, ok := sh.signals[key]; ok {
        return sig
    }
    return nil
}

func (sh *SignalHandler) GetCurrentPrice(symbol string) float64 {
    sh.mu.RLock()
    defer sh.mu.RUnlock()
    return sh.prices[symbol]
}

func (sh *SignalHandler) Subscribe() chan *Signal {
    sh.mu.Lock()
    defer sh.mu.Unlock()
    
    ch := make(chan *Signal, 100)
    sh.subscribers = append(sh.subscribers, ch)
    return ch
}Step 5.5: Autonomous BotСоздай internal/bot/autonomous.go:gopackage bot

import (
    "context"
    "sync"
    "time"
    
    log "github.com/sirupsen/logrus"
    
    "crypto-trading-bot/internal/binance"
    "crypto-trading-bot/internal/indicators"
    "crypto-trading-bot/internal/signals"
    "crypto-trading-bot/internal/trading"
)

type AutonomousBot struct {
    config         *BotConfig
    binanceClient  *binance.Client
    binanceWS      *binance.WSClient
    indicatorMgr   *indicators.IndicatorManager
    signalHandler  *signals.SignalHandler
    tradingEngine  *trading.TradingEngine
    mlClient       *MLServiceClient
    sentimentMgr   *SentimentManager
    
    isRunning      bool
    stopChan       chan struct{}
    mu             sync.RWMutex
    
    // State
    lastPrices     map[string]float64
    candleBuffers  map[string][]binance.Kline
}

type BotConfig struct {
    // Trading pairs
    Symbols    []string
    Timeframes []string
    
    // Trading settings
    InitialBalance     float64
    RiskPerTrade       float64
    MaxPositionSize    float64
    MinConfidence      float64
    MaxDailyTrades     int
    CooldownMinutes    int
    
    // ML settings
    MLServiceAddr      string
    
    // Sentiment settings
    EnableSentiment    bool
    TwitterBearerToken string
    TrumpUserID        string
    
    // Update intervals
    SignalUpdateSecs   int
    SentimentUpdateSecs int
}

func NewAutonomousBot(config *BotConfig) *AutonomousBot {
    // Create trading engine config
    engineConfig := &trading.EngineConfig{
        Symbol:            config.Symbols[0], // Primary symbol
        InitialBalance:    config.InitialBalance,
        MaxPositionSize:   config.MaxPositionSize,
        RiskPerTrade:      config.RiskPerTrade,
        DefaultStopLoss:   0.02, // 2%
        DefaultTakeProfit: 0.04, // 4%
        MinConfidence:     config.MinConfidence,
        MaxDailyTrades:    config.MaxDailyTrades,
        CooldownMinutes:   config.CooldownMinutes,
    }
    
    return &AutonomousBot{
        config:         config,
        binanceClient:  binance.NewClient(),
        binanceWS:      binance.NewWSClient(),
        indicatorMgr:   indicators.NewIndicatorManager(),
        signalHandler:  signals.NewSignalHandler(),
        tradingEngine:  trading.NewTradingEngine(engineConfig),
        mlClient:       NewMLServiceClient(config.MLServiceAddr),
        sentimentMgr:   NewSentimentManager(config),
        lastPrices:     make(map[string]float64),
        candleBuffers:  make(map[string][]binance.Kline),
        stopChan:       make(chan struct{}),
    }
}

func (bot *AutonomousBot) Start(ctx context.Context) error {
    bot.mu.Lock()
    defer bot.mu.Unlock()
    
    if bot.isRunning {
        return nil
    }
    
    log.Info("Starting autonomous bot...")
    
    // Connect to Binance WebSocket
    if err := bot.binanceWS.Connect(); err != nil {
        return err
    }
    
    // Load historical data
    if err := bot.loadHistoricalData(); err != nil {
        log.Warnf("Failed to load historical data: %v", err)
    }
    
    // Start WebSocket subscriptions
    for _, symbol := range bot.config.Symbols {
        for _, tf := range bot.config.Timeframes {
            go bot.subscribeToKlines(symbol, tf)
        }
    }
    
    // Start trading engine
    if err := bot.tradingEngine.Start(); err != nil {
        return err
    }
    
    // Start sentiment monitoring
    if bot.config.EnableSentiment {
        go bot.sentimentMgr.Start(ctx)
    }
    
    // Start main processing loop
    go bot.mainLoop(ctx)
    
    bot.isRunning = true
    log.Info("Autonomous bot started successfully")
    
    return nil
}

func (bot *AutonomousBot) Stop() {
    bot.mu.Lock()
    defer bot.mu.Unlock()
    
    if !bot.isRunning {
        return
    }
    
    log.Info("Stopping autonomous bot...")
    
    close(bot.stopChan)
    bot.tradingEngine.Stop()
    bot.binanceWS.Close()
    bot.sentimentMgr.Stop()
    
    bot.isRunning = false
    log.Info("Autonomous bot stopped")
}

func (bot *AutonomousBot) loadHistoricalData() error {
    for _, symbol := range bot.config.Symbols {
        for _, tf := range bot.config.Timeframes {
            klines, err := bot.binanceClient.GetKlines(symbol, tf, 500)
            if err != nil {
                log.Warnf("Failed to load klines for %s %s: %v", symbol, tf, err)
                continue
            }
            
            key := symbol + ":" + tf
            bot.candleBuffers[key] = klines
            
            // Initialize indicators with historical data
            indicatorSet := bot.indicatorMgr.GetOrCreate(symbol, tf)
            for _, k := range klines {
                indicatorSet.UpdateAll(k.High, k.Low, k.Close, k.Volume)
            }
            
            log.Infof("Loaded %d candles for %s %s", len(klines), symbol, tf)
        }
    }
    
    return nil
}

func (bot *AutonomousBot) subscribeToKlines(symbol, timeframe string) {
    symbolLower := strings.ToLower(symbol)
    
    ch, err := bot.binanceWS.SubscribeKline(symbolLower, timeframe)
    if err != nil {
        log.Errorf("Failed to subscribe to %s %s: %v", symbol, timeframe, err)
        return
    }
    
    for msg := range ch {
        bot.processKline(symbol, timeframe, msg)
    }
}

func (bot *AutonomousBot) processKline(symbol, timeframe string, msg *binance.KlineWSMessage) {
    // Update price
    close := parseFloat(msg.Kline.Close)
    bot.signalHandler.UpdatePrice(symbol, close)
    bot.lastPrices[symbol] = close
    
    // Only process closed candles for indicator updates
    if !msg.Kline.IsFinal {
        return
    }
    
    high := parseFloat(msg.Kline.High)
    low := parseFloat(msg.Kline.Low)
    volume := parseFloat(msg.Kline.Volume)
    
    // Update indicators
    indicatorSet := bot.indicatorMgr.GetOrCreate(symbol, timeframe)
    values := indicatorSet.UpdateAll(high, low, close, volume)
    
    // Update candle buffer
    key := symbol + ":" + timeframe
    kline := binance.Kline{
        OpenTime:  msg.Kline.StartTime,
        Open:      parseFloat(msg.Kline.Open),
        High:      high,
        Low:       low,
        Close:     close,
        Volume:    volume,
        CloseTime: msg.Kline.CloseTime,
    }
    
    bot.candleBuffers[key] = append(bot.candleBuffers[key], kline)
    if len(bot.candleBuffers[key]) > 500 {
        bot.candleBuffers[key] = bot.candleBuffers[key][1:]
    }
    
    // Generate signal asynchronously
    go bot.generateSignal(symbol, timeframe, values)
}

func (bot *AutonomousBot) generateSignal(symbol, timeframe string, indicators *indicators.IndicatorValues) {
    key := symbol + ":" + timeframe
    candles := bot.candleBuffers[key]
    
    if len(candles) < 60 {
        return
    }
    
    // Get sentiment score
    sentimentScore := bot.sentimentMgr.GetAggregateScore()
    
    // Get ML prediction
    prediction, err := bot.mlClient.Predict(candles, indicators, sentimentScore, timeframe)
    if err != nil {
        log.Warnf("ML prediction failed: %v", err)
        return
    }
    
    // Get technical signals
    techSignals := bot.indicatorMgr.GetOrCreate(symbol, timeframe).GetSignals(bot.lastPrices[symbol])
    techScore := calculateTechnicalScore(techSignals)
    
    // Combine signals
    signal := &signals.Signal{
        ID:              uuid.New().String(),