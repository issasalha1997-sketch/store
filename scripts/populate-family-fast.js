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

  return n.trim().toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
