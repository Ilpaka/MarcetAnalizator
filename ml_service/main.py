import asyncio
import logging
import time
from concurrent import futures
import grpc
from grpc_reflection.v1alpha import reflection

import prediction_pb2
import prediction_pb2_grpc
from models.lstm_model import LSTMPredictor
from models.xgboost_model import XGBoostPredictor
from models.ensemble import EnsemblePredictor
from sentiment.finbert import FinBERTAnalyzer
from sentiment.trump_analyzer import TrumpAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_pb2_grpc.add_PredictionServiceServicer_to_server(
        PredictionServicer(), server
    )

    # Enable reflection for debugging
    SERVICE_NAMES = (
        prediction_pb2.DESCRIPTOR.services_by_name['PredictionService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)

    server.add_insecure_port('[::]:50051')
    logger.info("ML Service starting on port 50051...")
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
