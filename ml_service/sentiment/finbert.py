import logging
from typing import List, Dict, Any
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
logger = logging.getLogger(__name__)
class FinBERTAnalyzer:
    """Financial sentiment analyzer using FinBERT model."""
    def __init__(self, model_name: str = "ProsusAI/finbert"):
        """
        Initialize FinBERT analyzer.
        Args:
            model_name: HuggingFace model name
        """
        logger.info(f"Loading FinBERT model: {model_name}")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            self.model.eval()
            logger.info(f"FinBERT loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load FinBERT: {e}")
            raise
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of a single text.
        Args:
            text: Text to analyze
        Returns:
            Dict with sentiment analysis results
        """
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
            # FinBERT labels: [positive, negative, neutral]
            probs = probabilities[0].cpu().numpy()
            label_map = {0: "positive", 1: "negative", 2: "neutral"}
            predicted_class = np.argmax(probs)
            # Calculate sentiment score (-1 to 1)
            sentiment_score = probs[0] - probs[1]  # positive - negative
            return {
                "text": text,
                "label": label_map[predicted_class],
                "score": float(sentiment_score),
                "positive": float(probs[0]),
                "negative": float(probs[1]),
                "neutral": float(probs[2]),
                "confidence": float(probs[predicted_class])
            }
        except Exception as e:
            logger.error(f"Error analyzing text: {e}")
            return {
                "text": text,
                "label": "neutral",
                "score": 0.0,
                "positive": 0.0,
                "negative": 0.0,
                "neutral": 1.0,
                "confidence": 0.0
            }
    def analyze_batch(self, texts: List[str]) -> Dict[str, Any]:
        """
        Analyze sentiment of multiple texts.
        Args:
            texts: List of texts to analyze
        Returns:
            Dict with aggregated sentiment analysis
        """
        results = [self.analyze(text) for text in texts]
        # Aggregate results
        total_score = sum(r['score'] for r in results)
        avg_score = total_score / len(results) if results else 0.0
        avg_positive = sum(r['positive'] for r in results) / len(results) if results else 0.0
        avg_negative = sum(r['negative'] for r in results) / len(results) if results else 0.0
        avg_neutral = sum(r['neutral'] for r in results) / len(results) if results else 0.0
        return {
            "overall_score": float(avg_score),
            "positive": float(avg_positive),
            "negative": float(avg_negative),
            "neutral": float(avg_neutral),
            "individual": results
        }