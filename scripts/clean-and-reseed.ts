/**
 * Clean the database and re-import all products with proper cross-store matching.
 * Run with: npx tsx scripts/clean-and-reseed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Database Cleanup & Re-seed ===\n");

  // 1. Count current state
  const currentProducts = await prisma.product.count();
  const currentPrices = await prisma.price.count();
  console.log(`Current state: ${currentProducts} products, ${currentPrices} prices`);

  // 2. Delete in correct order (foreign keys)
  console.log("\nCleaning database...");

  // Delete basket items first (references products)
  const deletedBasketItems = await prisma.basketItem.deleteMany();
  console.log(`  Deleted ${deletedBasketItems.count} basket items`);

  // Delete reviews (references products)
  const deletedReviews = await prisma.review.deleteMany();
  console.log(`  Deleted ${deletedReviews.count} reviews`);

  // Delete prices (references products and stores)
  const deletedPrices = await prisma.price.deleteMany();
  console.log(`  Deleted ${deletedPrices.count} prices`);

  // Delete scrape runs
  const deletedRuns = await prisma.scrapeRun.deleteMany();
  console.log(`  Deleted ${deletedRuns.count} scrape runs`);

  // Delete products
  const deletedProducts = await prisma.product.deleteMany();
  console.log(`  Deleted ${deletedProducts.count} products`);

  console.log("\n✓ Database cleaned. Ready for fresh import.");
  console.log("\nNext steps:");
  console.log("  1. Start the dev server: npm run dev");
  console.log("  2. Trigger scraper: POST /api/admin/scrape { \"store\": \"all\" }");
  console.log("  Or run: curl -X POST http://localhost:3000/api/admin/scrape -H 'Content-Type: application/json' -d '{\"store\":\"all\"}'");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
