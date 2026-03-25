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

/** Extract weight info from a product name */
function extractWeightFromName(name: string): { cleanName: string; weightStr: string } {
  // Match patterns like: (227 g), 2L, 500g, 1.5kg, 6 Pack, 10pk, 200 ml
  const patterns = [
    /\((\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl|pk|pack|pce|pcs|ea|each)\)/i,
    /\b(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/i,
    /\b(\d+)\s*(pack|pk)\b/i,
  ];

  for (const pat of patterns) {
    const m = name.match(pat);
    if (m) {
      const weight = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      const cleanName = name.replace(m[0], "").trim();
      return {
        cleanName,
        weightStr: normalizeWeight(weight, unit),
      };
    }
  }

  return { cleanName: name, weightStr: "" };
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

  // Remove "Irish" prefix (common in Irish stores: "Irish Whole Milk")
  // Keep it as it's a meaningful descriptor
  // n = n.replace(/^Irish\s+/i, "");

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
