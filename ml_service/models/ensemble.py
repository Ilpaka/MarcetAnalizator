"""
Ensemble Model - combines LSTM and XGBoost predictions
"""
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class EnsemblePredictor:
    """Ensemble predictor combining multiple models"""

    def __init__(self, lstm_predictor, xgboost_predictor):
        self.lstm = lstm_predictor
        self.xgboost = xgboost_predictor

        # Weights for ensemble (can be optimized)
        self.weights = {
            'lstm': 0.6,      # LSTM better for sequences
            'xgboost': 0.4     # XGBoost better for features
        }

        logger.info("Ensemble predictor initialized")

    def predict(self,
                candles: np.ndarray,
                indicators: Optional[Dict] = None,
                sentiment_score: float = 0.0,
                timeframe: str = '1h') -> Dict[str, Any]:
        """
        Make ensemble prediction

        Args:
            candles: Price data
            indicators: Technical indicators
            sentiment_score: Market sentiment
            timeframe: Trading timeframe

        Returns:
            Combined prediction
        """
        try:
            # Get predictions from both models
            lstm_pred = self.lstm.predict(candles, indicators, sentiment_score, timeframe)
            xgb_pred = self.xgboost.predict(candles, indicators, sentiment_score, timeframe)

            # Combine predictions
            combined = self._combine_predictions(lstm_pred, xgb_pred, timeframe)

            return combined

        except Exception as e:
            logger.error(f"Ensemble prediction error: {e}")
            # Fallback to LSTM
            return self.lstm.predict(candles, indicators, sentiment_score, timeframe)

    def _combine_predictions(self,
                             lstm_pred: Dict,
                             xgb_pred: Dict,
                             timeframe: str) -> Dict[str, Any]:
        """Combine predictions from multiple models"""

        # Adjust weights based on timeframe
        w_lstm = self.weights['lstm']
        w_xgb = self.weights['xgboost']

        # LSTM is better for longer timeframes
        if timeframe in ['4h', '1d']:
            w_lstm = 0.7
            w_xgb = 0.3
        # XGBoost is better for shorter timeframes
        elif timeframe in ['5m', '15m']:
            w_lstm = 0.4
            w_xgb = 0.6

        # Convert directions to numeric scores
        def direction_to_score(direction: str, probability: float) -> float:
            if direction == 'UP':
                return probability
            elif direction == 'DOWN':
                return -probability
            else:
                return 0.0

        lstm_score = direction_to_score(lstm_pred['direction'], lstm_pred['probability'])
        xgb_score = direction_to_score(xgb_pred['direction'], xgb_pred['probability'])

        # Weighted combination
        combined_score = w_lstm * lstm_score + w_xgb * xgb_score

        # Determine final direction
        if combined_score > 0.1:
            direction = 'UP'
            probability = abs(combined_score)
        elif combined_score < -0.1:
            direction = 'DOWN'
            probability = abs(combined_score)
        else:
            direction = 'NEUTRAL'
            probability = 0.5

        # Combine confidence (average)
        confidence = (
            w_lstm * lstm_pred['confidence'] +
            w_xgb * xgb_pred['confidence']
        )

        # Combine expected move (weighted average)
        expected_move = (
            w_lstm * lstm_pred['expected_move'] +
            w_xgb * xgb_pred['expected_move']
        )

        # Check if models agree
        models_agree = lstm_pred['direction'] == xgb_pred['direction']
        if models_agree:
            # Boost confidence when models agree
            confidence = min(confidence * 1.15, 0.95)
            probability = min(probability * 1.1, 0.95)

        return {
            'direction': direction,
            'probability': float(probability),
            'confidence': float(confidence),
            'expected_move': float(expected_move),
            'model': 'Ensemble',
            'lstm_direction': lstm_pred['direction'],
            'xgb_direction': xgb_pred['direction'],
            'models_agree': models_agree
        }
