import yfinance as yf
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime, timedelta

# Define asset tickers and multipliers
crypto_assets = {
    "BTC-USD": 0.12 / 1000,
    "ETH-USD": 0.09 / 100,
    "BNB-USD": 0.03,
    "XRP-USD": 0.03 * 10,
    "SOL-USD": 0.03,
}

metal_assets = {
    "XAUUSD=X": 0.20,
    "XPTUSD=X": 0.10,
    "XPDUSD=X": 0.06,
    "XAGUSD=X": 0.04,
}

forex_assets = {
    "EURUSD=X": 0.075,
    "GBPUSD=X": 0.06,
    "ZAR=X": 0.06,   # USD/ZAR, so invert
    "JPY=X": 0.03,   # USD/JPY, so invert
    "CHF=X": 0.03,   # USD/CHF, so invert
    "CNH=X": 0.045,  # USD/CNH, so invert
}

# Get historical prices (e.g., last 30 days)
end = datetime.today()
start = end - timedelta(days=30)

def fetch_prices(tickers):
    data = yf.download(tickers=list(tickers.keys()), start=start, end=end)['Adj Close']
    return data

# Fetch data
crypto_data = fetch_prices(crypto_assets)
metal_data = fetch_prices(metal_assets)
forex_data = fetch_prices(forex_assets)

# Calculate components
def calc_component(data, multipliers, invert_keys=[]):
    result = pd.Series(index=data.index, dtype='float64')
    for asset, mult in multipliers.items():
        prices = data[asset]
        if asset in invert_keys:
            prices = 1 / prices
        result += prices * mult
    return result

C = calc_component(crypto_data, crypto_assets)
M = calc_component(metal_data, metal_assets)
F = calc_component(forex_data, forex_assets, invert_keys=["ZAR=X", "JPY=X", "CHF=X", "CNH=X"])
Z = C + M + F  # Total ZiG value

# Plotting
plt.figure(figsize=(12, 6))
plt.plot(C, label="Crypto (C)", color="blue")
plt.plot(M, label="Metal (M)", color="gold")
plt.plot(F, label="Forex (F)", color="green")
plt.plot(Z, label="Total ZiG Value (C + M + F)", color="black", linewidth=2)
plt.title("ZiG Backing Components Over Time")
plt.xlabel("Date")
plt.ylabel("Value")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

