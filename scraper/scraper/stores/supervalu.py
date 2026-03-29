"""SuperValu scraper.

Strategy: SuperValu's online shop (shop.supervalu.ie) is a JavaScript SPA.
We first attempt to discover and use their internal JSON API.
If no API is available, we fall back to Playwright for browser automation.

SuperValu typically loads products via XHR requests to their backend,
often with patterns like /api/products or GraphQL endpoints.
"""

import json
import logging
from bs4 import BeautifulSoup

from ..base import BaseScraper, ScrapedProduct

logger = logging.getLogger(__name__)

# SuperValu category structure
SUPERVALU_CATEGORIES = [
    {"name": "Fresh Meat & Poultry", "path": "/shopping/fresh-food/fresh-meat-poultry/", "category": "meat & poultry"},
    {"name": "Dairy", "path": "/shopping/dairy-eggs-chilled/", "category": "dairy & eggs"},
    {"name": "Fruit & Veg", "path": "/shopping/fresh-food/fruit-vegetables/", "category": "fruits & vegetables"},
    {"name": "Bakery", "path": "/shopping/bakery/", "category": "bakery"},
    {"name": "Frozen", "path": "/shopping/frozen/", "category": "frozen"},
    {"name": "Drinks", "path": "/shopping/drinks/", "category": "drinks"},
    {"name": "Snacks & Confectionery", "path": "/shopping/food-cupboard/biscuits-snacks-confectionery/", "category": "snacks & sweets"},
    {"name": "Household", "path": "/shopping/household/", "category": "household"},
    {"name": "Health & Beauty", "path": "/shopping/health-beauty/", "category": "personal care"},
    {"name": "Baby", "path": "/shopping/baby-toddler/", "category": "baby"},
]


