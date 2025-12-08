package indicators

import "math"

type RSI struct {
	period    int
	avgGain   float64
	avgLoss   float64
	prevPrice float64
	count     int
	gains     []float64
	losses    []float64
	value     float64
}

func NewRSI(period int) *RSI {
	return &RSI{
		period: period,
		gains:  make([]float64, 0, period),
		losses: make([]float64, 0, period),
	}
}

func (r *RSI) Update(price float64) float64 {
	if r.count == 0 {
		r.prevPrice = price
		r.count++
		r.value = 50.0
		return r.value
	}

	change := price - r.prevPrice
	gain := math.Max(change, 0)
	loss := math.Abs(math.Min(change, 0))

	r.prevPrice = price
	r.count++

	// Initial period - collect data
	if r.count <= r.period {
		r.gains = append(r.gains, gain)
		r.losses = append(r.losses, loss)

		if r.count == r.period {
			// Calculate initial averages
			r.avgGain = sum(r.gains) / float64(r.period)
			r.avgLoss = sum(r.losses) / float64(r.period)
		} else {
			r.value = 50.0
			return r.value
		}
	} else {
		// Smoothed moving average
		r.avgGain = (r.avgGain*float64(r.period-1) + gain) / float64(r.period)
		r.avgLoss = (r.avgLoss*float64(r.period-1) + loss) / float64(r.period)
	}

	if r.avgLoss == 0 {
		r.value = 100.0
		return r.value
	}

	rs := r.avgGain / r.avgLoss
	r.value = 100.0 - (100.0 / (1.0 + rs))

	return r.value
}

func (r *RSI) Value() float64 {
	return r.value
}

func (r *RSI) IsOverbought() bool {
	return r.value >= 70
}

func (r *RSI) IsOversold() bool {
	return r.value <= 30
}

func (r *RSI) Signal() Signal {
	if r.value <= 30 {
		return Signal{
			Type:      "BUY",
			Strength:  (30 - r.value) / 30,
			Indicator: "RSI",
			Reason:    "Oversold condition",
		}
	}
	if r.value >= 70 {
		return Signal{
			Type:      "SELL",
			Strength:  (r.value - 70) / 30,
			Indicator: "RSI",
			Reason:    "Overbought condition",
		}
	}
	return Signal{Type: "HOLD", Indicator: "RSI"}
}

func (r *RSI) Reset() {
	r.avgGain = 0
	r.avgLoss = 0
	r.prevPrice = 0
	r.count = 0
	r.gains = r.gains[:0]
	r.losses = r.losses[:0]
	r.value = 50
}

func sum(arr []float64) float64 {
	var s float64
	for _, v := range arr {
		s += v
	}
	return s
}
