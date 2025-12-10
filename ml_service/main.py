import asyncio
import logging
import time
import threading
import os
import sys
import pickle
import glob
from concurrent import futures
from datetime import datetime
import grpc
from grpc_reflection.v1alpha import reflection
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

import prediction_pb2
import prediction_pb2_grpc
from models.lstm_model import LSTMPredictor
from models.xgboost_model import XGBoostPredictor
from models.ensemble import EnsemblePredictor
from sentiment.finbert import FinBERTAnalyzer
from sentiment.trump_analyzer import TrumpAnalyzer
from train import train_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class PredictionServicer(prediction_pb2_grpc.PredictionServiceServicer):
    def __init__(self):
        logger.info("Initializing ML models...")

        # Initialize models
        self.lstm = LSTMPredictor()
        self.xgboost = XGBoostPredictor()
        self.ensemble = EnsemblePredictor(self.lstm, self.xgboost)

        # Initialize sentiment analyzers
        self.finbert = FinBERTAnalyzer()
        self.trump_analyzer = TrumpAnalyzer()

        # Model registry for trained models
        self.model_registry = {}
        self.training_status = {}

        logger.info("ML models initialized successfully")

    def HealthCheck(self, request, context):
        return prediction_pb2.HealthResponse(
            healthy=True,
            version="1.0.0",
            loaded_models=["LSTM", "XGBoost", "FinBERT"]
        )

    def Predict(self, request, context):
        try:
            # Convert protobuf to numpy arrays
            candles = self._parse_candles(request.candles)
            indicators = self._parse_indicators(request.indicators)

            # Get prediction from ensemble
            result = self.ensemble.predict(
                candles=candles,
                indicators=indicators,
                sentiment_score=request.sentiment_score,
                timeframe=request.timeframe
            )

            return prediction_pb2.PredictionResponse(
                direction=result['direction'],
                probability=result['probability'],
                confidence=result['confidence'],
                expected_move=result['expected_move'],
                model_used=result['model'],
                timestamp=int(time.time() * 1000)
            )

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.PredictionResponse()

    def PredictMultiTimeframe(self, request, context):
        try:
            predictions = {}

            for tf in request.timeframes:
                candles = self._parse_candles(
                    request.candles_by_timeframe[tf].candles
                )

                result = self.ensemble.predict(
                    candles=candles,
                    indicators=None,  # Will be calculated internally
                    sentiment_score=request.sentiment_score,
                    timeframe=tf
                )

                predictions[tf] = prediction_pb2.PredictionResponse(
                    direction=result['direction'],
                    probability=result['probability'],
                    confidence=result['confidence'],
                    expected_move=result['expected_move'],
                    model_used=result['model']
                )

            # Calculate consensus
            consensus = self._calculate_consensus(predictions)

            return prediction_pb2.MultiTimeframeResponse(
                predictions=predictions,
                consensus=consensus
            )

        except Exception as e:
            logger.error(f"Multi-timeframe prediction error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.MultiTimeframeResponse()

    def AnalyzeSentiment(self, request, context):
        try:
            results = self.finbert.analyze_batch(request.texts)

            individual = [
                prediction_pb2.TextSentiment(
                    text=r['text'],
                    score=r['score'],
                    label=r['label']
                )
                for r in results['individual']
            ]

            return prediction_pb2.SentimentResponse(
                overall_score=results['overall_score'],
                positive=results['positive'],
                negative=results['negative'],
                neutral=results['neutral'],
                individual=individual
            )

        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.SentimentResponse()

    def AnalyzeTrumpTweet(self, request, context):
        try:
            result = self.trump_analyzer.analyze(
                tweet_text=request.tweet_text,
                timestamp=request.timestamp
            )

            return prediction_pb2.TweetAnalysisResponse(
                impact_score=result['impact_score'],
                sentiment=result['sentiment'],
                signal=result['signal'],
                keywords=result['keywords'],
                analysis=result['analysis'],
                is_crypto_related=result['is_crypto_related'],
                is_market_related=result['is_market_related']
            )

        except Exception as e:
            logger.error(f"Trump tweet analysis error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.TweetAnalysisResponse()

    def _parse_candles(self, candles):
        import numpy as np
        return np.array([
            [c.open, c.high, c.low, c.close, c.volume]
            for c in candles
        ])

    def _parse_indicators(self, ind):
        if ind is None:
            return None
        return {
            'ema9': ind.ema9,
            'ema21': ind.ema21,
            'ema50': ind.ema50,
            'ema200': ind.ema200,
            'rsi14': ind.rsi14,
            'rsi7': ind.rsi7,
            'macd_line': ind.macd_line,
            'macd_signal': ind.macd_signal,
            'macd_hist': ind.macd_hist,
            'bb_upper': ind.bb_upper,
            'bb_middle': ind.bb_middle,
            'bb_lower': ind.bb_lower,
            'bb_percent_b': ind.bb_percent_b,
            'atr14': ind.atr14,
            'stoch_rsi_k': ind.stoch_rsi_k,
            'stoch_rsi_d': ind.stoch_rsi_d,
            'obv': ind.obv,
        }

    def _calculate_consensus(self, predictions):
        up_count = 0
        down_count = 0
        total_confidence = 0

        weights = {
            '5m': 0.15,
            '15m': 0.20,
            '1h': 0.25,
            '4h': 0.25,
            '1d': 0.15
        }

        for tf, pred in predictions.items():
            weight = weights.get(tf, 0.2)
            if pred.direction == "UP":
                up_count += 1
                total_confidence += pred.confidence * weight
            elif pred.direction == "DOWN":
                down_count += 1
                total_confidence -= pred.confidence * weight

        total = len(predictions)
        alignment = max(up_count, down_count) / total if total > 0 else 0

        return prediction_pb2.ConsensusResult(
            direction="UP" if up_count > down_count else "DOWN",
            alignment=alignment,
            confidence=abs(total_confidence),
            actionable=alignment >= 0.7
        )

    def TrainModel(self, request, context):
        """Train LSTM model - streaming response"""
        symbol = request.symbol
        timeframe = request.timeframe
        model_key = f"{symbol}_{timeframe}"

        # Check if already training
        if model_key in self.training_status and self.training_status[model_key].get('training', False):
            yield prediction_pb2.TrainResponse(
                epoch=0,
                completed=False,
                message="Model is already training"
            )
            return

        # Start training status
        self.training_status[model_key] = {
            'training': True,
            'progress': 0,
            'epoch': 0,
            'train_loss': 0.0,
            'val_loss': 0.0,
            'total_epochs': request.epochs,
        }

        # Use a queue to communicate progress from training thread to generator
        import queue
        progress_queue = queue.Queue()

        def train_worker():
            """Run training in background thread"""
            try:
                def progress_callback(progress_data):
                    """Update training status and send to queue"""
                    self.training_status[model_key].update({
                        'epoch': progress_data.get('epoch', 0),
                        'train_loss': progress_data.get('train_loss', 0.0),
                        'val_loss': progress_data.get('val_loss', 0.0),
                        'progress': int((progress_data.get('epoch', 0) / request.epochs) * 100),
                        'completed': progress_data.get('completed', False),
                    })
                    # Send progress to queue
                    progress_queue.put(progress_data)

                # Train model
                model, metadata = train_model(
                    symbol=symbol,
                    interval=timeframe,
                    lookback=request.lookback,
                    hidden_size=request.hidden_size,
                    num_layers=request.num_layers,
                    epochs=request.epochs,
                    batch_size=request.batch_size,
                    learning_rate=request.learning_rate,
                    val_split=request.val_split,
                    progress_callback=progress_callback
                )

                # Get model directory path
                model_path = metadata.get('model_path', '')
                if not model_path:
                    model_path = f"models/{symbol}_{timeframe}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

                if os.path.isfile(model_path):
                    model_dir = os.path.dirname(model_path)
                else:
                    model_dir = model_path

                # Save to registry
                predictor = LSTMPredictor(model_path=model_dir)
                if model_dir and os.path.exists(model_dir):
                    predictor.load_model(model_dir)

                self.model_registry[model_key] = {
                    'model': model,
                    'metadata': metadata,
                    'predictor': predictor
                }

                # Update final status
                self.training_status[model_key].update({
                    'training': False,
                    'progress': 100,
                    'completed': True,
                })

                # Send final completion with metadata
                metadata_response = prediction_pb2.ModelMetadataResponse(
                    exists=True,
                    symbol=symbol,
                    timeframe=timeframe,
                    mae=metadata.get('mae', 0.0),
                    rmse=metadata.get('rmse', 0.0),
                    mape=metadata.get('mape', 0.0),
                    direction_accuracy=metadata.get('direction_accuracy', 0.0),
                    trained_at=int(metadata.get('trained_at', time.time())),
                    model_path=model_path
                )

                progress_queue.put({
                    'epoch': request.epochs,
                    'completed': True,
                    'message': 'Training completed successfully',
                    'metadata': metadata_response
                })

            except Exception as e:
                logger.error(f"Training error: {e}")
                import traceback
                error_msg = str(e) + "\n" + traceback.format_exc()
                self.training_status[model_key].update({
                    'training': False,
                    'completed': False,
                    'error': error_msg,
                })
                progress_queue.put({
                    'epoch': 0,
                    'completed': False,
                    'message': f'Training failed: {str(e)}',
                    'error': True
                })

        # Start training in background thread
        thread = threading.Thread(target=train_worker, daemon=True)
        thread.start()

        # Stream progress updates
        try:
            while True:
                try:
                    progress_data = progress_queue.get(timeout=1.0)
                    
                    if progress_data.get('error'):
                        context.set_code(grpc.StatusCode.INTERNAL)
                        context.set_details(progress_data.get('message', 'Training failed'))
                        yield prediction_pb2.TrainResponse(
                            epoch=progress_data.get('epoch', 0),
                            completed=False,
                            message=progress_data.get('message', 'Training failed')
                        )
                        break

                    if 'metadata' in progress_data:
                        # Final response with metadata
                        yield prediction_pb2.TrainResponse(
                            epoch=progress_data.get('epoch', request.epochs),
                            train_loss=self.training_status[model_key].get('train_loss', 0.0),
                            val_loss=self.training_status[model_key].get('val_loss', 0.0),
                            completed=True,
                            message=progress_data.get('message', 'Training completed'),
                            metadata=progress_data['metadata']
                        )
                        break
                    else:
                        # Progress update
                        yield prediction_pb2.TrainResponse(
                            epoch=progress_data.get('epoch', 0),
                            train_loss=progress_data.get('train_loss', 0.0),
                            val_loss=progress_data.get('val_loss', 0.0),
                            completed=progress_data.get('completed', False),
                            message=progress_data.get('message', '')
                        )
                        
                        if progress_data.get('completed', False):
                            break

                except queue.Empty:
                    # Check if training thread is still alive
                    if not thread.is_alive() and progress_queue.empty():
                        # Thread finished but no final message - check status
                        if self.training_status[model_key].get('completed', False):
                            break
                    continue

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            yield prediction_pb2.TrainResponse(
                epoch=0,
                completed=False,
                message=f"Streaming error: {str(e)}"
            )

    def GetModelMetadata(self, request, context):
        """Get model metadata"""
        try:
            symbol = request.symbol
            timeframe = request.timeframe
            model_key = f"{symbol}_{timeframe}"

            # Check registry first
            if model_key in self.model_registry:
                metadata = self.model_registry[model_key]['metadata']
                return prediction_pb2.ModelMetadataResponse(
                    exists=True,
                    symbol=symbol,
                    timeframe=timeframe,
                    mae=metadata.get('mae', 0.0),
                    rmse=metadata.get('rmse', 0.0),
                    mape=metadata.get('mape', 0.0),
                    direction_accuracy=metadata.get('direction_accuracy', 0.0),
                    trained_at=int(metadata.get('trained_at', 0)),
                    model_path=metadata.get('model_path', '')
                )

            # Try to load from disk
            pattern = f'models/{symbol}_{timeframe}_*'
            model_dirs = glob.glob(pattern)
            if model_dirs:
                latest_dir = max(model_dirs, key=os.path.getmtime)
                metadata_file = os.path.join(latest_dir, 'metadata.pkl')
                if os.path.exists(metadata_file):
                    with open(metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    return prediction_pb2.ModelMetadataResponse(
                        exists=True,
                        symbol=symbol,
                        timeframe=timeframe,
                        mae=metadata.get('mae', 0.0),
                        rmse=metadata.get('rmse', 0.0),
                        mape=metadata.get('mape', 0.0),
                        direction_accuracy=metadata.get('direction_accuracy', 0.0),
                        trained_at=int(metadata.get('trained_at', 0)),
                        model_path=latest_dir
                    )

            return prediction_pb2.ModelMetadataResponse(
                exists=False,
                symbol=symbol,
                timeframe=timeframe
            )

        except Exception as e:
            logger.error(f"GetModelMetadata error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.ModelMetadataResponse(
                exists=False,
                symbol=request.symbol,
                timeframe=request.timeframe
            )

    def PredictPrice(self, request, context):
        """Predict price using trained LSTM model"""
        try:
            symbol = request.symbol
            timeframe = request.timeframe
            model_key = f"{symbol}_{timeframe}"

            # Convert candles to numpy array
            candles_array = self._parse_candles(request.candles)

            # Get current price (last candle close)
            current_price = candles_array[-1, 3] if len(candles_array) > 0 else 0.0

            # Try to load model from registry or disk
            predictor = None
            if model_key in self.model_registry:
                predictor = self.model_registry[model_key]['predictor']
            else:
                # Try to load from disk
                pattern = f'models/{symbol}_{timeframe}_*'
                model_dirs = glob.glob(pattern)
                if model_dirs:
                    latest_dir = max(model_dirs, key=os.path.getmtime)
                    predictor = LSTMPredictor(model_path=latest_dir)
                    predictor.load_model(latest_dir)

            if predictor is None or not predictor.is_trained:
                return prediction_pb2.PricePredictionResponse(
                    predicted_price=current_price,
                    current_price=current_price,
                    confidence=0.0,
                    error="Model not trained or failed to load"
                )

            # Make prediction
            result = predictor.predict(
                candles=candles_array,
                timeframe=timeframe
            )

            predicted_price = result.get('predicted_price', current_price)
            confidence = result.get('confidence', 0.5)
            direction = result.get('direction', 'NEUTRAL')
            expected_move = result.get('expected_move', 0.0)

            return prediction_pb2.PricePredictionResponse(
                predicted_price=float(predicted_price),
                current_price=float(current_price),
                confidence=float(confidence),
                direction=direction,
                expected_move=float(expected_move),
                change_pct=float(((predicted_price - current_price) / current_price) * 100),
                timestamp=int(time.time() * 1000)
            )

        except Exception as e:
            logger.error(f"PredictPrice error: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return prediction_pb2.PricePredictionResponse(
                error=str(e)
            )


# Global servicer instance for shared state
servicer_instance = None

def create_http_app(servicer):
    """Create Flask HTTP API app"""
    app = Flask(__name__)
    CORS(app)

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'healthy', 'service': 'ML Training API'})

    @app.route('/train', methods=['POST'])
    def train():
        """Start training in background"""
        data = request.json
        
        symbol = data.get('symbol', 'BTCUSDT')
        timeframe = data.get('timeframe', '1h')
        lookback = data.get('lookback', 60)
        hidden_size = data.get('hidden_size', 64)
        num_layers = data.get('num_layers', 2)
        epochs = data.get('epochs', 30)
        batch_size = data.get('batch_size', 32)
        learning_rate = data.get('learning_rate', 0.001)
        val_split = data.get('val_split', 0.2)
        
        model_key = f"{symbol}_{timeframe}"
        
        # Check if already training
        if model_key in servicer.training_status and servicer.training_status[model_key].get('training', False):
            return jsonify({'error': 'Model is already training'}), 400
        
        # Start training in background thread
        def train_worker():
            servicer.training_status[model_key] = {
                'training': True, 
                'progress': 0,
                'epoch': 0,
                'train_loss': 0.0,
                'val_loss': 0.0,
                'total_epochs': epochs,
                'train_losses': [],
                'val_losses': []
            }
            
            def progress_callback(progress_data):
                """Update training status with progress"""
                servicer.training_status[model_key].update({
                    'epoch': progress_data.get('epoch', 0),
                    'train_loss': progress_data.get('train_loss', 0.0),
                    'val_loss': progress_data.get('val_loss', 0.0),
                    'progress': int((progress_data.get('epoch', 0) / epochs) * 100),
                    'completed': progress_data.get('completed', False),
                    'message': progress_data.get('message', '')
                })
                
                if 'train_loss' in progress_data:
                    servicer.training_status[model_key]['train_losses'].append(progress_data['train_loss'])
                if 'val_loss' in progress_data:
                    servicer.training_status[model_key]['val_losses'].append(progress_data['val_loss'])
            
            try:
                model, metadata = train_model(
                    symbol=symbol,
                    interval=timeframe,
                    lookback=lookback,
                    hidden_size=hidden_size,
                    num_layers=num_layers,
                    epochs=epochs,
                    batch_size=batch_size,
                    learning_rate=learning_rate,
                    val_split=val_split,
                    progress_callback=progress_callback
                )
                
                model_path = metadata.get('model_path', '')
                if not model_path:
                    model_path = f"models/{symbol}_{timeframe}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                if os.path.isfile(model_path):
                    model_dir = os.path.dirname(model_path)
                else:
                    model_dir = model_path
                
                predictor = LSTMPredictor(model_path=model_dir)
                if model_dir and os.path.exists(model_dir):
                    predictor.load_model(model_dir)
                
                servicer.model_registry[model_key] = {
                    'model': model,
                    'metadata': metadata,
                    'predictor': predictor
                }
                
                servicer.training_status[model_key].update({
                    'training': False,
                    'progress': 100,
                    'completed': True,
                    'message': 'Training completed successfully'
                })
            except Exception as e:
                import traceback
                error_msg = str(e) + "\n" + traceback.format_exc()
                logger.error(f"Training failed for {model_key}: {error_msg}")
                servicer.training_status[model_key].update({
                    'training': False,
                    'completed': False,
                    'error': error_msg,
                    'message': f'Training failed: {str(e)}'
                })
        
        thread = threading.Thread(target=train_worker)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'status': 'training_started',
            'model_key': model_key,
            'message': 'Training started in background'
        })

    @app.route('/training_status/<symbol>/<timeframe>', methods=['GET'])
    def get_training_status(symbol, timeframe):
        """Get training status"""
        model_key = f"{symbol}_{timeframe}"
        status = servicer.training_status.get(model_key, {
            'training': False, 
            'progress': 0,
            'epoch': 0,
            'train_loss': 0.0,
            'val_loss': 0.0,
            'completed': False,
            'message': 'Not started',
            'train_losses': [],
            'val_losses': []
        })
        return jsonify(status)

    @app.route('/model_metadata/<symbol>/<timeframe>', methods=['GET'])
    def get_model_metadata(symbol, timeframe):
        """Get model metadata"""
        model_key = f"{symbol}_{timeframe}"
        
        if model_key in servicer.model_registry:
            metadata = servicer.model_registry[model_key]['metadata']
            return jsonify({
                'exists': True,
                'symbol': symbol,
                'timeframe': timeframe,
                'mae': metadata.get('mae', 0.0),
                'rmse': metadata.get('rmse', 0.0),
                'mape': metadata.get('mape', 0.0),
                'direction_accuracy': metadata.get('direction_accuracy', 0.0),
                'trained_at': int(metadata.get('trained_at', 0)),
                'model_path': metadata.get('model_path', '')
            })
        
        # Try to load from disk
        pattern = f'models/{symbol}_{timeframe}_*'
        model_dirs = glob.glob(pattern)
        if model_dirs:
            latest_dir = max(model_dirs, key=os.path.getmtime)
            try:
                metadata_file = os.path.join(latest_dir, 'metadata.pkl')
                if os.path.exists(metadata_file):
                    with open(metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    return jsonify({
                        'exists': True,
                        'symbol': symbol,
                        'timeframe': timeframe,
                        'mae': metadata.get('mae', 0.0),
                        'rmse': metadata.get('rmse', 0.0),
                        'mape': metadata.get('mape', 0.0),
                        'direction_accuracy': metadata.get('direction_accuracy', 0.0),
                        'trained_at': int(metadata.get('trained_at', 0)),
                        'model_path': latest_dir
                    })
            except Exception as e:
                logger.error(f"Failed to load metadata from disk: {e}")
        
        return jsonify({
            'exists': False,
            'symbol': symbol,
            'timeframe': timeframe
        })

    @app.route('/predict', methods=['POST'])
    def predict():
        """Predict price"""
        data = request.json
        
        symbol = data.get('symbol')
        timeframe = data.get('timeframe')
        candles = data.get('candles', [])
        
        if not symbol or not timeframe:
            return jsonify({'error': 'symbol and timeframe required'}), 400
        
        model_key = f"{symbol}_{timeframe}"
        
        # Try to load model from disk if not in registry
        if model_key not in servicer.model_registry:
            pattern = f'models/{symbol}_{timeframe}_*'
            model_dirs = glob.glob(pattern)
            if model_dirs:
                latest_dir = max(model_dirs, key=os.path.getmtime)
                try:
                    predictor = LSTMPredictor(model_path=latest_dir)
                    predictor.load_model(latest_dir)
                    
                    metadata_file = os.path.join(latest_dir, 'metadata.pkl')
                    with open(metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    
                    servicer.model_registry[model_key] = {
                        'model': predictor.model,
                        'metadata': metadata,
                        'predictor': predictor
                    }
                    logger.info(f"Loaded model from disk: {latest_dir}")
                except Exception as e:
                    logger.error(f"Failed to load model from disk: {e}")
                    return jsonify({'error': 'Model not trained or failed to load'}), 404
            else:
                return jsonify({'error': 'Model not trained'}), 404
        
        try:
            candles_array = np.array(candles)
            current_price = candles_array[-1, 3] if len(candles_array) > 0 else 0.0
            
            predictor = servicer.model_registry[model_key]['predictor']
            
            if not predictor.is_trained:
                logger.error(f"Model {model_key} is not trained!")
                return jsonify({'error': 'Model not properly loaded'}), 500
            
            result = predictor.predict(
                candles=candles_array,
                timeframe=timeframe
            )
            
            predicted_price = result.get('predicted_price')
            current_price_from_result = result.get('current_price', current_price)
            
            if current_price_from_result and current_price_from_result > 0:
                current_price = current_price_from_result
            
            if predicted_price is None or predicted_price == 0:
                logger.error(f"Model returned invalid predicted_price: {predicted_price}")
                return jsonify({'error': 'Model prediction failed - returned invalid price'}), 500
            
            price_diff_pct = abs(predicted_price - current_price) / current_price * 100
            if price_diff_pct < 0.01:
                direction = result.get('direction', 'NEUTRAL')
                expected_move = result.get('expected_move', 0.0)
                
                if abs(expected_move) > 0.01:
                    if direction == 'UP':
                        predicted_price = current_price * (1 + abs(expected_move) / 100)
                    elif direction == 'DOWN':
                        predicted_price = current_price * (1 - abs(expected_move) / 100)
            
            confidence = result.get('confidence', 0.5)
            direction = result.get('direction', 'NEUTRAL')
            expected_move = result.get('expected_move', 0.0)
            
            metadata = servicer.model_registry[model_key]['metadata']
            rmse = metadata.get('rmse', current_price * 0.02)
            confidence_range = rmse * (1 - confidence + 0.1)
            
            change_pct = ((predicted_price - current_price) / current_price) * 100
            
            return jsonify({
                'predicted_price': float(predicted_price),
                'current_price': float(current_price),
                'confidence': float(confidence),
                'confidence_interval_lower': float(predicted_price - confidence_range),
                'confidence_interval_upper': float(predicted_price + confidence_range),
                'change_pct': float(change_pct),
                'direction': direction,
                'expected_move': float(expected_move),
                'timestamp': int(time.time() * 1000),
                'model_used': 'LSTM'
            })
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            import traceback
            return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

    return app

def serve():
    global servicer_instance
    
    # Create servicer instance
    servicer_instance = PredictionServicer()
    
    # Start gRPC server
    grpc_server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_pb2_grpc.add_PredictionServiceServicer_to_server(
        servicer_instance, grpc_server
    )

    # Enable reflection for debugging
    SERVICE_NAMES = (
        prediction_pb2.DESCRIPTOR.services_by_name['PredictionService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, grpc_server)

    grpc_server.add_insecure_port('[::]:50051')
    logger.info("gRPC Service starting on port 50051...")
    grpc_server.start()

    # Start HTTP API server
    http_app = create_http_app(servicer_instance)
    logger.info("HTTP API starting on port 5000...")
    
    # Run Flask in a separate thread
    def run_flask():
        http_app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    logger.info("ML Service started successfully!")
    logger.info("  - gRPC API: localhost:50051")
    logger.info("  - HTTP API: http://localhost:5000")
    
    try:
        grpc_server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        grpc_server.stop(0)


if __name__ == '__main__':
    serve()
