/**
 * Tesco Ireland scraper.
 * Fetches product data from tesco.ie by parsing embedded product JSON from HTML.
 * Bypasses Akamai WAF with proper browser-like headers.
 */
import type { ScrapedProduct } from "./products";
import type { ScraperResult } from "./base";

const TESCO_BASE = "https://www.tesco.ie/groceries/en-IE";

const HEADERS: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IE,en;q=0.5",
  "Accept-Encoding": "identity",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
};

// Category URLs — use top-level /all paths for reliability.
// Sub-categories that work are used for better category mapping.
const CATEGORIES = [
  // Fresh Food — sub-categories that work
  { path: "/shop/fresh-food/cheese/all", mapped: "dairy & eggs" },
  { path: "/shop/fresh-food/yoghurts/all", mapped: "dairy & eggs" },
  { path: "/shop/fresh-food/fresh-meat-and-poultry/all", mapped: "meat & poultry" },
  { path: "/shop/fresh-food/fresh-fruit/all", mapped: "fruits & vegetables" },
  { path: "/shop/fresh-food/fresh-vegetables/all", mapped: "fruits & vegetables" },
  // Fresh Food — top-level catches remaining (milk, eggs, butter, fish, etc.)
  { path: "/shop/fresh-food/all", mapped: "dairy & eggs" },
  // Bakery
  { path: "/shop/bakery/all", mapped: "bakery" },
  // Food Cupboard — top-level (sub-categories 404)
  { path: "/shop/food-cupboard/all", mapped: "snacks & sweets" },
  // Frozen Food — top-level (sub-categories 404)
  { path: "/shop/frozen-food/all", mapped: "frozen" },
  // Drinks — sub-categories that work
  { path: "/shop/drinks/tea/all", mapped: "drinks" },
  { path: "/shop/drinks/coffee/all", mapped: "drinks" },
  { path: "/shop/drinks/water/all", mapped: "drinks" },
  { path: "/shop/drinks/fizzy-drinks/all", mapped: "drinks" },
  // Drinks — top-level catches remaining
  { path: "/shop/drinks/all", mapped: "drinks" },
  // Treats & Snacks
  { path: "/shop/treats-and-snacks/all", mapped: "snacks & sweets" },
  // Household — sub-category that works
  { path: "/shop/household/cleaning/all", mapped: "household" },
  // Household — top-level catches remaining
  { path: "/shop/household/all", mapped: "household" },
  // Health & Beauty — sub-category that works
  { path: "/shop/health-and-beauty/toiletries/all", mapped: "personal care" },
  // Health & Beauty — top-level catches remaining
  { path: "/shop/health-and-beauty/all", mapped: "personal care" },
  // Baby
  { path: "/shop/baby-and-toddler/all", mapped: "baby" },
];

interface TescoProduct {
  title: string;
  brandName?: string;
  tpnc?: string;
  gtin?: string;
  price?: {
    actual: number;
    unitPrice?: number;
    unitOfMeasure?: string;
  };
  promotions?: Array<{ description?: string }>;
  defaultImageUrl?: string;
  superDepartmentName?: string;
  departmentName?: string;
  aisleName?: string;
  shelfName?: string;
  status?: string;
  isNew?: boolean;
  details?: {
    components?: Array<{
      __typename?: string;
      competitors?: Array<{
        id?: string;
        priceMatch?: { isMatching?: boolean };
      }>;
    }>;
  };
}

/**
 * Extract all products from Tesco HTML by finding embedded JSON product objects.
 */
