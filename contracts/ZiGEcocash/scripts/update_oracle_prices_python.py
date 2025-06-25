#!/usr/bin/env python3
"""
Python script to update oracle prices using yfinance for metals
Replicates functionality of incremental-update-oracle-prices.js
"""

import json
import os
import time
from pathlib import Path
import yfinance as yf
import requests
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
DEPLOYMENT_FILE = "deployment-addresses-polygon_zkevm.json"
RPC_URL = "https://rpc.public.zkevm-test.net"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

# Asset configurations
CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"]
METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"]
FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"]

# Yahoo Finance tickers for metals
YF_METAL_TICKERS = {
    "XAU": "GC=F",  # Gold
    "XAG": "SI=F",  # Silver
    "XPT": "PL=F",  # Platinum
    "XPD": "PA=F",  # Palladium
}

# Yahoo Finance tickers for crypto
YF_CRYPTO_TICKERS = {
    "BTCUSD": "BTC-USD",
    "ETHUSD": "ETH-USD",
    "BNBUSD": "BNB-USD",
    "XRPUSD": "XRP-USD",
    "SOLUSD": "SOL-USD",
}

def load_deployment_addresses():
    """Load deployment addresses from JSON file"""
    deployment_path = Path(__file__).parent.parent / DEPLOYMENT_FILE
    if not deployment_path.exists():
        raise FileNotFoundError(f"Deployment file not found: {deployment_path}")
    
    with open(deployment_path, 'r') as f:
        return json.load(f)

def setup_web3():
    """Setup Web3 connection"""
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise ConnectionError("Failed to connect to RPC")
    
    account = w3.eth.account.from_key(PRIVATE_KEY)
    return w3, account

