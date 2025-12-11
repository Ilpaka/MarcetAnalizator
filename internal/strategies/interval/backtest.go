package interval

import (
	"fmt"
	"sort"
	"time"

	"crypto-trading-bot/internal/binance"
	log "github.com/sirupsen/logrus"
)

// Результат бэктеста
type BacktestResult struct {
	Config              IntervalConfig `json:"config"`
	TotalTrades         int            `json:"totalTrades"`
	WinningTrades       int            `json:"winningTrades"`
	LosingTrades        int            `json:"losingTrades"`
	TotalProfit         float64        `json:"totalProfit"`
	TotalProfitPercent  float64        `json:"totalProfitPercent"`
	AverageDayProfit     float64        `json:"averageDayProfit"`
	MaxDrawdown         float64        `json:"maxDrawdown"`
	BestSymbol          string         `json:"bestSymbol"`
	WorstSymbol         string         `json:"worstSymbol"`
}

type Backtester struct {
	config *IntervalConfig
	client *binance.Client
}

func NewBacktester(config *IntervalConfig, client *binance.Client) *Backtester {
	return &Backtester{
		config: config,
		client: client,
	}
}

// Запуск бэктеста на исторических данных
func (b *Backtester) Run(symbol string, startDate, endDate time.Time) (*BacktestResult, error) {
	log.Infof("Starting backtest for %s from %s to %s",
		symbol, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	// Загружаем исторические данные
	days := int(endDate.Sub(startDate).Hours() / 24)
	if days < 1 {
		days = 1
	}
	
	limit := days * 1440
	if limit > 1000 {
		limit = 1000 // Binance API limit
	}

	klines, err := b.client.GetKlines(symbol, "1m", limit)
	if err != nil {
		return nil, err
	}

	if len(klines) == 0 {
		return nil, fmt.Errorf("no klines data for %s", symbol)
	}

	// Создаем анализатор
	analyzer := NewIntervalAnalyzer(b.config, b.client)

	// Находим лучший интервал на первой половине данных (обучение)
	trainSize := len(klines) / 2
	if trainSize == 0 {
		trainSize = len(klines)
	}
	trainKlines := klines[:trainSize]
	interval := analyzer.findBestInterval(symbol, trainKlines)

	log.Infof("Training interval: [%.2f - %.2f], width: %.2f%%",
		interval.Lower, interval.Upper, interval.Width)

	// Тестируем на второй половине (тестирование)
	testKlines := klines[trainSize:]

	result := &BacktestResult{
		Config: *b.config,
	}

	var balance float64 = 10000.0 // Начальный баланс для бэктеста
	var position *Position

	for _, candle := range testKlines {
		price := candle.Close

		if position == nil {
			// Проверяем покупку
			if price <= interval.Lower*1.001 { // 0.1% допуск
				// Открываем позицию
				quantity := b.config.PreferredPositionPrice / price
				stopLoss := price * (1 - b.config.StopLossPercent/100)

				position = &Position{
					Symbol:     symbol,
					Side:       "BUY",
					EntryPrice: price,
					Quantity:   quantity,
					StopLoss:   stopLoss,
					TakeProfit: interval.Upper,
					OpenedAt:   time.Unix(candle.CloseTime/1000, 0),
				}

				balance -= price * quantity
			}
		} else {
			// Проверяем продажу или stop-loss
			shouldSell := false
			reason := ""

			if price >= interval.Upper*0.999 { // Достигли верхней границы
				shouldSell = true
				reason = "Take Profit"
			} else if price <= position.StopLoss { // Stop-loss
				shouldSell = true
				reason = "Stop Loss"
			}

			if shouldSell {
				// Закрываем позицию
				profit := (price - position.EntryPrice) * position.Quantity
				balance += price * position.Quantity

				result.TotalTrades++
				if profit > 0 {
					result.WinningTrades++
					result.TotalProfit += profit
				} else {
					result.LosingTrades++
					result.TotalProfit += profit
				}

				log.Debugf("Trade closed: %s, Entry: %.2f, Exit: %.2f, Profit: %.2f",
					reason, position.EntryPrice, price, profit)

				position = nil
			}
		}
	}

	// Рассчитываем итоговые метрики
	result.TotalProfitPercent = (balance - 10000.0) / 10000.0 * 100
	if days > 0 {
		result.AverageDayProfit = result.TotalProfitPercent / float64(days)
	}

	log.Infof("Backtest completed: Total trades: %d, Win rate: %.2f%%, Total profit: %.2f%%",
		result.TotalTrades,
		float64(result.WinningTrades)/float64(result.TotalTrades)*100,
		result.TotalProfitPercent)

	return result, nil
}

// Множественный бэктест с разными конфигурациями
func (b *Backtester) RunMultiple(
	symbol string,
	startDate, endDate time.Time,
	configs []IntervalConfig,
) ([]*BacktestResult, error) {
	results := make([]*BacktestResult, 0, len(configs))

	for i, config := range configs {
		log.Infof("Running backtest %d/%d", i+1, len(configs))
		b.config = &config

		result, err := b.Run(symbol, startDate, endDate)
		if err != nil {
			log.Warnf("Backtest failed: %v", err)
			continue
		}

		results = append(results, result)
	}

	// Сортируем по средней дневной прибыли
	sort.Slice(results, func(i, j int) bool {
		return results[i].AverageDayProfit > results[j].AverageDayProfit
	})

	return results, nil
}

// Вспомогательная структура для бэктеста
type Position struct {
	Symbol     string
	Side       string
	EntryPrice float64
	Quantity   float64
	StopLoss   float64
	TakeProfit float64
	OpenedAt   time.Time
}

