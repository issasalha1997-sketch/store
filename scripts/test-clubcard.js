// Quick test to verify Clubcard price extraction
async function test() {
  const url = "https://www.tesco.ie/groceries/en-IE/search?query=cadbury+timeout&count=10";
  const res = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IE,en;q=0.5",
      "Accept-Encoding": "identity",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    },
  });
  const html = await res.text();

  // 1. Extract promotions
  const promoRegex = /\{"__typename":"PromotionType","id":"(\d+)"[^}]*"description":"([^"]*)"[^}]*?"unitSellingInfo":("(?:[^"]*)"|null)/g;
  const promos = new Map();
  let m;
  while ((m = promoRegex.exec(html)) !== null) {
    const desc = m[2];
    const priceMatch = desc.match(/€(\d+(?:\.\d+)?)\s/);
    promos.set(m[1], {
      clubcardPrice: priceMatch ? parseFloat(priceMatch[1]) : null,
      description: desc,
    });
  }
  console.log("Promotions found:", promos.size);
  for (const [id, p] of promos) {
    console.log(`  Promo ${id}: ${p.description} → Clubcard: €${p.clubcardPrice}`);
  }

  // 2. Link promotions to products via refs
  const refPattern = 'PromotionType:{\\"id\\":\\"';
  let idx = 0;
  let linked = 0;
  while (true) {
    idx = html.indexOf(refPattern, idx);
    if (idx === -1) break;
    idx += refPattern.length;
    const endIdx = html.indexOf('\\"', idx);
    const promoId = html.substring(idx, endIdx);

    // Find product tpnc by looking backwards
    const searchStart = Math.max(0, idx - 3000);
    const context = html.substring(searchStart, idx);
    const tpncAll = [...context.matchAll(/"tpnc":"(\d+)"/g)];
    if (tpncAll.length > 0 && promos.has(promoId)) {
      const tpnc = tpncAll[tpncAll.length - 1][1];
      const promo = promos.get(promoId);
      // Find the product title too
      const titleAll = [...context.matchAll(/"title":"([^"]+)"/g)];
      const title = titleAll.length > 0 ? titleAll[titleAll.length - 1][1] : "?";
      const priceAll = [...context.matchAll(/"actual":(\d+\.?\d*)/g)];
      const regularPrice = priceAll.length > 0 ? priceAll[priceAll.length - 1][1] : "?";

      console.log(`\n  Product: ${title}`);
      console.log(`    Regular: €${regularPrice}`);
      console.log(`    Clubcard: €${promo.clubcardPrice}`);
      console.log(`    Promo: ${promo.description}`);
      linked++;
    }
  }
  console.log(`\nLinked ${linked} products to Clubcard promotions`);
}

test().catch(console.error);
