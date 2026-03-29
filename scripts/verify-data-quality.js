/**
 * Verify data quality after fixes
 */
require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const client = new Client({ connectionString: connStr });

async function main() {
  await client.connect();
  console.log('=== DATA QUALITY VERIFICATION ===\n');

  // 1. Check Aldi Bakery — any remaining non-bakery items?
  const aldiStore = await client.query(`SELECT id FROM "Store" WHERE slug = 'aldi'`);
  if (aldiStore.rows.length > 0) {
    const aldiStoreId = aldiStore.rows[0].id;
    const bakeryJunk = await client.query(`
      SELECT p.name FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
      AND c.slug = 'bakery'
      AND LOWER(p.name) ~ '(cable|razor|bike|mattress|car |drill|lamp|chair|table|blanket|duvet|pillow|towel|shampoo|deodorant|toothpaste|makeup|lipstick|mascara|foundation|detergent|bleach|sponge)'
      ORDER BY p.name
    `, [aldiStoreId]);
    console.log(`1. Non-food items still in Aldi Bakery: ${bakeryJunk.rows.length}`);
    for (const r of bakeryJunk.rows) console.log(`   ${r.name}`);

    // Aldi category distribution
    const cats = await client.query(`
      SELECT c.name, COUNT(*) as cnt FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
      GROUP BY c.name ORDER BY cnt DESC
    `, [aldiStoreId]);
    console.log('\n   Aldi category distribution:');
    for (const r of cats.rows) console.log(`   ${r.name}: ${r.cnt}`);
  }

  // 2. Any remaining doubled measurements?
  const doubled = await client.query(
    "SELECT name FROM \"Product\" WHERE \"isActive\" = true " +
    "AND name ~ '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m))\\s+\\1\\s*$' " +
    "LIMIT 20"
  );
  console.log(`\n2. Products with doubled measurements remaining: ${doubled.rows.length}`);
  for (const r of doubled.rows) console.log(`   ${r.name}`);

  // 3. Pet products
  const petProds = await client.query(`
    SELECT p.name, c.name as category, s.name as store
    FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
    JOIN "Store" s ON s.id = pr."storeId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."isActive" = true
    AND LOWER(p.name) ~ '(dog food|cat food|pet food|cat litter|dog treat|cat treat)'
    ORDER BY p.name
  `);
  console.log(`\n3. Pet products in database: ${petProds.rows.length}`);
  for (const r of petProds.rows) console.log(`   [${r.store}] [${r.category}] ${r.name}`);

  // 4. Mixed weight units in families
  const mixed = await client.query(`
    SELECT "familySlug", array_agg(DISTINCT "weightUnit") as units, COUNT(*) as cnt
    FROM "Product"
    WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
    GROUP BY "familySlug"
    HAVING COUNT(DISTINCT "weightUnit") > 1
      AND array_agg(DISTINCT "weightUnit") @> ARRAY['g'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['kg']
      OR array_agg(DISTINCT "weightUnit") @> ARRAY['ml'] AND array_agg(DISTINCT "weightUnit") @> ARRAY['l']
  `);
  console.log(`\n4. Families with kg+g or l+ml mixed: ${mixed.rows.length}`);
  for (const r of mixed.rows) console.log(`   ${r.familySlug}: [${r.units.join(', ')}]`);

  // 5. Cadbury Dairy Milk 109g/110g
  const cdm = await client.query(`
    SELECT name, weight, "weightUnit", "isActive"
    FROM "Product"
    WHERE LOWER(name) LIKE '%cadbury dairy milk chocolate bar%'
    AND weight BETWEEN 108 AND 111
    ORDER BY name
  `);
  console.log(`\n5. Cadbury Dairy Milk ~110g variants:`);
  for (const r of cdm.rows) console.log(`   [${r.isActive ? 'active' : 'INACTIVE'}] ${r.name} (${r.weight}${r.weightUnit})`);

  // 6. Overall stats
  const totalActive = await client.query(`SELECT COUNT(*) FROM "Product" WHERE "isActive" = true`);
  const totalInactive = await client.query(`SELECT COUNT(*) FROM "Product" WHERE "isActive" = false`);
  const totalPrices = await client.query(`SELECT COUNT(*) FROM "Price" WHERE "isLatest" = true`);
  console.log(`\n6. Overall stats:`);
  console.log(`   Active products: ${totalActive.rows[0].count}`);
  console.log(`   Inactive products: ${totalInactive.rows[0].count}`);
  console.log(`   Latest prices: ${totalPrices.rows[0].count}`);

  await client.end();
  console.log('\nVerification complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
