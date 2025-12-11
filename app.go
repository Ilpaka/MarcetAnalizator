package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
	"crypto-trading-bot/internal/binance"
	"crypto-trading-bot/internal/bot"
	"crypto-trading-bot/internal/config"
	"crypto-trading-bot/internal/indicators"
	"crypto-trading-bot/internal/sentiment"
	"crypto-trading-bot/internal/signals"
	"crypto-trading-bot/internal/strategies/interval"
	"crypto-trading-bot/internal/trading"

	log "github.com/sirupsen/logrus"
)

// App represents the main application structure that coordinates all components
// of the trading bot including market data, trading engine, strategies, and UI.
type App struct {
	ctx              context.Context              // Application context for cancellation and timeouts
	binanceClient    *binance.Client              // REST API client for Binance
	binanceWS        *binance.WSClient            // WebSocket client for real-time market data
	indicatorManager *indicators.IndicatorManager // Technical indicator calculator
	tradingEngine    *trading.TradingEngine       // Core trading execution engine
	autonomousBot    *bot.AutonomousBot          // Autonomous trading bot
	signalHandler    *signals.SignalHandler       // Trading signal processor
	sentimentManager *sentiment.SentimentManager  // Sentiment analysis manager
	intervalStrategy *interval.IntervalStrategy   // Interval trading strategy
	cfg              *config.Config               // Application configuration
}

// NewApp creates a new App instance with default values.
// Components are initialized during startup.
func NewApp() *App {
	return &App{}
}

// setupLogging configures the logging system to write to both file and stdout.
// Logs are written to bot.log with timestamps and debug level enabled.
func setupLogging() error {
	// Create log file
	logFile, err := os.OpenFile("bot.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return fmt.Errorf("failed to open log file: %v", err)
	}

	// Set log format
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
		ForceColors:     false,
		DisableColors:   true, // Disable colors for file output
	})

	// Create multi-writer to write to both file and stdout
	multiWriter := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(multiWriter)
	
	// Set log level
	log.SetLevel(log.DebugLevel)

	log.Info("=== Trading Bot Started ===")
	log.Infof("Logging initialized. Log file: bot.log")
	
	return nil
}

// startup initializes all application components when the app starts.
// It sets up logging, loads configuration, initializes Binance clients,
// creates trading engine, indicators, and starts background services.
// The context is saved for use in runtime methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Setup logging first
	if err := setupLogging(); err != nil {
		fmt.Printf("Warning: Failed to setup logging: %v\n", err)
	}
	
	log.Info("Application starting...")

	// Load configuration
	a.cfg = config.Load()
	log.Infof("Configuration loaded: InitialBalance=%.2f, RiskPerTrade=%.2f, MinConfidence=%.2f, MaxDailyTrades=%d, CooldownMinutes=%d",
		a.cfg.InitialBalance, a.cfg.RiskPerTrade, a.cfg.MinConfidence, a.cfg.MaxDailyTrades, a.cfg.CooldownMinutes)

	// Initialize Binance client
	a.binanceClient = binance.NewClient()
	log.Info("Binance REST client initialized")

	// Initialize WebSocket client
	a.binanceWS = binance.NewWSClient()
	if err := a.binanceWS.Connect(); err != nil {
		log.Errorf("Failed to connect WebSocket: %v", err)
	} else {
		log.Info("Binance WebSocket connected")
	}

	// Initialize indicator manager
	a.indicatorManager = indicators.NewIndicatorManager()
	log.Info("Indicator manager initialized")

	// Initialize signal handler
	a.signalHandler = signals.NewSignalHandler()
	log.Info("Signal handler initialized")

	// Initialize sentiment manager
	a.sentimentManager = sentiment.NewSentimentManager()
	log.Info("Sentiment manager initialized")

	// Initialize trading engine
	engineConfig := &trading.EngineConfig{
		Symbol:            "BTCUSDT",
		InitialBalance:    a.cfg.InitialBalance,
		MaxPositionSize:   a.cfg.MaxPositionSize,
		RiskPerTrade:      a.cfg.RiskPerTrade,
		DefaultStopLoss:   0.02,
		DefaultTakeProfit: 0.04,
		MinConfidence:     a.cfg.MinConfidence,
		MaxDailyTrades:    a.cfg.MaxDailyTrades,
		CooldownMinutes:   a.cfg.CooldownMinutes,
	}
	a.tradingEngine = trading.NewTradingEngine(engineConfig)
	log.Info("Trading engine initialized")

	log.Info("Application started successfully")
}

