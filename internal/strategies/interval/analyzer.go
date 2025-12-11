package interval

import (
	"fmt"
	"sort"
	"time"

	"crypto-trading-bot/internal/binance"
	log "github.com/sirupsen/logrus"
)

// getMinutesPerCandle возвращает количество минут в одной свече для данного таймфрейма
func getMinutesPerCandle(timeframe string) int {
	switch timeframe {
	case "1m":
		return 1
	case "3m":
		return 3
	case "5m":
		return 5
	case "15m":
		return 15
	case "30m":
		return 30
	case "1h":
		return 60
	case "2h":
		return 120
	case "4h":
		return 240
	case "6h":
		return 360
	case "8h":
		return 480
	case "12h":
		return 720
	case "1d":
		return 1440
	case "3d":
		return 4320
	case "1w":
		return 10080
	default:
		return 1 // По умолчанию 1 минута
	}
}

type IntervalAnalyzer struct {
	config *IntervalConfig
	client *binance.Client
}

func NewIntervalAnalyzer(config *IntervalConfig, client *binance.Client) *IntervalAnalyzer {
	return &IntervalAnalyzer{
		config: config,
		client: client,
	}
}

// Анализ всех инструментов и выбор топовых
func (a *IntervalAnalyzer) AnalyzeInstruments(symbols []string) ([]InstrumentAnalysis, error) {
	if len(symbols) == 0 {
		return nil, fmt.Errorf("no symbols provided for analysis")
	}

	log.Infof("Analyzing %d instruments: %v", len(symbols), symbols)
	results := make([]InstrumentAnalysis, 0, len(symbols))

	for _, symbol := range symbols {
		log.Debugf("Analyzing instrument: %s", symbol)
		analysis, err := a.analyzeInstrument(symbol)
		if err != nil {
			log.Warnf("Failed to analyze %s: %v", symbol, err)
			continue
		}
		log.Debugf("Analysis result for %s: volatility=%.2f, width=%.2f%%, crosses=%d",
			symbol, analysis.BestInterval.Volatility, analysis.BestInterval.Width, analysis.BestInterval.Crosses)
		results = append(results, analysis)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no instruments could be analyzed successfully")
	}

	// Сортируем по волатильности (убывание)
	sort.Slice(results, func(i, j int) bool {
		return results[i].BestInterval.Volatility > results[j].BestInterval.Volatility
	})

	// Возвращаем топ N
	if len(results) > a.config.TopInstrumentsCount {
		results = results[:a.config.TopInstrumentsCount]
	}

	log.Infof("Selected %d top instruments from analysis", len(results))
	return results, nil
}

// Анализ одного инструмента
func (a *IntervalAnalyzer) analyzeInstrument(symbol string) (InstrumentAnalysis, error) {
	// Определяем таймфрейм и период анализа
	timeframe := a.config.Timeframe
	if timeframe == "" {
		timeframe = "1m" // По умолчанию 1 минута
	}

	// Определяем количество свечей для анализа
	var limit int
	if a.config.PeriodMinutesToAnalyze > 0 {
		// Используем новый параметр PeriodMinutesToAnalyze
		// Конвертируем минуты в количество свечей в зависимости от таймфрейма
		minutesPerCandle := getMinutesPerCandle(timeframe)
		limit = a.config.PeriodMinutesToAnalyze / minutesPerCandle
		if limit < 10 {
			limit = 10 // Минимум 10 свечей
		}
	} else if a.config.DaysToAnalyze > 0 {
		// Обратная совместимость: используем DaysToAnalyze
		minutesPerCandle := getMinutesPerCandle(timeframe)
		limit = (a.config.DaysToAnalyze * 1440) / minutesPerCandle
	} else {
		// По умолчанию: 7 дней
		minutesPerCandle := getMinutesPerCandle(timeframe)
		limit = (7 * 1440) / minutesPerCandle
	}

	if limit > 1000 {
		limit = 1000 // Binance API limit
	}

	log.Debugf("Fetching %d klines for %s with timeframe %s", limit, symbol, timeframe)
	klines, err := a.client.GetKlines(symbol, timeframe, limit)
	if err != nil {
		log.Errorf("Failed to get klines for %s: %v", symbol, err)
		return InstrumentAnalysis{}, fmt.Errorf("failed to get klines for %s: %v", symbol, err)
	}

	if len(klines) == 0 {
		return InstrumentAnalysis{}, fmt.Errorf("no klines data for %s", symbol)
	}

	if len(klines) < 10 {
		return InstrumentAnalysis{}, fmt.Errorf("insufficient klines data for %s: got %d, need at least 10", symbol, len(klines))
	}

	// Находим лучший интервал
	interval := a.findBestInterval(symbol, klines)

	// Получаем текущую цену
	currentPrice := klines[len(klines)-1].Close

	// Рассчитываем оценку
	score := interval.Volatility

	return InstrumentAnalysis{
		Symbol:          symbol,
		BestInterval:    interval,
		CurrentPrice:    currentPrice,
		Score:           score,
		EstimatedTrades: interval.Crosses,
		EstimatedProfit: interval.Width * float64(interval.Crosses),
	}, nil
}

