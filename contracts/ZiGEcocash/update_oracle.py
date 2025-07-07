import json
import time
import logging
import os
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
    filename="oracle_update.log",
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

oracle_address = Web3.to_checksum_address(deployment["ZiGOracleHub"])
oracle_hub = web3.eth.contract(address=oracle_address, abi=oracle_abi)

# === Asset Lists ===
CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"]
METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"]
FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"]

YAHOO_TICKERS = {
    "BTCUSD": "BTC-USD", "ETHUSD": "ETH-USD", "BNBUSD": "BNB-USD",
    "XRPUSD": "XRP-USD", "SOLUSD": "SOL-USD",
    "XAUUSD": "GC=F", "XAGUSD": "SI=F", "XPTUSD": "PL=F", "XPDUSD": "PA=F",
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDZAR": "ZAR=X",
    "USDJPY": "JPY=X", "USDCHF": "CHF=X", "USDCNH": "CNH=X"
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

@rate_limited(1.2)
def fetch_price(asset):
    try:
        ticker = YAHOO_TICKERS[asset]
        data = yf.Ticker(ticker).info
        price = float(data["regularMarketPrice"])
        logging.info(f"Fetched {asset} = ${price}")
        return price
    except Exception as e:
        logging.error(f"Failed to fetch {asset}: {e}")
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

def update_price(asset, price, asset_type):
    wei_price = Web3.to_wei(Decimal(str(price)), 'ether')
    if asset_type == "crypto":
        return send_tx(oracle_hub.functions.updateCryptoPrice(asset, wei_price))
    elif asset_type == "metal":
        return send_tx(oracle_hub.functions.updateMetalPrice(asset, wei_price))
    elif asset_type == "forex":
        return send_tx(oracle_hub.functions.updateForexPrice(asset, wei_price))

@retry(times=3)
def get_current_onchain_price(asset, asset_type):
    if asset_type == "crypto":
        data = oracle_hub.functions.cryptoPrices(asset).call()
    elif asset_type == "metal":
        data = oracle_hub.functions.metalPrices(asset).call()
    elif asset_type == "forex":
        data = oracle_hub.functions.forexPrices(asset).call()
    return float(Web3.from_wei(data[0], 'ether'))

def update_incrementally(asset, live_price, asset_type):
    current_price = get_current_onchain_price(asset, asset_type)
    if current_price == 0:
        logging.info(f"🟢 First-time update for {asset}: ${live_price}")
        update_price(asset, live_price, asset_type)
        return

    deviation = abs(live_price - current_price) / current_price
    if deviation <= 0.10:
        logging.info(f"✅ Direct update for {asset}: ${current_price} → ${live_price}")
        update_price(asset, live_price, asset_type)
        return

    logging.info(f"🔧 Incremental update for {asset}: ${current_price} → ${live_price} ({deviation:.2%})")
    max_step = 0.05
    step = 0
    while abs(live_price - current_price) / current_price > max_step:
        direction = 1 if live_price > current_price else -1
        next_price = current_price * (1 + direction * max_step)
        step += 1
        logging.info(f"  Step {step}: ${current_price} → ${round(next_price, 4)}")
        update_price(asset, next_price, asset_type)
        time.sleep(2)
        current_price = get_current_onchain_price(asset, asset_type)

    logging.info(f"✅ Final update for {asset} → ${live_price}")
    update_price(asset, live_price, asset_type)

def main():
    logging.info("🔄 Starting live oracle updates via yfinance...")

    for asset in CRYPTO_ASSETS:
        price = fetch_price(asset)
        if price:
            update_incrementally(asset, price, "crypto")

    for asset in METAL_ASSETS:
        price = fetch_price(asset)
        if price:
            update_incrementally(asset, price, "metal")

    for asset in FOREX_ASSETS:
        price = fetch_price(asset)
        if price:
            update_incrementally(asset, price, "forex")

    logging.info("✅ All oracle updates completed.")

if __name__ == "__main__":
    main()
