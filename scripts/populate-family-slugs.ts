/**
 * Populate the familySlug field for all products.
 * familySlug groups products with the same base name but different sizes.
 *
 * Usage: npx tsx scripts/populate-family-slugs.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { productFamilySlug } from "../src/lib/scraper/matcher";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, weight: true, weightUnit: true, familySlug: true },
  });

  console.log(`Populating familySlug for ${products.length} products...`);

  let updated = 0;
  for (const p of products) {
    const fSlug = productFamilySlug(
      p.name,
      p.weight ?? undefined,
      p.weightUnit ?? undefined
    );

    if (fSlug !== p.familySlug) {
      await prisma.product.update({
        where: { id: p.id },
        data: { familySlug: fSlug },
      });
      updated++;
    }
  }

  console.log(`Updated: ${updated} products`);

  // Show stats
  const families = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT COUNT(*) as count FROM (
      SELECT "familySlug" FROM "Product"
      WHERE "isActive" = true AND "familySlug" IS NOT NULL
      GROUP BY "familySlug"
      HAVING COUNT(*) > 1
    ) sub
  `);
  console.log(`Product families (2+ sizes): ${families[0]?.count ?? 0}`);

  const crossStore = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT COUNT(*) as count FROM (
      SELECT p."familySlug" FROM "Product" p
      JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      WHERE p."isActive" = true AND p."familySlug" IS NOT NULL
      GROUP BY p."familySlug"
      HAVING COUNT(DISTINCT pr."storeId") >= 2
    ) sub
  `);
  console.log(`Cross-store families (2+ stores): ${crossStore[0]?.count ?? 0}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
