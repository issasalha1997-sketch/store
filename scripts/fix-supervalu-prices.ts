/**
 * Re-import SuperValu prices for products that are missing them.
 * Run with: npx tsx scripts/fix-supervalu-prices.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { canonicalProductName, productMatchSlug } from "../src/lib/scraper/matcher";
import { CATEGORY_MAP } from "../src/lib/scraper/products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const API_BASE = "https://storefrontgateway.supervalu.ie/api";
const STORE_ID = "1733";

const CATEGORIES = [
  { id: "O100001", mapped: "fruits & vegetables" },
  { id: "O100010", mapped: "bakery" },
  { id: "O100015", mapped: "meat & poultry" },
  { id: "O100025", mapped: "dairy & eggs" },
  { id: "O100045", mapped: "frozen" },
  { id: "O100050", mapped: "drinks" },
  { id: "O100035", mapped: "snacks & sweets" },
  { id: "O100065", mapped: "household" },
];

async function fetchCategory(catId: string, maxItems: number = 100) {
  const items: any[] = [];
  let skip = 0;

  while (items.length < maxItems) {
    const take = Math.min(48, maxItems - items.length);
    const res = await fetch(
      `${API_BASE}/stores/${STORE_ID}/categories/${catId}/search?take=${take}&skip=${skip}`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    const data = await res.json();
    if (!data.items || data.items.length === 0) break;
    items.push(...data.items);
    skip += data.items.length;
    if (items.length >= data.total) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  return items;
}

async function main() {
  console.log("=== Importing SuperValu prices ===\n");

  const store = await prisma.store.findUnique({ where: { slug: "supervalu" } });
  if (!store) throw new Error("SuperValu store not found");

  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c: any) => [c.slug, c.id]));

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const cat of CATEGORIES) {
    const items = await fetchCategory(cat.id, 100);
    let added = 0;

    for (const item of items) {
      try {
        const price =
          typeof item.priceNumeric === "number" ? item.priceNumeric : 0;
        if (price <= 0) continue;

        const w = item.unitOfSize?.size || undefined;
        const wu = item.unitOfSize?.abbreviation || undefined;
        const matchSlug = productMatchSlug(item.name, w, wu);
        const canonName = canonicalProductName(item.name, w, wu);

        // Find or create product
        let product = await prisma.product.findUnique({
          where: { slug: matchSlug },
        });

        if (!product) {
          const catSlug =
            CATEGORY_MAP[cat.mapped.toLowerCase() as keyof typeof CATEGORY_MAP];
          const categoryId = catSlug ? catMap.get(catSlug) : undefined;
          product = await prisma.product.create({
            data: {
              name: canonName,
              slug: matchSlug,
              brand: item.brand || null,
              weight: w || null,
              weightUnit: wu || null,
              barcode: item.sku || null,
              categoryId: categoryId || null,
              imageUrl: item.image?.default || null,
              description: item.description?.slice(0, 500) || null,
              isActive: true,
            },
          });
        } else if (!product.imageUrl && item.image?.default) {
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: item.image.default },
          });
        }

        // Check if price already exists for this store
        const existing = await prisma.price.findFirst({
          where: {
            productId: product.id,
            storeId: store.id,
            isLatest: true,
          },
        });
        if (existing) {
          totalSkipped++;
          continue;
        }

        // Parse unit price
        let unitPrice = null;
        let unitPriceUnit = null;
        if (item.pricePerUnit) {
          const m = item.pricePerUnit.match(/€([\d.]+)\/([\w]+)/);
          if (m) {
            unitPrice = parseFloat(m[1]);
            unitPriceUnit = m[2];
          }
        }

        await prisma.price.create({
          data: {
            productId: product.id,
            storeId: store.id,
            price,
            isOnSale: false,
            unitPrice,
            unitPriceUnit,
            currency: "EUR",
            isLatest: true,
            scrapedAt: new Date(),
          },
        });
        added++;
      } catch (e: any) {
        totalErrors++;
        if (totalErrors <= 3) {
          console.log(`  Error: ${e.message?.slice(0, 100)}`);
        }
      }
    }

    console.log(
      `${cat.mapped}: +${added} prices from ${items.length} items`
    );
    totalAdded += added;
  }

  const totalProducts = await prisma.product.count();
  const totalPrices = await prisma.price.count({ where: { isLatest: true } });

  console.log("\n=== Done ===");
  console.log(`Added: ${totalAdded} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);
  console.log(`Total: ${totalProducts} products, ${totalPrices} active prices`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
