import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.price.deleteMany();
  await prisma.basketItem.deleteMany();
  await prisma.basket.deleteMany();
  await prisma.review.deleteMany();
  await prisma.storeLocation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();

  // Create stores
  const stores = await Promise.all([
    prisma.store.create({
      data: { name: "Tesco Ireland", slug: "tesco", color: "#00539f", websiteUrl: "https://www.tesco.ie", logoUrl: "/icons/tesco.svg" },
    }),
    prisma.store.create({
      data: { name: "Dunnes Stores", slug: "dunnes", color: "#1a1a1a", websiteUrl: "https://www.dunnesstoresgrocery.com", logoUrl: "/icons/dunnes.svg" },
    }),
    prisma.store.create({
      data: { name: "Lidl Ireland", slug: "lidl", color: "#0050aa", websiteUrl: "https://www.lidl.ie", logoUrl: "/icons/lidl.svg" },
    }),
    prisma.store.create({
      data: { name: "Aldi Ireland", slug: "aldi", color: "#00005f", websiteUrl: "https://www.aldi.ie", logoUrl: "/icons/aldi.svg" },
    }),
    prisma.store.create({
      data: { name: "SuperValu", slug: "supervalu", color: "#e31837", websiteUrl: "https://www.supervalu.ie", logoUrl: "/icons/supervalu.svg" },
    }),
  ]);

  const [tesco, dunnes, lidl, aldi, supervalu] = stores;

  // Create store locations in Dublin
  const locations = [
    { storeId: tesco.id, name: "Tesco Jervis Street", address: "Jervis Shopping Centre, Dublin 1", latitude: 53.3488, longitude: -6.2675 },
    { storeId: tesco.id, name: "Tesco Baggot Street", address: "1 Baggot Street Lower, Dublin 2", latitude: 53.3393, longitude: -6.2496 },
    { storeId: dunnes.id, name: "Dunnes St Stephen's Green", address: "St Stephen's Green Shopping Centre, Dublin 2", latitude: 53.3389, longitude: -6.2613 },
    { storeId: dunnes.id, name: "Dunnes Cornelscourt", address: "Cornelscourt Shopping Centre, Dublin 18", latitude: 53.2771, longitude: -6.2178 },
    { storeId: lidl.id, name: "Lidl Phibsborough", address: "Phibsborough Road, Dublin 7", latitude: 53.3589, longitude: -6.2722 },
    { storeId: lidl.id, name: "Lidl Rathmines", address: "Rathmines Road, Dublin 6", latitude: 53.3228, longitude: -6.2632 },
    { storeId: aldi.id, name: "Aldi Parnell Street", address: "Parnell Street, Dublin 1", latitude: 53.3522, longitude: -6.2641 },
    { storeId: aldi.id, name: "Aldi Cork Street", address: "Cork Street, Dublin 8", latitude: 53.3366, longitude: -6.2813 },
    { storeId: supervalu.id, name: "SuperValu Knocklyon", address: "Knocklyon Shopping Centre, Dublin 16", latitude: 53.2856, longitude: -6.3274 },
    { storeId: supervalu.id, name: "SuperValu Ballinteer", address: "Ballinteer Shopping Centre, Dublin 16", latitude: 53.2759, longitude: -6.2585 },
  ];

  await prisma.storeLocation.createMany({ data: locations });

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Dairy & Eggs", slug: "dairy-eggs" } }),
    prisma.category.create({ data: { name: "Meat & Poultry", slug: "meat-poultry" } }),
    prisma.category.create({ data: { name: "Fruits & Vegetables", slug: "fruits-vegetables" } }),
    prisma.category.create({ data: { name: "Bakery", slug: "bakery" } }),
    prisma.category.create({ data: { name: "Drinks", slug: "drinks" } }),
    prisma.category.create({ data: { name: "Frozen", slug: "frozen" } }),
    prisma.category.create({ data: { name: "Snacks & Sweets", slug: "snacks-sweets" } }),
    prisma.category.create({ data: { name: "Household", slug: "household" } }),
    prisma.category.create({ data: { name: "Personal Care", slug: "personal-care" } }),
    prisma.category.create({ data: { name: "Baby", slug: "baby" } }),
  ]);

  const [dairy, meat, fruits, bakery, drinks, frozen, snacks, household, personalCare, baby] = categories;

  // Create products with prices
  const products = [
    // Dairy & Eggs
    { name: "Avonmore Full Fat Milk 2L", slug: "avonmore-full-fat-milk-2l", brand: "Avonmore", weight: 2, weightUnit: "l", categoryId: dairy.id, prices: { tesco: 2.19, dunnes: 2.09, lidl: 1.89, aldi: 1.85, supervalu: 2.15 } },
    { name: "Kerrygold Irish Butter 250g", slug: "kerrygold-irish-butter-250g", brand: "Kerrygold", weight: 250, weightUnit: "g", categoryId: dairy.id, prices: { tesco: 3.49, dunnes: 3.29, lidl: 2.99, aldi: 2.99, supervalu: 3.39 } },
    { name: "Free Range Eggs Large 12 Pack", slug: "free-range-eggs-large-12", brand: null, weight: 12, weightUnit: "units", categoryId: dairy.id, prices: { tesco: 4.29, dunnes: 3.99, lidl: 3.49, aldi: 3.39, supervalu: 4.19 } },
    { name: "Cheddar Cheese Block 200g", slug: "cheddar-cheese-block-200g", brand: null, weight: 200, weightUnit: "g", categoryId: dairy.id, prices: { tesco: 2.99, dunnes: 2.79, lidl: 2.49, aldi: 2.39, supervalu: 2.89 } },
    { name: "Greek Style Yoghurt 500g", slug: "greek-style-yoghurt-500g", brand: null, weight: 500, weightUnit: "g", categoryId: dairy.id, prices: { tesco: 2.49, dunnes: 2.39, lidl: 1.99, aldi: 1.89, supervalu: 2.45 } },

    // Meat & Poultry
    { name: "Irish Chicken Breast Fillets 500g", slug: "irish-chicken-breast-fillets-500g", brand: null, weight: 500, weightUnit: "g", categoryId: meat.id, prices: { tesco: 6.49, dunnes: 5.99, lidl: 5.49, aldi: 5.29, supervalu: 6.29 } },
    { name: "Irish Lean Mince Beef 500g", slug: "irish-lean-mince-beef-500g", brand: null, weight: 500, weightUnit: "g", categoryId: meat.id, prices: { tesco: 5.99, dunnes: 5.49, lidl: 4.99, aldi: 4.89, supervalu: 5.79 } },
    { name: "Rashers Back Bacon 200g", slug: "rashers-back-bacon-200g", brand: null, weight: 200, weightUnit: "g", categoryId: meat.id, prices: { tesco: 3.29, dunnes: 2.99, lidl: 2.69, aldi: 2.59, supervalu: 3.19 } },
    { name: "Irish Pork Sausages 8 Pack", slug: "irish-pork-sausages-8-pack", brand: null, weight: 454, weightUnit: "g", categoryId: meat.id, prices: { tesco: 2.99, dunnes: 2.79, lidl: 2.49, aldi: 2.39, supervalu: 2.89 } },
    { name: "Fresh Salmon Fillets 280g", slug: "fresh-salmon-fillets-280g", brand: null, weight: 280, weightUnit: "g", categoryId: meat.id, prices: { tesco: 5.99, dunnes: 5.79, lidl: 5.49, aldi: 5.29, supervalu: 5.89 } },

    // Fruits & Vegetables
    { name: "Bananas Bunch", slug: "bananas-bunch", brand: null, weight: 5, weightUnit: "units", categoryId: fruits.id, prices: { tesco: 1.39, dunnes: 1.29, lidl: 0.99, aldi: 0.95, supervalu: 1.35 } },
    { name: "Baby Potatoes 1kg", slug: "baby-potatoes-1kg", brand: null, weight: 1, weightUnit: "kg", categoryId: fruits.id, prices: { tesco: 1.99, dunnes: 1.79, lidl: 1.49, aldi: 1.45, supervalu: 1.89 } },
    { name: "Broccoli Head", slug: "broccoli-head", brand: null, weight: 1, weightUnit: "units", categoryId: fruits.id, prices: { tesco: 1.29, dunnes: 1.19, lidl: 0.99, aldi: 0.89, supervalu: 1.25 } },
    { name: "Mixed Salad Bag 150g", slug: "mixed-salad-bag-150g", brand: null, weight: 150, weightUnit: "g", categoryId: fruits.id, prices: { tesco: 1.79, dunnes: 1.69, lidl: 1.49, aldi: 1.39, supervalu: 1.75 } },
    { name: "Avocados 2 Pack", slug: "avocados-2-pack", brand: null, weight: 2, weightUnit: "units", categoryId: fruits.id, prices: { tesco: 2.49, dunnes: 2.29, lidl: 1.99, aldi: 1.89, supervalu: 2.39 } },

    // Bakery
    { name: "Brennans White Sliced Pan 800g", slug: "brennans-white-sliced-pan-800g", brand: "Brennans", weight: 800, weightUnit: "g", categoryId: bakery.id, prices: { tesco: 1.89, dunnes: 1.79, lidl: 1.59, aldi: 1.55, supervalu: 1.85 } },
    { name: "Sourdough Bread Loaf", slug: "sourdough-bread-loaf", brand: null, weight: 500, weightUnit: "g", categoryId: bakery.id, prices: { tesco: 3.49, dunnes: 3.29, lidl: 2.79, aldi: 2.69, supervalu: 3.39 } },
    { name: "Croissants 4 Pack", slug: "croissants-4-pack", brand: null, weight: 4, weightUnit: "units", categoryId: bakery.id, prices: { tesco: 2.29, dunnes: 2.19, lidl: 1.79, aldi: 1.69, supervalu: 2.25 } },
    { name: "Tortilla Wraps 8 Pack", slug: "tortilla-wraps-8-pack", brand: null, weight: 8, weightUnit: "units", categoryId: bakery.id, prices: { tesco: 1.99, dunnes: 1.89, lidl: 1.49, aldi: 1.39, supervalu: 1.95 } },

    // Drinks
    { name: "Barry's Tea Gold Blend 80s", slug: "barrys-tea-gold-blend-80s", brand: "Barry's", weight: 80, weightUnit: "units", categoryId: drinks.id, prices: { tesco: 4.99, dunnes: 4.79, lidl: 4.49, aldi: 4.39, supervalu: 4.89 } },
    { name: "Lyons Original Tea 80s", slug: "lyons-original-tea-80s", brand: "Lyons", weight: 80, weightUnit: "units", categoryId: drinks.id, prices: { tesco: 4.79, dunnes: 4.59, lidl: 4.29, aldi: 4.19, supervalu: 4.69 } },
    { name: "Coca-Cola 2L", slug: "coca-cola-2l", brand: "Coca-Cola", weight: 2, weightUnit: "l", categoryId: drinks.id, prices: { tesco: 2.65, dunnes: 2.55, lidl: 2.35, aldi: 2.29, supervalu: 2.59 } },
    { name: "Tropicana Orange Juice 1L", slug: "tropicana-orange-juice-1l", brand: "Tropicana", weight: 1, weightUnit: "l", categoryId: drinks.id, prices: { tesco: 3.49, dunnes: 3.29, lidl: 2.99, aldi: 2.89, supervalu: 3.39 } },
    { name: "Ballygowan Still Water 2L", slug: "ballygowan-still-water-2l", brand: "Ballygowan", weight: 2, weightUnit: "l", categoryId: drinks.id, prices: { tesco: 1.29, dunnes: 1.19, lidl: 0.99, aldi: 0.95, supervalu: 1.25 } },

    // Frozen
    { name: "Fish Fingers 10 Pack", slug: "fish-fingers-10-pack", brand: null, weight: 250, weightUnit: "g", categoryId: frozen.id, prices: { tesco: 2.99, dunnes: 2.79, lidl: 2.29, aldi: 2.19, supervalu: 2.89 } },
    { name: "Frozen Pizza Margherita", slug: "frozen-pizza-margherita", brand: null, weight: 350, weightUnit: "g", categoryId: frozen.id, prices: { tesco: 3.49, dunnes: 3.29, lidl: 2.49, aldi: 2.39, supervalu: 3.39 } },
    { name: "Frozen Garden Peas 900g", slug: "frozen-garden-peas-900g", brand: null, weight: 900, weightUnit: "g", categoryId: frozen.id, prices: { tesco: 1.99, dunnes: 1.89, lidl: 1.49, aldi: 1.39, supervalu: 1.95 } },

    // Snacks & Sweets
    { name: "Tayto Cheese & Onion 6 Pack", slug: "tayto-cheese-onion-6-pack", brand: "Tayto", weight: 150, weightUnit: "g", categoryId: snacks.id, prices: { tesco: 2.99, dunnes: 2.79, lidl: 2.49, aldi: 2.39, supervalu: 2.89 } },
    { name: "Cadbury Dairy Milk 200g", slug: "cadbury-dairy-milk-200g", brand: "Cadbury", weight: 200, weightUnit: "g", categoryId: snacks.id, prices: { tesco: 3.99, dunnes: 3.79, lidl: 3.49, aldi: 3.39, supervalu: 3.89 } },
    { name: "Digestive Biscuits 400g", slug: "digestive-biscuits-400g", brand: null, weight: 400, weightUnit: "g", categoryId: snacks.id, prices: { tesco: 1.99, dunnes: 1.89, lidl: 1.49, aldi: 1.39, supervalu: 1.95 } },

    // Household
    { name: "Fairy Washing Up Liquid 900ml", slug: "fairy-washing-up-liquid-900ml", brand: "Fairy", weight: 900, weightUnit: "ml", categoryId: household.id, prices: { tesco: 3.49, dunnes: 3.29, lidl: 2.99, aldi: 2.89, supervalu: 3.39 } },
    { name: "Toilet Roll 9 Pack", slug: "toilet-roll-9-pack", brand: null, weight: 9, weightUnit: "units", categoryId: household.id, prices: { tesco: 4.99, dunnes: 4.79, lidl: 3.99, aldi: 3.89, supervalu: 4.89 } },
    { name: "Bin Bags 20 Pack", slug: "bin-bags-20-pack", brand: null, weight: 20, weightUnit: "units", categoryId: household.id, prices: { tesco: 2.99, dunnes: 2.79, lidl: 2.29, aldi: 2.19, supervalu: 2.89 } },

    // Personal Care
    { name: "Shampoo 400ml", slug: "shampoo-400ml", brand: null, weight: 400, weightUnit: "ml", categoryId: personalCare.id, prices: { tesco: 3.99, dunnes: 3.79, lidl: 2.99, aldi: 2.89, supervalu: 3.89 } },
    { name: "Toothpaste 100ml", slug: "toothpaste-100ml", brand: null, weight: 100, weightUnit: "ml", categoryId: personalCare.id, prices: { tesco: 2.49, dunnes: 2.39, lidl: 1.99, aldi: 1.89, supervalu: 2.45 } },

    // Baby
    { name: "Baby Wipes 64 Pack", slug: "baby-wipes-64-pack", brand: null, weight: 64, weightUnit: "units", categoryId: baby.id, prices: { tesco: 2.49, dunnes: 2.39, lidl: 1.89, aldi: 1.79, supervalu: 2.45 } },
    { name: "Nappies Size 4 (40 Pack)", slug: "nappies-size-4-40-pack", brand: null, weight: 40, weightUnit: "units", categoryId: baby.id, prices: { tesco: 9.99, dunnes: 9.49, lidl: 7.99, aldi: 7.69, supervalu: 9.79 } },
  ];

  const storeMap: Record<string, string> = {
    tesco: tesco.id,
    dunnes: dunnes.id,
    lidl: lidl.id,
    aldi: aldi.id,
    supervalu: supervalu.id,
  };

  for (const p of products) {
    const { prices: priceData, ...productData } = p;
    const product = await prisma.product.create({ data: productData });

    const priceRecords = Object.entries(priceData).map(([storeSlug, price]) => {
      const weight = product.weight ?? 1;
      const unitMultiplier = product.weightUnit === "kg" || product.weightUnit === "l" ? 1 : product.weightUnit === "g" || product.weightUnit === "ml" ? 1000 : 1;
      const unitPrice = (price / weight) * unitMultiplier;
      const isOnSale = Math.random() < 0.15; // 15% chance of being on sale
      const originalPrice = isOnSale ? +(price * (1 + Math.random() * 0.3)).toFixed(2) : null;

      return {
        productId: product.id,
        storeId: storeMap[storeSlug],
        price,
        originalPrice,
        isOnSale,
        unitPrice: +unitPrice.toFixed(4),
        unitPriceUnit: product.weightUnit === "kg" || product.weightUnit === "g" ? "per kg" : product.weightUnit === "l" || product.weightUnit === "ml" ? "per l" : "per unit",
        currency: "EUR",
        isLatest: true,
      };
    });

    await prisma.price.createMany({ data: priceRecords });
  }

  console.log("Seed completed successfully!");
  console.log(`Created ${stores.length} stores`);
  console.log(`Created ${locations.length} store locations`);
  console.log(`Created ${categories.length} categories`);
  console.log(`Created ${products.length} products with prices`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
