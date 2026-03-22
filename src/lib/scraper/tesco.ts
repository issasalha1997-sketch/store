/**
 * Tesco Ireland scraper.
 * Attempts to fetch products from Tesco.ie's grocery search.
 * Falls back to curated data if live scraping fails.
 */
import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./products";
import { fetchPage, scrapeWithFallback, type ScraperResult } from "./base";

const TESCO_BASE = "https://www.tesco.ie/groceries/en-IE";

const CATEGORIES_TO_SCRAPE = [
  { url: `${TESCO_BASE}/shop/fresh-food/all`, category: "dairy & eggs" },
  { url: `${TESCO_BASE}/shop/bakery/all`, category: "bakery" },
  { url: `${TESCO_BASE}/shop/frozen-food/all`, category: "frozen" },
  { url: `${TESCO_BASE}/shop/drinks/all`, category: "drinks" },
];

async function scrapeTescoLive(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  for (const cat of CATEGORIES_TO_SCRAPE) {
    const html = await fetchPage(cat.url);
    const $ = cheerio.load(html);

    $(".product-list--list-item").each((_i, el) => {
      const $el = $(el);
      const name = $el.find(".styled__Text-sc-1i711qa-1").text().trim();
      const priceText = $el
        .find(".styled__StyledHeading-sc-119w3hf-2")
        .text()
        .trim();
      const priceMatch = priceText.match(/€?([\d.]+)/);
      const imgSrc = $el.find("img").attr("src") || undefined;

      if (name && priceMatch) {
        products.push({
          name,
          price: parseFloat(priceMatch[1]),
          brand: "Tesco",
          category: cat.category,
          imageUrl: imgSrc,
          sourceUrl: cat.url,
        });
      }
    });

    // Alternative selector pattern (Tesco sometimes changes layout)
    if (products.length === 0) {
      $("[data-auto='product-tile']").each((_i, el) => {
        const $el = $(el);
        const name =
          $el.find("[data-auto='product-tile--title']").text().trim() ||
          $el.find("h3").text().trim();
        const priceText =
          $el.find("[data-auto='price-value']").text().trim() ||
          $el.find(".price").text().trim();
        const priceMatch = priceText.match(/€?([\d.]+)/);
        const imgSrc = $el.find("img").attr("src") || undefined;

        if (name && priceMatch) {
          products.push({
            name,
            price: parseFloat(priceMatch[1]),
            brand: "Tesco",
            category: cat.category,
            imageUrl: imgSrc,
            sourceUrl: cat.url,
          });
        }
      });
    }
  }

  return products;
}

export async function scrapeTesco(
  fallback: ScrapedProduct[]
): Promise<ScraperResult> {
  return scrapeWithFallback("Tesco", scrapeTescoLive, fallback);
}
