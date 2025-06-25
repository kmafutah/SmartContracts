#!/usr/bin/env python3
import json
import os
import yfinance as yf
import requests
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
RPC_URL = "https://rpc.public.zkevm-test.net"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

# Metal tickers
METAL_TICKERS = {
    "XAU": "GC=F",  # Gold
    "XAG": "SI=F",  # Silver
    "XPT": "PL=F",  # Platinum
    "XPD": "PA=F",  # Palladium
}

def fetch_metal_prices():
    """Fetch metal prices using yfinance"""
    metals = {}
    print("📡 Fetching metal prices from Yahoo Finance...")
    
    for symbol, ticker in METAL_TICKERS.items():
        try:
            ticker_obj = yf.Ticker(ticker)
            price = ticker_obj.info.get('regularMarketPrice')
            if price:
                metals[f"{symbol}USD"] = price
                print(f"✅ {symbol}: ${price}")
            else:
                print(f"⚠️ No price for {symbol}")
        except Exception as e:
            print(f"❌ Failed to fetch {symbol}: {e}")
    
    return metals

def main():
    print("🔄 Python Oracle Price Update using yfinance...")
    
    # Fetch metal prices
    metal_prices = fetch_metal_prices()
    
    print("\n📊 Metal prices fetched:")
    for asset, price in metal_prices.items():
        print(f"  {asset}: ${price}")
    
    print("\n✅ Python metal price fetching complete!")

if __name__ == "__main__":
    main() 