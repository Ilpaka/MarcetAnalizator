package indicators

type StochRSI struct {
	rsi       *RSI
	period    int
	smoothK   int
	smoothD   int
	rsiValues []float64
	kValues   []float64
	k         float64
	d         float64
}

func NewStochRSI(rsiPeriod, stochPeriod, smoothK, smoothD int) *StochRSI {
	return &StochRSI{
		rsi:       NewRSI(rsiPeriod),
		period:    stochPeriod,
		smoothK:   smoothK,
		smoothD:   smoothD,
		rsiValues: make([]float64, 0, stochPeriod),
		kValues:   make([]float64, 0, smoothD),
	}
}

// DefaultStochRSI creates with standard 14, 14, 3, 3 parameters
func DefaultStochRSI() *StochRSI {
	return NewStochRSI(14, 14, 3, 3)
}

func (s *StochRSI) Update(price float64) (k, d float64) {
	rsiValue := s.rsi.Update(price)

	s.rsiValues = append(s.rsiValues, rsiValue)
	if len(s.rsiValues) > s.period {
		s.rsiValues = s.rsiValues[1:]
	}

	if len(s.rsiValues) < s.period {
		s.k = 50
		s.d = 50
		return s.k, s.d
	}

	// Calculate Stochastic of RSI
	minRSI := minSlice(s.rsiValues)
	maxRSI := maxSlice(s.rsiValues)

	if maxRSI-minRSI == 0 {
		s.k = 50
	} else {
		rawK := ((rsiValue - minRSI) / (maxRSI - minRSI)) * 100

		// Smooth %K
		s.kValues = append(s.kValues, rawK)
		if len(s.kValues) > s.smoothK {
			s.kValues = s.kValues[1:]
		}
		s.k = sum(s.kValues) / float64(len(s.kValues))
	}

	// %D is SMA of %K (already smoothed)
	s.d = s.k // Simplified, can add separate smoothing

	return s.k, s.d
}

func (s *StochRSI) Values() (k, d float64) {
	return s.k, s.d
}

func (s *StochRSI) Signal() Signal {
	// More sensitive thresholds for scalping
	
	// Strong oversold
	if s.k < 20 {
		return Signal{
			Type:      "BUY",
			Strength:  0.9 + (20-s.k)/20*0.1, // 0.9-1.0
			Indicator: "StochRSI",
			Reason:    "Strong oversold condition",
		}
	}
	
	// Moderate oversold
	if s.k < 30 {
		return Signal{
			Type:      "BUY",
			Strength:  0.6 + (30-s.k)/10*0.3, // 0.6-0.9
			Indicator: "StochRSI",
			Reason:    "Moderate oversold condition",
		}
	}
	
	// Weak oversold
	if s.k < 40 {
		return Signal{
			Type:      "BUY",
			Strength:  0.3 + (40-s.k)/10*0.3, // 0.3-0.6
			Indicator: "StochRSI",
			Reason:    "Weak oversold condition",
		}
	}

	// Strong overbought
	if s.k > 80 {
		return Signal{
			Type:      "SELL",
			Strength:  0.9 + (s.k-80)/20*0.1, // 0.9-1.0
			Indicator: "StochRSI",
			Reason:    "Strong overbought condition",
		}
	}
	
	// Moderate overbought
	if s.k > 70 {
		return Signal{
			Type:      "SELL",
			Strength:  0.6 + (s.k-70)/10*0.3, // 0.6-0.9
			Indicator: "StochRSI",
			Reason:    "Moderate overbought condition",
		}
	}
	
	// Weak overbought
	if s.k > 60 {
		return Signal{
			Type:      "SELL",
			Strength:  0.3 + (s.k-60)/10*0.3, // 0.3-0.6
			Indicator: "StochRSI",
			Reason:    "Weak overbought condition",
		}
	}

	return Signal{Type: "HOLD", Indicator: "StochRSI"}
}

func (s *StochRSI) Reset() {
	s.rsi.Reset()
	s.rsiValues = s.rsiValues[:0]
	s.kValues = s.kValues[:0]
	s.k = 50
	s.d = 50
}

func minSlice(arr []float64) float64 {
	if len(arr) == 0 {
		return 0
	}
	m := arr[0]
	for _, v := range arr[1:] {
		if v < m {
			m = v
		}
	}
	return m
}

func maxSlice(arr []float64) float64 {
	if len(arr) == 0 {
		return 0
	}
	m := arr[0]
	for _, v := range arr[1:] {
		if v > m {
			m = v
		}
	}
	return m
}
