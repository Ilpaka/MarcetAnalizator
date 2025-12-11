// Package interval implements an interval trading strategy that identifies
// price ranges and executes trades when price approaches interval boundaries.
package interval

import (
	"context"
	"fmt"
	"sync"
	"time"

	"crypto-trading-bot/internal/binance"
	"crypto-trading-bot/internal/trading"

	log "github.com/sirupsen/logrus"
)

// IntervalStrategy implements a trading strategy based on price intervals.
// It analyzes historical price data to identify optimal buy/sell zones and
// executes trades when price enters these zones.
type IntervalStrategy struct {
	config        *IntervalConfig          // Strategy configuration
	analyzer      *IntervalAnalyzer         // Price interval analyzer
	tradingEngine *trading.TradingEngine    // Trading execution engine
	binanceClient *binance.Client          // Binance API client

	// State
	activeIntervals   map[string]PriceInterval // Active price intervals by symbol
	lastRecalculation time.Time                // Last interval recalculation time

	// Statistics
	stats IntervalStats // Trading statistics

	mu        sync.RWMutex  // Mutex for thread-safe operations
	stopChan  chan struct{} // Stop signal channel
	isRunning bool          // Strategy running state
}

// NewIntervalStrategy creates a new interval strategy instance with the given
// configuration, trading engine, and Binance client.
func NewIntervalStrategy(
	config *IntervalConfig,
	tradingEngine *trading.TradingEngine,
	binanceClient *binance.Client,
) *IntervalStrategy {
	analyzer := NewIntervalAnalyzer(config, binanceClient)

	return &IntervalStrategy{
		config:          config,
		analyzer:        analyzer,
		tradingEngine:   tradingEngine,
		binanceClient:   binanceClient,
		activeIntervals: make(map[string]PriceInterval),
		stats: IntervalStats{
			ActiveIntervals: make(map[string]PriceInterval),
		},
		stopChan: make(chan struct{}),
	}
}

// Start begins the interval strategy execution.
// It performs initial interval calculation and starts the main trading loop
// that checks for buy/sell signals every 5 seconds.
func (s *IntervalStrategy) Start(ctx context.Context) error {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		log.Warn("Strategy is already running")
		return nil
	}
	s.mu.Unlock()

	log.Info("Starting Interval Trading Strategy...")

	// Первичный анализ и выбор инструментов (выполняем БЕЗ блокировки мьютекса)
	log.Info("Performing initial interval recalculation...")
	if err := s.recalculateIntervals(); err != nil {
		log.Errorf("Failed to recalculate intervals during start: %v", err)
		return err
	}
	log.Info("Initial recalculation completed successfully")

	// Теперь блокируем мьютекс только для установки флага и запуска горутины
	s.mu.Lock()
	s.isRunning = true
	log.Info("Starting main loop in goroutine...")
	go s.mainLoop(ctx)
	s.mu.Unlock()

	log.Info("Interval Strategy started successfully")
	return nil
}

// Остановка стратегии
func (s *IntervalStrategy) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isRunning {
		return
	}

	if s.stopChan != nil {
		select {
		case <-s.stopChan:
			// Уже закрыт
		default:
			close(s.stopChan)
		}
	}
	s.isRunning = false
	s.stopChan = make(chan struct{}) // Пересоздаем для следующего запуска
	log.Info("Interval Strategy stopped")
}

// Главный цикл стратегии
func (s *IntervalStrategy) mainLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second) // Проверка каждые 5 секунд для более быстрой реакции
	defer ticker.Stop()

	log.Info("🔄 Interval strategy main loop started - checking signals every 5 seconds")

	for {
		select {
		case <-ctx.Done():
			log.Info("Interval strategy main loop stopped: context cancelled")
			return
		case <-s.stopChan:
			log.Info("Interval strategy main loop stopped: stop signal received")
			return
		case <-ticker.C:
			s.checkSignals()
			s.checkRecalculation()
		}
	}
}