def get_oracle_hub_contract(w3, address):
    """Get ZiGOracleHub contract instance"""
    # ABI for the functions we need
    abi = [
        {
            "inputs": [{"internalType": "string", "name": "symbol", "type": "string"}],
            "name": "updateCryptoPrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "string", "name": "symbol", "type": "string"}],
            "name": "updateMetalPrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "string", "name": "symbol", "type": "string"}],
            "name": "updateForexPrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "string", "name": "", "type": "string"}],
            "name": "cryptoPrices",
            "outputs": [
                {"internalType": "uint256", "name": "price", "type": "uint256"},
                {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "string", "name": "", "type": "string"}],
            "name": "metalPrices",
            "outputs": [
                {"internalType": "uint256", "name": "price", "type": "uint256"},
                {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "string", "name": "", "type": "string"}],
            "name": "forexPrices",
            "outputs": [
                {"internalType": "uint256", "name": "price", "type": "uint256"},
                {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    return w3.eth.contract(address=address, abi=abi)

def fetch_crypto_prices():
    """Fetch crypto prices using CoinGecko"""
    try:
        print("📡 Fetching crypto prices from CoinGecko...")
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={
                'ids': 'bitcoin,ethereum,binancecoin,ripple,solana',
                'vs_currencies': 'usd',
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "BTCUSD": data['bitcoin']['usd'],
            "ETHUSD": data['ethereum']['usd'],
            "BNBUSD": data['binancecoin']['usd'],
            "XRPUSD": data['ripple']['usd'],
            "SOLUSD": data['solana']['usd'],
        }
    except Exception as e:
        print(f"❌ Failed to fetch crypto prices: {e}")
        return {}

def fetch_metal_prices():
    """Fetch metal prices using yfinance"""
    metals = {}
    print("📡 Fetching metal prices from Yahoo Finance...")
    
    for symbol, ticker in YF_METAL_TICKERS.items():
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

def fetch_forex_prices():
    """Fetch forex prices using OpenExchangeRates"""
    try:
        print("📡 Fetching forex prices from OpenExchangeRates...")
        response = requests.get(
            'https://openexchangerates.org/api/latest.json',
            params={
                'app_id': os.getenv('OPENEXG_APPID'),
                'symbols': 'ZAR,EUR,GBP,CHF,JPY,CNH',
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "EURUSD": 1 / data['rates']['EUR'],
            "GBPUSD": 1 / data['rates']['GBP'],
            "USDZAR": data['rates']['ZAR'],
            "USDJPY": data['rates']['JPY'],
            "USDCHF": data['rates']['CHF'],
            "USDCNH": data['rates']['CNH'],
        }
    except Exception as e:
        print(f"❌ Failed to fetch forex prices: {e}")
        return {}

def update_price_incrementally(w3, account, oracle_hub, asset, current_price, target_price, update_func, asset_type):
    """Update price incrementally to avoid large deviations"""
    max_deviation = 0.05  # 5%
    cur = current_price
    step = 0
    
    while abs(target_price - cur) / cur > max_deviation:
        direction = 1 if target_price > cur else -1
        next_price = cur * (1 + direction * max_deviation)
        next_price_rounded = round(next_price, 10)
        
        print(f"Step {step + 1}: Updating {asset} ({asset_type}) from ${cur:.2f} to ${next_price_rounded:.2f} "
              f"(deviation: {abs(target_price - cur) / cur * 100:.2f}%)")
        
        try:
            # Update price on blockchain
            update_func(asset, next_price_rounded)
            
            # Wait for transaction to be mined
            time.sleep(2)
            
            # Read the actual price from blockchain after update
            if asset_type == "crypto":
                cur = w3.from_wei(oracle_hub.functions.cryptoPrices(asset).call()[0], 'ether')
            elif asset_type == "metal":
                cur = w3.from_wei(oracle_hub.functions.metalPrices(asset).call()[0], 'ether')
            elif asset_type == "forex":
                cur = w3.from_wei(oracle_hub.functions.forexPrices(asset).call()[0], 'ether')
            
            print(f"✅ Step {step + 1} complete. New on-chain price: ${cur:.2f}")
            step += 1
            
        except Exception as error:
            print(f"❌ Step {step + 1} failed: {error}")
            raise error
    
    # Final update to target
    print(f"Final step: Updating {asset} ({asset_type}) from ${cur:.2f} to ${target_price:.2f}")
    update_func(asset, target_price)
    print(f"✅ Final: Updated {asset} ({asset_type}) to ${target_price:.2f}")

def main():
    print("🔄 Python Oracle Price Update using yfinance...")
    
    try:
        # Load deployment addresses
        deployment_addresses = load_deployment_addresses()
        
        # Setup Web3
        w3, account = setup_web3()
        print(f"🔗 Connected to Polygon zkEVM using account: {account.address}")
        
        # Get oracle hub contract
        oracle_hub = get_oracle_hub_contract(w3, deployment_addresses['ZiGOracleHub'])
        
        # Fetch live prices
        crypto_prices = fetch_crypto_prices()
        metal_prices = fetch_metal_prices()
        forex_prices = fetch_forex_prices()
        
        # Helper functions for updating prices
        def update_crypto(asset, price):
            tx = oracle_hub.functions.updateCryptoPrice(
                asset, 
                w3.to_wei(price, 'ether')
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'gasPrice': w3.eth.gas_price
            })
            signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"✅ Updated {asset} to ${price}")
        
        def update_metal(asset, price):
            tx = oracle_hub.functions.updateMetalPrice(
                asset, 
                w3.to_wei(price, 'ether')
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'gasPrice': w3.eth.gas_price
            })
            signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"✅ Updated {asset} to ${price}")
        
        def update_forex(asset, price):
            tx = oracle_hub.functions.updateForexPrice(
                asset, 
                w3.to_wei(price, 'ether')
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'gasPrice': w3.eth.gas_price
            })
            signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"✅ Updated {asset} to ${price}")
        
        # Helper functions for getting current prices
        def get_crypto_price(asset):
            data = oracle_hub.functions.cryptoPrices(asset).call()
            return float(w3.from_wei(data[0], 'ether'))
        
        def get_metal_price(asset):
            data = oracle_hub.functions.metalPrices(asset).call()
            return float(w3.from_wei(data[0], 'ether'))
        
        def get_forex_price(asset):
            data = oracle_hub.functions.forexPrices(asset).call()
            return float(w3.from_wei(data[0], 'ether'))
        
        # Update crypto prices
        print("\n📊 Updating crypto prices...")
        for asset in CRYPTO_ASSETS:
            if asset in crypto_prices:
                live_price = crypto_prices[asset]
                try:
                    current_price = get_crypto_price(asset)
                    if current_price == 0:
                        update_crypto(asset, live_price)
                        print(f"Set {asset} to ${live_price} (was 0)")
                    elif abs(live_price - current_price) / current_price > 0.10:
                        print(f"Incremental update needed for {asset}: on-chain ${current_price:.2f} -> live ${live_price:.2f}")
                        update_price_incrementally(w3, account, oracle_hub, asset, current_price, live_price, update_crypto, "crypto")
                    else:
                        update_crypto(asset, live_price)
                        print(f"Updated {asset} to ${live_price}")
                except Exception as e:
                    print(f"❌ Failed to update {asset}: {e}")
        
        # Update metal prices
        print("\n📊 Updating metal prices...")
        for asset in METAL_ASSETS:
            if asset in metal_prices:
                live_price = metal_prices[asset]
                try:
                    current_price = get_metal_price(asset)
                    if current_price == 0:
                        update_metal(asset, live_price)
                        print(f"Set {asset} to ${live_price} (was 0)")
                    elif abs(live_price - current_price) / current_price > 0.10:
                        print(f"Incremental update needed for {asset}: on-chain ${current_price:.2f} -> live ${live_price:.2f}")
                        update_price_incrementally(w3, account, oracle_hub, asset, current_price, live_price, update_metal, "metal")
                    else:
                        update_metal(asset, live_price)
                        print(f"Updated {asset} to ${live_price}")
                except Exception as e:
                    print(f"❌ Failed to update {asset}: {e}")
        
        # Update forex prices
        print("\n📊 Updating forex prices...")
        for asset in FOREX_ASSETS:
            if asset in forex_prices:
                live_price = forex_prices[asset]
                try:
                    current_price = get_forex_price(asset)
                    if current_price == 0:
                        update_forex(asset, live_price)
                        print(f"Set {asset} to ${live_price} (was 0)")
                    elif abs(live_price - current_price) / current_price > 0.10:
                        print(f"Incremental update needed for {asset}: on-chain ${current_price:.2f} -> live ${live_price:.2f}")
                        update_price_incrementally(w3, account, oracle_hub, asset, current_price, live_price, update_forex, "forex")
                    else:
                        update_forex(asset, live_price)
                        print(f"Updated {asset} to ${live_price}")
                except Exception as e:
                    print(f"❌ Failed to update {asset}: {e}")
        
        print("\n✅ Python oracle price updates complete!")
        
    except Exception as error:
        print(f"❌ Python oracle price update failed: {error}")
        raise

if __name__ == "__main__":
    main() 