"""Database persistence layer for the GrocerySaver scraper.

Uses psycopg2 directly since Prisma is JS-only.
Connects to the same PostgreSQL database as the Next.js app.
"""

import os
import re
import uuid
import logging
from datetime import datetime
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from .base import ScrapedProduct
from .matcher import match_product
from .normalizer import extract_weight

logger = logging.getLogger(__name__)

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


def _cuid() -> str:
    """Generate a CUID-like ID compatible with Prisma's @default(cuid())."""
    return "c" + uuid.uuid4().hex[:24]


def slugify(text: str) -> str:
    """Generate a URL-safe slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


def get_connection():
    """Get a PostgreSQL connection using DATABASE_URL from environment."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(url)


@contextmanager
def get_cursor():
    """Context manager that provides a cursor and handles commit/rollback."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─── Cached lookups ──────────────────────────────────────

_store_cache: dict[str, str] = {}
_category_cache: dict[str, str] = {}


def get_store_id(slug: str) -> str | None:
    """Look up Store.id by slug. Cached after first call."""
    if slug in _store_cache:
        return _store_cache[slug]

    with get_cursor() as cur:
        cur.execute('SELECT id FROM "Store" WHERE slug = %s', (slug,))
        row = cur.fetchone()
        if row:
            _store_cache[slug] = row["id"]
            return row["id"]
    return None


def get_categories() -> dict[str, str]:
    """Fetch all categories as {slug: id} dict. Cached."""
    if _category_cache:
        return _category_cache

    with get_cursor() as cur:
        cur.execute('SELECT id, slug, name FROM "Category"')
        for row in cur.fetchall():
            _category_cache[row["slug"]] = row["id"]
            # Also map by name for fuzzy matching
            _category_cache[row["name"].lower()] = row["id"]
    return _category_cache


# Store-specific category mapping
CATEGORY_MAP: dict[str, str] = {
    # Common category names scraped → our category slugs
    "dairy": "dairy-eggs",
    "dairy & eggs": "dairy-eggs",
    "milk": "dairy-eggs",
    "cheese": "dairy-eggs",
    "yoghurt": "dairy-eggs",
    "yogurt": "dairy-eggs",
    "eggs": "dairy-eggs",
    "butter": "dairy-eggs",
    "cream": "dairy-eggs",
    "meat": "meat-poultry",
    "meat & poultry": "meat-poultry",
    "fresh meat": "meat-poultry",
    "poultry": "meat-poultry",
    "chicken": "meat-poultry",
    "beef": "meat-poultry",
    "pork": "meat-poultry",
    "lamb": "meat-poultry",
    "fish": "meat-poultry",
    "seafood": "meat-poultry",
    "fruit": "fruits-vegetables",
    "fruits": "fruits-vegetables",
    "vegetables": "fruits-vegetables",
    "fruit & veg": "fruits-vegetables",
    "fruits & vegetables": "fruits-vegetables",
    "fresh fruit": "fruits-vegetables",
    "fresh vegetables": "fruits-vegetables",
    "salad": "fruits-vegetables",
    "bakery": "bakery",
    "bread": "bakery",
    "baked goods": "bakery",
    "cakes": "bakery",
    "drinks": "drinks",
    "beverages": "drinks",
    "soft drinks": "drinks",
    "juice": "drinks",
    "water": "drinks",
    "tea": "drinks",
    "coffee": "drinks",
    "tea & coffee": "drinks",
    "frozen": "frozen",
    "frozen food": "frozen",
    "ice cream": "frozen",
    "frozen vegetables": "frozen",
    "snacks": "snacks-sweets",
    "sweets": "snacks-sweets",
    "snacks & sweets": "snacks-sweets",
    "chocolate": "snacks-sweets",
    "crisps": "snacks-sweets",
    "biscuits": "snacks-sweets",
    "confectionery": "snacks-sweets",
    "household": "household",
    "cleaning": "household",
    "laundry": "household",
    "kitchen": "household",
    "personal care": "personal-care",
    "toiletries": "personal-care",
    "health & beauty": "personal-care",
    "baby": "baby",
    "baby care": "baby",
    "nappies": "baby",
}


def map_category(scraped_category: str | None) -> str | None:
    """Map a scraped category string to a Category ID."""
    if not scraped_category:
        return None

    categories = get_categories()
    key = scraped_category.lower().strip()

    # Direct slug match
    if key in categories:
        return categories[key]

    # Mapped name match
    mapped_slug = CATEGORY_MAP.get(key)
    if mapped_slug and mapped_slug in categories:
        return categories[mapped_slug]

    # Partial match — check if any mapping key is contained in the scraped name
    for map_key, map_slug in CATEGORY_MAP.items():
        if map_key in key and map_slug in categories:
            return categories[map_slug]

    return None


def get_all_products() -> list[dict]:
    """Fetch all products from the database for matching."""
    with get_cursor() as cur:
        cur.execute(
            'SELECT id, name, slug, barcode, brand, weight, "weightUnit" '
            'FROM "Product" WHERE "isActive" = true'
        )
        return [dict(row) for row in cur.fetchall()]


# ─── Product upsert ──────────────────────────────────────


def find_or_create_product(
    scraped: ScrapedProduct,
    existing_products: list[dict],
) -> str:
    """Match scraped product to existing, or create new. Returns product ID."""
    matched, confidence = match_product(
        scraped.name, scraped.barcode, existing_products
    )

    if matched and confidence >= 80:
        logger.debug(
            f"Matched '{scraped.name}' → '{matched['name']}' ({confidence:.0f}%)"
        )
        return matched["id"]

    # Create new product
    product_id = _cuid()
    slug = slugify(scraped.name)
    weight, weight_unit = extract_weight(scraped.name)
    if scraped.weight:
        weight = scraped.weight
    if scraped.weight_unit:
        weight_unit = scraped.weight_unit

    category_id = map_category(scraped.category)

    with get_cursor() as cur:
        # Check slug uniqueness, append random suffix if needed
        cur.execute('SELECT id FROM "Product" WHERE slug = %s', (slug,))
        if cur.fetchone():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        cur.execute(
            """
            INSERT INTO "Product" (id, name, slug, brand, barcode, weight, "weightUnit",
                                   "categoryId", "isActive", "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            """,
            (
                product_id,
                scraped.name,
                slug,
                scraped.brand,
                scraped.barcode,
                weight,
                weight_unit,
                category_id,
            ),
        )

    # Add to existing products list so future matches in this run can find it
    existing_products.append(
        {
            "id": product_id,
            "name": scraped.name,
            "slug": slug,
            "barcode": scraped.barcode,
            "brand": scraped.brand,
            "weight": weight,
            "weightUnit": weight_unit,
        }
    )

    logger.info(f"Created new product: '{scraped.name}' (slug: {slug})")
    return product_id


