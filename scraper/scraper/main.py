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
from .db import (
    get_all_products,
    find_or_create_product,
    save_prices,
    create_scrape_run,
)

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

    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Starting {scraper.store_name} scraper...")
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
            logger.info("DRY RUN — not saving to database")
            for p in products[:20]:
                sale_marker = " [SALE]" if p.is_on_sale else ""
                brand_str = f" ({p.brand})" if p.brand else ""
                logger.info(
                    f"  {p.name}{brand_str}: €{p.price:.2f}{sale_marker}"
                    f"  [{p.category or 'uncategorized'}]"
                )
            if len(products) > 20:
                logger.info(f"  ... and {len(products) - 20} more")
        else:
            # Match and save to database
            logger.info(f"Matching and saving {len(products)} products to database...")
            existing_products = get_all_products()
            logger.info(f"Loaded {len(existing_products)} existing products for matching")

            matched_products: list[tuple[str, object]] = []
            match_new = 0
            match_existing = 0

            for scraped in products:
                try:
                    product_id = find_or_create_product(
                        scraped, existing_products
                    )
                    matched_products.append((product_id, scraped))

                    # Track new vs existing
                    if len(existing_products) > 0 and existing_products[-1]["id"] == product_id:
                        match_new += 1
                    else:
                        match_existing += 1
                except Exception as e:
                    scraper.log_error(f"Failed to match/create product '{scraped.name}': {e}")

            # Save all prices in one transaction
            prices_saved = save_prices(matched_products, store_slug)

            logger.info(
                f"Saved {prices_saved} prices for {scraper.store_name} "
                f"({match_existing} matched, {match_new} new products)"
            )

            # Log the scrape run
            completed_at = datetime.now()
            duration = (completed_at - start).seconds
            create_scrape_run(
                store_slug=store_slug,
                status="completed",
                products_found=stats["products_found"],
                prices_updated=prices_saved,
                errors=stats["errors"],
                error_log=stats.get("error_log"),
                started_at=start,
                completed_at=completed_at,
                duration=duration,
            )

    except Exception as e:
        logger.error(f"Scraper failed for {store_slug}: {e}")
        completed_at = datetime.now()
        duration = (completed_at - start).seconds
        if not dry_run:
            try:
                create_scrape_run(
                    store_slug=store_slug,
                    status="failed",
                    errors=1,
                    error_log=str(e),
                    started_at=start,
                    completed_at=completed_at,
                    duration=duration,
                )
            except Exception:
                logger.error("Failed to log scrape run error to database")


async def run_all(dry_run: bool = False):
    """Run all scrapers sequentially."""
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Running all scrapers...")
    total_start = datetime.now()

    for slug in SCRAPERS:
        await run_scraper(slug, dry_run)

    total_duration = (datetime.now() - total_start).seconds
    logger.info(f"All scrapers completed in {total_duration}s")


async def run_scheduled():
    """Run scrapers on a schedule using the schedule library."""
    import schedule
    import time

    logger.info("Starting scheduled scraper...")

    # Tesco, SuperValu, Dunnes: daily at 03:00
    schedule.every().day.at("03:00").do(
        lambda: asyncio.get_event_loop().run_until_complete(
            run_scraper("tesco")
        )
    )
    schedule.every().day.at("03:30").do(
        lambda: asyncio.get_event_loop().run_until_complete(
            run_scraper("supervalu")
        )
    )
    schedule.every().day.at("04:00").do(
        lambda: asyncio.get_event_loop().run_until_complete(
            run_scraper("dunnes")
        )
    )

    # Lidl & Aldi: weekly on Thursday at 06:00 (new offers day)
    schedule.every().thursday.at("06:00").do(
        lambda: asyncio.get_event_loop().run_until_complete(
            run_scraper("lidl")
        )
    )
    schedule.every().thursday.at("06:30").do(
        lambda: asyncio.get_event_loop().run_until_complete(
            run_scraper("aldi")
        )
    )

    logger.info("Schedule configured:")
    logger.info("  Tesco:    daily at 03:00")
    logger.info("  SuperValu: daily at 03:30")
    logger.info("  Dunnes:   daily at 04:00")
    logger.info("  Lidl:     Thursday at 06:00")
    logger.info("  Aldi:     Thursday at 06:30")

    while True:
        schedule.run_pending()
        time.sleep(60)


def main():
    parser = argparse.ArgumentParser(
        description="GrocerySaver Price Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.main --store tesco --dry-run    # Test Tesco scraper
  python -m scraper.main --store all                # Scrape all stores
  python -m scraper.main --store lidl               # Scrape Lidl only
  python -m scraper.main --schedule                  # Run on schedule
        """,
    )
    parser.add_argument(
        "--store",
        choices=list(SCRAPERS.keys()) + ["all"],
        default="all",
        help="Which store to scrape (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape but don't save to database",
    )
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Run scrapers on a recurring schedule",
    )
    args = parser.parse_args()

    if args.schedule:
        asyncio.run(run_scheduled())
    elif args.store == "all":
        asyncio.run(run_all(args.dry_run))
    else:
        asyncio.run(run_scraper(args.store, args.dry_run))


if __name__ == "__main__":
    main()
