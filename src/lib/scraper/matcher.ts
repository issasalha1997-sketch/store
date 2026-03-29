/**
 * Smart product matching system.
 * Normalizes product names across stores so "Tesco Whole Milk 2L"
 * and "SuperValu Whole Milk (2 L)" become the same product.
 */

// ─── Store brand names to strip ─────────────────────────────────────
const STORE_PREFIXES = [
  "tesco",
  "dunnes",
  "dunnes stores",
  "lidl",
  "aldi",
  "supervalu",
  "super valu",
];

const STORE_BRAND_NAMES = [
  // Tesco own brands
  "tesco finest",
  "tesco everyday value",
  "tesco goodness",
  "tesco organic",
  "tesco healthy living",
  // Dunnes own brands
  "dunnes stores",
  "simply better",
  "my family favourites",
  "dunnes",
  // Lidl own brands
  "creggan", "kilkeely", "coolmore", "ombra", "newgate", "eridanous",
  "milbona", "ballyburren", "birchwood", "rowan hill", "kildevand",
  "solevita", "bellarom", "freeway", "trattoria alfredo", "gelatelli",
  "snaktastic", "w5", "formil", "silvercrest", "cien", "deluxe",
  "meadow fresh", "mcennedy", "vitafit", "perlenbacher",
  // Aldi own brands
  "castlefarm", "greenvale", "clonbawn", "cucina", "the pantry",
  "brooklea", "ashdale", "nature's glen", "village bakery", "aqua falls",
  "nature's pick", "alcafé", "alcafe", "summit", "ocean trader", "carlos",
  "four seasons", "grandessa", "dairyfine", "moser roth", "snackrite",
  "belmont", "saxon", "almat", "lacura", "mamia", "specially selected",
  "everyday essentials", "the fishmonger", "the butcher's selection",
  // SuperValu own brands
  "supervalu signature tastes",
  "signature tastes",
  "supervalu",
];

// Sort by length descending so longer prefixes match first
const ALL_PREFIXES = [...STORE_BRAND_NAMES, ...STORE_PREFIXES]
  .sort((a, b) => b.length - a.length);

// ─── Size/weight normalization ──────────────────────────────────────

/** Normalize weight to a standard form: grams for g/kg, ml for ml/l/cl */
function normalizeWeight(weight: number | undefined, unit: string | undefined): string {
  if (!weight || !unit) return "";
  const u = unit.toLowerCase().replace(/\s/g, "");

  // Weight
  if (u === "kg") return `${Math.round(weight * 1000)}g`;
  if (u === "g") return `${Math.round(weight)}g`;
  // Volume
  if (u === "l" || u === "ltr" || u === "litre" || u === "litres" || u === "liter" || u === "liters") {
    return `${Math.round(weight * 1000)}ml`;
  }
  if (u === "cl") return `${Math.round(weight * 10)}ml`;
  if (u === "ml") return `${Math.round(weight)}ml`;
  // Count
  if (u === "units" || u === "pack" || u === "pk" || u === "pcs" || u === "pce" || u === "each" || u === "ea" || u === "s") {
    return weight === 1 ? "" : `${Math.round(weight)}pk`;
  }
  return `${weight}${u}`;
}

/** Extract weight info from a product name.
 *  Returns the LAST matched weight as the canonical one,
 *  and strips ALL weight/size patterns from the name.
 */
function extractWeightFromName(name: string): { cleanName: string; weightStr: string } {
  let cleanName = name;
  let weightStr = "";

  // Match patterns like: (227 g), 2L, 500g, 1.5kg, 6 Pack, 10pk, 200 ml, 1 Litre, 2.75litre, 3Ltr
  const patterns = [
    /\((\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|pk|pack|pce|pcs|ea|each)\)/gi,
    /\b(\d+(?:\.\d+)?)\s*(litre|liter|litres|liters|ltr)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/gi,
    /\b(\d+)\s*(pack|pk)\b/gi,
    /\b(\d+)\s*(piece|pieces|pce|pcs|each|ea|s)\b/gi,
  ];

  for (const pat of patterns) {
    let match;
    while ((match = pat.exec(cleanName)) !== null) {
      const weight = parseFloat(match[1]);
      let unit = match[2].toLowerCase();
      // Normalize "litre" → "l", "ltr" → "l"
      if (unit.startsWith("litre") || unit.startsWith("liter") || unit === "ltr") unit = "l";
      if (unit === "piece" || unit === "pieces") unit = "each";
      const normalized = normalizeWeight(weight, unit);
      if (normalized) weightStr = normalized; // keep the last (most specific) one
    }
    // Reset regex lastIndex
    pat.lastIndex = 0;
    // Remove ALL matches of this pattern from the name
    cleanName = cleanName.replace(pat, "").trim();
  }

  return { cleanName, weightStr };
}

