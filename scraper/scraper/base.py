"""Abstract base class for store scrapers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from contextlib import asynccontextmanager
import logging
import time
import random
import re

import httpx

logger = logging.getLogger(__name__)

# Realistic browser user agents (rotated)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
]


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
        delay = self.rate_limit + random.uniform(0.2, 0.8)
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

    @asynccontextmanager
    async def http_client(self):
        """Provide a configured httpx.AsyncClient with retry logic."""
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IE,en-GB;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
        }
        transport = httpx.AsyncHTTPTransport(retries=3)
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(30.0, connect=10.0),
            transport=transport,
            follow_redirects=True,
        ) as client:
            yield client

    @asynccontextmanager
    async def json_client(self):
        """Provide a configured httpx.AsyncClient for JSON API calls."""
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json",
            "Accept-Language": "en-IE,en-GB;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
        }
        transport = httpx.AsyncHTTPTransport(retries=3)
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(30.0, connect=10.0),
            transport=transport,
            follow_redirects=True,
        ) as client:
            yield client

    @staticmethod
    def parse_price(text: str) -> float | None:
        """Extract a float price from text like '€3.49', '3,49', '$12.99'."""
        if not text:
            return None
        # Remove currency symbols and whitespace
        cleaned = re.sub(r"[€$£\s]", "", text.strip())
        # Handle comma as decimal separator (European format)
        if "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        # Handle thousand separators: 1,234.56 or 1.234,56
        elif "," in cleaned and "." in cleaned:
            if cleaned.index(",") < cleaned.index("."):
                cleaned = cleaned.replace(",", "")  # 1,234.56
            else:
                cleaned = cleaned.replace(".", "").replace(",", ".")  # 1.234,56
        try:
            price = float(cleaned)
            return price if price > 0 else None
        except ValueError:
            return None

    @staticmethod
    def parse_unit_price(text: str) -> tuple[float | None, str | None]:
        """Parse unit price text like '€2.50/kg' or '€1.25 per litre'."""
        if not text:
            return None, None

        match = re.search(
            r"[€$£]?\s*([\d.,]+)\s*(?:per|/)\s*(kg|g|l|ml|litre|liter|100g|100ml|each|unit)",
            text,
            re.IGNORECASE,
        )
        if match:
            price = BaseScraper.parse_price(match.group(1))
            unit = match.group(2).lower()
            # Normalize unit
            unit_map = {
                "litre": "l", "liter": "l",
                "each": "unit", "100g": "100g", "100ml": "100ml",
            }
            unit = unit_map.get(unit, unit)
            return price, unit

        return None, None
