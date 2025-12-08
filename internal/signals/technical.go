package signals

import (
	"crypto-trading-bot/internal/indicators"
	"time"
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
	weights := map[string]float64{
		"technical": 0.4,
		"ml":         0.4,
		"sentiment":  0.2,
	}

	combinedScore := technicalScore*weights["technical"] +
		mlScore*weights["ml"] +
		sentimentScore*weights["sentiment"]

	var direction string
	var confidence float64

	if combinedScore > 0.3 {
		direction = "LONG"
		confidence = combinedScore
	} else if combinedScore < -0.3 {
		direction = "SHORT"
		confidence = -combinedScore
	} else {
		direction = "HOLD"
		confidence = 0.0
	}

	return &Signal{
		Direction:       direction,
		Confidence:      confidence,
		TechnicalSignal: technicalScore,
		MLSignal:        mlScore,
		SentimentSignal: sentimentScore,
		Timestamp:       time.Now(),
	}
}