// ─── Name normalization helpers ─────────────────────────────────────

/** Normalize common product name variations across Irish stores */
function normalizeProductVariations(name: string): string {
  let n = name;

  // Normalize common synonyms and spelling variations
  n = n
    // Dairy
    .replace(/\bfree\s*range\b/gi, "Free Range")
    .replace(/\blow\s*fat\b/gi, "Low Fat")
    .replace(/\bhalf\s*fat\b/gi, "Low Fat")
    .replace(/\bsemi[\s-]*skimmed?\b/gi, "Low Fat")
    .replace(/\bskimmed?\s*milk\b/gi, "Skim Milk")
    .replace(/\bfull[\s-]*fat\b/gi, "Whole")
    .replace(/\bwhole\s*milk\b/gi, "Whole Milk")
    .replace(/\bfresh\s*milk\b/gi, "Whole Milk")
    .replace(/\bunsalted\s*butter\b/gi, "Unsalted Butter")
    .replace(/\bsalted\s*butter\b/gi, "Salted Butter")
    .replace(/\bspread(?:able)?\s*butter\b/gi, "Spreadable Butter")
    .replace(/\bcheddar\s*cheese\b/gi, "Cheddar")
    .replace(/\bmature\s*cheddar\b/gi, "Mature Cheddar")
    .replace(/\bmild\s*cheddar\b/gi, "Mild Cheddar")
    .replace(/\bnatural\s*yoghurt\b/gi, "Natural Yogurt")
    .replace(/\byoghurt\b/gi, "Yogurt")
    // Bread
    .replace(/\bwhole\s*meal\b/gi, "Wholemeal")
    .replace(/\bwholewheat\b/gi, "Wholemeal")
    .replace(/\bsliced\s*pan\b/gi, "Sliced Pan")
    .replace(/\bwhite\s*(?:sliced\s*)?bread\b/gi, "White Sliced Pan")
    .replace(/\bbrown\s*(?:sliced\s*)?bread\b/gi, "Wholemeal Sliced Pan")
    .replace(/\bsourdough\s*bread\b/gi, "Sourdough")
    .replace(/\bwrap(?:s)?\b/gi, "Wraps")
    .replace(/\btortilla(?:s)?\b/gi, "Wraps")
    // Meat
    .replace(/\bchicken\s*breast\s*fillets?\b/gi, "Chicken Fillets")
    .replace(/\bchicken\s*fillets?\b/gi, "Chicken Fillets")
    .replace(/\bbeef\s*(?:round\s*)?steak\s*mince\b/gi, "Beef Mince")
    .replace(/\bround\s*steak\s*mince\b/gi, "Beef Mince")
    .replace(/\bbeef\s*mince\s*(?:steak)?\b/gi, "Beef Mince")
    .replace(/\bbeef\s+beef\b/gi, "Beef")
    .replace(/\bstreaky\s*bacon\s*rashers?\b/gi, "Streaky Bacon")
    .replace(/\bback\s*bacon\s*rashers?\b/gi, "Back Bacon")
    .replace(/\bbacon\s*rashers?\b/gi, "Back Bacon")
    .replace(/\bpork\s*sausages?\b/gi, "Pork Sausages")
    .replace(/\bsausages?\b/gi, "Sausages")
    .replace(/\bminced?\s*beef\b/gi, "Beef Mince")
    // Produce
    .replace(/\brooster\s+potatoes?\b/gi, "Rooster Potatoes")
    .replace(/\bbaby\s+potatoes?\b/gi, "Baby Potatoes")
    .replace(/\bbananas?\b/gi, "Bananas")
    .replace(/\bbroccoli\s*(?:head|crown)?\b/gi, "Broccoli")
    .replace(/\biceberg\s*lettuce\b/gi, "Iceberg Lettuce")
    .replace(/\bcherry\s*tomatoes?\b/gi, "Cherry Tomatoes")
    .replace(/\bred\s*onions?\b/gi, "Red Onions")
    .replace(/\bwhite\s*onions?\b/gi, "White Onions")
    .replace(/\bbrown\s*onions?\b/gi, "Brown Onions")
    // Drinks
    .replace(/\bcoca[\s-]*cola\b/gi, "Coca-Cola")
    .replace(/\borange\s*juice\b/gi, "Orange Juice")
    .replace(/\bmineral\s*water\b/gi, "Still Water")
    .replace(/\bspring\s*water\b/gi, "Still Water")
    .replace(/\bstill\s*water\b/gi, "Still Water")
    .replace(/\bsparkling\s*water\b/gi, "Sparkling Water")
    // Household
    .replace(/\btoilet\s*(?:tissue|roll|paper)s?\b/gi, "Toilet Roll")
    .replace(/\bkitchen\s*(?:towel|roll|paper)s?\b/gi, "Kitchen Roll")
    .replace(/\bbin\s*(?:bag|liner)s?\b/gi, "Bin Bags")
    .replace(/\bwashing\s*(?:up\s*)?liquid\b/gi, "Washing Up Liquid")
    .replace(/\bdishwash(?:er|ing)?\s*tablets?\b/gi, "Dishwasher Tablets")
    .replace(/\blaundry\s*(?:detergent|liquid|capsules?)\b/gi, "Laundry Detergent")
    .replace(/\bfabric\s*(?:conditioner|softener)\b/gi, "Fabric Conditioner")
    // Spelling normalization
    .replace(/\bbeanz\b/gi, "Beans");

  // Remove filler words that differ between stores
  n = n
    .replace(/\b(?:premium|finest|selected?|quality|value|essential)\b/gi, "")
    .replace(/\b(?:ireland|irish|from\s+ireland)\b/gi, "")
    .replace(/\b(?:approx\.?|approximately)\b/gi, "")
    // Strip baby food age markers: "6+ Months", "7 Months+", etc.
    .replace(/\b\d+\+?\s*months?\+?\b/gi, "")
    // Strip "in tomato sauce", "in brine", etc. — stores add these inconsistently
    .replace(/\bin\s+(?:tomato\s+sauce|brine|water|oil|juice|syrup|gravy|jelly)\b/gi, "");

  // Strip store-specific container/descriptor suffixes from the END of the name
  // These are words stores append differently (e.g. "Coca-Cola Zero Sugar Bottle" vs "Coca-Cola Zero Sugar Soft Drink")
  // Applied repeatedly to peel off multiple trailing filler words
  let prev = "";
  while (prev !== n) {
    prev = n;
    n = n.replace(/\s+(?:bottle|bottles|can|cans|carton|pouch|tub|pot|jar|tin|bag|sachet|sachets|tube|box|soft\s+drink|soft\s+drinks|drink|beverage|bars?|original|classic|regular|standard|multipack|multi\s+pack|family\s+pack|value\s+pack|sharing|share|ready\s+to\s+eat|ready\s+to\s+drink|ready\s+meal|prepared|pre-packed|portion|portions|serving|servings|slices?|pieces?)\s*$/gi, "");
  }

  return n;
}