function extractProductsFromHtml(html: string, category: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const seen = new Set<string>();

  // Find all ProductType objects in the Apollo cache
  // Pattern: {"__typename":"ProductType","id":"...","isForSale":true,...}
  const regex = /\{"__typename":"ProductType","id":"(\d+)","isForSale":(true|false)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);

    // Extract the full product object by finding balanced braces
    const startIdx = match.index;
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < html.length && i < startIdx + 10000; i++) {
      if (html[i] === "{") depth++;
      if (html[i] === "}") depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }

    try {
      const objStr = html.substring(startIdx, endIdx);
      // Fix escaped forward slashes from JSON encoding
      const cleaned = objStr.replace(/\\u002F/g, "/");
      const product: TescoProduct = JSON.parse(cleaned);

      if (!product.title || !product.price?.actual || product.price.actual <= 0) continue;
      if (product.status === "NotAvailable") continue;

      // Fix image URL encoding
      let imageUrl = product.defaultImageUrl?.replace(/\\u002F/g, "/");
      // Remove size params to get full-size image
      if (imageUrl && imageUrl.includes("?")) {
        imageUrl = imageUrl.split("?")[0];
      }

      // Parse weight from product name
      let weight: number | undefined;
      let weightUnit: string | undefined;
      const weightMatch = product.title.match(
        /(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|ltr|litre|litres|pack|pk)\b/i
      );
      if (weightMatch) {
        weight = parseFloat(weightMatch[1]);
        weightUnit = weightMatch[2].toLowerCase();
        if (weightUnit === "ltr" || weightUnit === "litre" || weightUnit === "litres")
          weightUnit = "l";
        if (weightUnit === "pk") weightUnit = "pack";
      }

      const scraped: ScrapedProduct = {
        name: product.title,
        price: product.price.actual,
        brand: product.brandName || undefined,
        category,
        imageUrl,
        unitPrice: product.price.unitPrice || undefined,
        unitPriceUnit: product.price.unitOfMeasure || undefined,
        weight,
        weightUnit,
        barcode: product.gtin || undefined,
        sourceUrl: `https://www.tesco.ie/groceries/en-IE/products/${product.tpnc || id}`,
      };

      // Detect promotions as sales
      if (product.promotions && product.promotions.length > 0) {
        scraped.isOnSale = true;
        scraped.description = product.promotions
          .map((p) => p.description)
          .filter(Boolean)
          .join("; ")
          .slice(0, 500);
      }

      products.push(scraped);
    } catch {
      // Skip individual parse errors
    }
  }

  return products;
}

/**
 * Fetch a Tesco page with browser-like headers.
 */
async function fetchTescoPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Tesco HTTP ${res.status}: ${url}`);
  }
  return res.text();
}

/**
 * Scrape all products from Tesco Ireland.
 * Visits category pages and paginates through results.
 */
export async function scrapeTescoLive(
  maxPerCategory: number = 200
): Promise<ScrapedProduct[]> {
  const allProducts: ScrapedProduct[] = [];
  const seenIds = new Set<string>();

  for (const cat of CATEGORIES) {
    try {
      let page = 1;
      let totalForCat = 0;
      const maxPages = Math.ceil(maxPerCategory / 48);

      while (page <= maxPages) {
        const url = `${TESCO_BASE}${cat.path}?page=${page}&count=48`;
        const html = await fetchTescoPage(url);
        const products = extractProductsFromHtml(html, cat.mapped);

        if (products.length === 0) break;

        // Deduplicate across categories
        for (const p of products) {
          const key = p.barcode || p.name;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            allProducts.push(p);
            totalForCat++;
          }
        }

        page++;

        // Rate limit — be respectful to avoid triggering Akamai
        await new Promise((r) => setTimeout(r, 2000));
      }

      const catName = cat.path.split("/").filter(Boolean).slice(1, -1).join("/");
      console.log(`[Tesco] ${catName}: ${totalForCat} products`);
    } catch (err) {
      const catName = cat.path.split("/").filter(Boolean).slice(1, -1).join("/");
      console.error(
        `[Tesco] ${catName} error:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return allProducts;
}

export async function scrapeTesco(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  try {
    const products = await scrapeTescoLive();
    if (products.length > 0) {
      console.log(`[Tesco] Live scrape returned ${products.length} products`);
      return { products, source: "live" };
    }
    console.log("[Tesco] Live scrape returned 0 products, using fallback");
    return { products: fallback, source: "fallback" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Tesco] Live scrape failed: ${msg}, using fallback`);
    return { products: fallback, source: "fallback", error: msg };
  }
}
