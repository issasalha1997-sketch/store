/**
 * Final pass: check what's left in Aldi Bakery and fix any remaining non-food items
 */
require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const client = new Client({ connectionString: connStr });

async function main() {
  await client.connect();

  const aldiStore = await client.query(`SELECT id FROM "Store" WHERE slug = 'aldi'`);
  const aldiStoreId = aldiStore.rows[0].id;

  // Show ALL remaining Aldi Bakery items that don't match obvious bakery keywords
  const bakeryItems = await client.query(`
    SELECT p.id, p.name FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    AND c.slug = 'bakery'
    AND LOWER(p.name) !~
      '(bread|roll|croissant|baguette|scone|muffin|cake|pastry|donut|doughnut|bun|wrap|pitta|pita|bagel|brioche|sourdough|loaf|pancake|waffle|crumpet|flour|yeast|baking|danish|pain|ciabatta|flatbread|tortilla|naan|sponge|tart|turnover|wheaten|cookie|pie|flapjack|brownie|shortbread|eclair|strudel|pretzel|cracker|focaccia|panini|naan|calzone)'
    ORDER BY p.name
  `, [aldiStoreId]);

  console.log(`Remaining non-obvious Bakery items (${bakeryItems.rows.length}):`);
  for (const r of bakeryItems.rows) {
    console.log(`  ${r.name}`);
  }

  // Actually the remaining 10 from the regex check include camping, planter etc.
  // Let's look at those specifically
  const cats = await client.query(`SELECT id, slug FROM "Category"`);
  const catMap = {};
  for (const c of cats.rows) catMap[c.slug] = c.id;

  // Move ALL remaining non-food items (the broader list above minus actual bakery items)
  // Items like "Almond Fingers" are bakery. Items like "Solar Mushroom Stake Light" are not.
  const nonFood = await client.query(`
    SELECT p.id, p.name FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    AND c.slug = 'bakery'
    AND LOWER(p.name) ~ '(planter|garden|solar|ceramic|candle|diffuser|mirror|decorat|stake light|produce keeper|fruit keeper|mixing bowl|batter bowl|scale|cutlery|divided plate|tumbler|stand mixer|confetti|glasses|bonnet|hunt kit|rabbit spring|easter wooden|ball assortment|bath bombz|claw clip|serum|primer|concealer|blush|bronzer|berry produce|classic stand|cyclonic|digital kitchen|children.*tool|children.*bench|children.*bottle)'
    ORDER BY p.name
  `, [aldiStoreId]);

  if (nonFood.rows.length > 0) {
    console.log(`\nMoving ${nonFood.rows.length} additional non-food items to Household:`);
    for (const r of nonFood.rows) console.log(`  ${r.name}`);
    const ids = nonFood.rows.map(r => r.id);
    await client.query(
      `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::text[])`,
      [catMap['household'], ids]
    );
    console.log(`Done.`);
  }

  // Also move personal care items that slipped through
  const personalCare = await client.query(`
    SELECT p.id, p.name FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    AND c.slug = 'bakery'
    AND LOWER(p.name) ~ '(serum|primer|concealer|blush|bronzer|mascara|foundation|lipstick|bath bombz|claw clip)'
    ORDER BY p.name
  `, [aldiStoreId]);

  if (personalCare.rows.length > 0) {
    console.log(`\nMoving ${personalCare.rows.length} personal care items to Personal Care:`);
    for (const r of personalCare.rows) console.log(`  ${r.name}`);
    const ids = personalCare.rows.map(r => r.id);
    await client.query(
      `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::text[])`,
      [catMap['personal-care'], ids]
    );
    console.log(`Done.`);
  }

  // Move food items to correct categories
  // Coleslaw -> Dairy & Eggs (deli section)
  // Custard -> Dairy & Eggs
  // Dry Roasted Peanuts, Cashew Nuts, Pistachios -> Snacks & Sweets
  // Frankfurters, Black & White Puddings, Crumbed Ham -> Meat & Poultry
  // Cheese & Tomato Pizza -> Frozen
  // Crinkle Cut Fries, Curly Fries -> Frozen
  // Dark Chocolate items -> Snacks & Sweets
  // Demerara Sugar, Caster Sugar, Basmati Rice -> Pantry & Cupboard
  const foodFixes = [
    { regex: '(coleslaw|custard)', target: 'dairy-eggs', label: 'Deli/dairy' },
    { regex: '(peanuts|cashew|pistachio|almond finger|chocolate coated)', target: 'snacks-sweets', label: 'Snacks' },
    { regex: '(frankfurter|puddings|crumbed ham|salami)', target: 'meat-poultry', label: 'Meat' },
    { regex: '(pizza|fries|crinkle cut)', target: 'frozen', label: 'Frozen' },
    { regex: '(sugar|basmati|rice)', target: 'pantry-cupboard', label: 'Pantry' },
    { regex: '(cognac|champagne|prosecco|wine|whiskey|vodka|gin|rum|beer|lager|cider)', target: 'drinks', label: 'Drinks' },
  ];

  for (const fix of foodFixes) {
    const items = await client.query(`
      SELECT p.id, p.name FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
      AND c.slug = 'bakery'
      AND LOWER(p.name) ~ '${fix.regex}'
      ORDER BY p.name
    `, [aldiStoreId]);

    if (items.rows.length > 0) {
      console.log(`\nMoving ${items.rows.length} ${fix.label} items from Bakery to ${fix.target}:`);
      for (const r of items.rows) console.log(`  ${r.name}`);
      const ids = items.rows.map(r => r.id);
      await client.query(
        `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::text[])`,
        [catMap[fix.target], ids]
      );
    }
  }

  // Final count
  const finalBakery = await client.query(`
    SELECT COUNT(*) as cnt FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true AND c.slug = 'bakery'
  `, [aldiStoreId]);
  console.log(`\nAldi Bakery now has ${finalBakery.rows[0].cnt} products.`);

  // Final category distribution
  const finalCats = await client.query(`
    SELECT c.name, COUNT(*) as cnt FROM "Product" p
    JOIN "Price" pr ON pr."productId" = p.id
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
    GROUP BY c.name ORDER BY cnt DESC
  `, [aldiStoreId]);
  console.log('\nFinal Aldi category distribution:');
  for (const r of finalCats.rows) console.log(`  ${r.name}: ${r.cnt}`);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