// Проверка необходимости пересчета интервалов
func (s *IntervalStrategy) checkRecalculation() {
	s.mu.RLock()
	lastRecalc := s.lastRecalculation
	s.mu.RUnlock()

	if time.Since(lastRecalc) >= time.Duration(s.config.RecalculateIntervalHours)*time.Hour {
		log.Info("Recalculating intervals...")
		if err := s.recalculateIntervals(); err != nil {
			log.Errorf("Failed to recalculate intervals: %v", err)
		}
	}
}

// Пересчет интервалов
func (s *IntervalStrategy) recalculateIntervals() error {
	// Определяем символ для анализа
	symbol := s.config.Symbol
	if symbol == "" && len(s.config.Symbols) > 0 {
		// Обратная совместимость: используем первый символ из списка
		symbol = s.config.Symbols[0]
	}
	if symbol == "" {
		return fmt.Errorf("no symbol configured for interval strategy")
	}

	log.Infof("Recalculating interval for symbol: %s, timeframe: %s", symbol, s.config.Timeframe)
	log.Debugf("Config: periodMinutes=%d, minProfit=%.2f%%, maxProfit=%.2f%%, method=%d",
		s.config.PeriodMinutesToAnalyze, s.config.MinProfitPercent, s.config.MaxProfitPercent, s.config.AnalysisMethod)

	// Анализируем только выбранный символ
	analysis, err := s.analyzer.analyzeInstrument(symbol)
	if err != nil {
		log.Errorf("Failed to analyze instrument %s: %v", symbol, err)
		return fmt.Errorf("analysis failed: %w", err)
	}

	log.Infof("Analysis completed for %s: interval [%.2f - %.2f], width=%.2f%%, volatility=%.2f",
		symbol,
		analysis.BestInterval.Lower,
		analysis.BestInterval.Upper,
		analysis.BestInterval.Width,
		analysis.BestInterval.Volatility,
	)

	s.mu.Lock()
	defer s.mu.Unlock()

	// Обновляем активный интервал для выбранного символа
	s.activeIntervals = make(map[string]PriceInterval)
	s.activeIntervals[symbol] = analysis.BestInterval
	s.stats.ActiveIntervals[symbol] = analysis.BestInterval

	s.lastRecalculation = time.Now()
	s.stats.LastRecalculation = time.Now()

	log.Infof("Successfully calculated %d intervals", len(s.activeIntervals))

	// Логируем все интервалы для отладки
	for symbol, interval := range s.activeIntervals {
		log.Infof("Active interval %s: [%.2f - %.2f], width=%.2f%%, volatility=%.2f",
			symbol, interval.Lower, interval.Upper, interval.Width, interval.Volatility)
	}

	return nil
}

// Проверка сигналов для выбранного символа
func (s *IntervalStrategy) checkSignals() {
	s.mu.RLock()
	symbol := s.config.Symbol
	if symbol == "" && len(s.config.Symbols) > 0 {
		symbol = s.config.Symbols[0]
	}
	interval, exists := s.activeIntervals[symbol]
	s.mu.RUnlock()

	if !exists || symbol == "" {
		log.Warnf("⚠️ No active interval for symbol %s, skipping signal check. Run recalculation first!", symbol)
		return
	}

	// Получаем текущую цену
	ticker, err := s.binanceClient.GetTicker24h(symbol)
	if err != nil {
		log.Warnf("Failed to get ticker for %s: %v", symbol, err)
		return
	}

	currentPrice := ticker.LastPrice
	log.Infof("🔍 Checking signals for %s: Price=%.8f, Interval=[%.8f - %.8f]",
		symbol, currentPrice, interval.Lower, interval.Upper)

	// Проверяем позицию в trading engine
	positions := s.tradingEngine.GetPositions()
	var position *trading.Position
	for _, p := range positions {
		if p.Symbol == symbol {
			position = &p
			break
		}
	}

	if position == nil {
		// Нет открытой позиции - проверяем сигнал на покупку
		log.Infof("📊 No open position for %s, checking buy signal...", symbol)
		if s.shouldBuy(currentPrice, interval) {
			log.Infof("🚀 BUY SIGNAL CONFIRMED! Executing buy for %s", symbol)
			s.executeBuy(symbol, currentPrice, interval)
		} else {
			log.Infof("⏳ No buy signal yet for %s - waiting for better entry", symbol)
		}
	} else {
		// Есть позиция - проверяем сигнал на продажу
		log.Infof("💰 Open position found for %s: EntryPrice=%.8f, Quantity=%.8f, CurrentPrice=%.8f",
			symbol, position.EntryPrice, position.Quantity, currentPrice)
		if s.shouldSell(currentPrice, interval, position) {
			log.Infof("📉 SELL SIGNAL CONFIRMED! Executing sell for %s", symbol)
			s.executeSell(symbol, currentPrice, interval, position)
		} else {
			log.Infof("📈 Holding position for %s - waiting for exit signal", symbol)
		}
	}
}

