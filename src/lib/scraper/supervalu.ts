/**
 * SuperValu Ireland scraper.
 * Uses the real SuperValu Storefront Gateway API to fetch full product catalog.
 * API: https://storefrontgateway.supervalu.ie/api/
 */
import type { ScrapedProduct } from "./products";
import type { ScraperResult } from "./base";

const API_BASE = "https://storefrontgateway.supervalu.ie/api";
// Ranelagh Dublin store — used as reference for prices
const STORE_ID = "1733";
const PAGE_SIZE = 48;

// Grocery categories to scrape
const CATEGORIES = [
  { id: "O100001", name: "Fruit & Vegetables", mapped: "fruits & vegetables" },
  { id: "O100010", name: "Bakery", mapped: "bakery" },
  { id: "O100015", name: "Meat & Poultry", mapped: "meat & poultry" },
  { id: "O100017", name: "Fish & Seafood", mapped: "meat & poultry" },
  { id: "O100023", name: "Cheese", mapped: "dairy & eggs" },
  { id: "O100025", name: "Milk, Butter & Eggs", mapped: "dairy & eggs" },
  { id: "O100030", name: "Chilled Food", mapped: "dairy & eggs" },
  { id: "O100035", name: "Food Cupboard", mapped: "snacks & sweets" },
  { id: "O100045", name: "Frozen Foods", mapped: "frozen" },
  { id: "O100050", name: "Drinks", mapped: "drinks" },
  { id: "O100065", name: "Household & Cleaning", mapped: "household" },
  { id: "O100060", name: "Baby", mapped: "baby" },
  { id: "O100055", name: "Beauty & Personal Care", mapped: "personal care" },
];

interface SuperValuProduct {
  productId: string;
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  priceNumeric: number;
  wholePrice?: number;
  price: string;
  pricePerUnit?: string;
  unitOfSize?: {
    abbreviation: string;
    type: string;
    label: string;
    size: number;
  };
  unitOfMeasure?: {
    abbreviation: string;
    type: string;
    size: number;
  };
  sellBy?: string;
  image?: {
    default: string;
    cell: string;
    details: string;
    zoom: string;
  };
  defaultCategory?: Array<{
    categoryBreadcrumb: string;
    category: string;
  }>;
  available?: boolean;
  hasLoyaltyDiscount?: boolean;
  tprPrice?: number;
  attributes?: Record<string, unknown>;
}

interface CategorySearchResponse {
  categoryName: string;
  count: number;
  total: number;
  items: SuperValuProduct[];
}

async function fetchCategoryPage(
  categoryId: string,
  take: number,
  skip: number
): Promise<CategorySearchResponse> {
  const url = `${API_BASE}/stores/${STORE_ID}/categories/${categoryId}/search?take=${take}&skip=${skip}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`SuperValu API ${res.status}: ${url}`);
  }

  return res.json() as Promise<CategorySearchResponse>;
}

function parseUnitPrice(pricePerUnit?: string): { unitPrice?: number; unitPriceUnit?: string } {
  if (!pricePerUnit) return {};
  // Format: "€12.29/kg" or "€0.34/100ml" etc.
  const match = pricePerUnit.match(/€([\d.]+)\/([\w]+)/);
  if (match) {
    return {
      unitPrice: parseFloat(match[1]),
      unitPriceUnit: match[2],
    };
  }
  return {};
}

function parseWeight(product: SuperValuProduct): { weight?: number; weightUnit?: string } {
  // Try unitOfSize first
  if (product.unitOfSize && product.unitOfSize.size > 0) {
    return {
      weight: product.unitOfSize.size,
      weightUnit: product.unitOfSize.abbreviation || product.unitOfSize.type,
    };
  }

  // Try parsing from name: "Strawberries (227 g)" or "Milk 2L"
  const nameMatch = product.name.match(/[\s(](\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|pk|pack|pce|pcs)\)?/i);
  if (nameMatch) {
    return {
      weight: parseFloat(nameMatch[1]),
      weightUnit: nameMatch[2].toLowerCase(),
    };
  }

  return {};
}

function toScrapedProduct(
  product: SuperValuProduct,
  mappedCategory: string
): ScrapedProduct {
  const { unitPrice, unitPriceUnit } = parseUnitPrice(product.pricePerUnit);
  const { weight, weightUnit } = parseWeight(product);

  // Check if on sale (has a tprPrice that is a valid number and less than regular price)
  const tprPrice = typeof product.tprPrice === "number" ? product.tprPrice : null;
  const isOnSale = tprPrice != null && tprPrice > 0 && tprPrice < product.priceNumeric;
  const originalPrice = isOnSale ? product.priceNumeric : undefined;
  const price = isOnSale && tprPrice ? tprPrice : product.priceNumeric;

  // Clean up description
  let description = product.description?.trim() || undefined;
  if (description) {
    // Remove excessive whitespace
    description = description.replace(/\n{3,}/g, "\n\n").slice(0, 500);
  }

  return {
    name: product.name,
    price,
    originalPrice,
    isOnSale,
    unitPrice,
    unitPriceUnit,
    brand: product.brand || undefined,
    category: mappedCategory,
    weight,
    weightUnit,
    barcode: product.sku || undefined,
    imageUrl: product.image?.default || product.image?.cell || undefined,
    sourceUrl: `https://shop.supervalu.ie/shopping/product/${product.sku}`,
    description,
  };
}

/**
 * Scrape all products from SuperValu via their API.
 * maxPerCategory limits products per category (0 = no limit).
 */
export async function scrapeSuperValuLive(
  maxPerCategory: number = 200
): Promise<ScrapedProduct[]> {
  const allProducts: ScrapedProduct[] = [];

  for (const cat of CATEGORIES) {
    try {
      // First page — learn total count
      const firstPage = await fetchCategoryPage(cat.id, PAGE_SIZE, 0);
      const total = Math.min(firstPage.total, maxPerCategory || Infinity);

      console.log(
        `[SuperValu] ${cat.name}: ${firstPage.total} total, fetching up to ${total}`
      );

      // Process first page
      for (const item of firstPage.items) {
        allProducts.push(toScrapedProduct(item, cat.mapped));
      }

      // Fetch remaining pages
      let fetched = firstPage.items.length;
      while (fetched < total) {
        const page = await fetchCategoryPage(cat.id, PAGE_SIZE, fetched);
        if (page.items.length === 0) break;

        for (const item of page.items) {
          allProducts.push(toScrapedProduct(item, cat.mapped));
        }
        fetched += page.items.length;

        // Small delay to be respectful
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error(
        `[SuperValu] Error scraping ${cat.name}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return allProducts;
}

export async function scrapeSuperValu(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  try {
    const products = await scrapeSuperValuLive();
    if (products.length > 0) {
      console.log(
        `[SuperValu] Live scrape returned ${products.length} products`
      );
      return { products, source: "live" };
    }
    console.log("[SuperValu] Live scrape returned 0 products, using fallback");
    return { products: fallback, source: "fallback" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[SuperValu] Live scrape failed: ${msg}, using fallback`);
    return { products: fallback, source: "fallback", error: msg };
  }
}
