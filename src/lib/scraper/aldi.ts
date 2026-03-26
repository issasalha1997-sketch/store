/**
 * Aldi Ireland scraper.
 * Scrapes product data from aldi.ie category pages (server-rendered HTML).
 * No authentication needed — pages are public and contain all product data.
 */
import type { ScrapedProduct } from "./products";
import type { ScraperResult } from "./base";

const ALDI_BASE = "https://www.aldi.ie";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Aldi subcategory pages — each returns ~20-30 products per page with pagination
const CATEGORIES = [
  // Fresh Food
  { path: "/products/fresh-food/fruit/k/1588161416978075001", mapped: "fruits & vegetables" },
  { path: "/products/fresh-food/vegetables/k/1588161416978075002", mapped: "fruits & vegetables" },
  { path: "/products/fresh-food/poultry/k/1588161416978075004", mapped: "meat & poultry" },
  { path: "/products/fresh-food/beef/k/1588161416978075005", mapped: "meat & poultry" },
  { path: "/products/fresh-food/pork-ham/k/1588161416978075006", mapped: "meat & poultry" },
  { path: "/products/fresh-food/bacon-sausages/k/1588161416978075007", mapped: "meat & poultry" },
  { path: "/products/fresh-food/lamb/k/1588161416978075008", mapped: "meat & poultry" },
  { path: "/products/fresh-food/fish/k/1588161416978075011", mapped: "meat & poultry" },
  { path: "/products/fresh-food/seafood-prawns/k/1588161416978075012", mapped: "meat & poultry" },
  // Chilled Food
  { path: "/products/chilled-food/milk/k/1588161416978076001", mapped: "dairy & eggs" },
  { path: "/products/chilled-food/dairy/k/1588161416978076002", mapped: "dairy & eggs" },
  { path: "/products/chilled-food/eggs/k/1588161416978076003", mapped: "dairy & eggs" },
  { path: "/products/chilled-food/cheese/k/1588161416978076004", mapped: "dairy & eggs" },
  { path: "/products/chilled-food/yogurts/k/1588161416978076005", mapped: "dairy & eggs" },
  { path: "/products/chilled-food/ready-meals/k/1588161416978076007", mapped: "dairy & eggs" },
  // Bakery
  { path: "/products/bakery/k/1588161416978077", mapped: "bakery" },
  // Food Cupboard
  { path: "/products/food-cupboard/biscuits-crackers/k/1588161416978078001", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/cereals-snack-bars/k/1588161416978078002", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/chocolate-sweets/k/1588161416978078003", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/crisps-snacks/k/1588161416978078004", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/rice-pasta-noodles/k/1588161416978078008", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/sauces-oils-dressings/k/1588161416978078010", mapped: "snacks & sweets" },
  { path: "/products/food-cupboard/tins-cans-packets/k/1588161416978078012", mapped: "snacks & sweets" },
  // Drinks
  { path: "/products/drinks/tea/k/1588161416978079001", mapped: "drinks" },
  { path: "/products/drinks/coffee/k/1588161416978079002", mapped: "drinks" },
  { path: "/products/drinks/soft-drinks-juices/k/1588161416978079004", mapped: "drinks" },
  { path: "/products/drinks/water/k/1588161416978079005", mapped: "drinks" },
  // Frozen Food
  { path: "/products/frozen-food/meat-poultry/k/1588161416978081001", mapped: "frozen" },
  { path: "/products/frozen-food/fish-seafood/k/1588161416978081002", mapped: "frozen" },
  { path: "/products/frozen-food/chips-potato/k/1588161416978081003", mapped: "frozen" },
  { path: "/products/frozen-food/vegetables-sides/k/1588161416978081004", mapped: "frozen" },
  { path: "/products/frozen-food/ready-meals/k/1588161416978081005", mapped: "frozen" },
  { path: "/products/frozen-food/pizzas-garlic-bread/k/1588161416978081006", mapped: "frozen" },
  { path: "/products/frozen-food/ice-cream-desserts/k/1588161416978081009", mapped: "frozen" },
  // Home Essentials
  { path: "/products/home-essentials/dishwashing/k/1588161416978084003", mapped: "household" },
  { path: "/products/home-essentials/house-cleaning/k/1588161416978084005", mapped: "household" },
  { path: "/products/home-essentials/laundry/k/1588161416978084006", mapped: "household" },
  // Personal Care
  { path: "/products/health-beauty/body-care/k/1588161416978082001", mapped: "personal care" },
  { path: "/products/health-beauty/dental-care/k/1588161416978082002", mapped: "personal care" },
  { path: "/products/health-beauty/hair-care/k/1588161416978082003", mapped: "personal care" },
  // Baby
  { path: "/products/baby-toddler/k/1588161416978083", mapped: "baby" },
];

/**
 * Parse a single product tile from Aldi HTML.
 */
function parseProductTile(tile: string, category: string): ScrapedProduct | null {
  // Product URL and SKU
  const urlM = tile.match(/href="(\/product\/[^"]+)"/);
  if (!urlM) return null;
  const productUrl = urlM[1];

  // Product name from image alt text
  const nameM = tile.match(/alt="([^"]+)"/);
  if (!nameM) return null;
  const rawName = nameM[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');

  // Regular price: <span class="base-price__regular">...<ins ...>€X.XX</ins>...</span>
  // or just text content with €X.XX
  const salePriceM = tile.match(/base-price__discounted[^>]*>€(\d+\.\d{2})/);
  const regularPriceM = tile.match(/base-price__regular[^>]*>(?:<[^>]+>)*€(\d+\.\d{2})/);
  const wasPriceM = tile.match(/base-price__was-price[^>]*><del[^>]*>€(\d+\.\d{2})/);

  const price = salePriceM
    ? parseFloat(salePriceM[1])
    : regularPriceM
      ? parseFloat(regularPriceM[1])
      : NaN;

  if (isNaN(price) || price <= 0) return null;

  const originalPrice = wasPriceM ? parseFloat(wasPriceM[1]) : undefined;
  const isOnSale = !!salePriceM && !!wasPriceM;

  // Unit/comparison price: (€X.XX/unit)
  const unitPriceM = tile.match(/comparison-price[^>]*><p>\(€([\d.]+)\/([\d]*\s*[\w]+)\)/);
  let unitPrice: number | undefined;
  let unitPriceUnit: string | undefined;
  if (unitPriceM) {
    unitPrice = parseFloat(unitPriceM[1]);
    unitPriceUnit = unitPriceM[2].trim();
  }

  // Image URL
  const imgM = tile.match(/src="(https:\/\/dm\.emea\.cms\.aldi\.cx\/is\/image\/[^" ]+)"/);
  const imageUrl = imgM ? imgM[1] : undefined;

  // Parse weight from product name
  let weight: number | undefined;
  let weightUnit: string | undefined;
  const weightM = rawName.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|pk|pack)\b/i);
  if (weightM) {
    weight = parseFloat(weightM[1]);
    weightUnit = weightM[2].toLowerCase();
  }

  return {
    name: rawName,
    price,
    originalPrice,
    isOnSale,
    unitPrice,
    unitPriceUnit,
    category,
    weight,
    weightUnit,
    imageUrl,
    sourceUrl: `${ALDI_BASE}${productUrl}`,
  };
}

