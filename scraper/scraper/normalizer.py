"""Normalize product names, weights, and units for cross-store matching."""

import re


# Common words to strip for canonical matching
STRIP_WORDS = {
    "fresh", "premium", "irish", "organic", "free range", "natural",
    "quality", "finest", "selected", "value", "everyday", "own brand",
}

# Unit normalization map
UNIT_MAP = {
    "kilogram": "kg", "kilograms": "kg", "kilo": "kg",
    "gram": "g", "grams": "g", "gm": "g",
    "litre": "l", "litres": "l", "liter": "l", "liters": "l", "lt": "l",
    "millilitre": "ml", "millilitres": "ml", "milliliter": "ml",
    "pack": "units", "pcs": "units", "pieces": "units",
}


def normalize_unit(unit: str) -> str:
    """Normalize a unit string to a standard form."""
    unit = unit.lower().strip().rstrip("s")
    return UNIT_MAP.get(unit, unit)


def extract_weight(name: str) -> tuple[float | None, str | None]:
    """Extract weight and unit from a product name.

    Examples:
        'Avonmore Full Fat Milk 2L' -> (2.0, 'l')
        'Cheddar Cheese 200g' -> (200.0, 'g')
        'Eggs 12 Pack' -> (12.0, 'units')
    """
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)\b",
        r"(\d+(?:\.\d+)?)\s*(litre|liter|kilogram|gram)s?\b",
        r"(\d+)\s*(pack|pcs|pieces?)\b",
        r"(\d+)s\b",  # e.g., "80s" for teabags
    ]

    for pattern in patterns:
        match = re.search(pattern, name, re.IGNORECASE)
        if match:
            value = float(match.group(1))
            unit = normalize_unit(match.group(2)) if len(match.groups()) > 1 else "units"
            return value, unit

    return None, None


def canonical_key(name: str) -> str:
    """Generate a canonical key for fuzzy matching.

    'Avonmore Full Fat Milk 2L' -> 'avonmore-fat-milk-2l'
    'Avonmore Fresh Whole Milk 2 Litre' -> 'avonmore-whole-milk-2l'
    """
    key = name.lower()

    # Remove common filler words
    for word in STRIP_WORDS:
        key = re.sub(rf"\b{word}\b", "", key, flags=re.IGNORECASE)

    # Normalize units inline
    key = re.sub(r"(\d+)\s*litres?", r"\1l", key)
    key = re.sub(r"(\d+)\s*kilograms?", r"\1kg", key)
    key = re.sub(r"(\d+)\s*grams?", r"\1g", key)
    key = re.sub(r"(\d+)\s*millilitres?", r"\1ml", key)

    # Remove special characters, collapse spaces
    key = re.sub(r"[^\w\s-]", "", key)
    key = re.sub(r"\s+", "-", key.strip())
    key = re.sub(r"-+", "-", key)
    key = key.strip("-")

    return key
