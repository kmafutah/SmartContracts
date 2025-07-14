import json
import time
import logging
import os
import requests
from decimal import Decimal
from web3 import Web3
from web3.exceptions import TransactionNotFound
from eth_account import Account
from dotenv import load_dotenv
import yfinance as yf
from functools import wraps

# === Load .env ===
load_dotenv()

# === Logging Setup ===
logging.basicConfig(
    filename="oracle_update_enhanced.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
console.setFormatter(formatter)
logging.getLogger().addHandler(console)

# === Environment Config ===
RPC_URL = os.getenv("POLYGON_ZKEVM_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")  # Optional
CHAIN_ID = 1101  # Polygon zkEVM chainId

if not RPC_URL or not PRIVATE_KEY:
    raise Exception("Missing POLYGON_ZKEVM_RPC_URL or PRIVATE_KEY in .env")

ACCOUNT = Account.from_key(PRIVATE_KEY)
WALLET_ADDRESS = ACCOUNT.address
web3 = Web3(Web3.HTTPProvider(RPC_URL))

# === Load ABI and Oracle Contract ===
with open("ZiGOracleHub.json") as f:
    oracle_abi = json.load(f)["abi"]

with open("deployment-addresses-polygon_zkevm.json") as f:
    deployment = json.load(f)

# Get both oracle addresses
new_oracle_address = Web3.to_checksum_address(deployment["ZiGOracleHub"])

# Get the old oracle address that the Vault is using
vault_address = Web3.to_checksum_address(deployment["Vault"])
vault_abi = json.load(open("artifacts/contracts/economic_core/Vault.sol/Vault.json"))["abi"]
vault_contract = web3.eth.contract(address=vault_address, abi=vault_abi)
old_oracle_address = vault_contract.functions.oracleHub().call()

# Create contracts for both oracles
new_oracle_hub = web3.eth.contract(address=new_oracle_address, abi=oracle_abi)
old_oracle_hub = web3.eth.contract(address=old_oracle_address, abi=oracle_abi)

logging.info(f"New Oracle Hub: {new_oracle_address}")
logging.info(f"Old Oracle Hub (Vault's): {old_oracle_address}")

# === Asset Lists ===
CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"]
METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"]
FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"]

# === Price Provider Mappings ===
YAHOO_TICKERS = {
    "BTCUSD": "BTC-USD", "ETHUSD": "ETH-USD", "BNBUSD": "BNB-USD",
    "XRPUSD": "XRP-USD", "SOLUSD": "SOL-USD",
    "XAUUSD": "GC=F", "XAGUSD": "SI=F", "XPTUSD": "PL=F", "XPDUSD": "PA=F",
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDZAR": "ZAR=X",
    "USDJPY": "JPY=X", "USDCHF": "CHF=X", "USDCNH": "CNH=X"
}

COINGECKO_IDS = {
    "BTCUSD": "bitcoin", "ETHUSD": "ethereum", "BNBUSD": "binancecoin",
    "XRPUSD": "ripple", "SOLUSD": "solana"
}

ALPHA_VANTAGE_SYMBOLS = {
    "XAUUSD": "XAU", "XAGUSD": "XAG", "XPTUSD": "XPT", "XPDUSD": "XPD",
    "EURUSD": "EUR", "GBPUSD": "GBP", "USDZAR": "ZAR",
    "USDJPY": "JPY", "USDCHF": "CHF", "USDCNH": "CNH"
}

# === Rate-limit Protection ===
def rate_limited(min_interval=1.2):
    def decorator(fn):
        last_called = [0.0]
        @wraps(fn)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = fn(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator

# === Price Providers ===
@rate_limited(1.2)
def fetch_price_yahoo(asset):
    """Fetch price from Yahoo Finance"""
    try:
        ticker = YAHOO_TICKERS[asset]
        data = yf.Ticker(ticker).info
        price = float(data["regularMarketPrice"])
        logging.info(f"Yahoo: {asset} = ${price}")
        return price
    except Exception as e:
        logging.warning(f"Yahoo failed for {asset}: {e}")
        return None

@rate_limited(1.5)
def fetch_price_coingecko(asset):
    """Fetch crypto price from CoinGecko"""
    if asset not in COINGECKO_IDS:
        return None
    
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={COINGECKO_IDS[asset]}&vs_currencies=usd"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        price = data[COINGECKO_IDS[asset]]["usd"]
        logging.info(f"CoinGecko: {asset} = ${price}")
        return price
    except Exception as e:
        logging.warning(f"CoinGecko failed for {asset}: {e}")
        return None

@rate_limited(2.0)
def fetch_price_alphavantage(asset):
    """Fetch forex/metal price from Alpha Vantage"""
    if not ALPHA_VANTAGE_API_KEY or asset not in ALPHA_VANTAGE_SYMBOLS:
        return None
    
    try:
        symbol = ALPHA_VANTAGE_SYMBOLS[asset]
        url = f"https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency={symbol}&to_currency=USD&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "Error Message" in data:
            logging.warning(f"Alpha Vantage error for {asset}: {data['Error Message']}")
            return None
            
        rate = data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]
        price = float(rate)
        logging.info(f"Alpha Vantage: {asset} = ${price}")
        return price
    except Exception as e:
        logging.warning(f"Alpha Vantage failed for {asset}: {e}")
        return None

@rate_limited(1.0)
def fetch_price_fallback(asset):
    """Fallback price provider with reasonable defaults"""
    fallback_prices = {
        # Crypto
        "BTCUSD": 45000, "ETHUSD": 2500, "BNBUSD": 300, "XRPUSD": 0.5, "SOLUSD": 100,
        # Metals
        "XAUUSD": 2000, "XAGUSD": 25, "XPTUSD": 1000, "XPDUSD": 1200,
        # Forex
        "EURUSD": 1.1, "GBPUSD": 1.25, "USDZAR": 18, "USDJPY": 150, "USDCHF": 0.9, "USDCNH": 7.2
    }
    
    if asset in fallback_prices:
        price = fallback_prices[asset]
        logging.warning(f"Using fallback price for {asset}: ${price}")
        return price
    return None

def fetch_price_with_fallbacks(asset):
    """Try multiple price providers with fallbacks"""
    providers = []
    
    # Determine which providers to use based on asset type
    if asset in CRYPTO_ASSETS:
        providers = [
            ("Yahoo Finance", lambda: fetch_price_yahoo(asset)),
            ("CoinGecko", lambda: fetch_price_coingecko(asset)),
            ("Fallback", lambda: fetch_price_fallback(asset))
        ]
    elif asset in METAL_ASSETS:
        providers = [
            ("Yahoo Finance", lambda: fetch_price_yahoo(asset)),
            ("Alpha Vantage", lambda: fetch_price_alphavantage(asset)),
            ("Fallback", lambda: fetch_price_fallback(asset))
        ]
    elif asset in FOREX_ASSETS:
        providers = [
            ("Yahoo Finance", lambda: fetch_price_yahoo(asset)),
            ("Alpha Vantage", lambda: fetch_price_alphavantage(asset)),
            ("Fallback", lambda: fetch_price_fallback(asset))
        ]
    
    # Try each provider
    for provider_name, provider_func in providers:
        try:
            price = provider_func()
            if price and price > 0:
                logging.info(f"✅ {asset} price from {provider_name}: ${price}")
                return price
        except Exception as e:
            logging.warning(f"Provider {provider_name} failed for {asset}: {e}")
            continue
    
    logging.error(f"❌ All price providers failed for {asset}")
    return None

def retry(times=3, delay=3):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    logging.warning(f"Retry {attempt + 1}/{times} for {fn.__name__}: {e}")
                    if attempt < times - 1:
                        time.sleep(delay)
            logging.error(f"❌ Failed after {times} attempts: {fn.__name__}")
            return None
        return wrapper
    return decorator

@retry(times=3)
def send_tx(fn):
    tx = fn.build_transaction({
        'from': WALLET_ADDRESS,
        'nonce': web3.eth.get_transaction_count(WALLET_ADDRESS),
        'gas': 300000,
        'gasPrice': 0,  # Zero-gas for Polygon zkEVM
        'chainId': CHAIN_ID
    })
    signed = web3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    
    # Handle different web3.py versions
    if hasattr(signed, 'rawTransaction'):
        raw_tx = signed.rawTransaction
    else:
        raw_tx = signed.raw_transaction
    
    tx_hash = web3.eth.send_raw_transaction(raw_tx)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    logging.info(f"✅ Tx sent: {tx_hash.hex()} | Status: {receipt['status']}")
    return receipt

def update_price(asset, price, asset_type, oracle_hub_contract):
    wei_price = Web3.to_wei(Decimal(str(price)), 'ether')
    if asset_type == "crypto":
        return send_tx(oracle_hub_contract.functions.updateCryptoPrice(asset, wei_price))
    elif asset_type == "metal":
        return send_tx(oracle_hub_contract.functions.updateMetalPrice(asset, wei_price))
    elif asset_type == "forex":
        return send_tx(oracle_hub_contract.functions.updateForexPrice(asset, wei_price))

@retry(times=3)
def get_current_onchain_price(asset, asset_type, oracle_hub_contract):
    if asset_type == "crypto":
        data = oracle_hub_contract.functions.cryptoPrices(asset).call()
    elif asset_type == "metal":
        data = oracle_hub_contract.functions.metalPrices(asset).call()
    elif asset_type == "forex":
        data = oracle_hub_contract.functions.forexPrices(asset).call()
    return float(Web3.from_wei(data[0], 'ether'))

def update_incrementally(asset, live_price, asset_type, oracle_hub_contract):
    current_price = get_current_onchain_price(asset, asset_type, oracle_hub_contract)
    if current_price == 0:
        logging.info(f"🟢 First-time update for {asset}: ${live_price}")
        update_price(asset, live_price, asset_type, oracle_hub_contract)
        return

    deviation = abs(live_price - current_price) / current_price
    if deviation <= 0.10:
        logging.info(f"✅ Direct update for {asset}: ${current_price} → ${live_price}")
        update_price(asset, live_price, asset_type, oracle_hub_contract)
        return

    logging.info(f"🔧 Incremental update for {asset}: ${current_price} → ${live_price} ({deviation:.2%})")
    max_step = 0.05
    step = 0
    while abs(live_price - current_price) / current_price > max_step:
        direction = 1 if live_price > current_price else -1
        next_price = current_price * (1 + direction * max_step)
        step += 1
        logging.info(f"  Step {step}: ${current_price} → ${round(next_price, 4)}")
        update_price(asset, next_price, asset_type, oracle_hub_contract)
        time.sleep(2)
        current_price = get_current_onchain_price(asset, asset_type, oracle_hub_contract)

    logging.info(f"✅ Final update for {asset} → ${live_price}")
    update_price(asset, live_price, asset_type, oracle_hub_contract)

def main():
    logging.info("🔄 Starting enhanced oracle updates with multiple providers...")
    logging.info("📊 Providers: Yahoo Finance, CoinGecko, Alpha Vantage, Fallback")

    # Update both oracles
    oracles = [
        ("New Oracle Hub", new_oracle_hub),
        ("Old Oracle Hub (Vault's)", old_oracle_hub)
    ]

    for oracle_name, oracle_contract in oracles:
        logging.info(f"\n📊 Updating {oracle_name}...")
        
        for asset in CRYPTO_ASSETS:
            price = fetch_price_with_fallbacks(asset)
            if price:
                update_incrementally(asset, price, "crypto", oracle_contract)

        for asset in METAL_ASSETS:
            price = fetch_price_with_fallbacks(asset)
            if price:
                update_incrementally(asset, price, "metal", oracle_contract)

        for asset in FOREX_ASSETS:
            price = fetch_price_with_fallbacks(asset)
            if price:
                update_incrementally(asset, price, "forex", oracle_contract)

    logging.info("✅ All oracle updates completed for both oracles with enhanced providers.")

if __name__ == "__main__":
    main() 
