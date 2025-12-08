# Crypto Trading Bot - Setup Guide

Полнофункциональный desktop-приложение для автоматической торговли криптовалютой с ML предсказаниями и техническим анализом.

## 🚀 Технологический стек

- **Backend**: Go 1.21+ с Wails v2
- **Frontend**: ReactJS 18+ с TypeScript
- **ML Service**: Python 3.11+ (gRPC)
- **Database**: SQLite (локально) + Redis (кеш)
- **Charts**: TradingView Lightweight Charts
- **UI**: Tailwind CSS

## 📋 Предварительные требования

### Для Backend (Go)
- Go 1.21 или выше
- Wails CLI v2

### Для Frontend
- Node.js 18+ и npm

### Для ML Service (Python)
- Python 3.11+
- pip

## 🛠️ Установка

### 1. Установка Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 2. Установка Go зависимостей

```bash
go mod download
go mod tidy
```

### 3. Установка Frontend зависимостей

```bash
cd frontend
npm install
cd ..
```

### 4. Установка ML Service зависимостей

```bash
cd ml_service
pip install -r requirements.txt
cd ..
```

### 5. Компиляция gRPC protobuf файлов

```bash
cd ml_service/proto
python -m grpc_tools.protoc -I. --python_out=.. --grpc_python_out=.. prediction.proto
cd ../..
```

## 🏃 Запуск приложения

### Режим разработки

#### 1. Запустить ML Service (в отдельном терминале)

```bash
cd ml_service
python main.py
```

ML сервис запустится на порту 50051.

#### 2. Запустить Wails приложение в dev режиме

```bash
wails dev
```

Приложение откроется автоматически с hot-reload для frontend и backend.

### Режим production (сборка)

```bash
wails build
```

Скомпилированное приложение будет в директории `build/bin/`.

## 📁 Структура проекта

```
crypto-trading-bot/
├── main.go                          # Wails entry point
├── app.go                           # Main application
├── go.mod, go.sum                   # Go dependencies
├── wails.json                       # Wails config
│
├── internal/                        # Go backend code
│   ├── binance/                     # Binance API integration
│   │   ├── client.go               # REST API client
│   │   └── websocket.go            # WebSocket client
│   ├── indicators/                  # Technical indicators
│   │   ├── types.go                # Interfaces
│   │   ├── ema.go                  # EMA indicator
│   │   ├── rsi.go                  # RSI indicator
│   │   ├── macd.go                 # MACD indicator
│   │   ├── bollinger.go            # Bollinger Bands
│   │   ├── atr.go                  # ATR indicator
│   │   ├── stoch_rsi.go            # Stochastic RSI
│   │   ├── obv.go                  # OBV indicator
│   │   └── manager.go              # Indicator manager
│   ├── trading/                     # Trading engine
│   ├── risk/                        # Risk management
│   ├── signals/                     # Signal generation
│   ├── sentiment/                   # Sentiment analysis
│   ├── storage/                     # Database
│   └── bot/                         # Autonomous bot
│
├── frontend/                        # React frontend
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── layout/            # Layout components
│   │   │   ├── charts/            # Chart components
│   │   │   ├── trading/           # Trading UI
│   │   │   ├── signals/           # Signals display
│   │   │   ├── bot/               # Bot control
│   │   │   ├── analytics/         # Analytics
│   │   │   ├── sentiment/         # Sentiment UI
│   │   │   └── ui/                # Reusable UI components
│   │   ├── pages/                 # Page components
│   │   ├── hooks/                 # Custom hooks
│   │   ├── store/                 # State management (Zustand)
│   │   ├── services/              # API services
│   │   ├── types/                 # TypeScript types
│   │   └── utils/                 # Utilities
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.js
│
└── ml_service/                      # Python ML service
    ├── main.py                     # gRPC server
    ├── requirements.txt
    ├── models/                     # ML models
    ├── features/                   # Feature engineering
    ├── sentiment/                  # Sentiment analysis
    ├── proto/                      # gRPC definitions
    └── trained_models/             # Saved models
```

## ✅ Реализованные функции

### Backend (Go)
- ✅ Binance REST API клиент
- ✅ Binance WebSocket для real-time данных
- ✅ Технические индикаторы (EMA, RSI, MACD, BB, ATR, Stoch RSI, OBV)
- ✅ Менеджер индикаторов для мультиплексных символов/таймфреймов
- 🚧 Trading engine
- 🚧 Risk management
- 🚧 Paper trading
- 🚧 Autonomous bot

### Frontend (React)
- ✅ Базовая структура приложения
- ✅ Routing (React Router)
- ✅ Layout компоненты (Sidebar, Header)
- ✅ TypeScript типы для всех данных
- ✅ Tailwind CSS конфигурация
- 🚧 TradingView charts
- 🚧 Trading interface
- 🚧 Analytics dashboard
- 🚧 Bot control panel

### ML Service (Python)
- ✅ gRPC протокол определен
- ✅ Базовая структура сервера
- 🚧 LSTM модель
- 🚧 XGBoost модель
- 🚧 Ensemble predictor
- 🚧 FinBERT sentiment analysis
- 🚧 Trump tweet analyzer

## 🔧 Конфигурация

### Binance API
Для использования Binance API в режиме trading (не paper trading), создайте API ключи на Binance и добавьте в конфигурацию.

### ML Models
Модели нужно обучить перед использованием. Скрипты для обучения будут добавлены позже.

## 📊 Функции

### Реализовано:
- Real-time получение данных с Binance
- Расчет технических индикаторов
- WebSocket подключение для live данных
- Базовый UI с навигацией

### В разработке:
- ML предсказания направления цены
- Sentiment analysis (Twitter, News, Fear & Greed)
- Trump tweet monitoring
- Автоматический торговый бот
- Paper trading
- Backtesting engine
- Professional charts with indicators

## 🤝 Вклад

Проект находится в активной разработке. Основные компоненты реализованы и готовы к расширению.

## 📝 Лицензия

MIT License

## ⚠️ Disclaimer

Этот бот предназначен для образовательных целей. Торговля криптовалютой несет высокие риски. Всегда используйте paper trading перед реальной торговлей.