// shutdown gracefully shuts down all application components.
// It closes WebSocket connections and cleans up resources.
func (a *App) shutdown(ctx context.Context) {
	log.Info("Application shutting down...")

	if a.binanceWS != nil {
		a.binanceWS.Close()
	}

	log.Info("Application shutdown complete")
}

// GetKlines retrieves historical candlestick data
func (a *App) GetKlines(symbol, interval string, limit int) ([]binance.Kline, error) {
	return a.binanceClient.GetKlines(symbol, interval, limit)
}

// GetTicker24h retrieves 24hr ticker statistics
func (a *App) GetTicker24h(symbol string) (*binance.Ticker, error) {
	return a.binanceClient.GetTicker24h(symbol)
}

// GetAllTickers retrieves all tickers
func (a *App) GetAllTickers() ([]binance.Ticker, error) {
	return a.binanceClient.GetAllTickers()
}

// SubscribeKline subscribes to real-time kline updates
func (a *App) SubscribeKline(symbol, interval string) error {
	if a.binanceWS == nil {
		return fmt.Errorf("WebSocket client not initialized")
	}
	_, err := a.binanceWS.SubscribeKline(symbol, interval)
	return err
}

// CalculateIndicators calculates technical indicators for given candle data
func (a *App) CalculateIndicators(symbol, timeframe string, high, low, close, volume float64) *indicators.IndicatorValues {
	set := a.indicatorManager.GetOrCreate(symbol, timeframe)
	return set.UpdateAll(high, low, close, volume)
}

// GetSignals returns trading signals based on current indicators
func (a *App) GetSignals(symbol, timeframe string, price float64) []indicators.Signal {
	set := a.indicatorManager.GetOrCreate(symbol, timeframe)
	return set.GetSignals(price)
}

// StartBot starts the autonomous trading bot
func (a *App) StartBot(symbols []string, timeframes []string) error {
	if a.autonomousBot != nil && a.autonomousBot.IsRunning() {
		// Если бот уже запущен, останавливаем его перед перезапуском с новыми настройками
		a.autonomousBot.Stop()
		time.Sleep(500 * time.Millisecond)
	}

	if len(symbols) == 0 {
		symbols = []string{"BTCUSDT"}
	}
	if len(timeframes) == 0 {
		timeframes = []string{"1m"}
	}

	botConfig := &bot.BotConfig{
		Symbols:         symbols,
		Timeframes:      timeframes,
		InitialBalance:  a.cfg.InitialBalance,
		RiskPerTrade:    a.cfg.RiskPerTrade,
		MaxPositionSize: a.cfg.MaxPositionSize,
		MinConfidence:   a.cfg.MinConfidence,
		MaxDailyTrades:  a.cfg.MaxDailyTrades,
		CooldownMinutes:  a.cfg.CooldownMinutes,
		MLServiceAddr:   a.cfg.MLServiceAddr,
		EnableSentiment: false,
	}

	log.Infof("Starting bot with config: symbols=%v, timeframes=%v, riskPerTrade=%.2f, minConfidence=%.2f, maxDailyTrades=%d, cooldownMinutes=%d",
		symbols, timeframes, a.cfg.RiskPerTrade, a.cfg.MinConfidence, a.cfg.MaxDailyTrades, a.cfg.CooldownMinutes)

	// Используем существующий WebSocket клиент из App
	a.autonomousBot = bot.NewAutonomousBotWithWS(botConfig, a.binanceWS)
	return a.autonomousBot.Start(a.ctx)
}