// Проверка условия покупки
func (s *IntervalStrategy) shouldBuy(price float64, interval PriceInterval) bool {
	// ОЧЕНЬ АГРЕССИВНАЯ стратегия покупки - покупаем если цена в нижних 60% интервала
	// Это дает максимальные возможности для входа и больше сделок
	intervalRange := interval.Upper - interval.Lower
	if intervalRange <= 0 {
		log.Warnf("Invalid interval range: Upper=%.8f, Lower=%.8f", interval.Upper, interval.Lower)
		return false
	}

	lower60Percent := interval.Lower + intervalRange*0.6 // Нижние 60% интервала

	// Также покупаем если цена близка к нижней границе (в пределах 10%)
	distanceFromLower := (price - interval.Lower) / interval.Lower * 100

	// Покупаем если:
	// 1. Цена в нижних 60% интервала ИЛИ
	// 2. Цена близка к нижней границе (в пределах 10%)
	shouldBuy := (price <= lower60Percent) || (distanceFromLower >= 0 && distanceFromLower <= 10.0)

	if shouldBuy {
		log.Infof("✅✅✅ BUY SIGNAL CONFIRMED! Price=%.8f, Lower=%.8f, Upper=%.8f, Lower60%%=%.8f, DistanceFromLower=%.2f%%",
			price, interval.Lower, interval.Upper, lower60Percent, distanceFromLower)
	} else {
		log.Infof("⏳ No buy signal: Price=%.8f, Lower=%.8f, Upper=%.8f, Lower60%%=%.8f, DistanceFromLower=%.2f%%",
			price, interval.Lower, interval.Upper, lower60Percent, distanceFromLower)
	}

	return shouldBuy
}

// Проверка условия продажи
func (s *IntervalStrategy) shouldSell(price float64, interval PriceInterval, position *trading.Position) bool {
	// Продаем если:
	// 1. Цена достигла верхней границы
	upperDistance := (interval.Upper - price) / price * 100
	if upperDistance <= 0.1 {
		return true
	}

	// 2. Или сработал stop-loss
	if price <= position.StopLoss {
		return true
	}

	return false
}

