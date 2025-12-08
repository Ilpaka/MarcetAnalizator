package sentiment

import (
	"sync"
	"time"
)

type SentimentScore struct {
	OverallScore float64   `json:"overallScore"`
	Positive     float64   `json:"positive"`
	Negative     float64   `json:"negative"`
	Neutral      float64   `json:"neutral"`
	Timestamp    time.Time `json:"timestamp"`
}

type SentimentManager struct {
	currentScore SentimentScore
	mu           sync.RWMutex
}

func NewSentimentManager() *SentimentManager {
	return &SentimentManager{
		currentScore: SentimentScore{
			OverallScore: 0.0,
			Positive:     0.33,
			Negative:     0.33,
			Neutral:      0.34,
			Timestamp:     time.Now(),
		},
	}
}

func (sm *SentimentManager) UpdateScore(score SentimentScore) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.currentScore = score
	sm.currentScore.Timestamp = time.Now()
}

func (sm *SentimentManager) GetScore() SentimentScore {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.currentScore
}

func (sm *SentimentManager) GetAggregateScore() float64 {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.currentScore.OverallScore
}

