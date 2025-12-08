export namespace main {
	
	export class CandleData {
	    time: number;
	    open: number;
	    high: number;
	    low: number;
	    close: number;
	    volume: number;
	
	    static createFrom(source: any = {}) {
	        return new CandleData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = source["time"];
	        this.open = source["open"];
	        this.high = source["high"];
	        this.low = source["low"];
	        this.close = source["close"];
	        this.volume = source["volume"];
	    }
	}
	export class MLModelInfo {
	    loaded: boolean;
	    symbol: string;
	    interval: string;
	    mae: number;
	    rmse: number;
	    mape: number;
	    direction_accuracy: number;
	    lookback: number;
	
	    static createFrom(source: any = {}) {
	        return new MLModelInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.loaded = source["loaded"];
	        this.symbol = source["symbol"];
	        this.interval = source["interval"];
	        this.mae = source["mae"];
	        this.rmse = source["rmse"];
	        this.mape = source["mape"];
	        this.direction_accuracy = source["direction_accuracy"];
	        this.lookback = source["lookback"];
	    }
	}
	export class MLPrediction {
	    predicted_price: number;
	    current_price: number;
	    change_percent: number;
	    direction: string;
	    confidence: number;
	    timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new MLPrediction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.predicted_price = source["predicted_price"];
	        this.current_price = source["current_price"];
	        this.change_percent = source["change_percent"];
	        this.direction = source["direction"];
	        this.confidence = source["confidence"];
	        this.timestamp = source["timestamp"];
	    }
	}

}