// Выполнение покупки
func (s *IntervalStrategy) executeBuy(symbol string, price float64, interval PriceInterval) {
	// Проверяем лимит позиций
	positions := s.tradingEngine.GetPositions()
	if len(positions) >= s.config.MaxPositionsCount {
		log.Warnf("Max positions reached (%d/%d), skipping buy for %s", len(positions), s.config.MaxPositionsCount, symbol)
		return
	}

	log.Infof("=== INTERVAL BUY SIGNAL ===")
	log.Infof("Symbol: %s, Price: %.8f, Interval: [%.8f - %.8f]", symbol, price, interval.Lower, interval.Upper)

	// Проверяем баланс перед покупкой
	balance := s.tradingEngine.GetBalance()
	log.Infof("Current balance: %.2f USDT", balance)

	// Рассчитываем количество
	quantity := s.config.PreferredPositionPrice / price
	cost := price * quantity

	log.Infof("Calculated quantity: %.8f, Cost: %.2f USDT", quantity, cost)

	// Проверяем, достаточно ли баланса (с небольшим запасом)
	if cost > balance*0.99 {
		log.Warnf("Insufficient balance for buy: need %.2f USDT, have %.2f USDT", cost, balance)
		// Попробуем уменьшить размер позиции до 90% от баланса
		cost = balance * 0.9
		quantity = cost / price
		log.Infof("Reducing position size to %.2f USDT, quantity: %.8f", cost, quantity)
		if quantity <= 0 {
			log.Errorf("Cannot calculate valid quantity, skipping buy")
			return
		}
	}

	// Рассчитываем StopLoss и TakeProfit
	stopLossPercent := s.config.StopLossPercent
	if stopLossPercent <= 0 {
		stopLossPercent = 1.5 // По умолчанию 1.5%
	}
	stopLoss := price * (1 - stopLossPercent/100)
	takeProfit := interval.Upper // Берем верхнюю границу интервала как цель

	log.Infof("StopLoss: %.8f (%.2f%%), TakeProfit: %.8f (%.2f%%)",
		stopLoss, stopLossPercent, takeProfit, (takeProfit-price)/price*100)

	// Открываем позицию через ExecuteMarketOrder с StopLoss и TakeProfit
	if err := s.tradingEngine.ExecuteMarketOrder(symbol, "BUY", price, quantity, stopLoss, takeProfit); err != nil {
		log.Errorf("Failed to execute buy: %v", err)
		return
	}

	newBalance := s.tradingEngine.GetBalance()
	log.Infof("✅ Position opened successfully! Balance: %.2f -> %.2f USDT (change: -%.2f)", balance, newBalance, cost)
	
	// Примечание: TotalCrosses обновляется при продаже, так как покупка+продажа = одно пересечение
	log.Debugf("📊 Position opened, waiting for sell to update statistics")
}

