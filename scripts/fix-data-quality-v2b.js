/**
 * Fix the SuperValu doubled-measurement issue properly.
 * The v2 script's regex matched too broadly (multipacks like "4x330ml 330ml")
 * and didn't properly handle Unicode m² in regexp_replace.
 *
 * This script:
 * 1. Finds products with truly doubled measurements and fixes the names
 * 2. For "NxWWml WWml" multipack products, removes the trailing per-item size
 */
require('dotenv/config');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
const client = new Client({ connectionString: connStr });

async function main() {
  await client.connect();
  console.log('Connected to database.\n');

  try {
    // Find ALL products where the name ends with a repeated measurement-like suffix
    // We'll handle this in JS where regex is more reliable with Unicode
    const candidates = await client.query(
      "SELECT id, name, slug FROM \"Product\" WHERE \"isActive\" = true " +
      "AND (" +
      "  name ~ '(\\d+\\.?\\d*\\s*m\u00b2)\\s+\\1\\s*$' " +
      "  OR name ~ '\\d+[xX]\\d+\\.?\\d*\\s*(ml|g|kg|l|cl|mm|cm|m)\\s+\\d+\\.?\\d*\\s*(ml|g|kg|l|cl|mm|cm|m)\\s*$' " +
      "  OR name ~ '\\D\\d+\\.?\\d*(ml|g|kg|l|cl)\\s+\\d+\\.?\\d*(ml|g|kg|l|cl)\\s*$' " +
      ") ORDER BY name"
    );

    console.log(`Found ${candidates.rows.length} candidate products to check.\n`);

    let fixedDoubled = 0;
    let fixedMultipack = 0;
    let skipped = 0;

    for (const row of candidates.rows) {
      const name = row.name;

      // Pattern 1: True doubled measurement at end: "... 16.62m² 16.62m²"
      const doubledMatch = name.match(/(\d+\.?\d*\s*(?:m²|ml|g|kg|l|cl|mm|cm|m))\s+(\d+\.?\d*\s*(?:m²|ml|g|kg|l|cl|mm|cm|m))\s*$/);
      if (doubledMatch) {
        const first = doubledMatch[1].replace(/\s/g, '');
        const second = doubledMatch[2].replace(/\s/g, '');

        if (first === second) {
          // True doubled: remove the duplicate
          const cleanName = name.replace(/(\d+\.?\d*\s*(?:m²|ml|g|kg|l|cl|mm|cm|m))\s+\d+\.?\d*\s*(?:m²|ml|g|kg|l|cl|mm|cm|m)\s*$/, '$1').trim();

          if (cleanName !== name) {
            const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            // Check for slug collision
            const slugCheck = await client.query(
              `SELECT id FROM "Product" WHERE slug = $1 AND id != $2`, [cleanSlug, row.id]
            );
            const finalSlug = slugCheck.rows.length > 0 ? cleanSlug + '-sv' : cleanSlug;

            await client.query(
              `UPDATE "Product" SET name = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3`,
              [cleanName, finalSlug, row.id]
            );
            console.log(`DOUBLED: "${name}" -> "${cleanName}"`);
            fixedDoubled++;
            continue;
          }
        }

        // Multipack pattern: "4x330ml 330ml" — the trailing measurement is the per-item size
        // Check if there's a multiplier pattern before
        const multipackMatch = name.match(/(\d+)\s*[xX]\s*(\d+\.?\d*)\s*(ml|g|kg|l|cl|mm|cm|m)\s+(\d+\.?\d*)\s*(ml|g|kg|l|cl|mm|cm|m)\s*$/);
        if (multipackMatch) {
          const perItemInPack = multipackMatch[2] + multipackMatch[3];
          const trailing = multipackMatch[4] + multipackMatch[5];
          if (perItemInPack === trailing) {
            // Remove trailing per-item size
            const cleanName = name.replace(/\s+\d+\.?\d*\s*(?:ml|g|kg|l|cl|mm|cm|m)\s*$/, '').trim();
            if (cleanName !== name) {
              const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              const slugCheck = await client.query(
                `SELECT id FROM "Product" WHERE slug = $1 AND id != $2`, [cleanSlug, row.id]
              );
              const finalSlug = slugCheck.rows.length > 0 ? cleanSlug + '-sv' : cleanSlug;

              await client.query(
                `UPDATE "Product" SET name = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3`,
                [cleanName, finalSlug, row.id]
              );
              console.log(`MULTIPACK: "${name}" -> "${cleanName}"`);
              fixedMultipack++;
              continue;
            }
          }
        }

        // "Name295g 295g" — measurement stuck to word then repeated
        const stuckMatch = name.match(/(\D)(\d+\.?\d*)(ml|g|kg|l|cl)\s+(\d+\.?\d*)(ml|g|kg|l|cl)\s*$/);
        if (stuckMatch && (stuckMatch[2] + stuckMatch[3]) === (stuckMatch[4] + stuckMatch[5])) {
          // Remove the trailing duplicate, keep the stuck one
          const cleanName = name.replace(/\s+\d+\.?\d*(?:ml|g|kg|l|cl)\s*$/, '').trim();
          if (cleanName !== name) {
            const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const slugCheck = await client.query(
              `SELECT id FROM "Product" WHERE slug = $1 AND id != $2`, [cleanSlug, row.id]
            );
            const finalSlug = slugCheck.rows.length > 0 ? cleanSlug + '-sv' : cleanSlug;

            await client.query(
              `UPDATE "Product" SET name = $1, slug = $2, "updatedAt" = NOW() WHERE id = $3`,
              [cleanName, finalSlug, row.id]
            );
            console.log(`STUCK: "${name}" -> "${cleanName}"`);
            fixedDoubled++;
            continue;
          }
        }
      }

      skipped++;
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`True doubled measurements fixed: ${fixedDoubled}`);
    console.log(`Multipack trailing size removed: ${fixedMultipack}`);
    console.log(`Skipped (no change needed): ${skipped}`);

    // Verify: any remaining products with suspicious doubled measurements?
    const remaining = await client.query(
      "SELECT id, name FROM \"Product\" WHERE \"isActive\" = true " +
      "AND name ~ '(\\d+\\.?\\d*\\s*m\u00b2)\\s+\\1'"
    );
    console.log(`\nRemaining products with doubled m² measurements: ${remaining.rows.length}`);
    for (const r of remaining.rows) {
      console.log(`  ${r.name}`);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
