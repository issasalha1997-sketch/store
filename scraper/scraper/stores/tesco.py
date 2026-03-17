"""Tesco Ireland scraper using httpx + BeautifulSoup."""

from ..base import BaseScraper, ScrapedProduct


class TescoScraper(BaseScraper):
    store_slug = "tesco"
    store_name = "Tesco Ireland"
    base_url = "https://www.tesco.ie/groceries"
    rate_limit = 1.5

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Tesco Ireland.

        Tesco has a well-structured website with consistent HTML.
        Categories are listed at the top, each containing paginated product grids.

        Implementation note: This is a skeleton. The actual scraping logic
        needs to be implemented based on Tesco.ie's current HTML structure,
        which changes periodically. Run with --dry-run to test.
        """
        products: list[ScrapedProduct] = []

        # TODO: Implement actual scraping
        # 1. Fetch category listing page
        # 2. For each category, fetch paginated product pages
        # 3. Parse product cards: name, price, unit price, image, weight
        # 4. Handle sale prices (was/now pricing)

        self.products_found = len(products)
        return products
