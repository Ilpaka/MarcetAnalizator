package bot

import (
	"context"
	"strconv"
	"strings"
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

	isRunning bool
	stopChan  chan struct{}
	mu        sync.RWMutex

	lastPrices    map[string]float64
	candleBuffers map[string][]binance.Kline
}

type BotConfig struct {
	Symbols         []string
	Timeframes      []string
	InitialBalance  float64
	RiskPerTrade    float64
	MaxPositionSize float64
	MinConfidence   float64
	MaxDailyTrades  int
	CooldownMinutes int
	MLServiceAddr   string
	EnableSentiment bool
}

func NewAutonomousBot(config *BotConfig) *AutonomousBot {
	return NewAutonomousBotWithWS(config, nil)
}

func NewAutonomousBotWithWS(config *BotConfig, wsClient *binance.WSClient) *AutonomousBot {
	engineConfig := &trading.EngineConfig{
		Symbol:            config.Symbols[0],
		InitialBalance:    config.InitialBalance,
		MaxPositionSize:   config.MaxPositionSize,
		RiskPerTrade:      config.RiskPerTrade,
		DefaultStopLoss:   0.02,
		DefaultTakeProfit: 0.04,
		MinConfidence:     config.MinConfidence,
		MaxDailyTrades:    config.MaxDailyTrades,
		CooldownMinutes:   config.CooldownMinutes,
	}

	// Используем переданный WebSocket клиент или создаем новый
	if wsClient == nil {
		wsClient = binance.NewWSClient()
	}

	return &AutonomousBot{
		config:         config,
		binanceClient:  binance.NewClient(),
		binanceWS:      wsClient,
		indicatorMgr:   indicators.NewIndicatorManager(),
		signalHandler:  signals.NewSignalHandler(),
		tradingEngine:  trading.NewTradingEngine(engineConfig),
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

	// Проверяем, подключен ли уже WebSocket
	if !bot.binanceWS.IsConnected() {
		// Подключаемся к WebSocket только если еще не подключены
		if err := bot.binanceWS.Connect(); err != nil {
			return err
		}
		// Даем время на установку соединения перед подписками
		time.Sleep(500 * time.Millisecond)
	}

	if err := bot.loadHistoricalData(); err != nil {
		log.Warnf("Failed to load historical data: %v", err)
	}

	// Подписываемся с задержкой между подписками, чтобы избежать конкурентной записи
	for i, symbol := range bot.config.Symbols {
		for j, tf := range bot.config.Timeframes {
			go func(s string, t string) {
				// Добавляем задержку между подписками
				delay := time.Duration(i*len(bot.config.Timeframes)+j) * 100 * time.Millisecond
				time.Sleep(delay)
				bot.subscribeToKlines(s, t)
			}(symbol, tf)
		}
	}

	if err := bot.tradingEngine.Start(); err != nil {
		return err
	}

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
	if bot.tradingEngine != nil {
		bot.tradingEngine.Stop()
	}
	// Не закрываем WebSocket, так как он может использоваться другими компонентами
	// bot.binanceWS.Close()

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
	close := parseFloat(msg.Kline.Close)
	bot.signalHandler.UpdatePrice(symbol, close)
	bot.lastPrices[symbol] = close

	if !msg.Kline.IsFinal {
		return
	}

	high := parseFloat(msg.Kline.High)
	low := parseFloat(msg.Kline.Low)
	volume := parseFloat(msg.Kline.Volume)
	open := parseFloat(msg.Kline.Open)

	log.Debugf("=== PROCESSING KLINE ===")
	log.Debugf("Symbol: %s, Timeframe: %s", symbol, timeframe)
	log.Debugf("OHLCV: O=%.8f, H=%.8f, L=%.8f, C=%.8f, V=%.2f", open, high, low, close, volume)

	indicatorSet := bot.indicatorMgr.GetOrCreate(symbol, timeframe)
	values := indicatorSet.UpdateAll(high, low, close, volume)

	if values != nil {
		log.Debugf("Indicators updated: RSI=%.2f, MACD_Line=%.2f, MACD_Signal=%.2f, ATR14=%.2f, BB_Upper=%.2f, BB_Lower=%.2f",
			values.RSI14, values.MACDLine, values.MACDSignal, values.ATR14, values.BBUpper, values.BBLower)
	}

	key := symbol + ":" + timeframe
	kline := binance.Kline{
		OpenTime:  msg.Kline.StartTime,
		Open:      open,
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

	log.Debugf("Candle buffer size: %d", len(bot.candleBuffers[key]))

	go bot.generateSignal(symbol, timeframe, values)
}

func (bot *AutonomousBot) generateSignal(symbol, timeframe string, indicatorValues *indicators.IndicatorValues) {
	key := symbol + ":" + timeframe
	candles := bot.candleBuffers[key]

	if len(candles) < 60 {
		log.Debugf("Not enough candles for %s %s: %d < 60", symbol, timeframe, len(candles))
		return
	}

	currentPrice := bot.lastPrices[symbol]
	if currentPrice == 0 {
		log.Debugf("No price data for %s", symbol)
		return
	}

	indicatorSet := bot.indicatorMgr.GetOrCreate(symbol, timeframe)
	techSignals := indicatorSet.GetSignals(currentPrice)
	
	// Log technical signals for debugging
	if len(techSignals) > 0 {
		log.Debugf("Generated %d technical signals for %s %s", len(techSignals), symbol, timeframe)
		for _, ts := range techSignals {
			log.Debugf("  Signal: %s %s (strength: %.2f) from %s", ts.Type, ts.Reason, ts.Strength, ts.Indicator)
		}
	} else {
		log.Debugf("No technical signals generated for %s %s", symbol, timeframe)
	}
	
	techScore := signals.CalculateTechnicalScore(techSignals)
	log.Debugf("Technical score for %s %s: %.4f", symbol, timeframe, techScore)

	mlScore := 0.0
	sentimentScore := 0.0

	combinedSignal := signals.CombineSignals(techScore, mlScore, sentimentScore)
	combinedSignal.Symbol = symbol
	combinedSignal.Timeframe = timeframe
	combinedSignal.Price = currentPrice

	if indicatorValues != nil {
		combinedSignal.ATR = indicatorValues.ATR14
	}

	log.Infof("=== SIGNAL GENERATED ===")
	log.Infof("Symbol: %s, Timeframe: %s", symbol, timeframe)
	log.Infof("Direction: %s, Confidence: %.2f", combinedSignal.Direction, combinedSignal.Confidence)
	log.Infof("Technical Score: %.2f, ML Score: %.2f, Sentiment Score: %.2f", techScore, mlScore, sentimentScore)
	log.Infof("Price: %.8f, ATR: %.8f", currentPrice, combinedSignal.ATR)
	log.Infof("Signal ID: %s", combinedSignal.ID)
	
	// Log technical signals details
	if len(techSignals) > 0 {
		log.Debugf("Technical signals count: %d", len(techSignals))
		for _, ts := range techSignals {
			log.Debugf("  - %s: %s (strength: %.2f)", ts.Indicator, ts.Type, ts.Strength)
		}
	} else {
		log.Debugf("No technical signals generated")
	}
	
	log.Info("=== SIGNAL GENERATION COMPLETE ===")

	bot.signalHandler.UpdateSignal(combinedSignal)
}

func (bot *AutonomousBot) mainLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-bot.stopChan:
			return
		case <-ticker.C:
			bot.processSignals()
			bot.updatePositions()
		}
	}
}

