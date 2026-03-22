/**
 * Dunnes Stores scraper.
 * Attempts to fetch products from dunnesstores.com.
 * Falls back to curated data if live scraping fails.
 */
import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./products";
import { fetchPage, scrapeWithFallback, type ScraperResult } from "./base";

const DUNNES_BASE = "https://www.dunnesstores.com";

const CATEGORIES_TO_SCRAPE = [
  { url: `${DUNNES_BASE}/c/food-cupboard`, category: "snacks & sweets" },
  { url: `${DUNNES_BASE}/c/dairy-eggs-and-chilled`, category: "dairy & eggs" },
  { url: `${DUNNES_BASE}/c/fresh-meat-and-poultry`, category: "meat & poultry" },
  { url: `${DUNNES_BASE}/c/fruit-and-vegetables`, category: "fruits & vegetables" },
  { url: `${DUNNES_BASE}/c/frozen`, category: "frozen" },
  { url: `${DUNNES_BASE}/c/drinks`, category: "drinks" },
  { url: `${DUNNES_BASE}/c/bakery`, category: "bakery" },
];

async function scrapeDunnesLive(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  for (const cat of CATEGORIES_TO_SCRAPE) {
    try {
      const html = await fetchPage(cat.url);
      const $ = cheerio.load(html);

      // Dunnes product tiles
      $(".ProductCard, .product-card, [data-testid='product-card']").each(
        (_i, el) => {
          const $el = $(el);
          const name =
            $el.find(".ProductCard__title, .product-card__title, h3").text().trim();
          const priceText =
            $el.find(".ProductCard__price, .product-card__price, .price").text().trim();
          const priceMatch = priceText.match(/€?([\d.]+)/);
          const imgSrc = $el.find("img").attr("src") || undefined;
          const link = $el.find("a").attr("href") || undefined;

          if (name && priceMatch) {
            products.push({
              name,
              price: parseFloat(priceMatch[1]),
              brand: "Dunnes",
              category: cat.category,
              imageUrl: imgSrc,
              sourceUrl: link ? `${DUNNES_BASE}${link}` : cat.url,
            });
          }
        }
      );
    } catch {
      // Continue with other categories
    }
  }

  return products;
}

export async function scrapeDunnes(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  return scrapeWithFallback("Dunnes", scrapeDunnesLive, fallback);
}
