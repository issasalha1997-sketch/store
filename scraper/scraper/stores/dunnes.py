"""Dunnes Stores scraper.

Strategy: dunnesstoresgrocery.com uses SSR with client-side hydration.
The initial HTML often contains product data embedded in JSON script tags
or rendered server-side. We try:
1. Look for embedded JSON data (__NEXT_DATA__, window.__data__, etc.)
2. Check for internal API endpoints
3. Parse server-rendered HTML with BeautifulSoup
4. Fall back to Playwright if needed
"""

import json
import logging
from bs4 import BeautifulSoup

from ..base import BaseScraper, ScrapedProduct

logger = logging.getLogger(__name__)

DUNNES_CATEGORIES = [
    {"name": "Meat & Poultry", "path": "/sm/delivery/browse/meat-poultry-fish", "category": "meat & poultry"},
    {"name": "Dairy, Eggs & Chilled", "path": "/sm/delivery/browse/dairy-eggs-chilled", "category": "dairy & eggs"},
    {"name": "Fruit & Veg", "path": "/sm/delivery/browse/fruit-vegetables", "category": "fruits & vegetables"},
    {"name": "Bakery", "path": "/sm/delivery/browse/bakery", "category": "bakery"},
    {"name": "Frozen", "path": "/sm/delivery/browse/frozen", "category": "frozen"},
    {"name": "Drinks", "path": "/sm/delivery/browse/drinks", "category": "drinks"},
    {"name": "Snacks & Confectionery", "path": "/sm/delivery/browse/snacks-confectionery", "category": "snacks & sweets"},
    {"name": "Household", "path": "/sm/delivery/browse/household", "category": "household"},
    {"name": "Health & Beauty", "path": "/sm/delivery/browse/health-beauty", "category": "personal care"},
    {"name": "Baby", "path": "/sm/delivery/browse/baby-toddler", "category": "baby"},
]