func (bot *AutonomousBot) processSignals() {
	// Обрабатываем сигналы для всех символов из конфигурации
	for _, symbol := range bot.config.Symbols {
		// Получаем последний сигнал для символа
		latestSignal := bot.signalHandler.GetLatestSignalForSymbol(symbol)
		if latestSignal == nil {
			log.Debugf("No signal found for symbol %s", symbol)
			continue
		}

		// Проверяем уверенность сигнала
		if latestSignal.Confidence < bot.config.MinConfidence {
			log.Debugf("Signal confidence %.2f below minimum %.2f for %s", 
				latestSignal.Confidence, bot.config.MinConfidence, symbol)
			continue
		}

		// Обновляем символ в trading engine если нужно
		bot.mu.RLock()
		currentSymbol := bot.tradingEngine.GetSymbol()
		bot.mu.RUnlock()

		if currentSymbol != symbol {
			// Обновляем конфигурацию trading engine для нового символа
			engineConfig := &trading.EngineConfig{
				Symbol:            symbol,
				InitialBalance:    bot.config.InitialBalance,
				MaxPositionSize:   bot.config.MaxPositionSize,
				RiskPerTrade:      bot.config.RiskPerTrade,
				DefaultStopLoss:   0.02,
				DefaultTakeProfit: 0.04,
				MinConfidence:     bot.config.MinConfidence,
				MaxDailyTrades:    bot.config.MaxDailyTrades,
				CooldownMinutes:   bot.config.CooldownMinutes,
			}
			bot.tradingEngine.UpdateConfig(engineConfig)
			log.Infof("Updated trading engine config for symbol %s", symbol)
		}

		// Trading engine обработает сигнал в своем mainLoop
		// Но мы можем также обработать его здесь для более быстрой реакции
		log.Infof("=== PROCESSING SIGNAL FOR TRADING ===")
		log.Infof("Symbol: %s, Direction: %s, Confidence: %.2f, Price: %.2f", 
			symbol, latestSignal.Direction, latestSignal.Confidence, latestSignal.Price)
		log.Infof("Min Confidence Required: %.2f", bot.config.MinConfidence)
		
		bot.tradingEngine.ProcessSignal(latestSignal)
		log.Info("=== SIGNAL PROCESSING COMPLETE ===")
	}
}