/**
 * Fetch a single Aldi category page and extract products.
 */
async function fetchCategoryPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`Aldi HTTP ${res.status}: ${url}`);
  return res.text();
}

/**
 * Extract all products from an HTML page.
 */
function extractProducts(html: string, category: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const tileRegex = /<a[^>]*href="\/product\/[^"]*"[^>]*class="[^"]*product-tile__link[^"]*"[\s\S]*?<\/a>/g;

  let match;
  while ((match = tileRegex.exec(html)) !== null) {
    const product = parseProductTile(match[0], category);
    if (product) products.push(product);
  }

  return products;
}

/**
 * Scrape all products from Aldi Ireland.
 * Visits each category page and paginates through results.
 */
export async function scrapeAldiLive(maxPages: number = 5): Promise<ScrapedProduct[]> {
  const all: ScrapedProduct[] = [];

  for (const cat of CATEGORIES) {
    try {
      let page = 1;
      let totalForCat = 0;

      while (page <= maxPages) {
        const url = page === 1
          ? `${ALDI_BASE}${cat.path}`
          : `${ALDI_BASE}${cat.path}?page=${page}`;

        const html = await fetchCategoryPage(url);
        const products = extractProducts(html, cat.mapped);

        if (products.length === 0) break;

        all.push(...products);
        totalForCat += products.length;
        page++;

        // Small delay between pages
        await new Promise((r) => setTimeout(r, 300));
      }

      const catName = cat.path.split("/").filter(Boolean).slice(1, -1).join("/");
      console.log(`[Aldi] ${catName}: ${totalForCat} products`);
    } catch (err) {
      const catName = cat.path.split("/").filter(Boolean).slice(1, -1).join("/");
      console.error(
        `[Aldi] ${catName} error:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return all;
}

export async function scrapeAldi(fallback: ScrapedProduct[]): Promise<ScraperResult> {
  try {
    const products = await scrapeAldiLive();
    if (products.length > 0) {
      console.log(`[Aldi] Live scrape returned ${products.length} products`);
      return { products, source: "live" };
    }
    return { products: fallback, source: "fallback" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Aldi] Live scrape failed: ${msg}, using fallback`);
    return { products: fallback, source: "fallback", error: msg };
  }
}
