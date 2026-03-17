"""Aldi Ireland scraper - limited to weekly specials."""

from ..base import BaseScraper, ScrapedProduct


class AldiScraper(BaseScraper):
    store_slug = "aldi"
    store_name = "Aldi Ireland"
    base_url = "https://www.aldi.ie"
    rate_limit = 1.5

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Aldi Ireland.

        Similar to Lidl - limited online catalog focused on weekly specials.
        Same hybrid strategy: scrape specials + curate staples.

        Implementation note: Skeleton - requires implementation.
        """
        products: list[ScrapedProduct] = []
        self.products_found = len(products)
        return products
