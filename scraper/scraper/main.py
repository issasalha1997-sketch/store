"""Main entry point for the GrocerySaver price scraper."""

import argparse
import asyncio
import logging
from datetime import datetime

from .stores.tesco import TescoScraper
from .stores.supervalu import SuperValuScraper
from .stores.dunnes import DunnesScraper
from .stores.lidl import LidlScraper
from .stores.aldi import AldiScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SCRAPERS = {
    "tesco": TescoScraper,
    "supervalu": SuperValuScraper,
    "dunnes": DunnesScraper,
    "lidl": LidlScraper,
    "aldi": AldiScraper,
}


async def run_scraper(store_slug: str, dry_run: bool = False):
    """Run a single store scraper."""
    if store_slug not in SCRAPERS:
        logger.error(f"Unknown store: {store_slug}")
        return

    scraper_class = SCRAPERS[store_slug]
    scraper = scraper_class()

    logger.info(f"Starting {scraper.store_name} scraper...")
    start = datetime.now()

    try:
        products = await scraper.scrape()
        stats = scraper.get_stats()

        logger.info(
            f"Completed {scraper.store_name}: "
            f"{stats['products_found']} products found, "
            f"{stats['errors']} errors, "
            f"{stats['duration']}s duration"
        )

        if dry_run:
            logger.info("DRY RUN - not saving to database")
            for p in products[:10]:
                logger.info(f"  {p.name}: EUR {p.price:.2f}")
            if len(products) > 10:
                logger.info(f"  ... and {len(products) - 10} more")
        else:
            # TODO: Save to database using db.py
            logger.info("Saving to database...")

    except Exception as e:
        logger.error(f"Scraper failed for {store_slug}: {e}")


async def run_all(dry_run: bool = False):
    """Run all scrapers sequentially."""
    for slug in SCRAPERS:
        await run_scraper(slug, dry_run)


def main():
    parser = argparse.ArgumentParser(description="GrocerySaver Price Scraper")
    parser.add_argument(
        "--store",
        choices=list(SCRAPERS.keys()) + ["all"],
        default="all",
        help="Which store to scrape",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape but don't save to database",
    )
    args = parser.parse_args()

    if args.store == "all":
        asyncio.run(run_all(args.dry_run))
    else:
        asyncio.run(run_scraper(args.store, args.dry_run))


if __name__ == "__main__":
    main()
