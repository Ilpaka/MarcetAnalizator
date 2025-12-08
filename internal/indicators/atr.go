package indicators

import "math"

type ATR struct {
	period    int
	prevClose float64
	trValues  []float64
	value     float64
	count     int
}

func NewATR(period int) *ATR {
	return &ATR{
		period:   period,
		trValues: make([]float64, 0, period),
	}
}

func (a *ATR) Update(high, low, close float64) float64 {
	var trueRange float64

	if a.count == 0 {
		trueRange = high - low
	} else {
		// True Range = max(H-L, |H-prevClose|, |L-prevClose|)
		trueRange = math.Max(
			high-low,
			math.Max(
				math.Abs(high-a.prevClose),
				math.Abs(low-a.prevClose),
			),
		)
	}

	a.prevClose = close
	a.count++

	a.trValues = append(a.trValues, trueRange)
	if len(a.trValues) > a.period {
		a.trValues = a.trValues[1:]
	}

	if len(a.trValues) < a.period {
		a.value = sum(a.trValues) / float64(len(a.trValues))
		return a.value
	}

	// Smoothed ATR
	if a.count == a.period {
		a.value = sum(a.trValues) / float64(a.period)
	} else {
		a.value = (a.value*float64(a.period-1) + trueRange) / float64(a.period)
	}

	return a.value
}

func (a *ATR) Value() float64 {
	return a.value
}

// StopLoss calculates stop loss distance using ATR multiplier
func (a *ATR) StopLoss(multiplier float64) float64 {
	return a.value * multiplier
}

func (a *ATR) Reset() {
	a.prevClose = 0
	a.trValues = a.trValues[:0]
	a.value = 0
	a.count = 0
}
