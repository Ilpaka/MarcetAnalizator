package signals

import (
	"crypto-trading-bot/internal/indicators"
	"math"
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
		"technical": 0.6, // Increased weight for technical signals
		"ml":         0.3,
		"sentiment":  0.1,
	}

	combinedScore := technicalScore*weights["technical"] +
		mlScore*weights["ml"] +
		sentimentScore*weights["sentiment"]

	var direction string
	var confidence float64

	// Much lower threshold for scalping - allow small profits
	// Threshold reduced from 0.1 to 0.05 for more frequent trading
	scalpingThreshold := 0.05
	
	if combinedScore > scalpingThreshold {
		direction = "LONG"
		// Boost confidence for scalping - even small signals can be profitable
		confidence = math.Min(combinedScore*1.2, 1.0) // Boost by 20%
		// Ensure minimum confidence for trading
		if confidence < 0.3 {
			confidence = 0.3
		}
	} else if combinedScore < -scalpingThreshold {
		direction = "SHORT"
		confidence = math.Min(-combinedScore*1.2, 1.0) // Boost by 20%
		if confidence < 0.3 {
			confidence = 0.3
		}
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

