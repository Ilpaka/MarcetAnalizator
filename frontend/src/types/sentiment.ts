export interface SentimentScore {
  overall: number // -1 to 1
  positive: number
  negative: number
  neutral: number
}

export interface TextSentiment {
  text: string
  score: number
  label: 'positive' | 'negative' | 'neutral'
  timestamp: number
}

export interface TrumpTweetAnalysis {
  impactScore: number
  sentiment: number
  signal: number
  keywords: string[]
  analysis: string
  isCryptoRelated: boolean
  isMarketRelated: boolean
  timestamp: number
}

export interface FearGreedIndex {
  value: number // 0-100
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  timestamp: number
}

export interface NewsFeed {
  id: string
  title: string
  source: string
  url: string
  sentiment: number
  publishedAt: number
}

export interface SentimentData {
  fearGreed: FearGreedIndex
  twitter: SentimentScore
  news: SentimentScore
  reddit: SentimentScore
  trumpTweets: TrumpTweetAnalysis[]
  recentNews: NewsFeed[]
}
