/**
 * Dunnes Stores Ireland scraper.
 * Uses the Dunnes Grocery storefrontgateway API (same Mi9/Wynshop platform as SuperValu).
 * API: https://storefrontgateway.dunnesstoresgrocery.com/api/
 */
import type { ScrapedProduct } from "./products";
import type { ScraperResult } from "./base";

const API_BASE = "https://storefrontgateway.dunnesstoresgrocery.com/api";
const STORE_ID = "258"; // Beacon Court, Dublin 18
const PAGE_SIZE = 48;

const CATEGORIES = [
  { id: "50066", name: "Fresh Fruit", mapped: "fruits & vegetables" },
  { id: "47183", name: "Fresh Vegetables", mapped: "fruits & vegetables" },
  { id: "47181", name: "Fresh Meat & Poultry", mapped: "meat & poultry" },
  { id: "50101", name: "Chilled Fish & Seafood", mapped: "meat & poultry" },
  { id: "47173", name: "Chilled Food", mapped: "dairy & eggs" },
  { id: "47171", name: "Bakery", mapped: "bakery" },
  { id: "47177", name: "Food Cupboard", mapped: "snacks & sweets" },
  { id: "47185", name: "Frozen Food", mapped: "frozen" },
  { id: "47175", name: "Drinks", mapped: "drinks" },
  { id: "47189", name: "Household & Cleaning", mapped: "household" },
  { id: "47201", name: "Toiletries", mapped: "personal care" },
  { id: "47169", name: "Baby", mapped: "baby" },
];

interface DunnesProduct {
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  priceNumeric: number;
  pricePerUnit?: string;
  unitOfSize?: { abbreviation: string; type: string; size: number };
  image?: { default: string; cell: string };
  tprPrice?: unknown;
}

interface CategoryResponse {
  categoryName: string;
  total: number;
  items: DunnesProduct[];
}

async function fetchPage(categoryId: string, take: number, skip: number): Promise<CategoryResponse> {
  const url = `${API_BASE}/stores/${STORE_ID}/categories/${categoryId}/search?take=${take}&skip=${skip}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Dunnes API ${res.status}`);
  return res.json() as Promise<CategoryResponse>;
}

function toScrapedProduct(p: DunnesProduct, category: string): ScrapedProduct {
  let unitPrice: number | undefined;
  let unitPriceUnit: string | undefined;
  if (p.pricePerUnit) {
    const m = p.pricePerUnit.match(/€([\d.]+)\/([\w]+)/);
    if (m) { unitPrice = parseFloat(m[1]); unitPriceUnit = m[2]; }
  }

  const tpr = typeof p.tprPrice === "number" ? p.tprPrice : null;
  const isOnSale = tpr != null && tpr > 0 && tpr < p.priceNumeric;

  return {
    name: p.name,
    price: isOnSale && tpr ? tpr : p.priceNumeric,
    originalPrice: isOnSale ? p.priceNumeric : undefined,
    isOnSale,
    unitPrice,
    unitPriceUnit,
    brand: p.brand || undefined,
    category,
    weight: p.unitOfSize?.size || undefined,
    weightUnit: p.unitOfSize?.abbreviation || undefined,
    barcode: p.sku || undefined,
    imageUrl: p.image?.default || p.image?.cell || undefined,
    description: p.description?.slice(0, 500) || undefined,
  };
}

export async function scrapeDunnesLive(maxPerCategory: number = 200): Promise<ScrapedProduct[]> {
  const all: ScrapedProduct[] = [];

  for (const cat of CATEGORIES) {
    try {
      const first = await fetchPage(cat.id, PAGE_SIZE, 0);
      const total = Math.min(first.total, maxPerCategory);
      console.log(`[Dunnes] ${cat.name}: ${first.total} total, fetching ${total}`);

      for (const item of first.items) {
        if (item.priceNumeric > 0) all.push(toScrapedProduct(item, cat.mapped));
      }

      let fetched = first.items.length;
      while (fetched < total) {
        const page = await fetchPage(cat.id, PAGE_SIZE, fetched);
        if (!page.items?.length) break;
        for (const item of page.items) {
          if (item.priceNumeric > 0) all.push(toScrapedProduct(item, cat.mapped));
        }
        fetched += page.items.length;
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error(`[Dunnes] ${cat.name} error:`, err instanceof Error ? err.message : String(err));
    }
  }

  return all;
}

export async function scrapeDunnes(fallback: ScrapedProduct[]): Promise<ScraperResult> {
  try {
    const products = await scrapeDunnesLive();
    if (products.length > 0) {
      console.log(`[Dunnes] Live scrape returned ${products.length} products`);
      return { products, source: "live" };
    }
    return { products: fallback, source: "fallback" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Dunnes] Live scrape failed: ${msg}, using fallback`);
    return { products: fallback, source: "fallback", error: msg };
  }
}
