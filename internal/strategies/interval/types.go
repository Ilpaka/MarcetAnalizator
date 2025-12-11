package interval

import "time"

// Метод анализа интервала
type AnalysisMethod int

const (
	SIMPLEST    AnalysisMethod = iota // Полный перебор
	BEST_WIDTH                        // Медиана + расширение
	MATH_STAT                         // Статистические процентили
)

// Конфигурация интервальной стратегии
type IntervalConfig struct {
	// Основные параметры
	Symbol                string         `json:"symbol"`                  // Выбранный символ для анализа и торговли
	Timeframe             string         `json:"timeframe"`                // Таймфрейм для анализа (1m, 5m, 15m, 1h, 4h, 1d)
	PeriodMinutesToAnalyze int           `json:"periodMinutesToAnalyze"`  // Период анализа в минутах (вместо дней)
	Symbols                []string       `json:"symbols"`                 // Символы для анализа (deprecated, используется только Symbol)
	DaysToAnalyze          int            `json:"daysToAnalyze"`           // Дней для расчета интервала (deprecated, используется PeriodMinutesToAnalyze)
	MinProfitPercent       float64        `json:"minProfitPercent"`         // Минимальная ширина коридора в % (по умолчанию: 0.2)
	MaxProfitPercent       float64        `json:"maxProfitPercent"`         // Максимальная ширина коридора в % (по умолчанию: 0.6)
	TopInstrumentsCount    int            `json:"topInstrumentsCount"`     // Топ лучших по волатильности (deprecated, всегда 1)

	// Метод анализа
	AnalysisMethod         AnalysisMethod `json:"analysisMethod"`           // SIMPLEST, BEST_WIDTH, или MATH_STAT

	// Параметры для MATH_STAT
	LowPercentile          float64        `json:"lowPercentile"`           // Нижний процентиль (по умолчанию: 25)
	HighPercentile          float64        `json:"highPercentile"`           // Верхний процентиль (по умолчанию: 75)

	// Защита
	StopLossPercent        float64        `json:"stopLossPercent"`          // Stop-loss в % (по умолчанию: 1.5)
	MaxPositionsCount      int            `json:"maxPositionsCount"`         // Максимум одновременных позиций (по умолчанию: 3)

	// Управление капиталом
	PreferredPositionPrice float64        `json:"preferredPositionPrice"`   // Предпочтительная сумма позиции в USDT (по умолчанию: 1000)
	MaxPositionPrice       float64        `json:"maxPositionPrice"`          // Максимальная цена лота (по умолчанию: 5000)

	// Обновление интервалов
	RecalculateIntervalHours int          `json:"recalculateIntervalHours"`   // Пересчет каждые N часов (по умолчанию: 6)
}

// Ценовой интервал
type PriceInterval struct {
	Symbol          string    `json:"symbol"`           // Торговая пара
	Lower           float64   `json:"lower"`           // Нижняя граница
	Upper           float64   `json:"upper"`           // Верхняя граница
	Median          float64   `json:"median"`          // Медианная цена
	Width           float64   `json:"width"`           // Ширина в процентах
	Crosses         int       `json:"crosses"`          // Количество пересечений
	Volatility      float64   `json:"volatility"`       // Волатильность (width * crosses)
	CalculatedAt    time.Time `json:"calculatedAt" wails:"-"` // Время расчета
	CandlesAnalyzed int       `json:"candlesAnalyzed"`  // Количество проанализированных свечей
}

// Результат анализа инструмента
type InstrumentAnalysis struct {
	Symbol            string         `json:"symbol"`             // Символ
	BestInterval      PriceInterval  `json:"bestInterval"`       // Лучший интервал
	CurrentPrice      float64        `json:"currentPrice"`        // Текущая цена
	Score             float64        `json:"score"`              // Оценка инструмента
	EstimatedTrades   int            `json:"estimatedTrades"`    // Примерное количество сделок в день
	EstimatedProfit   float64        `json:"estimatedProfit"`    // Примерная прибыль в %
}

// Сигнал интервальной стратегии
type IntervalSignal struct {
	Symbol       string       `json:"symbol"`        // Символ
	Type         string       `json:"type"`         // "BUY" или "SELL"
	Price        float64      `json:"price"`        // Текущая цена
	Interval     PriceInterval `json:"interval"`     // Интервал
	Distance     float64      `json:"distance"`     // Расстояние до границы в %
	StopLoss     float64      `json:"stopLoss"`     // Stop-loss цена
	TakeProfit   float64      `json:"takeProfit"`   // Take-profit цена
	Timestamp    time.Time    `json:"timestamp" wails:"-"` // Время сигнала
}

// Статистика интервальной торговли
type IntervalStats struct {
	ActiveIntervals     map[string]PriceInterval `json:"activeIntervals"`     // Активные интервалы
	TotalCrosses        int                      `json:"totalCrosses"`        // Всего пересечений
	SuccessfulTrades    int                      `json:"successfulTrades"`   // Успешных сделок
	FailedTrades        int                      `json:"failedTrades"`        // Неудачных сделок
	AvgHoldTime         time.Duration            `json:"avgHoldTime" wails:"-"` // Среднее время удержания
	BestSymbol          string                   `json:"bestSymbol"`           // Лучший символ
	LastRecalculation   time.Time                `json:"lastRecalculation" wails:"-"` // Последний пересчет
}

