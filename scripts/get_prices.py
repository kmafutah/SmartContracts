import yfinance as yf
import json

symbols = {
    'XAUUSD': 'GC=F',
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'AUDUSD': 'AUDUSD=X',
    'USDZAR': 'USDZAR=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDCHF': 'USDCHF=X',
    'USDJPY': 'USDJPY=X',
    'BNBUSD': 'BNB-USD',
    'NGNUSD': 'NGN=X',
    'EGPUSD': 'EGP=X',
    'RUBUSD': 'RUB=X',
    'TRYUSD': 'TRY=X',
    'INRUSD': 'INR=X',
    'NZDUSD': 'NZDUSD=X',
    'CNYUSD': 'CNY=X',
    'JPYUSD': 'JPY=X',
    'CADUSD': 'CAD=X'
}

prices = {}

for key, symbol in symbols.items():
    try:
        data = yf.Ticker(symbol).info
        prices[key] = data['regularMarketPrice']
    except Exception as e:
        prices[key] = f"Error: {e}"

with open('prices.json', 'w') as f:
    json.dump(prices, f, indent=2)

print("Prices written to prices.json")
