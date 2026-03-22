/**
 * Aldi Ireland scraper.
 * Attempts to fetch products from aldi.ie.
 * Falls back to curated data if live scraping fails.
 */
import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./products";
import { fetchPage, scrapeWithFallback, type ScraperResult } from "./base";

const ALDI_BASE = "https://www.aldi.ie";

const CATEGORIES_TO_SCRAPE = [
  {
    url: `${ALDI_BASE}/products/fresh-meat.html`,
    category: "meat & poultry",
  },
  {
    url: `${ALDI_BASE}/products/fresh-food.html`,
    category: "dairy & eggs",
  },
  {
    url: `${ALDI_BASE}/products/fruit-and-vegetables.html`,
    category: "fruits & vegetables",
  },
  {
    url: `${ALDI_BASE}/products/bakery.html`,
    category: "bakery",
  },
  {
    url: `${ALDI_BASE}/products/frozen.html`,
    category: "frozen",
  },
  {
    url: `${ALDI_BASE}/products/drinks.html`,
    category: "drinks",
  },
  {
    url: `${ALDI_BASE}/products/food-cupboard.html`,
    category: "snacks & sweets",
  },
];

async function scrapeAldiLive(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  for (const cat of CATEGORIES_TO_SCRAPE) {
    try {
      const html = await fetchPage(cat.url);
      const $ = cheerio.load(html);

      // Aldi product tiles
      $(
        ".product-tile, .hover-item, [data-qa='product-tile']"
      ).each((_i, el) => {
        const $el = $(el);
        const name = (
          $el.find(".product-tile__name, .hover-item__title, h3").text().trim() ||
          $el.find("[data-qa='product-title']").text().trim()
        );
        const priceText = (
          $el.find(".product-tile__price, .hover-item__price, .price").text().trim()
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
            sourceUrl: link
              ? link.startsWith("http")
                ? link
                : `${ALDI_BASE}${link}`
              : cat.url,
          });
        }
      });
    } catch {
      // Continue with other categories
    }
  }

  return products;
}

export async function scrapeAldi(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  return scrapeWithFallback("Aldi", scrapeAldiLive, fallback);
}
