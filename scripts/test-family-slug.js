/**
 * Quick test to verify the updated familySlug function works correctly.
 */

function familySlug(name) {
  let n = name.trim();

  const prefixes = [
    "tesco finest","tesco everyday value","tesco goodness","tesco organic","tesco healthy living",
    "supervalu signature tastes","signature tastes",
    "dunnes stores","simply better","my family favourites",
    "specially selected","everyday essentials","the fishmonger","the butcher's selection",
    "nature's pick","nature's glen","the pantry","village bakery",
    "castlefarm","greenvale","clonbawn","cucina","brooklea","ashdale",
    "aqua falls","alcafe","ocean trader","carlos",
    "four seasons","grandessa","dairyfine","moser roth","snackrite",
    "tesco","dunnes","lidl","aldi","supervalu","super valu",
    "creggan","kilkeely","coolmore","milbona","solevita","bellarom",
    "belmont","saxon","almat","lacura","mamia","summit",
  ].sort((a, b) => b.length - a.length);

  for (const p of prefixes) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("^" + escaped + "[\\s-]*", "i");
    if (re.test(n)) { n = n.replace(re, ""); break; }
  }

  n = n.replace(/^fresh\s+irish\s+/i, "");
  n = n.replace(/^irish\s+/i, "");
  n = n.replace(/^fresh\s+/i, "");
  n = n.replace(/^organic\s+/i, "");
  n = n.replace(/^100%\s+/i, "");

  // Weight patterns
  n = n.replace(/\(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|cl|pk|pack|pce|pcs|ea|each)\)/gi, "");
  n = n.replace(/\b\d+(?:\.\d+)?\s*(?:litre|liter|litres|liters|ltr)\b/gi, "");
  n = n.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|cl)\b/gi, "");
  n = n.replace(/\b\d+\s*(?:pack|pk)\b/gi, "");
  n = n.replace(/\b\d+\s*(?:piece|pieces|pce|pcs|each|ea)\b/gi, "");

  // Filler words
  n = n.replace(/\b(?:premium|finest|selected?|quality|value|essential)\b/gi, "");
  n = n.replace(/\b(?:ireland|irish|from\s+ireland)\b/gi, "");

  // Product name variations
  n = n
    .replace(/\bcoca[\s-]*cola\b/gi, "Coca-Cola")
    .replace(/\bwhole\s*milk\b/gi, "Whole Milk")
    .replace(/\bfresh\s*milk\b/gi, "Whole Milk")
    .replace(/\bchicken\s*breast\s*fillets?\b/gi, "Chicken Fillets")
    .replace(/\bchicken\s*fillets?\b/gi, "Chicken Fillets")
    .replace(/\btoilet\s*(?:tissue|roll|paper)s?\b/gi, "Toilet Roll")
    .replace(/\bkitchen\s*(?:towel|roll|paper)s?\b/gi, "Kitchen Roll");

  // Trailing container/descriptor stripping
  let prev = "";
  while (prev !== n) {
    prev = n;
    n = n.replace(/\s+(?:bottle|bottles|can|cans|carton|pouch|tub|pot|jar|tin|bag|sachet|sachets|tube|box|soft\s+drink|soft\s+drinks|drink|beverage|bars?|original|classic|regular|standard|multipack|multi\s+pack|family\s+pack|value\s+pack|sharing|share|ready\s+to\s+eat|ready\s+to\s+drink|ready\s+meal|prepared|pre-packed|portion|portions|serving|servings|slices?|pieces?)\s*$/gi, "");
  }

  return n.trim().toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Test cases
const tests = [
  // These should all produce the same slug
  ["Coca-Cola Zero Sugar 2000ml", "coca-cola-zero-sugar"],
  ["Coca-Cola Zero Sugar Bottle 2000ml", "coca-cola-zero-sugar"],
  ["Coca-Cola Zero Sugar Soft Drink 2000ml", "coca-cola-zero-sugar"],
  // Container types should be stripped from end
  ["Heinz Baked Beans Can", "heinz-baked-beans"],
  ["Heinz Baked Beans Tin", "heinz-baked-beans"],
  // But product-core words should NOT be stripped
  ["Toilet Roll", "toilet-roll"],
  ["Kitchen Roll", "kitchen-roll"],
  // Multipack/descriptors at end
  ["Walkers Crisps Multipack", "walkers-crisps"],
  ["Walkers Crisps Sharing", "walkers-crisps"],
  // Milk
  ["Whole Milk 2L", "whole-milk"],
  ["Fresh Milk 1 Litre", "whole-milk"],
];

let pass = 0, fail = 0;
for (const [input, expected] of tests) {
  const result = familySlug(input);
  if (result === expected) {
    console.log(`  PASS: "${input}" => "${result}"`);
    pass++;
  } else {
    console.log(`  FAIL: "${input}" => "${result}" (expected "${expected}")`);
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
