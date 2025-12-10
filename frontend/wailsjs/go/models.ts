export namespace binance {
	
	export class Kline {
	    openTime: number;
	    open: number;
	    high: number;
	    low: number;
	    close: number;
	    volume: number;
	    closeTime: number;
	
	    static createFrom(source: any = {}) {
	        return new Kline(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.openTime = source["openTime"];
	        this.open = source["open"];
	        this.high = source["high"];
	        this.low = source["low"];
	        this.close = source["close"];
	        this.volume = source["volume"];
	        this.closeTime = source["closeTime"];
	    }
	}
	export class Ticker {
	    symbol: string;
	    priceChange: number;
	    priceChangePercent: number;
	    lastPrice: number;
	    volume: number;
	    quoteVolume: number;
	
	    static createFrom(source: any = {}) {
	        return new Ticker(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.symbol = source["symbol"];
	        this.priceChange = source["priceChange"];
	        this.priceChangePercent = source["priceChangePercent"];
	        this.lastPrice = source["lastPrice"];
	        this.volume = source["volume"];
	        this.quoteVolume = source["quoteVolume"];
	    }
	}

}

export namespace indicators {
	
	export class IndicatorValues {
	    ema9: number;
	    ema21: number;
	    ema50: number;
	    ema200: number;
	    rsi14: number;
	    rsi7: number;
	    macdLine: number;
	    macdSignal: number;
	    macdHist: number;
	    bbUpper: number;
	    bbMiddle: number;
	    bbLower: number;
	    bbPercentB: number;
	    atr14: number;
	    stochRsiK: number;
	    stochRsiD: number;
	    obv: number;
	    adx: number;
	    cci: number;
	    williams: number;
	    momentum: number;
	
	    static createFrom(source: any = {}) {
	        return new IndicatorValues(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ema9 = source["ema9"];
	        this.ema21 = source["ema21"];
	        this.ema50 = source["ema50"];
	        this.ema200 = source["ema200"];
	        this.rsi14 = source["rsi14"];
	        this.rsi7 = source["rsi7"];
	        this.macdLine = source["macdLine"];
	        this.macdSignal = source["macdSignal"];
	        this.macdHist = source["macdHist"];
	        this.bbUpper = source["bbUpper"];
	        this.bbMiddle = source["bbMiddle"];
	        this.bbLower = source["bbLower"];
	        this.bbPercentB = source["bbPercentB"];
	        this.atr14 = source["atr14"];
	        this.stochRsiK = source["stochRsiK"];
	        this.stochRsiD = source["stochRsiD"];
	        this.obv = source["obv"];
	        this.adx = source["adx"];
	        this.cci = source["cci"];
	        this.williams = source["williams"];
	        this.momentum = source["momentum"];
	    }
	}
	export class Signal {
	    Type: string;
	    Strength: number;
	    Indicator: string;
	    Reason: string;
	    Timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new Signal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Type = source["Type"];
	        this.Strength = source["Strength"];
	        this.Indicator = source["Indicator"];
	        this.Reason = source["Reason"];
	        this.Timestamp = source["Timestamp"];
	    }
	}

}

export namespace sentiment {
	
	export class SentimentScore {
	    overallScore: number;
	    positive: number;
	    negative: number;
	    neutral: number;
	    // Go type: time
	    timestamp: any;
	
	    static createFrom(source: any = {}) {
	        return new SentimentScore(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.overallScore = source["overallScore"];
	        this.positive = source["positive"];
	        this.negative = source["negative"];
	        this.neutral = source["neutral"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace signals {
	
	export class Signal {
	    id: string;
	    symbol: string;
	    timeframe: string;
	    direction: string;
	    confidence: number;
	    probability: number;
	    price: number;
	    atr: number;
	    technicalSignal: number;
	    mlSignal: number;
	    sentimentSignal: number;
	    // Go type: time
	    timestamp: any;
	    reasons: string[];
	    model: string;
	
	    static createFrom(source: any = {}) {
	        return new Signal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.symbol = source["symbol"];
	        this.timeframe = source["timeframe"];
	        this.direction = source["direction"];
	        this.confidence = source["confidence"];
	        this.probability = source["probability"];
	        this.price = source["price"];
	        this.atr = source["atr"];
	        this.technicalSignal = source["technicalSignal"];
	        this.mlSignal = source["mlSignal"];
	        this.sentimentSignal = source["sentimentSignal"];
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.reasons = source["reasons"];
	        this.model = source["model"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace trading {
	
	export class Order {
	    id: string;
	    symbol: string;
	    side: string;
	    type: string;
	    price: number;
	    quantity: number;
	    filledQty: number;
	    status: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    filledAt: any;
	    // Go type: time
	    cancelledAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Order(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.symbol = source["symbol"];
	        this.side = source["side"];
	        this.type = source["type"];
	        this.price = source["price"];
	        this.quantity = source["quantity"];
	        this.filledQty = source["filledQty"];
	        this.status = source["status"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.filledAt = this.convertValues(source["filledAt"], null);
	        this.cancelledAt = this.convertValues(source["cancelledAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Position {
	    id: string;
	    symbol: string;
	    side: string;
	    entryPrice: number;
	    quantity: number;
	    stopLoss: number;
	    takeProfit: number;
	    // Go type: time
	    openedAt: any;
	    signalId: string;
	    unrealizedPnL: number;
	    unrealizedPnLPct: number;
	
	    static createFrom(source: any = {}) {
	        return new Position(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.symbol = source["symbol"];
	        this.side = source["side"];
	        this.entryPrice = source["entryPrice"];
	        this.quantity = source["quantity"];
	        this.stopLoss = source["stopLoss"];
	        this.takeProfit = source["takeProfit"];
	        this.openedAt = this.convertValues(source["openedAt"], null);
	        this.signalId = source["signalId"];
	        this.unrealizedPnL = source["unrealizedPnL"];
	        this.unrealizedPnLPct = source["unrealizedPnLPct"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Trade {
	    id: string;
	    symbol: string;
	    side: string;
	    entryPrice: number;
	    exitPrice: number;
	    quantity: number;
	    pnl: number;
	    pnlPercent: number;
	    duration: number;
	    // Go type: time
	    openedAt: any;
	    // Go type: time
	    closedAt: any;
	    reason: string;
	    signalId: string;
	
	    static createFrom(source: any = {}) {
	        return new Trade(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.symbol = source["symbol"];
	        this.side = source["side"];
	        this.entryPrice = source["entryPrice"];
	        this.exitPrice = source["exitPrice"];
	        this.quantity = source["quantity"];
	        this.pnl = source["pnl"];
	        this.pnlPercent = source["pnlPercent"];
	        this.duration = source["duration"];
	        this.openedAt = this.convertValues(source["openedAt"], null);
	        this.closedAt = this.convertValues(source["closedAt"], null);
	        this.reason = source["reason"];
	        this.signalId = source["signalId"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TradingStats {
	    totalTrades: number;
	    winningTrades: number;
	    losingTrades: number;
	    totalPnL: number;
	    totalPnLPercent: number;
	    winRate: number;
	    avgWin: number;
	    avgLoss: number;
	    profitFactor: number;
	    maxDrawdown: number;
	    currentDrawdown: number;
	    peakBalance: number;
	    dailyPnL: number;
	    todayTrades: number;
	    // Go type: time
	    lastTradeTime: any;
	    // Go type: time
	    startTime: any;
	
	    static createFrom(source: any = {}) {
	        return new TradingStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalTrades = source["totalTrades"];
	        this.winningTrades = source["winningTrades"];
	        this.losingTrades = source["losingTrades"];
	        this.totalPnL = source["totalPnL"];
	        this.totalPnLPercent = source["totalPnLPercent"];
	        this.winRate = source["winRate"];
	        this.avgWin = source["avgWin"];
	        this.avgLoss = source["avgLoss"];
	        this.profitFactor = source["profitFactor"];
	        this.maxDrawdown = source["maxDrawdown"];
	        this.currentDrawdown = source["currentDrawdown"];
	        this.peakBalance = source["peakBalance"];
	        this.dailyPnL = source["dailyPnL"];
	        this.todayTrades = source["todayTrades"];
	        this.lastTradeTime = this.convertValues(source["lastTradeTime"], null);
	        this.startTime = this.convertValues(source["startTime"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