// Выполнение продажи
func (s *IntervalStrategy) executeSell(symbol string, price float64, interval PriceInterval, position *trading.Position) {
	log.Infof("=== INTERVAL SELL SIGNAL ===")
	log.Infof("Symbol: %s, Price: %.8f, Upper: %.8f", symbol, price, interval.Upper)
	log.Infof("Position: EntryPrice=%.8f, Quantity=%.8f", position.EntryPrice, position.Quantity)

	// Проверяем баланс до продажи
	balanceBefore := s.tradingEngine.GetBalance()
	log.Infof("Balance before sell: %.2f USDT", balanceBefore)

	// Рассчитываем ожидаемую прибыль/убыток
	var expectedPnL float64
	if position.Side == "LONG" || position.Side == "BUY" {
		expectedPnL = (price - position.EntryPrice) * position.Quantity
	} else {
		expectedPnL = (position.EntryPrice - price) * position.Quantity
	}
	expectedPnLPercent := expectedPnL / (position.EntryPrice * position.Quantity) * 100
	log.Infof("Expected PnL: %.2f USDT (%.2f%%)", expectedPnL, expectedPnLPercent)

	// Продаем через trading engine (StopLoss и TakeProfit не нужны для продажи)
	if err := s.tradingEngine.ExecuteMarketOrder(symbol, "SELL", price, position.Quantity, 0, 0); err != nil {
		log.Errorf("Failed to execute sell: %v", err)
		return
	}

	balanceAfter := s.tradingEngine.GetBalance()
	log.Infof("Balance after sell: %.2f USDT (change: +%.2f)", balanceAfter, balanceAfter-balanceBefore)

	// Небольшая задержка, чтобы сделка успела добавиться в историю
	time.Sleep(100 * time.Millisecond)

	// Получаем последнюю сделку из истории для обновления статистики
	trades := s.tradingEngine.GetTradeHistory()
	log.Infof("📊 Trade history length: %d", len(trades))
	
	if len(trades) > 0 {
		// Ищем последнюю сделку для нашего символа (может быть не последней в списке)
		var lastTrade *trading.Trade
		for i := len(trades) - 1; i >= 0; i-- {
			if trades[i].Symbol == symbol {
				lastTrade = &trades[i]
				log.Infof("📊 Found trade for %s: PnL=%.2f USDT (%.2f%%), Reason=%s", 
					symbol, lastTrade.PnL, lastTrade.PnLPercent, lastTrade.Reason)
				break
			}
		}
		
		if lastTrade != nil {
			s.mu.Lock()
			// Обновляем статистику на основе реального PnL
			if lastTrade.PnL > 0 {
				s.stats.SuccessfulTrades++
				log.Infof("✅ Successful trade: PnL=%.2f USDT (%.2f%%)", lastTrade.PnL, lastTrade.PnLPercent)
			} else {
				s.stats.FailedTrades++
				log.Infof("❌ Failed trade: PnL=%.2f USDT (%.2f%%)", lastTrade.PnL, lastTrade.PnLPercent)
			}
			// Увеличиваем счетчик пересечений при каждой завершенной сделке (покупка+продажа)
			s.stats.TotalCrosses++
			log.Infof("📊 Statistics updated: SuccessfulTrades=%d, FailedTrades=%d, TotalCrosses=%d",
				s.stats.SuccessfulTrades, s.stats.FailedTrades, s.stats.TotalCrosses)
			s.mu.Unlock()
		} else {
			log.Warnf("⚠️ Could not find trade for symbol %s in history, using expected PnL", symbol)
			// Fallback: используем ожидаемый PnL
			s.mu.Lock()
			if expectedPnL > 0 {
				s.stats.SuccessfulTrades++
			} else {
				s.stats.FailedTrades++
			}
			s.stats.TotalCrosses++
			log.Infof("📊 Statistics updated (fallback): SuccessfulTrades=%d, FailedTrades=%d, TotalCrosses=%d",
				s.stats.SuccessfulTrades, s.stats.FailedTrades, s.stats.TotalCrosses)
			s.mu.Unlock()
		}
	} else {
		log.Warnf("⚠️ Trade history is empty, using expected PnL for statistics")
		// Fallback: если не удалось получить сделку, используем ожидаемый PnL
		s.mu.Lock()
		if expectedPnL > 0 {
			s.stats.SuccessfulTrades++
		} else {
			s.stats.FailedTrades++
		}
		s.stats.TotalCrosses++
		log.Infof("📊 Statistics updated (fallback): SuccessfulTrades=%d, FailedTrades=%d, TotalCrosses=%d",
			s.stats.SuccessfulTrades, s.stats.FailedTrades, s.stats.TotalCrosses)
		s.mu.Unlock()
	}

	log.Info("Position closed successfully")
}

// Получение статистики
func (s *IntervalStrategy) GetStats() IntervalStats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	// Создаем копию статистики для безопасного возврата
	statsCopy := s.stats
	
	// Копируем map активных интервалов
	statsCopy.ActiveIntervals = make(map[string]PriceInterval)
	for k, v := range s.stats.ActiveIntervals {
		statsCopy.ActiveIntervals[k] = v
	}
	
	log.Infof("📊 GetStats called: SuccessfulTrades=%d, FailedTrades=%d, TotalCrosses=%d, ActiveIntervals=%d",
		statsCopy.SuccessfulTrades, statsCopy.FailedTrades, statsCopy.TotalCrosses, len(statsCopy.ActiveIntervals))
	
	return statsCopy
}

// Получение активных интервалов
func (s *IntervalStrategy) GetActiveIntervals() map[string]PriceInterval {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]PriceInterval)
	for k, v := range s.activeIntervals {
		result[k] = v
	}
	return result
}
