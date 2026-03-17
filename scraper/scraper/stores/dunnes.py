"""Dunnes Stores scraper using Playwright."""

from ..base import BaseScraper, ScrapedProduct


class DunnesScraper(BaseScraper):
    store_slug = "dunnes"
    store_name = "Dunnes Stores"
    base_url = "https://www.dunnesstoresgrocery.com"
    rate_limit = 2.0

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Dunnes Stores.

        Dunnes has an online grocery site with a mix of SSR and client-rendered content.
        Requires Playwright for full page rendering.

        Implementation note: Skeleton - requires Playwright setup.
        """
        products: list[ScrapedProduct] = []
        self.products_found = len(products)
        return products
