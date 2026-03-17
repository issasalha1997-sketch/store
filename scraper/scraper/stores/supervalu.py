"""SuperValu scraper using Playwright (JS-rendered pages)."""

from ..base import BaseScraper, ScrapedProduct


class SuperValuScraper(BaseScraper):
    store_slug = "supervalu"
    store_name = "SuperValu"
    base_url = "https://shop.supervalu.ie"
    rate_limit = 2.0

    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape products from SuperValu.

        SuperValu uses JavaScript-rendered pages, requiring Playwright.
        Products load dynamically with scroll pagination.

        Implementation note: Skeleton - requires Playwright setup.
        """
        products: list[ScrapedProduct] = []
        self.products_found = len(products)
        return products
