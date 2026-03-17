"""Match products across different stores."""

from rapidfuzz import fuzz
from .normalizer import canonical_key


CONFIDENCE_THRESHOLD = 80  # Minimum confidence for auto-matching


def match_product(
    scraped_name: str,
    scraped_barcode: str | None,
    existing_products: list[dict],
) -> tuple[dict | None, float]:
    """Try to match a scraped product to an existing product in the database.

    Returns (matched_product, confidence_score) or (None, 0) if no match.

    Matching strategy:
    1. Exact barcode match (100% confidence)
    2. Canonical key match (95% confidence)
    3. Fuzzy name match (variable confidence)
    """
    # 1. Barcode match
    if scraped_barcode:
        for product in existing_products:
            if product.get("barcode") == scraped_barcode:
                return product, 100.0

    # 2. Canonical key match
    scraped_key = canonical_key(scraped_name)
    for product in existing_products:
        product_key = canonical_key(product["name"])
        if scraped_key == product_key:
            return product, 95.0

    # 3. Fuzzy matching
    best_match = None
    best_score = 0.0

    for product in existing_products:
        # Compare canonical keys for better fuzzy matching
        product_key = canonical_key(product["name"])
        score = fuzz.token_sort_ratio(scraped_key, product_key)

        if score > best_score:
            best_score = score
            best_match = product

    if best_match and best_score >= CONFIDENCE_THRESHOLD:
        return best_match, best_score

    return None, 0.0
