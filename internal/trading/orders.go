package trading

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID          string    `json:"id"`
	Symbol      string    `json:"symbol"`
	Side        string    `json:"side"`        // "BUY" or "SELL"
	Type        string    `json:"type"`        // "LIMIT" or "MARKET"
	Price       float64   `json:"price"`       // For LIMIT orders
	Quantity    float64   `json:"quantity"`
	FilledQty   float64   `json:"filledQty"`  // How much has been filled
	Status      string    `json:"status"`      // "PENDING", "FILLED", "CANCELLED", "PARTIALLY_FILLED"
	CreatedAt   time.Time `json:"createdAt" wails:"-"`
	FilledAt    time.Time `json:"filledAt" wails:"-"`
	CancelledAt time.Time `json:"cancelledAt" wails:"-"`
}

type OrderManager struct {
	orders map[string]*Order
	mu     sync.RWMutex
}

func NewOrderManager() *OrderManager {
	return &OrderManager{
		orders: make(map[string]*Order),
	}
}

func (om *OrderManager) CreateOrder(order *Order) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	order.ID = uuid.New().String()
	order.Status = "PENDING"
	order.CreatedAt = time.Now()
	order.FilledQty = 0

	om.orders[order.ID] = order
	return nil
}

func (om *OrderManager) CancelOrder(orderID string) error {
	om.mu.Lock()
	defer om.mu.Unlock()

	order, exists := om.orders[orderID]
	if !exists {
		return fmt.Errorf("order not found: %s", orderID)
	}

	if order.Status != "PENDING" && order.Status != "PARTIALLY_FILLED" {
		return fmt.Errorf("cannot cancel order with status: %s", order.Status)
	}

	order.Status = "CANCELLED"
	order.CancelledAt = time.Now()

	return nil
}

func (om *OrderManager) GetOrder(orderID string) *Order {
	om.mu.RLock()
	defer om.mu.RUnlock()

	if order, exists := om.orders[orderID]; exists {
		copy := *order
		return &copy
	}
	return nil
}

func (om *OrderManager) GetOrders(symbol string) []Order {
	om.mu.RLock()
	defer om.mu.RUnlock()

	orders := make([]Order, 0)
	for _, order := range om.orders {
		if symbol == "" || order.Symbol == symbol {
			if order.Status == "PENDING" || order.Status == "PARTIALLY_FILLED" {
				orders = append(orders, *order)
			}
		}
	}
	return orders
}

func (om *OrderManager) GetAllOrders() []Order {
	om.mu.RLock()
	defer om.mu.RUnlock()

	orders := make([]Order, 0, len(om.orders))
	for _, order := range om.orders {
		orders = append(orders, *order)
	}
	return orders
}

func (om *OrderManager) FillOrder(orderID string, fillPrice float64, fillQty float64) (*Order, error) {
	om.mu.Lock()
	defer om.mu.Unlock()

	order, exists := om.orders[orderID]
	if !exists {
		return nil, fmt.Errorf("order not found: %s", orderID)
	}

	if order.Status == "CANCELLED" || order.Status == "FILLED" {
		return nil, fmt.Errorf("cannot fill order with status: %s", order.Status)
	}

	order.FilledQty += fillQty

	if order.FilledQty >= order.Quantity {
		order.Status = "FILLED"
		order.FilledAt = time.Now()
	} else {
		order.Status = "PARTIALLY_FILLED"
	}

	return order, nil
}

func (om *OrderManager) ProcessLimitOrders(symbol string, currentPrice float64, paperTrader *PaperTrader) ([]*Order, error) {
	om.mu.Lock()
	defer om.mu.Unlock()

	var filledOrders []*Order

	for _, order := range om.orders {
		if order.Symbol != symbol {
			continue
		}

		if order.Status != "PENDING" && order.Status != "PARTIALLY_FILLED" {
			continue
		}

		if order.Type != "LIMIT" {
			continue
		}

		// Check if limit order should be filled
		shouldFill := false
		if order.Side == "BUY" && currentPrice <= order.Price {
			shouldFill = true
		} else if order.Side == "SELL" && currentPrice >= order.Price {
			shouldFill = true
		}

		if shouldFill {
			remainingQty := order.Quantity - order.FilledQty
			if remainingQty > 0 {
				// Fill the order
				order.FilledQty += remainingQty
				order.Status = "FILLED"
				order.FilledAt = time.Now()
				filledOrders = append(filledOrders, order)

				// Execute the order - open or close position
				if order.Side == "BUY" {
					position := &Position{
						Symbol:     order.Symbol,
						Side:       "BUY",
						EntryPrice: order.Price,
						Quantity:   remainingQty,
						OpenedAt:   time.Now(),
					}
					// Balance already reserved, just open position
					if err := paperTrader.OpenPosition(position); err != nil {
						return nil, err
					}
				} else {
					// For SELL, close existing position
					_, err := paperTrader.ClosePosition(order.Symbol, order.Price, "Limit order filled")
					if err != nil {
						return nil, err
					}
				}
			}
		}
	}

	return filledOrders, nil
}

