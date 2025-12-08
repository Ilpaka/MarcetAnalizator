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

