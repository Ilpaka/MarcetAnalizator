import logging
import re
from typing import Dict, Any, List
from datetime import datetime
logger = logging.getLogger(__name__)
class TrumpAnalyzer:
    """Analyzer for Trump tweets and their potential market impact."""
    # Keywords that indicate crypto/market relevance
    CRYPTO_KEYWORDS = {
        'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
        'blockchain', 'defi', 'nft', 'altcoin', 'coinbase', 'binance'
    }
    MARKET_KEYWORDS = {
        'market', 'stock', 'trading', 'economy', 'inflation', 'fed',
        'federal reserve', 'interest rate', 'dollar', 'recession',
        'unemployment', 'jobs', 'gdp', 'china', 'trade', 'tariff',
        'wall street', 'nasdaq', 'dow', 's&p'
    }
    # High-impact keywords that typically move markets
    IMPACT_KEYWORDS = {
        'ban': -0.8,
        'restrict': -0.6,
        'investigation': -0.5,
        'fraud': -0.7,
        'scam': -0.6,
        'crisis': -0.7,
        'approve': 0.7,
        'support': 0.6,
        'boost': 0.6,
        'innovation': 0.5,
        'future': 0.4,
        'great': 0.3,
        'terrible': -0.5,
        'disaster': -0.6,
        'winning': 0.4,
        'losing': -0.4
    }
    def __init__(self):
        """Initialize Trump tweet analyzer."""
        logger.info("Trump analyzer initialized")
    def analyze(self, tweet_text: str, timestamp: int = None) -> Dict[str, Any]:
        """
        Analyze a Trump tweet for market impact.
        Args:
            tweet_text: The tweet text
            timestamp: Unix timestamp (milliseconds)
        Returns:
            Analysis results including impact score and signals
        """
        text_lower = tweet_text.lower()
        # Check if crypto/market related
        is_crypto = self._contains_keywords(text_lower, self.CRYPTO_KEYWORDS)
        is_market = self._contains_keywords(text_lower, self.MARKET_KEYWORDS)
        # Calculate impact score
        impact_score = self._calculate_impact(text_lower)
        # Extract sentiment
        sentiment = self._calculate_sentiment(text_lower)
        # Generate trading signal
        signal = self._generate_signal(
            impact_score,
            sentiment,
            is_crypto,
            is_market
        )
        # Extract keywords
        keywords = self._extract_keywords(text_lower)
        # Generate analysis
        analysis = self._generate_analysis(
            impact_score,
            sentiment,
            is_crypto,
            is_market,
            keywords
        )
        return {
            "impact_score": float(impact_score),
            "sentiment": sentiment,
            "signal": signal,
            "keywords": keywords,
            "analysis": analysis,
            "is_crypto_related": is_crypto,
            "is_market_related": is_market,
            "timestamp": timestamp or int(datetime.now().timestamp() * 1000)
        }
    def _contains_keywords(self, text: str, keywords: set) -> bool:
        """Check if text contains any of the keywords."""
        return any(keyword in text for keyword in keywords)
    def _calculate_impact(self, text: str) -> float:
        """Calculate potential market impact score (-1 to 1)."""
        score = 0.0
        count = 0
        for keyword, weight in self.IMPACT_KEYWORDS.items():
            if keyword in text:
                score += weight
                count += 1
        # Normalize by count, but cap at ±1
        if count > 0:
            score = score / count
        # Check for exclamation marks (Trump uses them a lot)
        exclamation_count = text.count('!')
        if exclamation_count > 2:
            score *= 1.2  # Amplify impact for excessive exclamations
        # Check for all caps words
        caps_words = re.findall(r'\b[A-Z]{3,}\b', text)
        if len(caps_words) > 1:
            score *= 1.1  # Amplify for emphasis
        return max(-1.0, min(1.0, score))  # Clamp to [-1, 1]
    def _calculate_sentiment(self, text: str) -> str:
        """Determine sentiment: positive, negative, or neutral."""
        positive_words = ['great', 'good', 'winning', 'best', 'strong', 'success']
        negative_words = ['bad', 'terrible', 'disaster', 'failing', 'weak', 'losing']
        pos_count = sum(1 for word in positive_words if word in text)
        neg_count = sum(1 for word in negative_words if word in text)
        if pos_count > neg_count:
            return "POSITIVE"
        elif neg_count > pos_count:
            return "NEGATIVE"
        else:
            return "NEUTRAL"
    def _generate_signal(
        self,
        impact: float,
        sentiment: str,
        is_crypto: bool,
        is_market: bool
    ) -> str:
        """Generate trading signal based on analysis."""
        # Only generate signals for relevant tweets
        if not (is_crypto or is_market):
            return "NEUTRAL"
        # Strong negative impact
        if impact < -0.5:
            return "STRONG_SELL"
        elif impact < -0.2:
            return "SELL"
        # Strong positive impact
        elif impact > 0.5:
            return "STRONG_BUY"
        elif impact > 0.2:
            return "BUY"
        # Neutral
        else:
            return "NEUTRAL"
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from tweet."""
        keywords = []
        # Extract crypto keywords
        for kw in self.CRYPTO_KEYWORDS:
            if kw in text:
                keywords.append(kw)
        # Extract market keywords
        for kw in self.MARKET_KEYWORDS:
            if kw in text:
                keywords.append(kw)
        # Extract impact keywords
        for kw in self.IMPACT_KEYWORDS.keys():
            if kw in text:
                keywords.append(kw)
        return list(set(keywords))  # Remove duplicates
    def _generate_analysis(
        self,
        impact: float,
        sentiment: str,
        is_crypto: bool,
        is_market: bool,
        keywords: List[str]
    ) -> str:
        """Generate human-readable analysis."""
        if not (is_crypto or is_market):
            return "Tweet not related to crypto or markets."
        relevance = "crypto" if is_crypto else "market"
        if abs(impact) < 0.2:
            impact_desc = "minimal"
        elif abs(impact) < 0.5:
            impact_desc = "moderate"
        else:
            impact_desc = "significant"
        direction = "positive" if impact > 0 else "negative" if impact < 0 else "neutral"
        return (
            f"Trump tweet shows {impact_desc} {direction} impact on {relevance}. "
            f"Sentiment: {sentiment}. "
            f"Key topics: {', '.join(keywords[:5]) if keywords else 'none'}."
        )