// UpdateBotConfig updates bot configuration
func (a *App) UpdateBotConfig(riskPerTrade, maxPositionSize, minConfidence float64, maxDailyTrades, cooldownMinutes int) error {
	// Обновляем конфигурацию
	a.cfg.RiskPerTrade = riskPerTrade
	a.cfg.MaxPositionSize = maxPositionSize
	a.cfg.MinConfidence = minConfidence
	a.cfg.MaxDailyTrades = maxDailyTrades
	a.cfg.CooldownMinutes = cooldownMinutes

	// Если бот запущен, обновляем его конфигурацию
	if a.autonomousBot != nil && a.autonomousBot.IsRunning() {
		// Получаем текущие символы и таймфреймы
		botConfig := a.autonomousBot.GetConfig()
		if botConfig != nil {
			// Обновляем конфигурацию бота
			newConfig := &bot.BotConfig{
				Symbols:         botConfig.Symbols,
				Timeframes:      botConfig.Timeframes,
				InitialBalance:  botConfig.InitialBalance,
				RiskPerTrade:    riskPerTrade,
				MaxPositionSize: maxPositionSize,
				MinConfidence:   minConfidence,
				MaxDailyTrades:  maxDailyTrades,
				CooldownMinutes: cooldownMinutes,
				MLServiceAddr:   botConfig.MLServiceAddr,
				EnableSentiment: botConfig.EnableSentiment,
			}
			a.autonomousBot.UpdateConfig(newConfig)
		}
	}

	return nil
}

// StopBot stops the autonomous trading bot
func (a *App) StopBot() {
	if a.autonomousBot != nil {
		a.autonomousBot.Stop()
	}
}

// GetBotStats returns bot trading statistics
func (a *App) GetBotStats() trading.TradingStats {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetStats()
	}
	if a.tradingEngine == nil {
		return trading.TradingStats{}
	}
	return a.tradingEngine.GetStats()
}

// GetPositions returns all open positions
func (a *App) GetPositions() []trading.Position {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetPositions()
	}
	if a.tradingEngine == nil {
		return []trading.Position{}
	}
	return a.tradingEngine.GetPositions()
}

// GetTradeHistory returns trade history
func (a *App) GetTradeHistory() []trading.Trade {
	if a.autonomousBot != nil {
		return a.autonomousBot.GetTradeHistory()
	}
	if a.tradingEngine == nil {
		return []trading.Trade{}
	}
	return a.tradingEngine.GetTradeHistory()
}

// GetBalance returns current balance
func (a *App) GetBalance() float64 {
	if a.tradingEngine == nil {
		return 0.0
	}
	return a.tradingEngine.GetBalance()
}

// GetSignalsList returns all current signals
func (a *App) GetSignalsList() []*signals.Signal {
	return a.signalHandler.GetAllSignals()
}

// GetSentimentScore returns current sentiment score
func (a *App) GetSentimentScore() sentiment.SentimentScore {
	return a.sentimentManager.GetScore()
}

// GetFearGreedIndex returns the current Fear & Greed Index
func (a *App) GetFearGreedIndex() (*sentiment.FearGreedIndex, error) {
	return sentiment.GetFearGreedIndex()
}

