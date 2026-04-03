/**
 * Fast batch update of familySlug using direct SQL.
 * Run: node scripts/populate-family-fast.js
 */
require("dotenv/config");
const { Client } = require("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL.replace("?pgbouncer=true", ""),
});

function familySlug(name) {
  let n = name.trim();

  // Strip store/brand prefixes (sorted longest first)
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
    if (re.test(n)) {
      n = n.replace(re, "");
      break;
    }
  }

  // Strip fillers
  n = n.replace(/^fresh\s+irish\s+/i, "");
  n = n.replace(/^irish\s+/i, "");
  n = n.replace(/^fresh\s+/i, "");
  n = n.replace(/^organic\s+/i, "");
  n = n.replace(/^100%\s+/i, "");

  // Strip weight patterns
  n = n.replace(/\(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|cl|pk|pack|pce|pcs|ea|each)\)/gi, "");
  n = n.replace(/\b\d+(?:\.\d+)?\s*(?:litre|liter|litres|liters|ltr)\b/gi, "");
  n = n.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|cl)\b/gi, "");
  n = n.replace(/\b\d+\s*(?:pack|pk)\b/gi, "");
  n = n.replace(/\b\d+\s*(?:piece|pieces|pce|pcs|each|ea)\b/gi, "");

  // Strip quality/origin filler words
  n = n.replace(/\b(?:premium|finest|selected?|quality|value|essential)\b/gi, "");
  n = n.replace(/\b(?:ireland|irish|from\s+ireland)\b/gi, "");
  // Strip baby food age markers: "6+ Months", "7 Months+", etc.
  n = n.replace(/\b\d+\+?\s*months?\+?\b/gi, "");
  // Strip "in tomato sauce", "in brine", etc. — stores add these inconsistently
  n = n.replace(/\bin\s+(?:tomato\s+sauce|brine|water|oil|juice|syrup|gravy|jelly)\b/gi, "");

  // Normalize common product name variations across stores
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

  // Strip store-specific container/descriptor suffixes from the END of the name
  // Applied repeatedly to peel off multiple trailing filler words
  let prev = "";
  while (prev !== n) {
    prev = n;
    n = n.replace(/\s+(?:bottle|bottles|can|cans|carton|pouch|tub|pot|jar|tin|bag|sachet|sachets|tube|box|soft\s+drink|soft\s+drinks|drink|beverage|bars?|original|classic|regular|standard|multipack|multi\s+pack|family\s+pack|value\s+pack|sharing|share|ready\s+to\s+eat|ready\s+to\s+drink|ready\s+meal|prepared|pre-packed|portion|portions|serving|servings|slices?|pieces?)\s*$/gi, "");
  }

  // Normalize & to "and" before slugging so "Salt & Vinegar" matches "Salt And Vinegar"
  n = n.replace(/\s*&\s*/g, " and ");

  // To slug — then strip connector words so "Tomato and Basil" = "Tomato Basil"
  let slug = n.trim().toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-(?:and|with|in|of|the|for|a|an|by|on|to|from|de|au|la|le|al)-/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Sort words alphabetically to handle word-order differences across stores
  // e.g. "nappies-size-5" vs "size-5-nappies", "cream-tomato-soup" vs "tomato-cream-soup"
  const parts = slug.split("-").filter(p => p.length > 0);
  if (parts.length >= 2) {
    slug = parts.sort().join("-");
  }

  return slug;
}

async function run() {
  await client.connect();

  const r = await client.query(
    'SELECT id, name FROM "Product" WHERE "isActive" = true'
  );
  console.log("Processing", r.rows.length, "products...");

  // Batch update
  const batchSize = 200;
  let updated = 0;

  for (let i = 0; i < r.rows.length; i += batchSize) {
    const batch = r.rows.slice(i, i + batchSize);
    const values = batch
      .map((p) => {
        const fs = familySlug(p.name);
        return `('${p.id.replace(/'/g, "''")}', '${fs.replace(/'/g, "''")}')`;
      })
      .join(",");

    await client.query(`
      UPDATE "Product" AS p SET "familySlug" = v.fslug
      FROM (VALUES ${values}) AS v(pid, fslug)
      WHERE p.id = v.pid
    `);
    updated += batch.length;
    if (updated % 2000 === 0) process.stdout.write(`${updated}...`);
  }

  console.log(`\nUpdated ${updated} products`);

  const families = await client.query(`
    SELECT COUNT(*) FROM (
      SELECT "familySlug" FROM "Product" WHERE "isActive"=true AND "familySlug" IS NOT NULL
      GROUP BY "familySlug" HAVING COUNT(*) > 1
    ) s
  `);
  console.log("Multi-product families:", families.rows[0].count);

  const crossStore = await client.query(`
    SELECT COUNT(*) FROM (
      SELECT p."familySlug" FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      WHERE p."isActive" = true AND p."familySlug" IS NOT NULL
      GROUP BY p."familySlug"
      HAVING COUNT(DISTINCT pr."storeId") >= 2
    ) s
  `);
  console.log("Cross-store families:", crossStore.rows[0].count);

  await client.end();
}

run().catch((e) => {
  console.error(e.message);
  client.end();
});
