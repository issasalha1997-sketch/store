/**
 * SuperValu scraper.
 * Attempts to fetch products from supervalu.ie.
 * Falls back to curated data if live scraping fails.
 */
import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./products";
import { fetchPage, scrapeWithFallback, type ScraperResult } from "./base";

const SUPERVALU_BASE = "https://shop.supervalu.ie";

const CATEGORIES_TO_SCRAPE = [
  {
    url: `${SUPERVALU_BASE}/shopping/food-cupboard/702702000`,
    category: "snacks & sweets",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/dairy-eggs-butter/702700000`,
    category: "dairy & eggs",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/meat-poultry/702701000`,
    category: "meat & poultry",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/fruit-veg/702703000`,
    category: "fruits & vegetables",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/frozen/702705000`,
    category: "frozen",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/drinks/702707000`,
    category: "drinks",
  },
  {
    url: `${SUPERVALU_BASE}/shopping/bakery/702704000`,
    category: "bakery",
  },
];

async function scrapeSupervalu(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  for (const cat of CATEGORIES_TO_SCRAPE) {
    try {
      const html = await fetchPage(cat.url);
      const $ = cheerio.load(html);

      // SuperValu product tiles
      $(
        ".ColListing, .product-list-item, [data-testid='product-tile']"
      ).each((_i, el) => {
        const $el = $(el);
        const name =
          $el.find(".ProductCardTitle, .product-title, h3, h2").text().trim();
        const priceText =
          $el
            .find(
              ".ProductCardPrice, .product-price, .price, [data-testid='price']"
            )
            .text()
            .trim();
        const priceMatch = priceText.match(/€?([\d.]+)/);
        const imgSrc = $el.find("img").attr("src") || undefined;

        if (name && priceMatch) {
          products.push({
            name,
            price: parseFloat(priceMatch[1]),
            brand: "SuperValu",
            category: cat.category,
            imageUrl: imgSrc,
            sourceUrl: cat.url,
          });
        }
      });
    } catch {
      // Continue with other categories
    }
  }

  return products;
}

export async function scrapeSuperValu(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  return scrapeWithFallback("SuperValu", scrapeSupervalu, fallback);
}