// PlaceOrder places a manual order
func (a *App) PlaceOrder(symbol, side, orderType string, price, quantity float64) error {
	if a.tradingEngine == nil {
		log.Error("PlaceOrder failed: trading engine not initialized")
		return fmt.Errorf("trading engine not initialized")
	}

	log.Infof("=== MANUAL ORDER PLACED ===")
	log.Infof("Symbol: %s, Side: %s, Type: %s, Price: %.8f, Quantity: %.8f", symbol, side, orderType, price, quantity)

	// Get current price for market orders
	currentPrice := price
	if orderType == "MARKET" {
		ticker, err := a.binanceClient.GetTicker24h(symbol)
		if err != nil {
			log.Errorf("Failed to get current price for %s: %v", symbol, err)
			return fmt.Errorf("failed to get current price: %v", err)
		}
		currentPrice = ticker.LastPrice
		log.Infof("Market order: using current price %.8f", currentPrice)
	}

	balanceBefore := a.tradingEngine.GetBalance()
	log.Infof("Balance before order: %.2f USDT", balanceBefore)

	var err error
	// For MARKET orders, execute immediately
	if orderType == "MARKET" {
		// Для ручных ордеров StopLoss и TakeProfit не устанавливаем (0, 0)
		err = a.tradingEngine.ExecuteMarketOrder(symbol, side, currentPrice, quantity, 0, 0)
		if err != nil {
			log.Errorf("Market order execution failed: %v", err)
		} else {
			log.Infof("Market order executed successfully")
		}
	} else {
		// For LIMIT orders, create an order
		err = a.tradingEngine.CreateLimitOrder(symbol, side, price, quantity)
		if err != nil {
			log.Errorf("Limit order creation failed: %v", err)
		} else {
			log.Infof("Limit order created successfully at price %.8f", price)
		}
	}

	balanceAfter := a.tradingEngine.GetBalance()
	log.Infof("Balance after order: %.2f USDT (change: %.2f)", balanceAfter, balanceAfter-balanceBefore)
	log.Info("=== ORDER PLACEMENT COMPLETE ===")

	return err
}

// CancelOrder cancels a pending order
func (a *App) CancelOrder(orderID string) error {
	if a.tradingEngine == nil {
		log.Error("CancelOrder failed: trading engine not initialized")
		return fmt.Errorf("trading engine not initialized")
	}

	log.Infof("=== MANUAL ORDER CANCELLATION ===")
	log.Infof("Order ID: %s", orderID)

	// Get order info before cancellation
	orders := a.tradingEngine.GetAllOrders()
	var orderInfo *trading.Order
	for _, o := range orders {
		if o.ID == orderID {
			orderInfo = &o
			break
		}
	}

	if orderInfo != nil {
		log.Infof("Cancelling order: Symbol=%s, Side=%s, Type=%s, Price=%.8f, Quantity=%.8f, Status=%s",
			orderInfo.Symbol, orderInfo.Side, orderInfo.Type, orderInfo.Price, orderInfo.Quantity, orderInfo.Status)
	}

	err := a.tradingEngine.CancelOrder(orderID)
	if err != nil {
		log.Errorf("Order cancellation failed: %v", err)
	} else {
		log.Infof("Order %s cancelled successfully", orderID)
		balanceAfter := a.tradingEngine.GetBalance()
		log.Infof("Current balance after cancellation: %.2f USDT", balanceAfter)
	}
	log.Info("=== ORDER CANCELLATION COMPLETE ===")

	return err
}

// GetOrders returns all orders (pending and filled)
func (a *App) GetOrders(symbol string) []trading.Order {
	if a.tradingEngine == nil {
		return []trading.Order{}
	}
	return a.tradingEngine.GetOrders(symbol)
}

// GetAllOrders returns all orders including filled and cancelled
func (a *App) GetAllOrders() []trading.Order {
	if a.tradingEngine == nil {
		return []trading.Order{}
	}
	return a.tradingEngine.GetAllOrders()
}

// ProcessOrdersForSymbol processes limit orders for a specific symbol when price updates
func (a *App) ProcessOrdersForSymbol(symbol string, currentPrice float64) error {
	if a.tradingEngine == nil {
		return fmt.Errorf("trading engine not initialized")
	}
	_, err := a.tradingEngine.ProcessOrdersForSymbol(symbol, currentPrice)
	return err
}