# ─── Price saving ─────────────────────────────────────────


def save_prices(
    products: list[tuple[str, ScrapedProduct]],
    store_slug: str,
) -> int:
    """Save scraped prices to the database.

    Args:
        products: List of (product_id, ScrapedProduct) tuples
        store_slug: The store's slug identifier

    Returns:
        Number of prices saved
    """
    store_id = get_store_id(store_slug)
    if not store_id:
        logger.error(f"Store not found: {store_slug}")
        return 0

    if not products:
        return 0

    conn = get_connection()
    try:
        cur = conn.cursor()

        # 1. Mark all existing latest prices for this store as not latest
        cur.execute(
            """
            UPDATE "Price"
            SET "isLatest" = false
            WHERE "storeId" = %s AND "isLatest" = true
            """,
            (store_id,),
        )
        old_count = cur.rowcount
        logger.info(f"Marked {old_count} old prices as not latest for {store_slug}")

        # 2. Insert new prices
        values = []
        for product_id, scraped in products:
            price_id = _cuid()
            values.append(
                (
                    price_id,
                    product_id,
                    store_id,
                    scraped.price,
                    scraped.original_price,
                    scraped.is_on_sale,
                    scraped.unit_price,
                    scraped.unit_price_unit,
                    "EUR",
                    scraped.source_url,
                    datetime.now(),
                    True,
                )
            )

        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO "Price" (id, "productId", "storeId", price, "originalPrice",
                                "isOnSale", "unitPrice", "unitPriceUnit", currency,
                                "sourceUrl", "scrapedAt", "isLatest")
            VALUES %s
            """,
            values,
            template=(
                "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            ),
        )

        conn.commit()
        logger.info(f"Saved {len(values)} prices for {store_slug}")
        return len(values)

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to save prices for {store_slug}: {e}")
        raise
    finally:
        conn.close()


# ─── Scrape run logging ──────────────────────────────────


def create_scrape_run(
    store_slug: str,
    status: str,
    products_found: int = 0,
    prices_updated: int = 0,
    errors: int = 0,
    error_log: str | None = None,
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
    duration: int | None = None,
) -> str:
    """Create a ScrapeRun record for monitoring."""
    run_id = _cuid()

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO "ScrapeRun" (id, "storeSlug", status, "productsFound",
                                     "pricesUpdated", errors, "errorLog",
                                     "startedAt", "completedAt", duration)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                run_id,
                store_slug,
                status,
                products_found,
                prices_updated,
                errors,
                error_log,
                started_at or datetime.now(),
                completed_at,
                duration,
            ),
        )

    return run_id
