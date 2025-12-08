package indicators

type OBV struct {
	value     float64
	prevClose float64
	prevOBV   float64
	count     int
}

func NewOBV() *OBV {
	return &OBV{}
}

func (o *OBV) Update(close, volume float64) float64 {
	if o.count == 0 {
		o.prevClose = close
		o.value = volume
		o.count++
		return o.value
	}

	o.prevOBV = o.value

	if close > o.prevClose {
		o.value += volume
	} else if close < o.prevClose {
		o.value -= volume
	}
	// If close == prevClose, OBV unchanged

	o.prevClose = close
	o.count++

	return o.value
}

func (o *OBV) Value() float64 {
	return o.value
}

// Trend returns the direction of OBV movement
func (o *OBV) Trend() string {
	if o.value > o.prevOBV {
		return "UP"
	} else if o.value < o.prevOBV {
		return "DOWN"
	}
	return "FLAT"
}

func (o *OBV) Reset() {
	o.value = 0
	o.prevClose = 0
	o.prevOBV = 0
	o.count = 0
}
