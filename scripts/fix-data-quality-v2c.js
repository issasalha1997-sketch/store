/**
 * Final cleanup for remaining data quality issues
 */
require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const client = new Client({ connectionString: connStr });

async function main() {
  await client.connect();
  console.log('=== FINAL CLEANUP ===\n');

  // ── 1. Fix remaining non-food Aldi Bakery items ──
  console.log('1. Fixing remaining non-food items in Aldi Bakery...\n');

  const aldiStore = await client.query(`SELECT id FROM "Store" WHERE slug = 'aldi'`);
  const aldiStoreId = aldiStore.rows[0].id;

  const cats = await client.query(`SELECT id, slug FROM "Category"`);
  const catMap = {};
  for (const c of cats.rows) catMap[c.slug] = c.id;

  // Get the specific remaining items and move them
  const remainingBakeryJunk = await client.query(`
    SELECT p.id, p.name FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    AND c.slug = 'bakery'
    AND LOWER(p.name) ~ '(cable|razor|bike|mattress|car |tent|worktable|chair|lamp|accessories|picnic table|camping)'
    ORDER BY p.name
  `, [aldiStoreId]);

  if (remainingBakeryJunk.rows.length > 0) {
    const ids = remainingBakeryJunk.rows.map(r => r.id);
    await client.query(
      `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::text[])`,
      [catMap['household'], ids]
    );
    console.log(`Moved ${ids.length} non-food items from Bakery to Household:`);
    for (const r of remainingBakeryJunk.rows) console.log(`  ${r.name}`);
  }

  // Also move "Banoffee Easter Sponge" and "Lemon Meringue Easter Sponge" — these are actually bakery, keep them
  // They got caught by the regex because of "sponge" but they ARE bakery items

  // ── 2. Fix remaining doubled measurements (meters) ──
  console.log('\n2. Fixing remaining doubled measurement names...\n');

  // These are products with "Xm Xm" or "Xm Xm Xm" patterns (meters, not ml/mm)
  const meterDoubles = await client.query(`
    SELECT id, name FROM "Product"
    WHERE "isActive" = true
    AND name ~ '(\\d+\\.?\\d*(?:cm|m))\\s+\\1'
    AND name !~ '(\\d+\\.?\\d*(?:ml|mm|m\\u00b2))\\s+\\1'
    ORDER BY name
  `);

  console.log(`Found ${meterDoubles.rows.length} products with doubled meter measurements:`);
  let fixedMeter = 0;

  for (const row of meterDoubles.rows) {
    let name = row.name;

    // Remove repeated measurement at end: "50m 50m 50m" -> "50m", "12m 12m" -> "12m"
    // Keep removing trailing duplicates
    let changed = true;
    while (changed) {
      const cleaned = name.replace(/(\d+\.?\d*\s*(?:cm|m))\s+\1\s*$/, '$1');
      changed = cleaned !== name;
      name = cleaned;
    }

    // Also handle tripled: "50m 50m 50m" might need two passes
    // And handle "X Metres Xm Xm" -> "X Metres Xm"
    name = name.replace(/(\d+\.?\d*\s*m)\s+\1\s*$/, '$1');

    if (name !== row.name) {
      const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let finalSlug = cleanSlug;
      const slugCheck = await client.query(
        `SELECT id FROM "Product" WHERE slug = $1 AND id != $2`, [cleanSlug, row.id]
      );
      if (slugCheck.rows.length > 0) {
        // Add a random suffix to avoid collision
        finalSlug = cleanSlug + '-' + Math.random().toString(36).substring(2, 8);
      }

      await client.query(
        `UPDATE "Product" SET name = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3`,
        [name, finalSlug, row.id]
      );
      console.log(`  "${row.name}" -> "${name}"`);
      fixedMeter++;
    } else {
      console.log(`  SKIP (no change): "${row.name}"`);
    }
  }
  console.log(`Fixed ${fixedMeter} meter-doubled names.`);

  // ── 3. Fix remaining mixed l/ml families ──
  console.log('\n3. Fixing remaining l/ml mixed families...\n');

  // These are products with weight >= 10 in liters that should be ml
  // e.g., a "6 x 500ml" water pack might have weight=6 and unit='l'
  // Actually let's check specifically
  const remainingMixed = await client.query(`
    SELECT p.id, p.name, p.weight, p."weightUnit", p."familySlug"
    FROM "Product" p
    WHERE p."isActive" = true
    AND p."familySlug" IN (
      SELECT "familySlug" FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
      GROUP BY "familySlug"
      HAVING array_agg(DISTINCT "weightUnit") @> ARRAY['l'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['ml']
    )
    AND p."weightUnit" IN ('l', 'ml')
    ORDER BY p."familySlug", p.weight
  `);

  console.log('Products in families with mixed l/ml:');
  for (const r of remainingMixed.rows) {
    console.log(`  [${r.familySlug}] ${r.name} -- ${r.weight}${r.weightUnit}`);
  }

  // Convert remaining l to ml (even if weight >= 10, since these are clearly meant to be ml)
  const lToMlRemaining = await client.query(`
    UPDATE "Product"
    SET weight = weight * 1000, "weightUnit" = 'ml', "updatedAt" = NOW()
    WHERE "isActive" = true
    AND "weightUnit" = 'l'
    AND "familySlug" IN (
      SELECT "familySlug" FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
      GROUP BY "familySlug"
      HAVING array_agg(DISTINCT "weightUnit") @> ARRAY['l'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['ml']
    )
    RETURNING id, name, weight / 1000 as old_weight, weight as new_weight
  `);
  console.log(`\nConverted ${lToMlRemaining.rowCount} remaining l->ml products:`);
  for (const r of lToMlRemaining.rows) {
    console.log(`  ${r.name}: ${r.old_weight}l -> ${r.new_weight}ml`);
  }

  // ── 4. Verify everything is clean ──
  console.log('\n=== FINAL VERIFICATION ===\n');

  // Non-food in Aldi Bakery
  const bakeryCheck = await client.query(`
    SELECT COUNT(*) as cnt FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    AND c.slug = 'bakery'
    AND LOWER(p.name) ~ '(cable|razor|bike|mattress|car |tent|drill|lamp|chair|table|blanket|duvet|pillow|towel|shampoo|deodorant|toothpaste|makeup|lipstick|mascara|foundation|detergent|bleach|sponge|vacuum|mirror|planter|camping)'
  `, [aldiStoreId]);
  console.log(`Non-food items in Aldi Bakery: ${bakeryCheck.rows[0].cnt}`);

  // Doubled measurements
  const dblCheck = await client.query(
    "SELECT COUNT(*) as cnt FROM \"Product\" WHERE \"isActive\" = true " +
    "AND name ~ '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m))\\s+\\1\\s*$'"
  );
  console.log(`Products with doubled measurements: ${dblCheck.rows[0].cnt}`);

  // kg+g or l+ml mixed families
  const mixedCheck = await client.query(`
    SELECT COUNT(*) as cnt FROM (
      SELECT "familySlug" FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
      GROUP BY "familySlug"
      HAVING (array_agg(DISTINCT "weightUnit") @> ARRAY['g'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['kg'])
         OR (array_agg(DISTINCT "weightUnit") @> ARRAY['ml'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['l'])
    ) sub
  `);
  console.log(`Families with kg+g or l+ml mixed: ${mixedCheck.rows[0].cnt}`);

  // CDM 109g check
  const cdmCheck = await client.query(`
    SELECT name, "isActive" FROM "Product"
    WHERE LOWER(name) LIKE '%cadbury dairy milk chocolate bar 109g%'
  `);
  console.log(`CDM 109g status: ${cdmCheck.rows.map(r => `${r.name} [${r.isActive ? 'ACTIVE' : 'inactive'}]`).join(', ') || 'not found'}`);

  await client.end();
  console.log('\nCleanup complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
