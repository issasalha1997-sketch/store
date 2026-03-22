/**
 * Base scraper utilities shared across all store scrapers.
 */
import type { ScrapedProduct } from "./products";

export interface ScraperResult {
  products: ScrapedProduct[];
  source: "live" | "fallback";
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }

  return res.text();
}

export async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "en-IE,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }

  return res.json();
}

/**
 * Wraps a live scraper with a fallback to curated data.
 * If the live scrape fails or returns no products, use fallback.
 */
export async function scrapeWithFallback(
  storeName: string,
  liveScraper: () => Promise<ScrapedProduct[]>,
  fallbackProducts: ScrapedProduct[]
): Promise<ScraperResult> {
  try {
    const products = await liveScraper();
    if (products.length > 0) {
      console.log(
        `[${storeName}] Live scrape returned ${products.length} products`
      );
      return { products, source: "live" };
    }
    console.log(
      `[${storeName}] Live scrape returned 0 products, using fallback`
    );
    return { products: fallbackProducts, source: "fallback" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[${storeName}] Live scrape failed: ${msg}, using fallback`);
    return {
      products: fallbackProducts,
      source: "fallback",
      error: msg,
    };
  }
}