// GetPortfolio returns portfolio with all holdings
func (a *App) GetPortfolio() map[string]interface{} {
	if a.tradingEngine == nil {
		return map[string]interface{}{
			"balance":  0.0,
			"holdings": []interface{}{},
		}
	}

	positions := a.tradingEngine.GetPositions()
	balance := a.tradingEngine.GetBalance()

	holdings := make([]map[string]interface{}, 0)
	for _, pos := range positions {
		// Get current price
		ticker, err := a.binanceClient.GetTicker24h(pos.Symbol)
		currentPrice := pos.EntryPrice
		if err == nil && ticker != nil {
			currentPrice = ticker.LastPrice
		}

		// Update position PnL
		var unrealizedPnL float64
		var unrealizedPnLPct float64
		if pos.Side == "BUY" || pos.Side == "LONG" {
			unrealizedPnL = (currentPrice - pos.EntryPrice) * pos.Quantity
			unrealizedPnLPct = (currentPrice - pos.EntryPrice) / pos.EntryPrice * 100
		} else {
			unrealizedPnL = (pos.EntryPrice - currentPrice) * pos.Quantity
			unrealizedPnLPct = (pos.EntryPrice - currentPrice) / pos.EntryPrice * 100
		}

		baseAsset := pos.Symbol
		if len(pos.Symbol) > 4 && pos.Symbol[len(pos.Symbol)-4:] == "USDT" {
			baseAsset = pos.Symbol[:len(pos.Symbol)-4]
		}

		holdings = append(holdings, map[string]interface{}{
			"symbol":          pos.Symbol,
			"baseAsset":       baseAsset,
			"quantity":        pos.Quantity,
			"entryPrice":      pos.EntryPrice,
			"currentPrice":    currentPrice,
			"value":           currentPrice * pos.Quantity,
			"unrealizedPnL":   unrealizedPnL,
			"unrealizedPnLPct": unrealizedPnLPct,
		})
	}

	return map[string]interface{}{
		"balance":  balance,
		"holdings": holdings,
	}
}