// Поиск лучшего интервала в зависимости от метода
func (a *IntervalAnalyzer) findBestInterval(symbol string, klines []binance.Kline) PriceInterval {
	switch a.config.AnalysisMethod {
	case SIMPLEST:
		return a.findIntervalSimplest(symbol, klines)
	case BEST_WIDTH:
		return a.findIntervalBestWidth(symbol, klines)
	case MATH_STAT:
		return a.findIntervalMathStat(symbol, klines)
	default:
		return a.findIntervalBestWidth(symbol, klines)
	}
}

// Метод 1: SIMPLEST - полный перебор
func (a *IntervalAnalyzer) findIntervalSimplest(symbol string, klines []binance.Kline) PriceInterval {
	prices := make([]float64, len(klines))
	for i, k := range klines {
		prices[i] = (k.High + k.Low + k.Open + k.Close) / 4.0
	}

	minPrice := min(prices)
	maxPrice := max(prices)

	bestInterval := PriceInterval{}

	// Перебираем все возможные цены как центр интервала
	step := (maxPrice - minPrice) / 1000 // 1000 шагов для производительности

	for center := minPrice; center <= maxPrice; center += step {
		// Расширяем от минимальной ширины
		for widthPct := a.config.MinProfitPercent; widthPct <= a.config.MaxProfitPercent; widthPct += 0.05 {
			width := center * widthPct / 100.0
			lower := center - width/2
			upper := center + width/2

			if lower <= 0 {
				continue
			}

			crosses := a.countCrosses(klines, lower, upper)
			volatility := widthPct * float64(crosses)

			if volatility > bestInterval.Volatility {
				bestInterval = PriceInterval{
					Symbol:          symbol,
					Lower:           lower,
					Upper:           upper,
					Median:          center,
					Width:           widthPct,
					Crosses:         crosses,
					Volatility:      volatility,
					CalculatedAt:    time.Now(),
					CandlesAnalyzed: len(klines),
				}
			}
		}
	}

	return bestInterval
}

// Метод 2: BEST_WIDTH - медиана + расширение
func (a *IntervalAnalyzer) findIntervalBestWidth(symbol string, klines []binance.Kline) PriceInterval {
	prices := make([]float64, len(klines))
	for i, k := range klines {
		prices[i] = (k.High + k.Low + k.Open + k.Close) / 4.0
	}

	median := calculateMedian(prices)

	bestInterval := PriceInterval{}

	// Расширяем от медианы
	for widthPct := a.config.MinProfitPercent; widthPct <= a.config.MaxProfitPercent; widthPct += 0.05 {
		width := median * widthPct / 100.0
		lower := median - width/2
		upper := median + width/2

		if lower <= 0 {
			continue
		}

		crosses := a.countCrosses(klines, lower, upper)
		volatility := widthPct * float64(crosses)

		if volatility > bestInterval.Volatility {
			bestInterval = PriceInterval{
				Symbol:          symbol,
				Lower:           lower,
				Upper:           upper,
				Median:          median,
				Width:           widthPct,
				Crosses:         crosses,
				Volatility:      volatility,
				CalculatedAt:    time.Now(),
				CandlesAnalyzed: len(klines),
			}
		} else if volatility < bestInterval.Volatility && bestInterval.Volatility > 0 {
			// Если волатильность начала падать, прекращаем расширение
			break
		}
	}

	return bestInterval
}

// Метод 3: MATH_STAT - статистические процентили
func (a *IntervalAnalyzer) findIntervalMathStat(symbol string, klines []binance.Kline) PriceInterval {
	prices := make([]float64, len(klines))
	for i, k := range klines {
		prices[i] = (k.High + k.Low + k.Open + k.Close) / 4.0
	}

	sort.Float64s(prices)

	lower := calculatePercentile(prices, a.config.LowPercentile)
	upper := calculatePercentile(prices, a.config.HighPercentile)
	median := calculateMedian(prices)

	crosses := a.countCrosses(klines, lower, upper)
	widthPct := (upper - lower) / median * 100.0
	volatility := widthPct * float64(crosses)

	return PriceInterval{
		Symbol:          symbol,
		Lower:           lower,
		Upper:           upper,
		Median:          median,
		Width:           widthPct,
		Crosses:         crosses,
		Volatility:      volatility,
		CalculatedAt:    time.Now(),
		CandlesAnalyzed: len(klines),
	}
}

// Подсчет пересечений интервала
func (a *IntervalAnalyzer) countCrosses(klines []binance.Kline, lower, upper float64) int {
	count := 0
	for _, k := range klines {
		if k.High >= upper && k.Low <= lower {
			count++
		}
	}
	return count
}

// Вспомогательные функции
func min(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	m := nums[0]
	for _, n := range nums {
		if n < m {
			m = n
		}
	}
	return m
}

func max(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	m := nums[0]
	for _, n := range nums {
		if n > m {
			m = n
		}
	}
	return m
}

func calculateMedian(nums []float64) float64 {
	sorted := make([]float64, len(nums))
	copy(sorted, nums)
	sort.Float64s(sorted)

	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}

func calculatePercentile(sortedNums []float64, percentile float64) float64 {
	if len(sortedNums) == 0 {
		return 0
	}
	index := int(float64(len(sortedNums)-1) * percentile / 100.0)
	if index < 0 {
		index = 0
	}
	if index >= len(sortedNums) {
		index = len(sortedNums) - 1
	}
	return sortedNums[index]
}

