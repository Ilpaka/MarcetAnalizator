"""
LSTM Model for price prediction
Wraps the custom LSTM implementation for gRPC service
"""
import numpy as np
import pickle
import os
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class LSTMPredictor:
    """LSTM-based price predictor"""

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.metadata = None
        self.is_trained = False

        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            logger.warning("LSTM model not loaded. Using mock predictions.")

    def load_model(self, model_path: str):
        """Load trained LSTM model"""
        try:
            model_file = os.path.join(model_path, 'lstm_model.pkl')
            metadata_file = os.path.join(model_path, 'metadata.pkl')

            logger.info(f"Attempting to load model from: {model_path}")
            logger.info(f"Model file exists: {os.path.exists(model_file)}")
            logger.info(f"Metadata file exists: {os.path.exists(metadata_file)}")

            if not os.path.exists(model_file):
                logger.error(f"Model file not found: {model_file}")
                self.is_trained = False
                return

            if not os.path.exists(metadata_file):
                logger.error(f"Metadata file not found: {metadata_file}")
                self.is_trained = False
                return

            with open(model_file, 'rb') as f:
                self.model = pickle.load(f)
            logger.info(f"Model loaded successfully, type: {type(self.model)}")

            with open(metadata_file, 'rb') as f:
                self.metadata = pickle.load(f)
            logger.info(f"Metadata loaded successfully, keys: {list(self.metadata.keys())}")

            self.is_trained = True
            logger.info(f"LSTM model loaded from {model_path}")
            logger.info(f"Model metrics - MAE: ${self.metadata.get('mae', 0):.2f}, "
                       f"Direction Accuracy: {self.metadata.get('direction_accuracy', 0):.2f}%")
        except Exception as e:
            logger.error(f"Failed to load LSTM model: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.is_trained = False

    def predict(self,
                candles: np.ndarray,
                indicators: Optional[Dict] = None,
                sentiment_score: float = 0.0,
                timeframe: str = '1h') -> Dict[str, Any]:
        """
        Predict price direction

        Args:
            candles: Array of shape (n, 5) with [open, high, low, close, volume]
            indicators: Dictionary of indicator values
            sentiment_score: Sentiment score from -1 to 1
            timeframe: Trading timeframe

        Returns:
            Dictionary with prediction results
        """
        if not self.is_trained:
            logger.warning(f"Model not trained: is_trained={self.is_trained}")
            return self._mock_prediction(candles, sentiment_score)
        
        if not self.model:
            logger.warning("Model object is None")
            return self._mock_prediction(candles, sentiment_score)
        
        if not self.metadata:
            logger.warning("Metadata is None")
            return self._mock_prediction(candles, sentiment_score)

        try:
            # 1. Convert candles to DataFrame
            import pandas as pd
            import sys
            import os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            
            df = pd.DataFrame(candles, columns=['open', 'high', 'low', 'close', 'volume'])
            df['time'] = range(len(df))
            
            # 2. Feature engineering
            from preprocessing.features import create_features
            
            df_features = create_features(df)
            feature_cols = self.metadata.get('feature_cols', [])
            if not feature_cols:
                feature_cols = [col for col in df_features.columns 
                              if col not in ['time', 'close'] and 'lag' not in col]
            
            # 3. Normalization
            scaler = self.metadata.get('scaler')
            close_scaler = self.metadata.get('close_scaler')
            
            if not scaler or not close_scaler:
                logger.warning("Scalers not found in metadata, using mock prediction")
                return self._mock_prediction(candles, sentiment_score)
            
            X_data = scaler.transform(df_features[feature_cols].values)
            close_values = df_features['close'].values.reshape(-1, 1)
            close_normalized = close_scaler.transform(close_values).flatten()
            X_data = np.column_stack([close_normalized, X_data])
            
            # 4. Sequence preparation
            lookback = self.metadata.get('lookback', 60)
            if len(X_data) < lookback:
                logger.warning(f"Not enough data: {len(X_data)} < {lookback}, using mock prediction")
                return self._mock_prediction(candles, sentiment_score)
            
            # Take last lookback sequence
            X_predict = X_data[-lookback:].reshape(1, lookback, -1)
            
            # 5. Model prediction
            logger.info(f"Making prediction with input shape: {X_predict.shape}")
            predicted_normalized = self.model.predict(X_predict)
            logger.info(f"Model output shape: {predicted_normalized.shape}, values: {predicted_normalized.flatten()[:5]}")
            
            # Ensure output is 1D
            if predicted_normalized.ndim > 1:
                predicted_normalized = predicted_normalized.flatten()
            
            # Inverse transform
            predicted_price = close_scaler.inverse_transform(predicted_normalized.reshape(-1, 1)).flatten()[0]
            
            current_price = df['close'].iloc[-1]
            price_change = ((predicted_price - current_price) / current_price) * 100
            
            logger.info(f"Prediction: current={current_price:.2f}, predicted={predicted_price:.2f}, change={price_change:.4f}%")
            
            # Determine direction
            if price_change > 0.1:
                direction = 'UP'
            elif price_change < -0.1:
                direction = 'DOWN'
            else:
                direction = 'NEUTRAL'
            
            # Calculate confidence based on model metrics
            mae = self.metadata.get('mae', 0.0)
            rmse = self.metadata.get('rmse', 0.0)
            direction_accuracy = self.metadata.get('direction_accuracy', 0.0)
            
            # Confidence is based on direction accuracy and inverse of error
            base_confidence = direction_accuracy / 100.0
            error_factor = 1.0 / (1.0 + (rmse / current_price) if current_price > 0 else 1.0)
            confidence = min(base_confidence * error_factor, 0.95)
            
            logger.info(f"LSTM Prediction: current={current_price:.2f}, predicted={predicted_price:.2f}, change={price_change:.2f}%")
            
            return {
                'direction': direction,
                'probability': float(confidence),
                'confidence': float(confidence),
                'expected_move': float(price_change),
                'predicted_price': float(predicted_price),
                'current_price': float(current_price),
                'model': 'LSTM'
            }

        except Exception as e:
            logger.error(f"LSTM prediction error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return self._mock_prediction(candles, sentiment_score)

    def _mock_prediction(self, candles: np.ndarray, sentiment: float) -> Dict[str, Any]:
        """Generate mock prediction for testing"""
        logger.warning("Using MOCK prediction - model is not trained or failed to load!")
        
        # Simple momentum-based mock
        if len(candles) < 2:
            direction = 'NEUTRAL'
            probability = 0.5
            recent_change = 0.0
        else:
            idx = max(0, len(candles) - 10)
            recent_change = (candles[-1, 3] - candles[idx, 3]) / candles[idx, 3] if candles[idx, 3] > 0 else 0.0

            if recent_change > 0.01:
                direction = 'UP'
                probability = 0.55 + min(recent_change * 5, 0.2)
            elif recent_change < -0.01:
                direction = 'DOWN'
                probability = 0.55 + min(abs(recent_change) * 5, 0.2)
            else:
                direction = 'NEUTRAL'
                probability = 0.5

            # Adjust with sentiment
            if sentiment > 0.3 and direction == 'UP':
                probability = min(probability + 0.1, 0.95)
            elif sentiment < -0.3 and direction == 'DOWN':
                probability = min(probability + 0.1, 0.95)

        expected_move = recent_change * 100 if len(candles) >= 2 else 0.0
        current_price = candles[-1, 3] if len(candles) > 0 else 0.0
        
        # Calculate predicted price based on direction
        if direction == 'UP':
            predicted_price = current_price * (1 + abs(expected_move) / 100)
        elif direction == 'DOWN':
            predicted_price = current_price * (1 - abs(expected_move) / 100)
        else:
            predicted_price = current_price

        return {
            'direction': direction,
            'probability': float(probability),
            'confidence': float(probability * 0.9),  # Slightly lower confidence
            'expected_move': float(expected_move),
            'predicted_price': float(predicted_price),
            'current_price': float(current_price),
            'model': 'LSTM-Mock'
        }