func (bot *AutonomousBot) updatePositions() {
	positions := bot.tradingEngine.GetPositions()
	for _, pos := range positions {
		currentPrice := bot.lastPrices[pos.Symbol]
		if currentPrice > 0 {
			bot.tradingEngine.GetBalance()
		}
	}
}

func parseFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func (bot *AutonomousBot) IsRunning() bool {
	bot.mu.RLock()
	defer bot.mu.RUnlock()
	return bot.isRunning
}

func (bot *AutonomousBot) GetStats() trading.TradingStats {
	return bot.tradingEngine.GetStats()
}

func (bot *AutonomousBot) GetPositions() []trading.Position {
	return bot.tradingEngine.GetPositions()
}

func (bot *AutonomousBot) GetTradeHistory() []trading.Trade {
	return bot.tradingEngine.GetTradeHistory()
}

func (bot *AutonomousBot) GetConfig() *BotConfig {
	bot.mu.RLock()
	defer bot.mu.RUnlock()
	return bot.config
}

func (bot *AutonomousBot) UpdateConfig(newConfig *BotConfig) {
	bot.mu.Lock()
	defer bot.mu.Unlock()
	bot.config = newConfig
	// Обновляем конфигурацию trading engine
	engineConfig := &trading.EngineConfig{
		Symbol:            newConfig.Symbols[0],
		InitialBalance:    newConfig.InitialBalance,
		MaxPositionSize:   newConfig.MaxPositionSize,
		RiskPerTrade:      newConfig.RiskPerTrade,
		DefaultStopLoss:   0.02,
		DefaultTakeProfit: 0.04,
		MinConfidence:     newConfig.MinConfidence,
		MaxDailyTrades:    newConfig.MaxDailyTrades,
		CooldownMinutes:   newConfig.CooldownMinutes,
	}
	bot.tradingEngine.UpdateConfig(engineConfig)
}

