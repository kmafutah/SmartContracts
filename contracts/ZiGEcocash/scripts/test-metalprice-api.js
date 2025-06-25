const axios = require("axios");
require("dotenv").config();

async function testMetalPriceAPI() {
  console.log("🧪 Testing MetalPrice API...");
  
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${process.env.METAL_PRICE_API}&base=USD&currencies=EUR,XAU,XAG,XPT,XPD`;
    console.log("📡 Fetching from:", url);
    
    const response = await axios.get(url);
    console.log("✅ API Response received");
    console.log("📊 Response data:", JSON.stringify(response.data, null, 2));
    
    console.log("\n🔍 Available rates keys:");
    if (response.data && response.data.rates) {
      Object.keys(response.data.rates).forEach(key => {
        console.log(`  - ${key}: ${response.data.rates[key]}`);
      });
    }
    
    // Test our logic
    console.log("\n🧪 Testing our parsing logic:");
    for (const symbol of ["XAU", "XAG", "XPT", "XPD"]) {
      const metalKey = `USD${symbol}`;
      console.log(`  Looking for ${metalKey}...`);
      if (response.data.rates && response.data.rates[metalKey]) {
        console.log(`  ✅ Found ${metalKey}: ${response.data.rates[metalKey]}`);
      } else {
        console.log(`  ❌ Not found: ${metalKey}`);
      }
    }
    
  } catch (error) {
    console.error("❌ API call failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testMetalPriceAPI().catch(console.error); 