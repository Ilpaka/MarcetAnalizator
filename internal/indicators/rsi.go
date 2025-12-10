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
	// More sensitive thresholds for scalping: 40/60 instead of 30/70
	// Also add signals for moderate conditions
	
	// Strong oversold
	if r.value <= 30 {
		return Signal{
			Type:      "BUY",
			Strength:  0.9 + (30-r.value)/30*0.1, // 0.9-1.0
			Indicator: "RSI",
			Reason:    "Strong oversold condition",
		}
	}
	// Moderate oversold - for scalping
	if r.value <= 40 {
		return Signal{
			Type:      "BUY",
			Strength:  0.5 + (40-r.value)/10*0.4, // 0.5-0.9
			Indicator: "RSI",
			Reason:    "Moderate oversold condition",
		}
	}
	// Weak oversold - for quick scalps
	if r.value <= 45 {
		return Signal{
			Type:      "BUY",
			Strength:  0.3 + (45-r.value)/5*0.2, // 0.3-0.5
			Indicator: "RSI",
			Reason:    "Weak oversold condition",
		}
	}
	
	// Strong overbought
	if r.value >= 70 {
		return Signal{
			Type:      "SELL",
			Strength:  0.9 + (r.value-70)/30*0.1, // 0.9-1.0
			Indicator: "RSI",
			Reason:    "Strong overbought condition",
		}
	}
	// Moderate overbought - for scalping
	if r.value >= 60 {
		return Signal{
			Type:      "SELL",
			Strength:  0.5 + (r.value-60)/10*0.4, // 0.5-0.9
			Indicator: "RSI",
			Reason:    "Moderate overbought condition",
		}
	}
	// Weak overbought - for quick scalps
	if r.value >= 55 {
		return Signal{
			Type:      "SELL",
			Strength:  0.3 + (r.value-55)/5*0.2, // 0.3-0.5
			Indicator: "RSI",
			Reason:    "Weak overbought condition",
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
