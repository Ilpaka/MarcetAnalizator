package indicators

type EMA struct {
	period    int
	smoothing float64
	value     float64
	count     int
}

func NewEMA(period int) *EMA {
	return &EMA{
		period:    period,
		smoothing: 2.0 / float64(period+1),
	}
}

func (e *EMA) Update(price float64) float64 {
	e.count++

	if e.count == 1 {
		e.value = price
		return e.value
	}

	e.value = price*e.smoothing + e.value*(1-e.smoothing)
	return e.value
}

func (e *EMA) Value() float64 {
	return e.value
}

func (e *EMA) Reset() {
	e.value = 0
	e.count = 0
}

func (e *EMA) IsReady() bool {
	return e.count >= e.period
}