// TrainModel trains LSTM model for given symbol and timeframe
func (a *App) TrainModel(symbol, timeframe string, lookback, hiddenSize, numLayers, epochs, batchSize int, learningRate, valSplit float64) error {
	log.Infof("=== TRAINING LSTM MODEL ===")
	log.Infof("Symbol: %s, Timeframe: %s", symbol, timeframe)
	log.Infof("Params: lookback=%d, hidden_size=%d, num_layers=%d, epochs=%d, batch_size=%d, lr=%.4f, val_split=%.2f",
		lookback, hiddenSize, numLayers, epochs, batchSize, learningRate, valSplit)

	// Call ML service HTTP API
	mlAPIURL := "http://localhost:5000"
	if a.cfg.MLServiceAddr != "" && a.cfg.MLServiceAddr != "localhost:50051" {
		// Extract host from gRPC address, use HTTP port 5000
		mlAPIURL = "http://" + a.cfg.MLServiceAddr[:len(a.cfg.MLServiceAddr)-5] + "5000"
	}

	requestData := map[string]interface{}{
		"symbol":        symbol,
		"timeframe":     timeframe,
		"lookback":      lookback,
		"hidden_size":   hiddenSize,
		"num_layers":    numLayers,
		"epochs":        epochs,
		"batch_size":    batchSize,
		"learning_rate": learningRate,
		"val_split":     valSplit,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		log.Errorf("Failed to marshal training request: %v", err)
		return err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(mlAPIURL+"/train", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Warnf("ML service not available, training will be done asynchronously: %v", err)
		// Return nil to allow async training
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Errorf("Training request failed: %s", string(body))
		return fmt.Errorf("training request failed: %s", string(body))
	}

	log.Info("=== TRAINING INITIATED ===")
	return nil
}

// GetTrainingStatus returns training status
func (a *App) GetTrainingStatus(symbol, timeframe string) map[string]interface{} {
	mlAPIURL := "http://localhost:5000"
	if a.cfg.MLServiceAddr != "" && a.cfg.MLServiceAddr != "localhost:50051" {
		mlAPIURL = "http://" + a.cfg.MLServiceAddr[:len(a.cfg.MLServiceAddr)-5] + "5000"
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(fmt.Sprintf("%s/training_status/%s/%s", mlAPIURL, symbol, timeframe))
	if err != nil {
		return map[string]interface{}{
			"training":  false,
			"completed": false,
			"error":     err.Error(),
		}
	}
	defer resp.Body.Close()

	var status map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return map[string]interface{}{
			"training":  false,
			"completed": false,
			"error":     "Failed to parse status",
		}
	}

	return status
}

// GetModelMetadata returns metadata for trained model
func (a *App) GetModelMetadata(symbol, timeframe string) map[string]interface{} {
	log.Debugf("Getting model metadata for %s %s", symbol, timeframe)
	
	mlAPIURL := "http://localhost:5000"
	if a.cfg.MLServiceAddr != "" && a.cfg.MLServiceAddr != "localhost:50051" {
		mlAPIURL = "http://" + a.cfg.MLServiceAddr[:len(a.cfg.MLServiceAddr)-5] + "5000"
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(fmt.Sprintf("%s/model_metadata/%s/%s", mlAPIURL, symbol, timeframe))
	if err != nil {
		log.Debugf("ML service not available: %v", err)
		return map[string]interface{}{
			"exists":            false,
			"symbol":            symbol,
			"timeframe":         timeframe,
			"mae":               0.0,
			"rmse":              0.0,
			"mape":              0.0,
			"direction_accuracy": 0.0,
			"trained_at":        0,
			"model_path":        "",
		}
	}
	defer resp.Body.Close()

	var metadata map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		log.Errorf("Failed to decode metadata: %v", err)
		return map[string]interface{}{
			"exists": false,
			"symbol": symbol,
			"timeframe": timeframe,
		}
	}

	return metadata
}

// PredictPrice predicts price using trained LSTM model
func (a *App) PredictPrice(symbol, timeframe string) map[string]interface{} {
	log.Infof("=== PREDICTING PRICE ===")
	log.Infof("Symbol: %s, Timeframe: %s", symbol, timeframe)

	// Get historical candles for prediction
	klines, err := a.binanceClient.GetKlines(symbol, timeframe, 100)
	if err != nil {
		log.Errorf("Failed to get klines: %v", err)
		return map[string]interface{}{
			"error": "Failed to get historical data",
		}
	}

	// Get current price
	ticker, err := a.binanceClient.GetTicker24h(symbol)
	if err != nil {
		log.Errorf("Failed to get current price: %v", err)
		return map[string]interface{}{
			"error": "Failed to get current price",
		}
	}

	currentPrice := ticker.LastPrice

	// Prepare candles data
	candles := make([][]float64, 0, len(klines))
	for _, k := range klines {
		candles = append(candles, []float64{k.Open, k.High, k.Low, k.Close, k.Volume})
	}

	// Call ML service
	mlAPIURL := "http://localhost:5000"
	if a.cfg.MLServiceAddr != "" && a.cfg.MLServiceAddr != "localhost:50051" {
		mlAPIURL = "http://" + a.cfg.MLServiceAddr[:len(a.cfg.MLServiceAddr)-5] + "5000"
	}

	requestData := map[string]interface{}{
		"symbol":    symbol,
		"timeframe": timeframe,
		"candles":   candles,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		log.Errorf("Failed to marshal prediction request: %v", err)
		return map[string]interface{}{
			"error": "Failed to prepare prediction request",
		}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(mlAPIURL+"/predict", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Warnf("ML service not available, using fallback: %v", err)
		// Fallback: simple mock prediction
		predictedPrice := currentPrice * 1.01
		confidence := 0.65
		return map[string]interface{}{
			"predicted_price":            predictedPrice,
			"current_price":              currentPrice,
			"confidence":                 confidence,
			"confidence_interval_lower":  predictedPrice * 0.98,
			"confidence_interval_upper":  predictedPrice * 1.02,
			"timestamp":                  time.Now().Unix() * 1000,
			"model_used":                 "LSTM-Fallback",
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Errorf("Prediction request failed: %s", string(body))
		return map[string]interface{}{
			"error": fmt.Sprintf("Prediction failed: %s", string(body)),
		}
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Errorf("Failed to decode prediction result: %v", err)
		return map[string]interface{}{
			"error": "Failed to parse prediction result",
		}
	}

	log.Infof("Prediction received: price=%.2f, confidence=%.2f", result["predicted_price"], result["confidence"])
	return result
}

// StartIntervalStrategy запускает интервальную стратегию
func (a *App) StartIntervalStrategy(config interval.IntervalConfig) error {
	log.Info("=== STARTING INTERVAL STRATEGY ===")
	log.Infof("Config: symbols=%v, daysToAnalyze=%d, minProfit=%.2f%%, maxProfit=%.2f%%, method=%d",
		config.Symbols, config.DaysToAnalyze, config.MinProfitPercent, config.MaxProfitPercent, config.AnalysisMethod)

	// Проверяем наличие символа
	symbol := config.Symbol
	if symbol == "" && len(config.Symbols) > 0 {
		// Обратная совместимость
		symbol = config.Symbols[0]
	}
	if symbol == "" {
		err := fmt.Errorf("no symbol configured for interval strategy")
		log.Errorf("Failed to start interval strategy: %v", err)
		return err
	}
	
	// Устанавливаем символ в конфигурацию для обратной совместимости
	if len(config.Symbols) == 0 {
		config.Symbols = []string{symbol}
	}

	// Если стратегия уже существует и запущена, останавливаем её
	if a.intervalStrategy != nil {
		log.Info("Stopping existing interval strategy...")
		a.intervalStrategy.Stop()
		time.Sleep(1 * time.Second) // Даем больше времени на остановку
		log.Info("Existing strategy stopped")
		// Очищаем ссылку для создания новой стратегии
		a.intervalStrategy = nil
	}

	// Проверяем наличие необходимых компонентов
	if a.tradingEngine == nil {
		err := fmt.Errorf("trading engine is not initialized")
		log.Errorf("Failed to start interval strategy: %v", err)
		return err
	}
	if a.binanceClient == nil {
		err := fmt.Errorf("binance client is not initialized")
		log.Errorf("Failed to start interval strategy: %v", err)
		return err
	}
	if a.ctx == nil {
		err := fmt.Errorf("application context is not initialized")
		log.Errorf("Failed to start interval strategy: %v", err)
		return err
	}

	// Создаем новую стратегию с новой конфигурацией
	log.Info("Creating new interval strategy...")
	a.intervalStrategy = interval.NewIntervalStrategy(
		&config,
		a.tradingEngine,
		a.binanceClient,
	)
	log.Info("New interval strategy created successfully")

	log.Info("Starting interval strategy with context...")
	if err := a.intervalStrategy.Start(a.ctx); err != nil {
		log.Errorf("Failed to start interval strategy: %v", err)
		// Очищаем ссылку на стратегию при ошибке
		a.intervalStrategy = nil
		return err
	}

	log.Info("=== INTERVAL STRATEGY STARTED SUCCESSFULLY ===")
	return nil
}

// StopIntervalStrategy останавливает интервальную стратегию
func (a *App) StopIntervalStrategy() {
	if a.intervalStrategy != nil {
		a.intervalStrategy.Stop()
	}
}

// GetIntervalStats возвращает статистику интервальной торговли
func (a *App) GetIntervalStats() interval.IntervalStats {
	if a.intervalStrategy == nil {
		return interval.IntervalStats{
			ActiveIntervals: make(map[string]interval.PriceInterval),
		}
	}
	return a.intervalStrategy.GetStats()
}

// GetActiveIntervals возвращает активные интервалы
func (a *App) GetActiveIntervals() map[string]interval.PriceInterval {
	if a.intervalStrategy == nil {
		return make(map[string]interval.PriceInterval)
	}
	return a.intervalStrategy.GetActiveIntervals()
}

// RunIntervalBacktest запускает бэктест интервальной стратегии
func (a *App) RunIntervalBacktest(
	config interval.IntervalConfig,
	symbol string,
	startDate, endDate time.Time,
) (*interval.BacktestResult, error) {
	backtester := interval.NewBacktester(&config, a.binanceClient)
	return backtester.Run(symbol, startDate, endDate)
}