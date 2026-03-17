"""Lidl Ireland scraper - limited to weekly offers."""

from ..base import BaseScraper, ScrapedProduct


class LidlScraper(BaseScraper):
    store_slug = "lidl"
    store_name = "Lidl Ireland"
    base_url = "https://www.lidl.ie"
    rate_limit = 1.5

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from Lidl Ireland.

        Note: Lidl's website primarily shows weekly offers, not a full catalog.
        Strategy:
        - Scrape the weekly offers page for current deals
        - Supplement with a manually curated list of core staple products
          (Lidl own-brand items whose prices are relatively stable)

        This is a known limitation disclosed to users.

        Implementation note: Skeleton - requires implementation.
        """
        products: list[ScrapedProduct] = []
        self.products_found = len(products)
        return products
