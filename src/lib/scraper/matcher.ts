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
  // Dunnes own brands
  "dunnes stores",
  "simply better",
  "my family favourites",
  // Lidl own brands
  "creggan", "kilkeely", "coolmore", "ombra", "newgate", "eridanous",
  "milbona", "ballyburren", "birchwood", "rowan hill", "kildevand",
  "solevita", "bellarom", "freeway", "trattoria alfredo", "gelatelli",
  "snaktastic", "w5", "formil", "silvercrest", "cien",
  // Aldi own brands
  "castlefarm", "greenvale", "clonbawn", "cucina", "the pantry",
  "brooklea", "ashdale", "nature's glen", "village bakery", "aqua falls",
  "nature's pick", "alcafé", "alcafe", "summit", "ocean trader", "carlos",
  "four seasons", "grandessa", "dairyfine", "moser roth", "snackrite",
  "belmont", "saxon", "almat", "lacura", "mamia",
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
  if (u === "l") return `${Math.round(weight * 1000)}ml`;
  if (u === "cl") return `${Math.round(weight * 10)}ml`;
  if (u === "ml") return `${Math.round(weight)}ml`;
  // Count
  if (u === "units" || u === "pack" || u === "pk" || u === "pcs" || u === "pce" || u === "each" || u === "ea") {
    return weight === 1 ? "" : `${Math.round(weight)}pk`;
  }
  return `${weight}${u}`;
}

/** Extract weight info from a product name.
 *  Returns the LAST matched weight as the canonical one,
 *  and strips ALL weight/size patterns from the name.
 *  e.g. "Whole Milk 1 Litre 1000ml" → cleanName: "Whole Milk", weightStr: "1000ml"
 */
function extractWeightFromName(name: string): { cleanName: string; weightStr: string } {
  let cleanName = name;
  let weightStr = "";

  // Match patterns like: (227 g), 2L, 500g, 1.5kg, 6 Pack, 10pk, 200 ml, 1 Litre, 2.75litre
  const patterns = [
    /\((\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|pk|pack|pce|pcs|ea|each)\)/gi,
    /\b(\d+(?:\.\d+)?)\s*(litre|liter|litres|liters)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/gi,
    /\b(\d+)\s*(pack|pk)\b/gi,
    /\b(\d+)\s*(piece|pieces|pce|pcs|each|ea)\b/gi,
  ];

  for (const pat of patterns) {
    let match;
    while ((match = pat.exec(cleanName)) !== null) {
      const weight = parseFloat(match[1]);
      let unit = match[2].toLowerCase();
      // Normalize "litre" → "l"
      if (unit.startsWith("litre") || unit.startsWith("liter")) unit = "l";
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

// ─── Core normalization ─────────────────────────────────────────────

/**
 * Produce a canonical product name for cross-store matching.
 * Steps:
 * 1. Strip store/brand prefixes
 * 2. Extract and normalize weight/size
 * 3. Clean up and standardize
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
  // "Irish Whole Milk" = "Fresh Irish Whole Milk" = "Whole Milk"
  // "Fresh Irish Chicken" = "Irish Chicken" = "Chicken"
  const FILLER_PREFIXES = [
    /^fresh\s+irish\s+/i,
    /^irish\s+/i,
    /^fresh\s+/i,
    /^organic\s+/i,
  ];
  for (const re of FILLER_PREFIXES) {
    if (re.test(n)) {
      n = n.replace(re, "");
    }
  }

  // Normalize common synonyms
  n = n
    .replace(/\bfree\s*range\b/i, "Free Range")
    .replace(/\blow\s*fat\b/i, "Low Fat")
    .replace(/\bwhole\s*meal\b/i, "Wholemeal")
    .replace(/\bsliced\s*pan\b/i, "Sliced Pan")
    .replace(/\bwhite\s*bread\b/i, "White Sliced Pan")
    .replace(/\bbrown\s*bread\b/i, "Wholemeal Sliced Pan")
    .replace(/\bchicken\s*breast\s*fillets?\b/i, "Chicken Fillets")
    .replace(/\bbeef\s*(?:round\s*)?steak\s*mince\b/i, "Beef Mince")
    .replace(/\bround\s*steak\s*mince\b/i, "Beef Mince")
    .replace(/\bbeef\s+beef\b/i, "Beef")
    .replace(/\bstreaky\s*bacon\s*rashers?\b/i, "Streaky Bacon")
    .replace(/\bback\s*bacon\s*rashers?\b/i, "Back Bacon")
    .replace(/\bpork\s*sausages?\b/i, "Pork Sausages")
    .replace(/\brooster\s+potatoes?\b/i, "Rooster Potatoes")
    .replace(/\bbaby\s+potatoes?\b/i, "Baby Potatoes");

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
    .trim();

  // Title case
  clean = clean
    .split(" ")
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
