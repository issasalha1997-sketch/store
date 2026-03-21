"""Aldi Ireland scraper — hybrid approach.

Similar to Lidl, Aldi doesn't have a full online grocery catalog.
Their website shows weekly specials ("Super 6", "Fresh Deals").

Strategy:
1. Scrape weekly specials from aldi.ie
2. Load curated staple prices from CSV
3. Merge both sources
"""

import csv
import os
import logging
from bs4 import BeautifulSoup

from ..base import BaseScraper, ScrapedProduct

logger = logging.getLogger(__name__)

STAPLES_CSV = os.path.join(
    os.path.dirname(__file__), "..", "data", "aldi_staples.csv"
)

# Aldi weekly offers / special buys pages
ALDI_OFFERS_URLS = [
    "/en-GB/super-6",
    "/en-GB/weekly-offers",
    "/en-GB/fresh-meat-offers",
]


class AldiScraper(BaseScraper):
    store_slug = "aldi"
    store_name = "Aldi Ireland"
    base_url = "https://www.aldi.ie"
    rate_limit = 1.5

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape Aldi: weekly specials + curated staples."""
        products: list[ScrapedProduct] = []

        # 1. Scrape weekly offers
        offers = await self._scrape_offers()
        products.extend(offers)
        logger.info(f"[aldi] Weekly offers: {len(offers)} products")

        # 2. Load staple prices from CSV
        staples = self._load_staples()
        products.extend(staples)
        logger.info(f"[aldi] Curated staples: {len(staples)} products")

        self.products_found = len(products)
        return products

    async def _scrape_offers(self) -> list[ScrapedProduct]:
        """Scrape Aldi's weekly offers and Super 6 pages."""
        products: list[ScrapedProduct] = []

        async with self.http_client() as client:
            for url_path in ALDI_OFFERS_URLS:
                try:
                    url = f"{self.base_url}{url_path}"
                    response = await client.get(url)

                    if response.status_code != 200:
                        # Try alternate URL patterns
                        alt_paths = [
                            url_path.replace("/en-GB/", "/en-IE/"),
                            url_path.replace("/en-GB/", "/"),
                        ]
                        for alt in alt_paths:
                            try:
                                alt_url = f"{self.base_url}{alt}"
                                response = await client.get(alt_url)
                                if response.status_code == 200:
                                    url = alt_url
                                    break
                            except Exception:
                                continue

                    if response.status_code == 200:
                        page_products = self._parse_offers_page(
                            response.text, url
                        )
                        products.extend(page_products)
                except Exception as e:
                    self.log_error(f"Failed to scrape Aldi offers at {url_path}: {e}")

                self.wait()

        return products

    def _parse_offers_page(
        self, html: str, page_url: str
    ) -> list[ScrapedProduct]:
        """Parse an Aldi offers page."""
        products: list[ScrapedProduct] = []
        soup = BeautifulSoup(html, "html.parser")

        # Aldi uses product tiles in their offers pages
        cards = (
            soup.select("[class*='product']")
            or soup.select("[class*='offer']")
            or soup.select("[class*='tile']")
            or soup.select("article")
        )

        for card in cards:
            try:
                name_el = (
                    card.select_one("[class*='name']")
                    or card.select_one("[class*='title']")
                    or card.select_one("h3")
                    or card.select_one("h2")
                    or card.select_one("a[class*='product']")
                )
                if not name_el:
                    continue

                name = name_el.get_text(strip=True)
                if not name or len(name) < 3:
                    continue

                price_el = (
                    card.select_one("[class*='price']")
                    or card.select_one("[class*='cost']")
                )
                if not price_el:
                    continue

                price = self.parse_price(price_el.get_text())
                if not price:
                    continue

                # Sale detection
                original_price = None
                is_on_sale = False
                was_el = (
                    card.select_one("[class*='was']")
                    or card.select_one("[class*='old']")
                    or card.select_one("s")
                    or card.select_one("del")
                )
                if was_el:
                    original_price = self.parse_price(was_el.get_text())
                    if original_price and original_price > price:
                        is_on_sale = True

                # Product URL
                source_url = None
                link = card.select_one("a[href]")
                if link:
                    href = link.get("href", "")
                    source_url = (
                        href
                        if href.startswith("http")
                        else f"{self.base_url}{href}"
                    )

                category = self._guess_category(name)

                products.append(
                    ScrapedProduct(
                        name=name,
                        price=price,
                        original_price=original_price,
                        is_on_sale=is_on_sale,
                        category=category,
                        source_url=source_url,
                    )
                )
            except Exception as e:
                self.log_error(f"Failed to parse Aldi offer card: {e}")

        return products

    def _load_staples(self) -> list[ScrapedProduct]:
        """Load curated staple prices from CSV."""
        products: list[ScrapedProduct] = []

        if not os.path.exists(STAPLES_CSV):
            logger.warning(f"[aldi] Staples CSV not found: {STAPLES_CSV}")
            return products

        with open(STAPLES_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    price = float(row["price"])
                    weight = float(row["weight"]) if row.get("weight") else None

                    products.append(
                        ScrapedProduct(
                            name=row["name"],
                            price=price,
                            brand=row.get("brand") or None,
                            category=row.get("category") or None,
                            weight=weight,
                            weight_unit=row.get("weight_unit") or None,
                            barcode=row.get("barcode") or None,
                            source_url=None,
                        )
                    )
                except (ValueError, KeyError) as e:
                    self.log_error(f"Invalid CSV row: {row} — {e}")

        return products

    @staticmethod
    def _guess_category(name: str) -> str:
        """Guess category from product name keywords."""
        name_lower = name.lower()
        if any(w in name_lower for w in ["milk", "cheese", "yoghurt", "butter", "cream", "egg"]):
            return "dairy & eggs"
        if any(w in name_lower for w in ["chicken", "beef", "pork", "lamb", "meat", "sausage", "bacon", "mince"]):
            return "meat & poultry"
        if any(w in name_lower for w in ["apple", "banana", "orange", "potato", "onion", "tomato", "lettuce", "carrot"]):
            return "fruits & vegetables"
        if any(w in name_lower for w in ["bread", "roll", "croissant", "baguette"]):
            return "bakery"
        if any(w in name_lower for w in ["cola", "juice", "water", "tea", "coffee", "drink"]):
            return "drinks"
        if any(w in name_lower for w in ["frozen", "ice cream", "pizza"]):
            return "frozen"
        if any(w in name_lower for w in ["chocolate", "crisps", "biscuit", "sweet"]):
            return "snacks & sweets"
        return "household"
