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
	// Oversold: K < 20
	if s.k < 20 {
		return Signal{
			Type:      "BUY",
			Strength:  (20 - s.k) / 20,
			Indicator: "StochRSI",
			Reason:    "Oversold condition",
		}
	}

	// Overbought: K > 80
	if s.k > 80 {
		return Signal{
			Type:      "SELL",
			Strength:  (s.k - 80) / 20,
			Indicator: "StochRSI",
			Reason:    "Overbought condition",
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
