/**
 * Lidl Ireland scraper.
 * Attempts to fetch products from lidl.ie (weekly offers).
 * Falls back to curated data if live scraping fails.
 */
import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./products";
import { fetchPage, scrapeWithFallback, type ScraperResult } from "./base";

const LIDL_BASE = "https://www.lidl.ie";

const CATEGORIES_TO_SCRAPE = [
  {
    url: `${LIDL_BASE}/c/food/s10007530`,
    category: "snacks & sweets",
  },
  {
    url: `${LIDL_BASE}/c/fruit-and-vegetables/s10007531`,
    category: "fruits & vegetables",
  },
  {
    url: `${LIDL_BASE}/c/bakery/s10007534`,
    category: "bakery",
  },
  {
    url: `${LIDL_BASE}/c/chilled-food/s10007533`,
    category: "dairy & eggs",
  },
  {
    url: `${LIDL_BASE}/c/frozen-food/s10007535`,
    category: "frozen",
  },
  {
    url: `${LIDL_BASE}/c/drinks/s10007536`,
    category: "drinks",
  },
];

async function scrapeLidlLive(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  for (const cat of CATEGORIES_TO_SCRAPE) {
    try {
      const html = await fetchPage(cat.url);
      const $ = cheerio.load(html);

      // Lidl product grid items
      $(
        ".product-grid-box, .AProductGridbox, [data-grid-box]"
      ).each((_i, el) => {
        const $el = $(el);
        const name = (
          $el.find(".product-grid-box__title, .AProductGridbox__title, h3").text().trim() ||
          $el.find("[data-grid-box-title]").text().trim()
        );
        const priceText = (
          $el.find(".m-price__price, .pricebox__price, .price").text().trim() ||
          $el.find("[data-price]").attr("data-price") ||
          ""
        );
        const priceMatch = priceText.match(/€?([\d.]+)/);
        const imgSrc =
          $el.find("img").attr("src") ||
          $el.find("img").attr("data-src") ||
          undefined;
        const link = $el.find("a").attr("href") || undefined;

        if (name && priceMatch) {
          products.push({
            name,
            price: parseFloat(priceMatch[1]),
            category: cat.category,
            imageUrl: imgSrc,
            sourceUrl: link ? `${LIDL_BASE}${link}` : cat.url,
          });
        }
      });
    } catch {
      // Continue with other categories
    }
  }

  return products;
}

export async function scrapeLidl(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  return scrapeWithFallback("Lidl", scrapeLidlLive, fallback);
}