class DunnesScraper(BaseScraper):
    store_slug = "dunnes"
    store_name = "Dunnes Stores"
    base_url = "https://www.dunnesstoresgrocery.com"
    rate_limit = 2.0

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Dunnes Stores."""
        products: list[ScrapedProduct] = []

        async with self.http_client() as client:
            for cat_info in DUNNES_CATEGORIES:
                try:
                    cat_products = await self._scrape_category(
                        client, cat_info
                    )
                    products.extend(cat_products)
                    logger.info(
                        f"[dunnes] {cat_info['name']}: {len(cat_products)} products"
                    )
                except Exception as e:
                    self.log_error(
                        f"Failed to scrape {cat_info['name']}: {e}"
                    )
                self.wait()

        # If HTML scraping yielded nothing, try Playwright
        if not products:
            logger.info("[dunnes] HTML scraping found no products, trying Playwright...")
            products = await self._playwright_scrape()

        self.products_found = len(products)
        return products

    async def _scrape_category(
        self, client, cat_info: dict
    ) -> list[ScrapedProduct]:
        """Scrape a category from Dunnes."""
        products: list[ScrapedProduct] = []
        url = f"{self.base_url}{cat_info['path']}"

        try:
            response = await client.get(url)
            response.raise_for_status()
        except Exception as e:
            self.log_error(f"HTTP error for {url}: {e}")
            return products

        html = response.text

        # Strategy 1: Look for embedded JSON data
        json_products = self._extract_embedded_json(html, cat_info["category"])
        if json_products:
            return json_products

        # Strategy 2: Parse server-rendered HTML
        return self._parse_html(html, cat_info["category"], url)

    def _extract_embedded_json(
        self, html: str, category: str
    ) -> list[ScrapedProduct]:
        """Try to extract product data from embedded JSON in the page."""
        products: list[ScrapedProduct] = []
        soup = BeautifulSoup(html, "html.parser")

        # Look for __NEXT_DATA__ (Next.js apps)
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data:
            try:
                data = json.loads(next_data.string)
                return self._parse_next_data(data, category)
            except (json.JSONDecodeError, KeyError):
                pass

        # Look for other embedded data patterns
        for script in soup.find_all("script"):
            if not script.string:
                continue
            text = script.string.strip()

            # window.__data__ = {...}
            for prefix in [
                "window.__data__",
                "window.__INITIAL_STATE__",
                "window.__PRELOADED_STATE__",
            ]:
                if prefix in text:
                    try:
                        json_str = text.split(f"{prefix} = ", 1)[1]
                        # Handle trailing semicolons
                        if json_str.rstrip().endswith(";"):
                            json_str = json_str.rstrip()[:-1]
                        data = json.loads(json_str)
                        extracted = self._extract_products_from_state(
                            data, category
                        )
                        if extracted:
                            return extracted
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue

        return products

    def _parse_next_data(
        self, data: dict, category: str
    ) -> list[ScrapedProduct]:
        """Parse products from Next.js __NEXT_DATA__ JSON."""
        products: list[ScrapedProduct] = []

        # Navigate common Next.js data structures
        page_props = data.get("props", {}).get("pageProps", {})
        items = (
            page_props.get("products")
            or page_props.get("items")
            or page_props.get("initialProducts")
            or []
        )

        for item in items:
            product = self._json_to_product(item, category)
            if product:
                products.append(product)

        return products

    def _extract_products_from_state(
        self, data: dict, category: str
    ) -> list[ScrapedProduct]:
        """Extract products from a state object (generic traversal)."""
        products: list[ScrapedProduct] = []

        def find_product_arrays(obj, depth=0):
            if depth > 5:
                return
            if isinstance(obj, list) and len(obj) > 0:
                if isinstance(obj[0], dict) and (
                    "name" in obj[0] or "title" in obj[0]
                ):
                    if "price" in obj[0] or "salePrice" in obj[0]:
                        for item in obj:
                            p = self._json_to_product(item, category)
                            if p:
                                products.append(p)
                        return
            if isinstance(obj, dict):
                for val in obj.values():
                    find_product_arrays(val, depth + 1)

        find_product_arrays(data)
        return products

    def _json_to_product(
        self, item: dict, category: str
    ) -> ScrapedProduct | None:
        """Convert a JSON product object to ScrapedProduct."""
        name = (
            item.get("name")
            or item.get("title")
            or item.get("displayName")
            or item.get("productName")
        )
        if not name:
            return None

        price = (
            item.get("price")
            or item.get("salePrice")
            or item.get("currentPrice")
            or item.get("sellingPrice")
        )
        if isinstance(price, str):
            price = self.parse_price(price)
        if not price or price <= 0:
            return None

        original_price = item.get("wasPrice") or item.get("originalPrice")
        if isinstance(original_price, str):
            original_price = self.parse_price(original_price)

        is_on_sale = bool(original_price and original_price > price)

        unit_price_val = item.get("unitPrice")
        if isinstance(unit_price_val, str):
            unit_price_val = self.parse_price(unit_price_val)

        return ScrapedProduct(
            name=name,
            price=float(price),
            original_price=float(original_price) if original_price else None,
            is_on_sale=is_on_sale,
            unit_price=float(unit_price_val) if unit_price_val else None,
            unit_price_unit=item.get("unitPriceUnit") or item.get("pricePerUnit"),
            brand=item.get("brand") or item.get("brandName"),
            category=category,
            barcode=item.get("ean") or item.get("barcode") or item.get("gtin"),
            image_url=item.get("image") or item.get("imageUrl") or item.get("thumbnailUrl"),
            source_url=item.get("url") or item.get("productUrl") or item.get("slug"),
        )

    def _parse_html(
        self, html: str, category: str, page_url: str
    ) -> list[ScrapedProduct]:
        """Parse products from server-rendered HTML."""
        products: list[ScrapedProduct] = []
        soup = BeautifulSoup(html, "html.parser")

        # Try various product card selectors
        cards = (
            soup.select("[class*='product-card']")
            or soup.select("[class*='product-tile']")
            or soup.select("[data-testid*='product']")
            or soup.select("article[class*='product']")
            or soup.select("[class*='ProductCard']")
        )

        for card in cards:
            try:
                name_el = (
                    card.select_one("[class*='name']")
                    or card.select_one("[class*='title']")
                    or card.select_one("h3")
                    or card.select_one("h2")
                    or card.select_one("a")
                )
                if not name_el:
                    continue

                name = name_el.get_text(strip=True)
                if not name:
                    continue

                price_el = card.select_one("[class*='price']")
                if not price_el:
                    continue

                price = self.parse_price(price_el.get_text())
                if not price:
                    continue

                # Check for sale
                original_price = None
                is_on_sale = False
                was_el = (
                    card.select_one("s")
                    or card.select_one("del")
                    or card.select_one("[class*='was']")
                    or card.select_one("[class*='old']")
                )
                if was_el:
                    original_price = self.parse_price(was_el.get_text())
                    if original_price and original_price > price:
                        is_on_sale = True

                source_url = None
                link = card.select_one("a[href]")
                if link:
                    href = link.get("href", "")
                    source_url = (
                        href
                        if href.startswith("http")
                        else f"{self.base_url}{href}"
                    )

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
                self.log_error(f"Failed to parse Dunnes HTML product: {e}")

        return products

    async def _playwright_scrape(self) -> list[ScrapedProduct]:
        """Fallback: Scrape using Playwright browser automation."""
        products: list[ScrapedProduct] = []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            self.log_error("Playwright not installed")
            return products

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                for cat_info in DUNNES_CATEGORIES:
                    try:
                        url = f"{self.base_url}{cat_info['path']}"
                        await page.goto(url, wait_until="networkidle", timeout=30000)

                        # Scroll to load content
                        for _ in range(5):
                            await page.evaluate(
                                "window.scrollTo(0, document.body.scrollHeight)"
                            )
                            await page.wait_for_timeout(1500)

                        html = await page.content()
                        cat_products = self._parse_html(
                            html, cat_info["category"], url
                        )
                        products.extend(cat_products)
                        logger.info(
                            f"[dunnes] {cat_info['name']}: {len(cat_products)} products (Playwright)"
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
