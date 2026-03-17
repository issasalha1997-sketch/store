"""Abstract base class for store scrapers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
import logging
import time
import random

logger = logging.getLogger(__name__)


@dataclass
class ScrapedProduct:
    """A product scraped from a store website."""
    name: str
    price: float
    original_price: float | None = None
    is_on_sale: bool = False
    unit_price: float | None = None
    unit_price_unit: str | None = None
    brand: str | None = None
    category: str | None = None
    weight: float | None = None
    weight_unit: str | None = None
    barcode: str | None = None
    image_url: str | None = None
    source_url: str | None = None


class BaseScraper(ABC):
    """Base class for all store scrapers."""

    store_slug: str
    store_name: str
    base_url: str
    rate_limit: float = 1.0  # seconds between requests

    def __init__(self):
        self.session_start = datetime.now()
        self.products_found = 0
        self.errors = 0
        self.error_log: list[str] = []

    @abstractmethod
    async def scrape(self) -> list[ScrapedProduct]:
        """Scrape all products from the store. Must be implemented by subclasses."""
        ...

    def wait(self):
        """Rate limit between requests with random jitter."""
        delay = self.rate_limit + random.uniform(0.1, 0.5)
        time.sleep(delay)

    def log_error(self, message: str):
        """Log an error and track it."""
        self.errors += 1
        self.error_log.append(f"[{datetime.now().isoformat()}] {message}")
        logger.error(f"[{self.store_slug}] {message}")

    def get_stats(self) -> dict:
        """Return scraping statistics."""
        return {
            "store_slug": self.store_slug,
            "products_found": self.products_found,
            "errors": self.errors,
            "duration": (datetime.now() - self.session_start).seconds,
            "error_log": "\n".join(self.error_log) if self.error_log else None,
        }
