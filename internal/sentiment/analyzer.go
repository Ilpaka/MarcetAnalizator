package sentiment

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
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

// FearGreedIndex represents the Fear & Greed Index data
type FearGreedIndex struct {
	Value          int       `json:"value"`          // 0-100
	Classification string    `json:"classification"` // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
	Timestamp      time.Time `json:"timestamp"`
}

// FearGreedAPIResponse represents the API response structure
type FearGreedAPIResponse struct {
	Name  string `json:"name"`
	Data  []struct {
		Value              string `json:"value"`
		ValueClassification string `json:"value_classification"`
		Timestamp          string `json:"timestamp"`
	} `json:"data"`
	Metadata struct {
		Error interface{} `json:"error"`
	} `json:"metadata"`
}

// GetFearGreedIndex fetches the current Fear & Greed Index from alternative.me API
func GetFearGreedIndex() (*FearGreedIndex, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get("https://api.alternative.me/fng/")
	if err != nil {
		log.Errorf("Failed to fetch Fear & Greed Index: %v", err)
		return nil, fmt.Errorf("failed to fetch Fear & Greed Index: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Errorf("Fear & Greed Index API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var apiResp FearGreedAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		log.Errorf("Failed to decode Fear & Greed Index response: %v", err)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(apiResp.Data) == 0 {
		return nil, fmt.Errorf("no data in API response")
	}

	// Get the most recent data point
	data := apiResp.Data[0]
	
	value, err := strconv.Atoi(data.Value)
	if err != nil {
		log.Errorf("Failed to parse Fear & Greed Index value: %v", err)
		return nil, fmt.Errorf("failed to parse value: %w", err)
	}

	timestamp, err := strconv.ParseInt(data.Timestamp, 10, 64)
	if err != nil {
		log.Errorf("Failed to parse timestamp: %v", err)
		return nil, fmt.Errorf("failed to parse timestamp: %w", err)
	}

	return &FearGreedIndex{
		Value:          value,
		Classification: data.ValueClassification,
		Timestamp:      time.Unix(timestamp, 0),
	}, nil
}

