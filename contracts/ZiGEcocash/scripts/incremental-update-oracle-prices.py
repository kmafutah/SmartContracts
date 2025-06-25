import yfinance as yf
import time

CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"]
METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"]
FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"]

# Yahoo Finance ticker mapping
YAHOO_TICKERS = {
    "BTCUSD": "BTC-USD",
    "ETHUSD": "ETH-USD",
    "BNBUSD": "BNB-USD",
    "XRPUSD": "XRP-USD",
    "SOLUSD": "SOL-USD",
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "XPTUSD": "PL=F",
    "XPDUSD": "PA=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDZAR": "ZAR=X",
    "USDJPY": "JPY=X",
    "USDCHF": "CHF=X",
    "USDCNH": "CNH=X",
}

# Mock database simulating on-chain prices
onchain_prices = {asset: 0.0 for asset in CRYPTO_ASSETS + METAL_ASSETS + FOREX_ASSETS}

def fetch_price(asset):
    try:
        ticker = YAHOO_TICKERS[asset]
        data = yf.Ticker(ticker).info
        price = data.get("regularMarketPrice")
        print(f"📡 {asset} live price: ${price}")
        return price
    except Exception as e:
        print(f"❌ Failed to fetch {asset}: {e}")
        return None

def get_onchain_price(asset):
    return onchain_prices.get(asset, 0.0)

def update_onchain_price(asset, price):
    onchain_prices[asset] = price
    print(f"🔁 Updated on-chain price of {asset} to ${price}")

def update_incrementally(asset, live_price, max_deviation=0.05):
    current = get_onchain_price(asset)
    
    if current == 0.0:
        update_onchain_price(asset, live_price)
        print(f"✅ Initial price set for {asset}: ${live_price}")
        return

    deviation = abs(live_price - current) / current
    if deviation <= 0.10:
        update_onchain_price(asset, live_price)
        print(f"✅ Direct update for {asset}: ${current} → ${live_price}")
        return

    print(f"🔧 Incremental update for {asset} from ${current} to ${live_price} (deviation: {deviation:.2%})")
    step = 0
    while abs(live_price - current) / current > max_deviation:
        direction = 1 if live_price > current else -1
        next_price = current * (1 + direction * max_deviation)
        next_price = round(next_price, 10)
        step += 1
        print(f"  Step {step}: ${current} → ${next_price}")
        update_onchain_price(asset, next_price)
        time.sleep(1.5)
        current = get_onchain_price(asset)

    update_onchain_price(asset, live_price)
    print(f"✅ Final update for {asset} to ${live_price}")

def main():
    print("🔄 Starting Oracle Update via Yahoo Finance\n")

    all_assets = CRYPTO_ASSETS + METAL_ASSETS + FOREX_ASSETS
    for asset in all_assets:
        price = fetch_price(asset)
        if price is not None:
            update_incrementally(asset, price)
        else:
            print(f"⚠️ Skipping {asset}, no price available.")

    print("\n✅ All updates complete.")

if __name__ == "__main__":
    main()
