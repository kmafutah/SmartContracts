const axios = require('axios');
const cheerio = require('cheerio');

const YAHOO_URLS = {
  XAU: 'https://finance.yahoo.com/quote/GC=F', // Gold
  XAG: 'https://finance.yahoo.com/quote/SI=F', // Silver
  XPT: 'https://finance.yahoo.com/quote/PL=F', // Platinum
  XPD: 'https://finance.yahoo.com/quote/PA=F', // Palladium
};

async function debugYahoo(symbol) {
  const url = YAHOO_URLS[symbol];
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    const $ = cheerio.load(data);
    console.log(`\nAll <fin-streamer data-field="regularMarketPrice"> for ${symbol}:`);
    $('fin-streamer[data-field="regularMarketPrice"]').each((i, el) => {
      const price = $(el).text();
      const parent = $(el).parent().attr('class') || $(el).parent().attr('id') || $(el).parent().prop('tagName');
      console.log(`  [${i}] Price: ${price} | Parent: ${parent}`);
    });
    // Optionally, print the HTML of the first few parents for context
    // console.log($.html($('fin-streamer[data-field="regularMarketPrice"]').first().parent()));
  } catch (err) {
    console.error(`Failed to scrape ${symbol}:`, err.message);
  }
}

debugYahoo('XAU');
