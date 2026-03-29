/**
 * Clean HTML from product descriptions and fix duplicate isLatest prices.
 * Run: node scripts/fix-descriptions.js
 */
require("dotenv/config");
const { Client } = require("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL.replace("?pgbouncer=true", ""),
});

/** Strip HTML tags and decode entities from a string */
function stripHtml(html) {
  if (!html) return null;
  let text = html
    // Remove HTML tags
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#8494;/g, "℮")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    // Clean up whitespace
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  // Truncate to 500 chars
  if (text.length > 500) text = text.slice(0, 500);

  return text || null;
}

async function run() {
  await client.connect();

  // 1. Fix HTML in descriptions
  console.log("=== Cleaning HTML from descriptions ===");

  const htmlProducts = await client.query(`
    SELECT id, description FROM "Product"
    WHERE description IS NOT NULL
    AND (description LIKE '%<%' OR description LIKE '%&amp;%' OR description LIKE '%&#%')
  `);

  console.log(`Found ${htmlProducts.rows.length} products with HTML in descriptions`);

  let cleaned = 0;
  const batchSize = 200;

  for (let i = 0; i < htmlProducts.rows.length; i += batchSize) {
    const batch = htmlProducts.rows.slice(i, i + batchSize);
    const values = batch
      .map((p) => {
        const clean = stripHtml(p.description);
        const escaped = clean
          ? `'${clean.replace(/'/g, "''")}'`
          : "NULL";
        return `('${p.id}', ${escaped})`;
      })
      .join(",");

    await client.query(`
      UPDATE "Product" AS p SET description = v.clean_desc
      FROM (VALUES ${values}) AS v(pid, clean_desc)
      WHERE p.id = v.pid
    `);
    cleaned += batch.length;
    if (cleaned % 1000 === 0) process.stdout.write(`${cleaned}...`);
  }
  console.log(`\nCleaned ${cleaned} descriptions`);

  // 2. Fix duplicate isLatest prices
  console.log("\n=== Fixing duplicate isLatest prices ===");

  const dupes = await client.query(`
    SELECT "productId", "storeId", COUNT(*) as cnt,
           array_agg(id ORDER BY "scrapedAt" DESC) as price_ids
    FROM "Price"
    WHERE "isLatest" = true
    GROUP BY "productId", "storeId"
    HAVING COUNT(*) > 1
  `);

  console.log(`Found ${dupes.rows.length} product-store combos with duplicate latest prices`);

  let fixed = 0;
  for (const row of dupes.rows) {
    // Keep the most recent one (first in array), mark others as not latest
    const keepId = row.price_ids[0];
    const removeIds = row.price_ids.slice(1);

    await client.query(
      `UPDATE "Price" SET "isLatest" = false WHERE id = ANY($1)`,
      [removeIds]
    );
    fixed += removeIds.length;
  }
  console.log(`Fixed ${fixed} duplicate price records`);

  // 3. Verify
  const remaining = await client.query(`
    SELECT COUNT(*) FROM "Product"
    WHERE description LIKE '%<%' AND description IS NOT NULL AND "isActive" = true
  `);
  console.log(`\nRemaining products with '<' in description: ${remaining.rows[0].count}`);

  const remainingDupes = await client.query(`
    SELECT COUNT(*) FROM (
      SELECT "productId", "storeId" FROM "Price"
      WHERE "isLatest" = true
      GROUP BY "productId", "storeId"
      HAVING COUNT(*) > 1
    ) s
  `);
  console.log(`Remaining duplicate latest prices: ${remainingDupes.rows[0].count}`);

  await client.end();
}

run().catch((e) => {
  console.error(e.message);
  client.end();
});
