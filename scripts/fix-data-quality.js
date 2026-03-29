/**
 * Data Quality Fix Script for GrocerySaver
 *
 * 1. Create "Pantry & Cupboard" category and move misplaced products
 * 2. Fix cross-store brand contamination
 * 3. Fix Aldi weight data from unit prices
 * 4. Fix orphaned products and placeholder images
 */

require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');

async function run() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database.\n');

  const results = {};

  // ============================================================
  // TASK 1a: Create "Pantry & Cupboard" category
  // ============================================================
  console.log('=== TASK 1a: Create "Pantry & Cupboard" category ===');
  const catRes = await client.query(`
    INSERT INTO "Category" (id, name, slug, "iconUrl")
    VALUES (gen_random_uuid(), 'Pantry & Cupboard', 'pantry-cupboard', '🥫')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, "iconUrl" = EXCLUDED."iconUrl"
    RETURNING id, name, slug
  `);
  const pantryCatId = catRes.rows[0].id;
  console.log(`  Created/found category: ${catRes.rows[0].name} (${pantryCatId})`);

  // ============================================================
  // TASK 1b: Move products from "Snacks & Sweets" to "Pantry & Cupboard"
  // ============================================================
  console.log('\n=== TASK 1b: Move pantry products from Snacks & Sweets ===');

  // Get snacks category id
  const snacksRes = await client.query(`SELECT id FROM "Category" WHERE slug = 'snacks-sweets'`);
  const snacksCatId = snacksRes.rows[0]?.id;
  console.log(`  Snacks category ID: ${snacksCatId}`);

  // Pantry patterns
  const pantryPatterns = [
    'rice', 'pasta', 'noodle', 'spaghetti', 'penne', 'fusilli', 'macaroni', 'lasagne', 'linguine',
    'flour', 'sugar', 'salt', 'pepper', 'spice', 'herb', 'seasoning', 'cumin', 'paprika', 'turmeric', 'cinnamon', 'oregano', 'thyme', 'basil',
    'oil', 'olive oil', 'cooking oil', 'sunflower oil', 'rapeseed oil', 'coconut oil', 'vinegar',
    'sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'chutney', 'salsa',
    'stock', 'stock cube', 'oxo', 'bouillon',
    'soup',
    'beans', 'baked beans', 'kidney bean', 'chickpea', 'lentil',
    'tin', 'tinned', 'canned',
    'cereal', 'porridge', 'oats', 'granola', 'muesli', 'weetabix', 'cornflakes', 'bran flakes',
    'jam', 'marmalade', 'honey', 'spread', 'peanut butter', 'nutella', 'chocolate spread',
    'cous cous', 'couscous', 'quinoa', 'bulgur',
    'gravy', 'stuffing', 'breadcrumb',
    'coconut milk', 'passata', 'tomato puree', 'chopped tomato',
    'soy sauce', 'worcestershire', 'fish sauce', 'hot sauce', 'tabasco', 'sriracha',
    'baking powder', 'baking soda', 'bicarbonate', 'yeast', 'cornflour', 'cornstarch'
  ];

  // Build a big ILIKE condition
  const pantryConditions = pantryPatterns.map((p, i) => `LOWER(p.name) LIKE $${i + 2}`);
  const pantryParams = [snacksCatId, ...pantryPatterns.map(p => `%${p}%`)];

  const moveRes = await client.query(`
    UPDATE "Product" p
    SET "categoryId" = '${pantryCatId}'
    WHERE p."categoryId" = $1
    AND (${pantryConditions.join(' OR ')})
  `, pantryParams);
  results.movedToPantry = moveRes.rowCount;
  console.log(`  Moved ${moveRes.rowCount} products to Pantry & Cupboard`);

  // ============================================================
  // TASK 1b-extra: Move tea/coffee from Snacks to Drinks
  // ============================================================
  console.log('\n=== TASK 1b-extra: Move tea/coffee to Drinks ===');
  const drinksRes = await client.query(`SELECT id FROM "Category" WHERE slug = 'drinks'`);
  const drinksCatId = drinksRes.rows[0]?.id;

  if (drinksCatId) {
    // Move tea/coffee from Snacks AND from Pantry (in case they were moved there)
    const teaCoffeeRes = await client.query(`
      UPDATE "Product"
      SET "categoryId" = $1
      WHERE "categoryId" IN ($2, $3)
      AND (LOWER(name) LIKE '%tea %' OR LOWER(name) LIKE '%tea' OR LOWER(name) LIKE '% tea%'
           OR LOWER(name) LIKE '%coffee%'
           OR LOWER(name) LIKE '%teabag%' OR LOWER(name) LIKE '%tea bag%')
    `, [drinksCatId, snacksCatId, pantryCatId]);
    results.movedToDrinks = teaCoffeeRes.rowCount;
    console.log(`  Moved ${teaCoffeeRes.rowCount} tea/coffee products to Drinks`);
  }

  // ============================================================
  // TASK 1c: Fix category misplacements
  // ============================================================
  console.log('\n=== TASK 1c: Fix category misplacements ===');

  // Get household and bakery category IDs
  const householdRes = await client.query(`SELECT id FROM "Category" WHERE slug = 'household'`);
  const bakeryRes = await client.query(`SELECT id FROM "Category" WHERE slug = 'bakery'`);
  const householdCatId = householdRes.rows[0]?.id;
  const bakeryCatId = bakeryRes.rows[0]?.id;

  // Move pet food to Household
  if (householdCatId) {
    const petRes = await client.query(`
      UPDATE "Product"
      SET "categoryId" = $1
      WHERE "categoryId" != $1
      AND (LOWER(name) LIKE '%dog food%' OR LOWER(name) LIKE '%cat food%'
           OR LOWER(name) LIKE '%pet food%' OR LOWER(name) LIKE '%puppy%'
           OR LOWER(name) LIKE '%kitten food%' OR LOWER(name) LIKE '%dog treat%'
           OR LOWER(name) LIKE '%cat treat%' OR LOWER(name) LIKE '%cat litter%')
    `, [householdCatId]);
    results.movedPetToHousehold = petRes.rowCount;
    console.log(`  Moved ${petRes.rowCount} pet products to Household`);
  }

  // Move toilet/kitchen roll from Bakery to Household
  if (bakeryCatId && householdCatId) {
    const rollRes = await client.query(`
      UPDATE "Product"
      SET "categoryId" = $1
      WHERE "categoryId" = $2
      AND (LOWER(name) LIKE '%toilet roll%' OR LOWER(name) LIKE '%toilet paper%'
           OR LOWER(name) LIKE '%kitchen roll%' OR LOWER(name) LIKE '%kitchen towel%'
           OR LOWER(name) LIKE '%paper towel%')
    `, [householdCatId, bakeryCatId]);
    results.movedRollsToHousehold = rollRes.rowCount;
    console.log(`  Moved ${rollRes.rowCount} toilet/kitchen roll products from Bakery to Household`);
  }

  // Move Cast Iron cookware from Bakery to Household
  if (bakeryCatId && householdCatId) {
    const castIronRes = await client.query(`
      UPDATE "Product"
      SET "categoryId" = $1
      WHERE "categoryId" = $2
      AND LOWER(name) LIKE '%cast iron%'
    `, [householdCatId, bakeryCatId]);
    results.movedCastIronToHousehold = castIronRes.rowCount;
    console.log(`  Moved ${castIronRes.rowCount} cast iron products from Bakery to Household`);
  }

  // ============================================================
  // TASK 2: Fix cross-store brand contamination
  // ============================================================
  console.log('\n=== TASK 2: Fix cross-store brand contamination ===');
  const brandRes = await client.query(`
    UPDATE "Product" SET brand = NULL
    WHERE id IN (
      SELECT p.id
      FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      GROUP BY p.id
      HAVING COUNT(DISTINCT pr."storeId") > 1
      AND p.brand IN ('TESCO', 'Dunnes Stores', 'SuperValu')
    )
  `);
  results.brandsCleaned = brandRes.rowCount;
  console.log(`  Cleaned brand from ${brandRes.rowCount} cross-store products`);

  // ============================================================
  // TASK 3: Fix Aldi weight data from unit price
  // ============================================================
  console.log('\n=== TASK 3: Fix Aldi weight data from unit prices ===');

  // Get Aldi store ID
  const aldiStoreRes = await client.query(`SELECT id FROM "Store" WHERE slug = 'aldi'`);
  const aldiStoreId = aldiStoreRes.rows[0]?.id;

  if (aldiStoreId) {
    // Find Aldi products with unitPrice but no weight
    const aldiProducts = await client.query(`
      SELECT p.id, p.name, pr.price, pr."unitPrice", pr."unitPriceUnit"
      FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true AND pr."storeId" = $1
      WHERE p.weight IS NULL
      AND pr."unitPrice" IS NOT NULL
      AND pr."unitPrice" > 0
      AND pr."unitPriceUnit" IS NOT NULL
    `, [aldiStoreId]);

    console.log(`  Found ${aldiProducts.rows.length} Aldi products with unitPrice but no weight`);

    let weightFixed = 0;
    for (const row of aldiProducts.rows) {
      const price = parseFloat(row.price);
      const unitPrice = parseFloat(row.unitPrice);
      const unitPriceUnit = row.unitPriceUnit || '';

      if (unitPrice <= 0 || price <= 0) continue;

      // Determine weight and unit from unitPriceUnit
      // Common formats: "€X.XX/1 KG", "€X.XX/100 ML", "€X.XX/1 L", "€X.XX/100 G"
      let weightUnit = '';
      let weight = 0;

      const upperUnit = unitPriceUnit.toUpperCase();

      if (upperUnit.includes('KG') || upperUnit.includes('KILO')) {
        // price / unitPrice = weight in KG
        weight = price / unitPrice;
        if (weight < 1) {
          // Convert to grams
          weight = Math.round(weight * 1000);
          weightUnit = 'g';
        } else {
          weight = Math.round(weight * 100) / 100;
          weightUnit = 'kg';
        }
      } else if (upperUnit.includes('100G') || upperUnit.includes('100 G')) {
        // unitPrice is per 100g
        weight = Math.round((price / unitPrice) * 100);
        weightUnit = 'g';
      } else if (upperUnit.includes(' G') || upperUnit.endsWith('G')) {
        // unitPrice per gram (unlikely but handle)
        weight = Math.round(price / unitPrice);
        weightUnit = 'g';
      } else if (upperUnit.includes(' L') || upperUnit.includes('LTR') || upperUnit.includes('LITRE')) {
        weight = price / unitPrice;
        if (weight < 1) {
          weight = Math.round(weight * 1000);
          weightUnit = 'ml';
        } else {
          weight = Math.round(weight * 100) / 100;
          weightUnit = 'l';
        }
      } else if (upperUnit.includes('100ML') || upperUnit.includes('100 ML')) {
        weight = Math.round((price / unitPrice) * 100);
        weightUnit = 'ml';
      } else if (upperUnit.includes('ML')) {
        weight = Math.round(price / unitPrice);
        weightUnit = 'ml';
      } else {
        continue; // Unknown unit
      }

      if (weight > 0 && weight < 50000 && weightUnit) {
        await client.query(`
          UPDATE "Product" SET weight = $1, "weightUnit" = $2 WHERE id = $3
        `, [weight, weightUnit, row.id]);
        weightFixed++;
      }
    }
    results.aldiWeightFixed = weightFixed;
    console.log(`  Fixed weight for ${weightFixed} Aldi products`);
  }

  // ============================================================
  // TASK 4a: Deactivate products with no latest price
  // ============================================================
  console.log('\n=== TASK 4a: Deactivate orphaned products (no latest price) ===');
  const orphanRes = await client.query(`
    UPDATE "Product" p
    SET "isActive" = false
    WHERE "isActive" = true
    AND NOT EXISTS (
      SELECT 1 FROM "Price" pr
      WHERE pr."productId" = p.id AND pr."isLatest" = true
    )
  `);
  results.orphansDeactivated = orphanRes.rowCount;
  console.log(`  Deactivated ${orphanRes.rowCount} orphaned products`);

  // ============================================================
  // TASK 4b: Fix placeholder images
  // ============================================================
  console.log('\n=== TASK 4b: Nullify placeholder/no-image URLs ===');
  const imgRes = await client.query(`
    UPDATE "Product"
    SET "imageUrl" = NULL
    WHERE "imageUrl" IS NOT NULL
    AND (
      LOWER("imageUrl") LIKE '%no-image%'
      OR LOWER("imageUrl") LIKE '%_default%'
      OR LOWER("imageUrl") LIKE '%noimage%'
      OR LOWER("imageUrl") LIKE '%placeholder%'
      OR LOWER("imageUrl") LIKE '%no_image%'
    )
  `);
  results.placeholderImagesCleared = imgRes.rowCount;
  console.log(`  Cleared ${imgRes.rowCount} placeholder image URLs`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`  Products moved to Pantry & Cupboard: ${results.movedToPantry}`);
  console.log(`  Tea/coffee moved to Drinks:          ${results.movedToDrinks || 0}`);
  console.log(`  Pet products moved to Household:     ${results.movedPetToHousehold || 0}`);
  console.log(`  Rolls moved Bakery -> Household:     ${results.movedRollsToHousehold || 0}`);
  console.log(`  Cast iron moved Bakery -> Household: ${results.movedCastIronToHousehold || 0}`);
  console.log(`  Cross-store brands cleaned:          ${results.brandsCleaned}`);
  console.log(`  Aldi weights fixed from unit price:  ${results.aldiWeightFixed || 0}`);
  console.log(`  Orphaned products deactivated:       ${results.orphansDeactivated}`);
  console.log(`  Placeholder images cleared:          ${results.placeholderImagesCleared}`);
  console.log('========================================');

  // Quick verification counts
  const pantryCount = await client.query(`SELECT COUNT(*) FROM "Product" WHERE "categoryId" = $1`, [pantryCatId]);
  const snacksCount = await client.query(`SELECT COUNT(*) FROM "Product" WHERE "categoryId" = $1`, [snacksCatId]);
  console.log(`\n  Pantry & Cupboard now has: ${pantryCount.rows[0].count} products`);
  console.log(`  Snacks & Sweets now has:   ${snacksCount.rows[0].count} products`);

  await client.end();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
