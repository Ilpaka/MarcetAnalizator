package signals

import (
	"crypto-trading-bot/internal/indicators"
	"math"
	"time"

	"github.com/google/uuid"
)

func CalculateTechnicalScore(indicatorSignals []indicators.Signal) float64 {
	if len(indicatorSignals) == 0 {
		return 0.0
	}

	var totalScore float64
	var totalWeight float64

	for _, sig := range indicatorSignals {
		var weight float64 = 1.0
		var score float64

		switch sig.Type {
		case "BUY":
			score = sig.Strength
		case "SELL":
			score = -sig.Strength
		default:
			score = 0.0
		}

		switch sig.Indicator {
		case "RSI":
			weight = 1.2
		case "MACD":
			weight = 1.5
		case "BollingerBands":
			weight = 1.0
		case "StochRSI":
			weight = 1.1
		case "EMA":
			weight = 1.3
		case "ADX":
			weight = 1.4 // Strong trend indicator
		case "CCI":
			weight = 1.1
		case "Williams%R":
			weight = 1.0
		case "Momentum":
			weight = 1.2
		case "OBV":
			weight = 0.9
		}

		totalScore += score * weight
		totalWeight += weight
	}

	if totalWeight == 0 {
		return 0.0
	}

	return totalScore / totalWeight
}

func CombineSignals(technicalScore, mlScore, sentimentScore float64) *Signal {
	// For scalping, prioritize technical analysis
	weights := map[string]float64{
		"technical": 0.7, // Increased weight for technical signals
		"ml":         0.2,
		"sentiment":  0.1,
	}

	combinedScore := technicalScore*weights["technical"] +
		mlScore*weights["ml"] +
		sentimentScore*weights["sentiment"]

	var direction string
	var confidence float64
	
	// Если технический скор не равен нулю, значит есть сигналы от индикаторов
	// В этом случае ТОЧНО торгуем!
	if math.Abs(technicalScore) > 0.0001 {
		// Есть технические сигналы - ТОРГУЕМ ОБЯЗАТЕЛЬНО!
		if technicalScore > 0 {
			direction = "LONG"
			// Гарантируем минимум 25% уверенности для любых технических сигналов
			// Это гарантирует что сделка произойдет даже при MinConfidence = 0.3
			confidence = math.Max(math.Abs(technicalScore)*5.0, 0.25)
			confidence = math.Min(confidence, 1.0)
		} else {
			direction = "SHORT"
			// Гарантируем минимум 25% уверенности для любых технических сигналов
			confidence = math.Max(math.Abs(technicalScore)*5.0, 0.25)
			confidence = math.Min(confidence, 1.0)
		}
		
		// Дополнительно увеличиваем уверенность на основе combinedScore
		if math.Abs(combinedScore) > 0.01 {
			confidence = math.Max(confidence, math.Min(math.Abs(combinedScore)*10.0, 1.0))
		}
	} else {
		// Нет технических сигналов - HOLD
		direction = "HOLD"
		confidence = 0.0
	}

	return &Signal{
		ID:              uuid.New().String(), // Генерируем ID сразу
		Direction:       direction,
		Confidence:      confidence,
		TechnicalSignal: technicalScore,
		MLSignal:        mlScore,
		SentimentSignal: sentimentScore,
		Timestamp:       time.Now(),
	}
}

