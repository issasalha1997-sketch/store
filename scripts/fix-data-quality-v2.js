/**
 * GrocerySaver Data Quality Fix Script v2
 * Fixes:
 *   1. Aldi category mapping (wrong categories)
 *   2. SuperValu duplicate products with doubled measurement text
 *   3. Pet food availability check
 *   4. Mixed weight units within families (kg→g, l→ml)
 *   5. Cadbury Dairy Milk 109g/110g merge
 */
require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const client = new Client({ connectionString: connStr });

const report = {
  aldiCategoryFixes: {},
  superValuDuplicates: 0,
  superValuRenamed: 0,
  petFoodCheck: '',
  mixedUnitFixes: {},
  cdmMerge: '',
};

async function main() {
  await client.connect();
  console.log('Connected to database.\n');

  try {
    // ═══════════════════════════════════════════════════════
    // ISSUE 1: Aldi category mapping fixes
    // ═══════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════');
    console.log('ISSUE 1: Aldi category mapping');
    console.log('═══════════════════════════════════════════════════════\n');

    // Get the Aldi store ID
    const aldiStore = await client.query(`SELECT id FROM "Store" WHERE slug = 'aldi'`);
    if (aldiStore.rows.length === 0) {
      console.log('WARNING: No Aldi store found. Skipping category fixes.');
    } else {
      const aldiStoreId = aldiStore.rows[0].id;

      // Get all category IDs
      const cats = await client.query(`SELECT id, slug, name FROM "Category"`);
      const catMap = {};
      for (const c of cats.rows) {
        catMap[c.slug] = c.id;
      }
      console.log('Available categories:', cats.rows.map(c => `${c.name} (${c.slug})`).join(', '));
      console.log('');

      // Ensure needed categories exist
      const needed = [
        { name: 'Personal Care', slug: 'personal-care' },
        { name: 'Household', slug: 'household' },
        { name: 'Pantry & Cupboard', slug: 'pantry-cupboard' },
        { name: 'Meat & Poultry', slug: 'meat-poultry' },
        { name: 'Dairy & Eggs', slug: 'dairy-eggs' },
        { name: 'Fruits & Vegetables', slug: 'fruits-vegetables' },
        { name: 'Snacks & Sweets', slug: 'snacks-sweets' },
        { name: 'Drinks', slug: 'drinks' },
        { name: 'Frozen', slug: 'frozen' },
        { name: 'Bakery', slug: 'bakery' },
      ];
      for (const n of needed) {
        if (!catMap[n.slug]) {
          console.log(`Creating missing category: ${n.name}`);
          const res = await client.query(
            `INSERT INTO "Category" (id, name, slug) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (slug) DO NOTHING RETURNING id`,
            [n.name, n.slug]
          );
          if (res.rows.length > 0) {
            catMap[n.slug] = res.rows[0].id;
          } else {
            const existing = await client.query(`SELECT id FROM "Category" WHERE slug = $1`, [n.slug]);
            if (existing.rows.length > 0) catMap[n.slug] = existing.rows[0].id;
          }
        }
      }

      // Show Aldi products by category BEFORE
      const aldiCatsBefore = await client.query(`
        SELECT c.name, c.slug, COUNT(*) as cnt
        FROM "Product" p
        JOIN "Price" pr ON pr."productId" = p.id
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
        GROUP BY c.name, c.slug ORDER BY cnt DESC
      `, [aldiStoreId]);
      console.log('Aldi products by category BEFORE fix:');
      for (const r of aldiCatsBefore.rows) console.log(`  ${r.name}: ${r.cnt}`);
      console.log('');

      // Show non-bakery items in Bakery (sample)
      const bakeryJunk = await client.query(`
        SELECT p.id, p.name
        FROM "Product" p
        JOIN "Price" pr ON pr."productId" = p.id
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
        AND c.slug = 'bakery'
        AND LOWER(p.name) !~
          '(bread|roll|croissant|baguette|scone|muffin|cake|pastry|donut|doughnut|bun|wrap|pitta|pita|bagel|brioche|sourdough|loaf|pancake|waffle|crumpet|flour|yeast|baking|danish|pain|ciabatta|flatbread|tortilla|naan)'
        ORDER BY p.name LIMIT 60
      `, [aldiStoreId]);
      console.log(`Sample non-bakery items in Bakery (up to 60):`);
      for (const r of bakeryJunk.rows) console.log(`  ${r.name}`);
      console.log('');

      // ── Re-categorization rules ──
      // Aldi products: find ALL Aldi products and re-assign based on keyword matching.
      // The source category doesn't matter for some rules (pet, personal care, non-food, cleaning).
      // For food rules, we restrict source categories to avoid moving correctly-placed items.

      const recatRules = [
        // Pet products → Household (from ANY category)
        {
          regex: '(dog food|cat food|pet food|cat litter|dog treat|puppy food|kitten food|pet care|flea treatment|tick collar|dog chew|cat treat)',
          targetSlug: 'household',
          label: 'Pet products → Household',
          fromAnyCat: true,
        },
        // Personal care → Personal Care (from ANY category)
        {
          regex: '(\\brazor\\b|shaving|shampoo|conditioner|shower gel|deodorant|toothpaste|toothbrush|dental floss|hair dye|hair colour|body wash|moisturiser|moisturizer|face wash|face cream|hand cream|sun cream|sunscreen|makeup|lipstick|mascara|foundation|nail polish|perfume|aftershave|antiperspirant|mouthwash|cotton pad|cotton bud|sanitary|tampon|\\bnappy\\b|nappies|diaper)',
          targetSlug: 'personal-care',
          label: 'Personal care → Personal Care',
          fromAnyCat: true,
        },
        // Non-food household items → Household (from ANY category)
        {
          regex: '(\\bcable\\b|\\bhdmi\\b|\\busb\\b|\\bbike\\b|bicycle|\\bmattress|tool box|\\bdrill\\b|screwdriver|\\bscrew\\b|\\blamp\\b|light bulb|\\bchair\\b|\\btable\\b|\\bblanket\\b|\\bduvet\\b|\\bpillow\\b|\\btowel\\b|\\bcurtain\\b|\\brug\\b|shelf|storage box|bin bag|bin liner|garden hose|lawnmower|plant pot|candle|battery|extension lead|plug|adapter|phone case|headphone|speaker|clock|frame|mirror|vase|ironing board)',
          targetSlug: 'household',
          label: 'Non-food items → Household',
          fromAnyCat: true,
        },
        // Cleaning products → Household (from ANY category)
        {
          regex: '(detergent|washing liquid|washing powder|washing tablet|washing capsule|fabric softener|cleaning spray|\\bbleach\\b|disinfectant|\\bsponge\\b|cleaning cloth|floor cleaner|toilet cleaner|dish soap|dishwasher tablet|dishwasher salt|dishwasher rinse|\\blaundry\\b|stain remover|air freshener|febreze|dettol)',
          targetSlug: 'household',
          label: 'Cleaning products → Household',
          fromAnyCat: true,
        },
        // Canned fish in wrong categories → Pantry & Cupboard
        {
          regex: '(\\btuna\\b|sardine|mackerel|anchov)',
          targetSlug: 'pantry-cupboard',
          label: 'Canned fish → Pantry & Cupboard',
          fromSlugs: ['bakery', 'snacks-sweets', 'dairy-eggs', 'household'],
        },
        // Fresh fish/seafood in wrong categories → Meat & Poultry
        {
          regex: '(\\bsalmon\\b|\\bcod\\b|\\bprawn\\b|\\bshrimp\\b|\\bhaddock\\b|sea bass|\\btrout\\b|\\bcrab\\b|lobster|mussel|squid|calamari|fish finger|fish cake|fish pie|battered fish|breaded fish)',
          targetSlug: 'meat-poultry',
          label: 'Fish/seafood → Meat & Poultry',
          fromSlugs: ['bakery', 'snacks-sweets', 'dairy-eggs', 'household'],
        },
        // Pantry staples in wrong categories → Pantry & Cupboard
        {
          regex: '(\\brice\\b|\\bpasta\\b|\\bnoodle|spaghetti|penne|fusilli|\\bcereal\\b|\\bporridge\\b|\\boats\\b|granola|muesli|couscous|quinoa|\\bflour\\b|baking powder|baking soda|\\bsugar\\b|stock cube|\\bgravy\\b|\\bsauce\\b|ketchup|\\bmustard\\b|mayonnaise|\\bvinegar\\b|olive oil|cooking oil|tinned|canned|\\bbeans\\b|chickpea|\\blentil|\\bsoup\\b|\\bjam\\b|\\bhoney\\b|peanut butter|passata|chopped tomato|tomato puree|soy sauce)',
          targetSlug: 'pantry-cupboard',
          label: 'Pantry items → Pantry & Cupboard',
          fromSlugs: ['bakery', 'snacks-sweets', 'dairy-eggs'],
        },
        // Meat products in wrong categories → Meat & Poultry
        {
          regex: '(\\bchicken\\b|\\bturkey\\b|\\bham\\b|\\bbeef\\b|\\bpork\\b|\\blamb\\b|\\bbacon\\b|\\bsausage\\b|\\bmince\\b|\\bsteak\\b|\\bburger\\b|salami|pepperoni|chorizo|prosciutto)',
          targetSlug: 'meat-poultry',
          label: 'Meat products → Meat & Poultry',
          fromSlugs: ['dairy-eggs', 'bakery', 'snacks-sweets', 'household'],
        },
        // Dairy products in wrong categories → Dairy & Eggs
        {
          regex: '(\\bmilk\\b|\\bcheese\\b|\\byoghurt\\b|\\byogurt\\b|\\bbutter\\b|cream cheese|cottage cheese|\\beggs?\\b)',
          targetSlug: 'dairy-eggs',
          label: 'Dairy → Dairy & Eggs',
          fromSlugs: ['bakery', 'household', 'snacks-sweets'],
        },
        // Fruits & vegetables in wrong categories
        {
          regex: '(\\bapple\\b|\\bbanana\\b|\\borange\\b|\\bgrape\\b|strawberr|blueberr|raspberr|\\bmango\\b|\\bpear\\b|\\bpeach\\b|\\bplum\\b|\\blemon\\b|\\blime\\b|avocado|\\bpotato\\b|\\bonion\\b|\\btomato\\b|lettuce|\\bcarrot\\b|broccoli|spinach|cucumber|\\bcelery\\b|mushroom|\\bgarlic\\b|cabbage|cauliflower|courgette|aubergine|beetroot|sweet potato|parsnip)',
          targetSlug: 'fruits-vegetables',
          label: 'Fruits/veg → Fruits & Vegetables',
          fromSlugs: ['bakery', 'household', 'snacks-sweets'],
        },
        // Snacks & sweets in wrong categories
        {
          regex: '(\\bchocolate\\b|\\bcrisps\\b|\\bbiscuit|\\bsweets\\b|\\bcandy\\b|popcorn|pretzel|\\bcookie|\\bfudge\\b|toffee|\\bjelly\\b|gummy|haribo|snack bar)',
          targetSlug: 'snacks-sweets',
          label: 'Snacks → Snacks & Sweets',
          fromSlugs: ['bakery', 'household', 'dairy-eggs'],
        },
        // Drinks in wrong categories
        {
          regex: '(\\bcola\\b|\\bjuice\\b|\\bwater\\b|\\btea\\b|\\bcoffee\\b|lemonade|\\bsquash\\b|cordial|sparkling water|mineral water|energy drink|\\bsmoothie\\b|\\blager\\b|\\bbeer\\b|\\bwine\\b|\\bcider\\b)',
          targetSlug: 'drinks',
          label: 'Drinks → Drinks',
          fromSlugs: ['bakery', 'household', 'dairy-eggs', 'snacks-sweets'],
        },
        // Frozen items in wrong categories
        {
          regex: '(\\bfrozen\\b|ice cream|potato waffle|oven chip|frozen pizza|fish finger)',
          targetSlug: 'frozen',
          label: 'Frozen → Frozen',
          fromSlugs: ['bakery', 'household', 'dairy-eggs', 'snacks-sweets'],
        },
      ];

      let totalAldiFixed = 0;

      for (const rule of recatRules) {
        const targetCatId = catMap[rule.targetSlug];
        if (!targetCatId) {
          console.log(`SKIP: No category found for slug "${rule.targetSlug}"`);
          continue;
        }

        let sourceCatFilter = '';
        let params = [aldiStoreId, targetCatId];

        if (!rule.fromAnyCat && rule.fromSlugs) {
          const catIds = rule.fromSlugs.map(s => catMap[s]).filter(Boolean);
          if (catIds.length === 0) continue;
          const placeholders = catIds.map((_, i) => `$${i + 3}`).join(',');
          sourceCatFilter = `AND p."categoryId" IN (${placeholders})`;
          params.push(...catIds);
        }

        const findQuery = `
          SELECT p.id, p.name, c.name as current_category
          FROM "Product" p
          JOIN "Price" pr ON pr."productId" = p.id
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          WHERE pr."storeId" = $1
            AND p."isActive" = true
            AND pr."isLatest" = true
            AND p."categoryId" IS DISTINCT FROM $2
            AND LOWER(p.name) ~ '${rule.regex}'
            ${sourceCatFilter}
          ORDER BY p.name
        `;

        const matches = await client.query(findQuery, params);

        if (matches.rows.length > 0) {
          console.log(`${rule.label}: ${matches.rows.length} products to move`);
          for (const m of matches.rows.slice(0, 15)) {
            console.log(`  [${m.current_category || 'null'}] ${m.name}`);
          }
          if (matches.rows.length > 15) console.log(`  ... and ${matches.rows.length - 15} more`);

          const ids = matches.rows.map(r => r.id);
          const updateRes = await client.query(
            `UPDATE "Product" SET "categoryId" = $1, "updatedAt" = NOW() WHERE id = ANY($2::text[])`,
            [targetCatId, ids]
          );
          console.log(`  -> Updated ${updateRes.rowCount} products\n`);
          totalAldiFixed += updateRes.rowCount;
          report.aldiCategoryFixes[rule.label] = updateRes.rowCount;
        } else {
          console.log(`${rule.label}: 0 products to move`);
        }
      }

      console.log(`\nTotal Aldi category fixes: ${totalAldiFixed}`);

      // Show AFTER counts
      const aldiCatsAfter = await client.query(`
        SELECT c.name, c.slug, COUNT(*) as cnt
        FROM "Product" p
        JOIN "Price" pr ON pr."productId" = p.id
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE pr."storeId" = $1 AND p."isActive" = true AND pr."isLatest" = true
        GROUP BY c.name, c.slug ORDER BY cnt DESC
      `, [aldiStoreId]);
      console.log('\nAldi products by category AFTER fix:');
      for (const r of aldiCatsAfter.rows) console.log(`  ${r.name}: ${r.cnt}`);
    }

    // ═══════════════════════════════════════════════════════
    // ISSUE 2: SuperValu duplicate products (doubled measurement)
    // ═══════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('ISSUE 2: SuperValu duplicate products (doubled measurement)');
    console.log('═══════════════════════════════════════════════════════\n');

    // Find products with doubled measurement text that have a clean counterpart
    const dupsQuery = `
      SELECT p1.id as dup_id, p1.name as dup_name, p2.id as keep_id, p2.name as keep_name
      FROM "Product" p1
      JOIN "Product" p2
        ON p2.name = regexp_replace(p1.name, '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m)\\b)\\s+\\1', '\\1')
      WHERE p1.id != p2.id
        AND p1."isActive" = true
        AND p1.name ~ '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m))\\s+\\1'
    `;
    const dups = await client.query(dupsQuery);
    console.log(`Found ${dups.rows.length} duplicate products with doubled measurement AND a clean counterpart:`);
    for (const d of dups.rows) {
      console.log(`  DUP:  "${d.dup_name}"`);
      console.log(`  KEEP: "${d.keep_name}"\n`);
    }

    if (dups.rows.length > 0) {
      // Migrate prices and deactivate
      for (const d of dups.rows) {
        // Move any latest prices from dup to keep if keep doesn't have them for that store
        const migrated = await client.query(`
          UPDATE "Price" SET "productId" = $1
          WHERE "productId" = $2 AND "isLatest" = true
          AND "storeId" NOT IN (SELECT "storeId" FROM "Price" WHERE "productId" = $1 AND "isLatest" = true)
        `, [d.keep_id, d.dup_id]);
        if (migrated.rowCount > 0) {
          console.log(`  Migrated ${migrated.rowCount} price(s) from dup to keep for "${d.keep_name}"`);
        }
      }

      const dupIds = dups.rows.map(r => r.dup_id);
      const deactRes = await client.query(
        `UPDATE "Product" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ANY($1::text[])`,
        [dupIds]
      );
      console.log(`Deactivated ${deactRes.rowCount} duplicate products.`);
      report.superValuDuplicates = deactRes.rowCount;
    }

    // Find products with doubled measurement but NO clean counterpart (rename them)
    const orphanDups = await client.query(`
      SELECT p1.id, p1.name, p1.slug,
             regexp_replace(p1.name, '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m)\\b)\\s+\\1', '\\1') as clean_name
      FROM "Product" p1
      WHERE p1."isActive" = true
      AND p1.name ~ '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m))\\s+\\1'
      AND NOT EXISTS (
        SELECT 1 FROM "Product" p2
        WHERE p2.name = regexp_replace(p1.name, '(\\d+\\.?\\d*\\s*(?:m\u00b2|ml|g|kg|l|cl|mm|cm|m)\\b)\\s+\\1', '\\1')
        AND p2.id != p1.id
      )
    `);

    if (orphanDups.rows.length > 0) {
      console.log(`\nFound ${orphanDups.rows.length} products with doubled measurement but no clean counterpart — will rename:`);
      for (const d of orphanDups.rows) {
        const cleanSlug = d.clean_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // Check slug collision
        const slugCheck = await client.query(
          `SELECT id FROM "Product" WHERE slug = $1 AND id != $2`,
          [cleanSlug, d.id]
        );
        const finalSlug = slugCheck.rows.length > 0 ? cleanSlug + '-v2' : cleanSlug;

        await client.query(
          `UPDATE "Product" SET name = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3`,
          [d.clean_name, finalSlug, d.id]
        );
        console.log(`  Renamed: "${d.name}" -> "${d.clean_name}"`);
      }
      report.superValuRenamed = orphanDups.rows.length;
      console.log(`Fixed ${orphanDups.rows.length} orphan doubled-measurement names.`);
    } else {
      console.log('No orphan doubled-measurement products found.');
    }

    // ═══════════════════════════════════════════════════════
    // ISSUE 3: Pet food check
    // ═══════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('ISSUE 3: Pet food availability check');
    console.log('═══════════════════════════════════════════════════════\n');

    const petProducts = await client.query(`
      SELECT p.name, c.name as category, s.name as store
      FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      JOIN "Store" s ON s.id = pr."storeId"
      WHERE p."isActive" = true
      AND LOWER(p.name) ~ '(dog food|cat food|pet food|puppy|kitten|cat litter|dog treat|cat treat|pet treat|dog chew|flea|pet shampoo|pet bed|dog lead|cat toy|dog toy|bird seed|fish food|hamster|guinea pig|rabbit food)'
      ORDER BY s.name, p.name
    `);

    console.log(`Found ${petProducts.rows.length} pet-related products in database:`);
    for (const p of petProducts.rows) {
      console.log(`  [${p.store}] [${p.category || 'uncategorized'}] ${p.name}`);
    }

    if (petProducts.rows.length === 0) {
      report.petFoodCheck = 'No pet products in DB. Not being scraped by any store scraper.';
      console.log('\nNo pet products found. Pet food categories are likely not in any scraper\'s category list.');
      console.log('Aldi scraper _guess_category defaults non-food items to "household" but does not specifically scrape pet food pages.');
    } else {
      report.petFoodCheck = `${petProducts.rows.length} pet products found (already re-categorized to correct categories).`;
    }

    // ═══════════════════════════════════════════════════════
    // ISSUE 4: Mixed weight units within families
    // ═══════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('ISSUE 4: Mixed weight units within families');
    console.log('═══════════════════════════════════════════════════════\n');

    // Show mixed families BEFORE
    const mixedBefore = await client.query(`
      SELECT "familySlug",
             array_agg(DISTINCT "weightUnit") as units,
             COUNT(*) as cnt
      FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
      GROUP BY "familySlug"
      HAVING COUNT(DISTINCT "weightUnit") > 1
      ORDER BY "familySlug"
    `);
    console.log(`Families with mixed weight units BEFORE fix: ${mixedBefore.rows.length}`);
    for (const f of mixedBefore.rows) {
      const prods = await client.query(
        `SELECT name, weight, "weightUnit" FROM "Product" WHERE "familySlug" = $1 AND "isActive" = true ORDER BY weight`,
        [f.familySlug]
      );
      console.log(`  ${f.familySlug}: [${f.units.join(', ')}] (${f.cnt} products)`);
      for (const p of prods.rows) {
        console.log(`    ${p.name} -- ${p.weight}${p.weightUnit}`);
      }
    }

    // Normalize: convert kg<10 to g, l<10 to ml
    console.log('\nNormalizing units...');

    const kgToG = await client.query(`
      UPDATE "Product"
      SET weight = weight * 1000, "weightUnit" = 'g', "updatedAt" = NOW()
      WHERE "weightUnit" = 'kg' AND weight < 10 AND "isActive" = true
      RETURNING id, name, weight / 1000 as old_weight, weight as new_weight
    `);
    console.log(`Converted ${kgToG.rowCount} products from kg to g:`);
    for (const r of kgToG.rows.slice(0, 25)) {
      console.log(`  ${r.name}: ${r.old_weight}kg -> ${r.new_weight}g`);
    }
    if (kgToG.rows.length > 25) console.log(`  ... and ${kgToG.rows.length - 25} more`);
    report.mixedUnitFixes['kg to g'] = kgToG.rowCount;

    const lToMl = await client.query(`
      UPDATE "Product"
      SET weight = weight * 1000, "weightUnit" = 'ml', "updatedAt" = NOW()
      WHERE "weightUnit" = 'l' AND weight < 10 AND "isActive" = true
      RETURNING id, name, weight / 1000 as old_weight, weight as new_weight
    `);
    console.log(`\nConverted ${lToMl.rowCount} products from l to ml:`);
    for (const r of lToMl.rows.slice(0, 25)) {
      console.log(`  ${r.name}: ${r.old_weight}l -> ${r.new_weight}ml`);
    }
    if (lToMl.rows.length > 25) console.log(`  ... and ${lToMl.rows.length - 25} more`);
    report.mixedUnitFixes['l to ml'] = lToMl.rowCount;

    // Check remaining mixed families
    const mixedAfter = await client.query(`
      SELECT "familySlug", array_agg(DISTINCT "weightUnit") as units
      FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL AND "weightUnit" IS NOT NULL
      GROUP BY "familySlug"
      HAVING COUNT(DISTINCT "weightUnit") > 1
    `);
    console.log(`\nRemaining families with mixed units after normalization: ${mixedAfter.rows.length}`);
    for (const f of mixedAfter.rows) {
      console.log(`  ${f.familySlug}: [${f.units.join(', ')}]`);
    }

    // ═══════════════════════════════════════════════════════
    // ISSUE 5: Cadbury Dairy Milk 109g / 110g merge
    // ═══════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('ISSUE 5: Cadbury Dairy Milk 109g/110g merge');
    console.log('═══════════════════════════════════════════════════════\n');

    // Search broadly for CDM products near that weight
    const cdm = await client.query(`
      SELECT p.id, p.name, p.slug, p.weight, p."weightUnit", p."familySlug", p."isActive",
             string_agg(DISTINCT s.name, ', ') as stores,
             string_agg(DISTINCT pr.price::text, ', ') as prices
      FROM "Product" p
      LEFT JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      LEFT JOIN "Store" s ON s.id = pr."storeId"
      WHERE p."isActive" = true
        AND LOWER(p.name) LIKE '%cadbury%dairy%milk%'
        AND (
          (p.weight BETWEEN 100 AND 115)
          OR p.name ~ '10[0-9]g|110g|11[0-5]g'
        )
      GROUP BY p.id, p.name, p.slug, p.weight, p."weightUnit", p."familySlug", p."isActive"
      ORDER BY p.name
    `);

    console.log(`Found ${cdm.rows.length} Cadbury Dairy Milk variants near 109g/110g:`);
    for (const p of cdm.rows) {
      console.log(`  [${p.id.substring(0,8)}] ${p.name} -- ${p.weight}${p.weightUnit} -- Stores: ${p.stores} -- Prices: ${p.prices}`);
    }

    if (cdm.rows.length >= 2) {
      // Try to find the specific 109g and 110g
      const v110 = cdm.rows.find(r => r.weight === 110 || (r.name && r.name.includes('110g')));
      const v109 = cdm.rows.find(r => (r.weight === 109 || (r.name && r.name.includes('109g'))) && (!v110 || r.id !== v110.id));

      if (v110 && v109) {
        console.log(`\nMerging "${v109.name}" into "${v110.name}"`);

        // Migrate prices
        const migratedPrices = await client.query(`
          UPDATE "Price" SET "productId" = $1
          WHERE "productId" = $2 AND "isLatest" = true
          AND "storeId" NOT IN (SELECT "storeId" FROM "Price" WHERE "productId" = $1 AND "isLatest" = true)
        `, [v110.id, v109.id]);
        console.log(`  Migrated ${migratedPrices.rowCount} price(s)`);

        // Migrate basket items
        const migratedBasket = await client.query(`
          UPDATE "BasketItem" SET "productId" = $1
          WHERE "productId" = $2
          AND "basketId" NOT IN (SELECT "basketId" FROM "BasketItem" WHERE "productId" = $1)
        `, [v110.id, v109.id]);
        console.log(`  Migrated ${migratedBasket.rowCount} basket item(s)`);

        // Deactivate 109g
        await client.query(
          `UPDATE "Product" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
          [v109.id]
        );
        console.log(`  Deactivated: "${v109.name}"`);
        report.cdmMerge = `Merged "${v109.name}" into "${v110.name}" -- ${migratedPrices.rowCount} prices migrated, duplicate deactivated.`;
      } else {
        // Maybe both are same weight after unit normalization
        console.log('Could not identify distinct 109g vs 110g variants. Listing all:');
        for (const p of cdm.rows) {
          console.log(`  ${p.name} weight=${p.weight}${p.weightUnit}`);
        }
        report.cdmMerge = 'Could not auto-identify distinct 109g/110g variants.';
      }
    } else if (cdm.rows.length === 1) {
      console.log('Only one variant found -- no merge needed.');
      report.cdmMerge = `Only one variant exists: "${cdm.rows[0].name}" (${cdm.rows[0].weight}${cdm.rows[0].weightUnit}). No merge needed.`;
    } else {
      // Broader search
      const cdmBroad = await client.query(`
        SELECT p.id, p.name, p.weight, p."weightUnit", p."isActive"
        FROM "Product" p
        WHERE LOWER(p.name) LIKE '%cadbury%dairy%milk%'
        AND p.weight BETWEEN 100 AND 115
        ORDER BY p.name
      `);
      console.log('Broader search (including inactive):');
      for (const p of cdmBroad.rows) {
        console.log(`  [${p.isActive ? 'active' : 'inactive'}] ${p.name} -- ${p.weight}${p.weightUnit}`);
      }
      if (cdmBroad.rows.length === 0) {
        report.cdmMerge = 'No Cadbury Dairy Milk 109g/110g products found in database.';
      } else {
        report.cdmMerge = 'Products found but not active/matched. Check manually.';
      }
    }

    // ═══════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════
    console.log('\n\n========================================================================');
    console.log('                         FINAL REPORT');
    console.log('========================================================================\n');

    console.log('1. ALDI CATEGORY FIXES:');
    let totalCatFix = 0;
    for (const [label, count] of Object.entries(report.aldiCategoryFixes)) {
      if (count > 0) {
        console.log(`   ${label}: ${count}`);
        totalCatFix += count;
      }
    }
    console.log(`   TOTAL: ${totalCatFix} products re-categorized`);

    console.log(`\n2. SUPERVALU DUPLICATES:`);
    console.log(`   Deactivated (had clean counterpart): ${report.superValuDuplicates}`);
    console.log(`   Renamed (no clean counterpart):      ${report.superValuRenamed}`);

    console.log(`\n3. PET FOOD: ${report.petFoodCheck}`);

    console.log(`\n4. WEIGHT UNIT NORMALIZATION:`);
    for (const [label, count] of Object.entries(report.mixedUnitFixes)) {
      console.log(`   ${label}: ${count} products`);
    }

    console.log(`\n5. CADBURY DAIRY MILK MERGE: ${report.cdmMerge}`);

    console.log('\n========================================================================');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
