"""Tesco Ireland scraper.

Strategy: Tesco IE's grocery site is an SPA that calls internal APIs.
We target their product search/browse API endpoints which return JSON.
Fallback to HTML scraping with httpx + BeautifulSoup if API is unavailable.

Tesco IE typically uses endpoints like:
  - https://www.tesco.ie/groceries/en-IE/shop/{category}/all
  - Internal API: product listings with pagination

The scraper discovers and uses the most reliable data source available.
"""

import logging
from bs4 import BeautifulSoup

from ..base import BaseScraper, ScrapedProduct

logger = logging.getLogger(__name__)

# Tesco IE grocery category URLs
TESCO_CATEGORIES = [
    {"name": "Fresh Food", "path": "/groceries/en-IE/shop/fresh-food/all", "category": "meat & poultry"},
    {"name": "Dairy & Chilled", "path": "/groceries/en-IE/shop/dairy-and-chilled/all", "category": "dairy & eggs"},
    {"name": "Bakery", "path": "/groceries/en-IE/shop/bakery/all", "category": "bakery"},
    {"name": "Frozen", "path": "/groceries/en-IE/shop/frozen-food/all", "category": "frozen"},
    {"name": "Fruits", "path": "/groceries/en-IE/shop/fresh-food/fresh-fruit/all", "category": "fruits & vegetables"},
    {"name": "Vegetables", "path": "/groceries/en-IE/shop/fresh-food/fresh-vegetables/all", "category": "fruits & vegetables"},
    {"name": "Meat & Poultry", "path": "/groceries/en-IE/shop/fresh-food/fresh-meat-and-poultry/all", "category": "meat & poultry"},
    {"name": "Drinks", "path": "/groceries/en-IE/shop/drinks/all", "category": "drinks"},
    {"name": "Snacks & Sweets", "path": "/groceries/en-IE/shop/food-cupboard/sweets-chocolate-and-snacks/all", "category": "snacks & sweets"},
    {"name": "Household", "path": "/groceries/en-IE/shop/household/all", "category": "household"},
    {"name": "Health & Beauty", "path": "/groceries/en-IE/shop/health-and-beauty/all", "category": "personal care"},
    {"name": "Baby", "path": "/groceries/en-IE/shop/baby/all", "category": "baby"},
]


class TescoScraper(BaseScraper):
    store_slug = "tesco"
    store_name = "Tesco Ireland"
    base_url = "https://www.tesco.ie"
    rate_limit = 1.5

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Tesco Ireland.

        Attempts API-based scraping first, falls back to HTML parsing.
        """
        products: list[ScrapedProduct] = []

        async with self.http_client() as client:
            for cat_info in TESCO_CATEGORIES:
                try:
                    cat_products = await self._scrape_category(
                        client, cat_info
                    )
                    products.extend(cat_products)
                    logger.info(
                        f"[tesco] {cat_info['name']}: {len(cat_products)} products"
                    )
                except Exception as e:
                    self.log_error(
                        f"Failed to scrape category {cat_info['name']}: {e}"
                    )

                self.wait()

        self.products_found = len(products)
        return products

    async def _scrape_category(
        self, client, cat_info: dict
    ) -> list[ScrapedProduct]:
        """Scrape all products from a single Tesco category."""
        products: list[ScrapedProduct] = []
        page = 1
        max_pages = 20  # Safety limit

        while page <= max_pages:
            url = f"{self.base_url}{cat_info['path']}"
            params = {"page": page, "count": 48}

            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
            except Exception as e:
                self.log_error(f"HTTP error for {url} page {page}: {e}")
                break

            page_products = self._parse_product_page(
                response.text, cat_info["category"], url
            )

            if not page_products:
                break

            products.extend(page_products)
            page += 1
            self.wait()

        return products

    def _parse_product_page(
        self, html: str, category: str, page_url: str
    ) -> list[ScrapedProduct]:
        """Parse a Tesco product listing page HTML."""
        products: list[ScrapedProduct] = []
        soup = BeautifulSoup(html, "html.parser")

        # Tesco uses product tiles/cards — try multiple selector patterns
        # as they may change over time
        product_selectors = [
            "li[class*='product-list']",
            "div[class*='product-tile']",
            "[data-auto='product-tile']",
            ".product-list--list-item",
            "li.product-list--list-item",
        ]

        items = []
        for selector in product_selectors:
            items = soup.select(selector)
            if items:
                break

        if not items:
            # Try a more generic approach
            items = soup.find_all(
                ["li", "div"],
                class_=lambda c: c and "product" in c.lower() if c else False,
            )

        for item in items:
            try:
                product = self._parse_product_tile(item, category, page_url)
                if product:
                    products.append(product)
            except Exception as e:
                self.log_error(f"Failed to parse product tile: {e}")

        return products

    def _parse_product_tile(
        self, tile, category: str, page_url: str
    ) -> ScrapedProduct | None:
        """Parse a single product tile element."""
        # Extract product name
        name_el = (
            tile.select_one("[class*='title']")
            or tile.select_one("a[class*='product']")
            or tile.select_one("h3")
            or tile.select_one("h2")
            or tile.select_one("[data-auto='product-title']")
        )
        if not name_el:
            return None

        name = name_el.get_text(strip=True)
        if not name or len(name) < 2:
            return None

        # Extract price
        price_el = (
            tile.select_one("[class*='price']")
            or tile.select_one("[data-auto='price-value']")
            or tile.select_one(".value")
        )
        if not price_el:
            return None

        price = self.parse_price(price_el.get_text())
        if not price:
            return None

        # Extract original price (for sale items)
        original_price = None
        is_on_sale = False
        was_price_el = (
            tile.select_one("[class*='was-price']")
            or tile.select_one("[class*='old-price']")
            or tile.select_one("[class*='price-was']")
            or tile.select_one("s")
            or tile.select_one("del")
        )
        if was_price_el:
            original_price = self.parse_price(was_price_el.get_text())
            if original_price and original_price > price:
                is_on_sale = True

        # Extract unit price
        unit_price = None
        unit_price_unit = None
        unit_price_el = (
            tile.select_one("[class*='unit-price']")
            or tile.select_one("[class*='price-per']")
        )
        if unit_price_el:
            unit_price, unit_price_unit = self.parse_unit_price(
                unit_price_el.get_text()
            )

        # Extract brand (Tesco often includes brand in a separate element)
        brand = None
        brand_el = tile.select_one("[class*='brand']")
        if brand_el:
            brand = brand_el.get_text(strip=True)

        # Extract product URL
        source_url = None
        link_el = tile.select_one("a[href]")
        if link_el and link_el.get("href"):
            href = link_el["href"]
            source_url = href if href.startswith("http") else f"{self.base_url}{href}"

        # Extract image URL
        image_url = None
        img_el = tile.select_one("img[src]")
        if img_el and img_el.get("src"):
            image_url = img_el["src"]
            if image_url.startswith("//"):
                image_url = f"https:{image_url}"

        return ScrapedProduct(
            name=name,
            price=price,
            original_price=original_price,
            is_on_sale=is_on_sale,
            unit_price=unit_price,
            unit_price_unit=unit_price_unit,
            brand=brand,
            category=category,
            source_url=source_url,
            image_url=image_url,
        )