// ─── Core normalization ─────────────────────────────────────────────

/**
 * Produce a canonical product name for cross-store matching.
 * Steps:
 * 1. Strip store/brand prefixes
 * 2. Normalize product name variations
 * 3. Extract and normalize weight/size
 * 4. Clean up and standardize
 */
export function canonicalProductName(
  name: string,
  weight?: number,
  weightUnit?: string
): string {
  let n = name.trim();

  // Strip store/brand prefixes (case-insensitive)
  for (const prefix of ALL_PREFIXES) {
    const re = new RegExp(`^${escapeRegex(prefix)}[\\s\\-]*`, "i");
    if (re.test(n)) {
      n = n.replace(re, "");
      break;
    }
  }

  // Strip common filler prefixes that differ between stores
  const FILLER_PREFIXES = [
    /^fresh\s+irish\s+/i,
    /^irish\s+/i,
    /^fresh\s+/i,
    /^organic\s+/i,
    /^100%\s+/i,
  ];
  for (const re of FILLER_PREFIXES) {
    if (re.test(n)) {
      n = n.replace(re, "");
    }
  }

  // Normalize common product name variations
  n = normalizeProductVariations(n);

  // Extract weight from the name
  const { cleanName, weightStr: nameWeight } = extractWeightFromName(n);

  // Prefer explicit weight params over name-extracted weight
  const finalWeight = (weight && weightUnit)
    ? normalizeWeight(weight, weightUnit)
    : nameWeight;

  // Clean up the name
  let clean = cleanName
    .replace(/\s+/g, " ")       // collapse whitespace
    .replace(/[()]/g, "")       // remove parentheses
    .replace(/,\s*$/, "")       // trailing commas
    .replace(/\s*-\s*$/, "")    // trailing dashes
    .replace(/\s*[|/]\s*/g, " ") // replace | and / with space
    .trim();

  // Remove any remaining leading/trailing punctuation
  clean = clean.replace(/^[,\-\s]+|[,\-\s]+$/g, "").trim();

  // Title case
  clean = clean
    .split(" ")
    .filter(w => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  // Append weight if we have it
  if (finalWeight) {
    clean = `${clean} ${finalWeight}`;
  }

  return clean;
}

/**
 * Generate a slug for matching products across stores.
 * This is the key for deduplication.
 */
export function productMatchSlug(
  name: string,
  weight?: number,
  weightUnit?: string
): string {
  const canonical = canonicalProductName(name, weight, weightUnit);
  return canonical
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a family slug — the product name WITHOUT weight/size.
 * Used to group different sizes of the same product across stores.
 * e.g. "Whole Milk 2000ml" and "Whole Milk 1000ml" → "whole-milk"
 */
export function productFamilySlug(
  name: string,
  weight?: number,
  weightUnit?: string
): string {
  // Get canonical name but strip the weight part
  let n = name.trim();

  // Strip store/brand prefixes
  for (const prefix of ALL_PREFIXES) {
    const re = new RegExp(`^${escapeRegex(prefix)}[\\s\\-]*`, "i");
    if (re.test(n)) {
      n = n.replace(re, "");
      break;
    }
  }

  // Strip filler prefixes
  const FILLER_PREFIXES = [
    /^fresh\s+irish\s+/i,
    /^irish\s+/i,
    /^fresh\s+/i,
    /^organic\s+/i,
    /^100%\s+/i,
  ];
  for (const re of FILLER_PREFIXES) {
    if (re.test(n)) {
      n = n.replace(re, "");
    }
  }

  // Normalize product name variations
  n = normalizeProductVariations(n);

  // Strip ALL weight/size patterns from name
  const { cleanName } = extractWeightFromName(n);

  // Clean up
  let clean = cleanName
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/,\s*$/, "")
    .replace(/\s*-\s*$/, "")
    .replace(/\s*[|/]\s*/g, " ")
    .trim();

  // Remove filler words
  clean = clean
    .replace(/\b(?:premium|finest|selected?|quality|value|essential)\b/gi, "")
    .replace(/\b(?:ireland|irish|from\s+ireland)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip store-specific container/descriptor suffixes from the END of the name
  // These are words stores append differently (e.g. "Coca-Cola Zero Sugar Bottle" vs "Coca-Cola Zero Sugar Soft Drink")
  // Applied repeatedly to peel off multiple trailing filler words
  let prev = "";
  while (prev !== clean) {
    prev = clean;
    clean = clean.replace(/\s+(?:bottle|bottles|can|cans|carton|pouch|tub|pot|jar|tin|bag|sachet|sachets|tube|box|soft\s+drink|soft\s+drinks|drink|beverage|bars?|original|classic|regular|standard|multipack|multi\s+pack|family\s+pack|value\s+pack|sharing|share|ready\s+to\s+eat|ready\s+to\s+drink|ready\s+meal|prepared|pre-packed|portion|portions|serving|servings|slices?|pieces?)\s*$/gi, "");
  }
  clean = clean.trim();

  // Normalize & to "and" before slugging so "Salt & Vinegar" matches "Salt And Vinegar"
  clean = clean.replace(/\s*&\s*/g, " and ");

  // To slug — then strip connector words so "Tomato and Basil" = "Tomato Basil"
  // Stores use these inconsistently: "Salt & Vinegar" vs "Salt and Vinegar" vs "Salt Vinegar"
  return clean
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-(?:and|with|in|of|the|for|a|an|by|on|to|from|de|au|la|le|al)-/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Re-export legacy functions for backward compat ─────────────────

/** @deprecated Use canonicalProductName instead */
export function normalizeProductName(name: string): string {
  return canonicalProductName(name);
}

/** @deprecated Use productMatchSlug instead */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