class SuperValuScraper(BaseScraper):
    store_slug = "supervalu"
    store_name = "SuperValu"
    base_url = "https://shop.supervalu.ie"
    rate_limit = 2.0

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from SuperValu.

        Attempts API discovery first, then falls back to Playwright.
        """
        products: list[ScrapedProduct] = []

        # Try API-based scraping first
        api_products = await self._try_api_scrape()
        if api_products:
            return api_products

        # Fallback: Playwright browser automation
        logger.info("[supervalu] API not available, trying Playwright...")
        products = await self._playwright_scrape()

        self.products_found = len(products)
        return products

    async def _try_api_scrape(self) -> list[ScrapedProduct] | None:
        """Attempt to discover and use SuperValu's internal API."""
        products: list[ScrapedProduct] = []

        # Common API endpoint patterns for grocery SPAs
        api_patterns = [
            "/api/products",
            "/api/v1/products",
            "/api/catalog/products",
            "/_next/data",
        ]

        async with self.json_client() as client:
            # Try to discover API endpoints
            for pattern in api_patterns:
                try:
                    url = f"{self.base_url}{pattern}"
                    response = await client.get(url, params={"limit": 1})
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, dict) and (
                            "products" in data
                            or "items" in data
                            or "results" in data
                        ):
                            logger.info(
                                f"[supervalu] Found API at {pattern}"
                            )
                            products = await self._scrape_via_api(
                                client, pattern
                            )
                            if products:
                                self.products_found = len(products)
                                return products
                except Exception:
                    continue

        return None

    async def _scrape_via_api(
        self, client, api_path: str
    ) -> list[ScrapedProduct]:
        """Scrape products using discovered API endpoint."""
        products: list[ScrapedProduct] = []

        for cat_info in SUPERVALU_CATEGORIES:
            try:
                offset = 0
                limit = 48
                max_pages = 20

                while offset < limit * max_pages:
                    url = f"{self.base_url}{api_path}"
                    params = {
                        "category": cat_info["path"],
                        "offset": offset,
                        "limit": limit,
                    }
                    response = await client.get(url, params=params)
                    if response.status_code != 200:
                        break

                    data = response.json()
                    items = (
                        data.get("products")
                        or data.get("items")
                        or data.get("results")
                        or []
                    )

                    if not items:
                        break

                    for item in items:
                        try:
                            product = self._parse_api_product(
                                item, cat_info["category"]
                            )
                            if product:
                                products.append(product)
                        except Exception as e:
                            self.log_error(f"API parse error: {e}")

                    offset += limit
                    self.wait()

                logger.info(
                    f"[supervalu] {cat_info['name']}: scraped via API"
                )
            except Exception as e:
                self.log_error(
                    f"API scrape failed for {cat_info['name']}: {e}"
                )

        return products

    @staticmethod
    def _clean_doubled_measurement(name: str) -> str:
        """Remove doubled measurement suffixes from product names.

        SuperValu API sometimes returns names like:
          'Andrex Complete Clean Toilet Roll 4 Roll 10.22m² 10.22m²'
          'Heinz Baked Beans 4x415g 415g'
        """
        import re
        # Remove trailing measurement that duplicates the one before it
        cleaned = re.sub(
            r'(\d+\.?\d*\s*(?:m²|ml|g|kg|l|cl|mm|cm|m)\b)\s+\1\s*$',
            r'\1',
            name,
        )
        # Remove trailing per-item size after multipack descriptor: "4x330ml 330ml" -> "4x330ml"
        cleaned = re.sub(
            r'(\d+\s*[xX]\s*(\d+\.?\d*)\s*(ml|g|kg|l|cl))\s+\2\s*\3\s*$',
            r'\1',
            cleaned,
        )
        return cleaned

    def _parse_api_product(
        self, item: dict, category: str
    ) -> ScrapedProduct | None:
        """Parse a product from API JSON response."""
        name = item.get("name") or item.get("title") or item.get("displayName")
        if not name:
            return None
        name = self._clean_doubled_measurement(name)

        price = item.get("price") or item.get("salePrice") or item.get("currentPrice")
        if isinstance(price, str):
            price = self.parse_price(price)
        if not price or price <= 0:
            return None

        original_price = item.get("wasPrice") or item.get("originalPrice")
        if isinstance(original_price, str):
            original_price = self.parse_price(original_price)

        is_on_sale = bool(
            original_price and original_price > price
        ) or item.get("onPromotion", False)

        return ScrapedProduct(
            name=name,
            price=float(price),
            original_price=float(original_price) if original_price else None,
            is_on_sale=is_on_sale,
            unit_price=self.parse_price(str(item.get("unitPrice", ""))) if item.get("unitPrice") else None,
            unit_price_unit=item.get("unitPriceUnit"),
            brand=item.get("brand") or item.get("brandName"),
            category=category,
            barcode=item.get("ean") or item.get("barcode") or item.get("gtin"),
            image_url=item.get("image") or item.get("imageUrl"),
            source_url=item.get("url") or item.get("productUrl"),
        )

    async def _playwright_scrape(self) -> list[ScrapedProduct]:
        """Scrape products using Playwright browser automation."""
        products: list[ScrapedProduct] = []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            self.log_error("Playwright not installed. Run: playwright install chromium")
            return products

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self._get_ua(),
                    viewport={"width": 1920, "height": 1080},
                )
                page = await context.new_page()

                for cat_info in SUPERVALU_CATEGORIES:
                    try:
                        cat_products = await self._scrape_category_playwright(
                            page, cat_info
                        )
                        products.extend(cat_products)
                        logger.info(
                            f"[supervalu] {cat_info['name']}: {len(cat_products)} products (Playwright)"
                        )
                    except Exception as e:
                        self.log_error(
                            f"Playwright failed for {cat_info['name']}: {e}"
                        )
                    self.wait()

                await browser.close()
        except Exception as e:
            self.log_error(f"Playwright browser error: {e}")

        self.products_found = len(products)
        return products

    async def _scrape_category_playwright(self, page, cat_info: dict) -> list[ScrapedProduct]:
        """Scrape a single category using Playwright."""
        products: list[ScrapedProduct] = []
        url = f"{self.base_url}{cat_info['path']}"

        await page.goto(url, wait_until="networkidle", timeout=30000)

        # Scroll to load more products (infinite scroll)
        for _ in range(10):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1500)

            # Check if "Load More" button exists
            load_more = await page.query_selector(
                "button:has-text('Load More'), button:has-text('Show More'), [class*='load-more']"
            )
            if load_more:
                try:
                    await load_more.click()
                    await page.wait_for_timeout(2000)
                except Exception:
                    break
            else:
                # Check if new content loaded
                new_height = await page.evaluate("document.body.scrollHeight")
                if new_height == await page.evaluate("document.body.scrollHeight"):
                    break

        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # Find product cards
        product_cards = (
            soup.select("[class*='product-card']")
            or soup.select("[class*='product-tile']")
            or soup.select("[data-testid*='product']")
            or soup.select("article[class*='product']")
        )

        for card in product_cards:
            try:
                product = self._parse_html_product(card, cat_info["category"])
                if product:
                    products.append(product)
            except Exception as e:
                self.log_error(f"Failed to parse SuperValu product card: {e}")

        return products

    def _parse_html_product(self, card, category: str) -> ScrapedProduct | None:
        """Parse a product from HTML card element."""
        name_el = (
            card.select_one("[class*='name']")
            or card.select_one("[class*='title']")
            or card.select_one("h3")
            or card.select_one("a")
        )
        if not name_el:
            return None

        name = name_el.get_text(strip=True)
        if not name:
            return None

        price_el = (
            card.select_one("[class*='price']")
            or card.select_one("[class*='cost']")
        )
        if not price_el:
            return None

        price = self.parse_price(price_el.get_text())
        if not price:
            return None

        original_price = None
        is_on_sale = False
        was_el = card.select_one("s") or card.select_one("del") or card.select_one("[class*='was']")
        if was_el:
            original_price = self.parse_price(was_el.get_text())
            if original_price and original_price > price:
                is_on_sale = True

        source_url = None
        link = card.select_one("a[href]")
        if link:
            href = link.get("href", "")
            source_url = href if href.startswith("http") else f"{self.base_url}{href}"

        return ScrapedProduct(
            name=name,
            price=price,
            original_price=original_price,
            is_on_sale=is_on_sale,
            category=category,
            source_url=source_url,
        )

    @staticmethod
    def _get_ua() -> str:
        import random
        from ..base import USER_AGENTS
        return random.choice(USER_AGENTS)
