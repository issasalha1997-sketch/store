/**
 * Re-normalize product names and slugs to improve cross-store matching.
 * Also merges products that now have the same slug after re-normalization.
 *
 * Usage: npx tsx scripts/fix-matching.ts
 *        npx tsx scripts/fix-matching.ts --dry-run   (preview only)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  canonicalProductName,
  productMatchSlug,
} from "../src/lib/scraper/matcher";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(
    isDryRun
      ? "=== DRY RUN — No changes will be made ==="
      : "=== Re-normalizing product names and slugs ==="
  );
  console.log();

  // Get all active products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      prices: { where: { isLatest: true }, include: { store: true } },
    },
    orderBy: { name: "asc" },
  });

  console.log(`Found ${products.length} active products\n`);

  // Group products by their NEW slug to find merges needed
  const slugMap = new Map<
    string,
    Array<{
      id: string;
      name: string;
      slug: string;
      newName: string;
      newSlug: string;
      brand: string | null;
      imageUrl: string | null;
      weight: number | null;
      weightUnit: string | null;
      priceCount: number;
    }>
  >();

  let renamed = 0;
  let slugChanged = 0;

  for (const p of products) {
    const newName = canonicalProductName(
      p.name,
      p.weight ?? undefined,
      p.weightUnit ?? undefined
    );
    const newSlug = productMatchSlug(
      p.name,
      p.weight ?? undefined,
      p.weightUnit ?? undefined
    );

    if (newName !== p.name) renamed++;
    if (newSlug !== p.slug) slugChanged++;

    const entry = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      newName,
      newSlug,
      brand: p.brand,
      imageUrl: p.imageUrl,
      weight: p.weight,
      weightUnit: p.weightUnit,
      priceCount: p.prices.length,
    };

    if (!slugMap.has(newSlug)) {
      slugMap.set(newSlug, []);
    }
    slugMap.get(newSlug)!.push(entry);
  }

  console.log(`Names that would change: ${renamed}`);
  console.log(`Slugs that would change: ${slugChanged}`);

  // Find merges needed (multiple products mapping to same slug)
  const merges = [...slugMap.entries()].filter(([, items]) => items.length > 1);
  console.log(`\nMerge groups found: ${merges.length}`);

  // Show some sample merges
  const samplesShown = Math.min(merges.length, 30);
  if (samplesShown > 0) {
    console.log(`\nSample merges (showing ${samplesShown}):`);
    for (let i = 0; i < samplesShown; i++) {
      const [slug, items] = merges[i];
      console.log(`  → "${items[0].newName}" (slug: ${slug})`);
      for (const item of items) {
        console.log(
          `    - "${item.name}" (${item.priceCount} prices, slug: ${item.slug})`
        );
      }
    }
  }

  if (isDryRun) {
    console.log(
      "\n=== DRY RUN COMPLETE. Run without --dry-run to apply changes ==="
    );
    await prisma.$disconnect();
    return;
  }

  // Apply changes
  console.log("\n=== Applying changes ===\n");

  let updated = 0;
  let merged = 0;

  // First, handle merges
  for (const [, items] of merges) {
    // Pick the "best" product as target (most prices, or has brand/image)
    items.sort((a, b) => {
      if (a.priceCount !== b.priceCount)
        return b.priceCount - a.priceCount;
      if (a.imageUrl && !b.imageUrl) return -1;
      if (!a.imageUrl && b.imageUrl) return 1;
      if (a.brand && !b.brand) return -1;
      if (!a.brand && b.brand) return 1;
      return 0;
    });

    const target = items[0];
    const sources = items.slice(1);

    for (const source of sources) {
      try {
        // Move prices from source to target
        await prisma.price.updateMany({
          where: { productId: source.id },
          data: { productId: target.id },
        });

        // Move reviews
        await prisma.review.updateMany({
          where: { productId: source.id },
          data: { productId: target.id },
        });

        // Move basket items (delete if conflict)
        try {
          await prisma.basketItem.updateMany({
            where: { productId: source.id },
            data: { productId: target.id },
          });
        } catch {
          // Unique constraint violation — delete source basket items
          await prisma.basketItem.deleteMany({
            where: { productId: source.id },
          });
        }

        // Deactivate source product
        await prisma.product.update({
          where: { id: source.id },
          data: { isActive: false },
        });

        merged++;
      } catch (err) {
        console.error(
          `  Error merging "${source.name}" → "${target.newName}":`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // Update target product with new name/slug
    try {
      await prisma.product.update({
        where: { id: target.id },
        data: {
          name: target.newName,
          slug: target.newSlug,
          // Fill in missing data from sources
          ...(target.brand
            ? {}
            : { brand: sources.find((s) => s.brand)?.brand || null }),
          ...(target.imageUrl
            ? {}
            : {
                imageUrl: sources.find((s) => s.imageUrl)?.imageUrl || null,
              }),
        },
      });
      updated++;
    } catch (err) {
      console.error(
        `  Error updating "${target.newName}":`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Update remaining products (no merge needed, just rename)
  for (const [, items] of slugMap.entries()) {
    if (items.length > 1) continue; // Already handled above

    const item = items[0];
    if (item.newName !== item.name || item.newSlug !== item.slug) {
      try {
        await prisma.product.update({
          where: { id: item.id },
          data: {
            name: item.newName,
            slug: item.newSlug,
          },
        });
        updated++;
      } catch (err) {
        // Slug conflict — might be another existing product
        // Skip rather than error
      }
    }
  }

  console.log(`Products updated: ${updated}`);
  console.log(`Products merged: ${merged}`);

  // Final stats
  const finalPrices = await prisma.price.count({ where: { isLatest: true } });
  const finalProducts = await prisma.product.count({
    where: { isActive: true },
  });
  const crossStore = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM (SELECT "productId" FROM "Price" WHERE "isLatest" = true GROUP BY "productId" HAVING COUNT(DISTINCT "storeId") >= 2) sub`
  );

  console.log(`\n=== Final Stats ===`);
  console.log(`Active products: ${finalProducts}`);
  console.log(`Latest prices: ${finalPrices}`);
  console.log(`Cross-store matches: ${crossStore[0]?.count ?? 0}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
