-- ============================================================
-- GrocerySaver Database Setup
-- Run this ONCE in Supabase SQL Editor to create all tables
-- and fill them with demo data (37 Irish grocery products)
-- ============================================================

-- STEP 1: Create all tables
-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "openingHours" JSONB,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconUrl" TEXT,
    "parentId" TEXT,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "barcode" TEXT,
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "unitPrice" DECIMAL(10,4),
    "unitPriceUnit" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Basket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'My Basket',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Basket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BasketItem" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "preferredStoreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "pricesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- STEP 2: Create indexes
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "StoreLocation_storeId_idx" ON "StoreLocation"("storeId");
CREATE INDEX "StoreLocation_latitude_longitude_idx" ON "StoreLocation"("latitude", "longitude");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Price_productId_storeId_idx" ON "Price"("productId", "storeId");
CREATE INDEX "Price_scrapedAt_idx" ON "Price"("scrapedAt");
CREATE INDEX "Price_isLatest_idx" ON "Price"("isLatest");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE INDEX "Basket_userId_idx" ON "Basket"("userId");
CREATE INDEX "BasketItem_basketId_idx" ON "BasketItem"("basketId");
CREATE UNIQUE INDEX "BasketItem_basketId_productId_key" ON "BasketItem"("basketId", "productId");
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE UNIQUE INDEX "Review_productId_userId_key" ON "Review"("productId", "userId");
CREATE INDEX "ScrapeRun_storeSlug_startedAt_idx" ON "ScrapeRun"("storeSlug", "startedAt");

-- STEP 3: Add foreign keys
ALTER TABLE "StoreLocation" ADD CONSTRAINT "StoreLocation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Price" ADD CONSTRAINT "Price_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- STEP 4: Create Prisma migrations table (so Prisma knows the migration was applied)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (gen_random_uuid(), 'manual', now(), '20260317011203_init', 1);

-- ============================================================
-- STEP 5: Seed demo data — 5 stores, 10 locations, 10 categories, 37 products
-- ============================================================

-- Stores
INSERT INTO "Store" ("id", "name", "slug", "color", "websiteUrl", "logoUrl") VALUES
('store_tesco', 'Tesco Ireland', 'tesco', '#00539f', 'https://www.tesco.ie', '/icons/tesco.svg'),
('store_dunnes', 'Dunnes Stores', 'dunnes', '#1a1a1a', 'https://www.dunnesstoresgrocery.com', '/icons/dunnes.svg'),
('store_lidl', 'Lidl Ireland', 'lidl', '#0050aa', 'https://www.lidl.ie', '/icons/lidl.svg'),
('store_aldi', 'Aldi Ireland', 'aldi', '#00005f', 'https://www.aldi.ie', '/icons/aldi.svg'),
('store_supervalu', 'SuperValu', 'supervalu', '#e31837', 'https://www.supervalu.ie', '/icons/supervalu.svg');

-- Store Locations (Dublin)
INSERT INTO "StoreLocation" ("id", "storeId", "name", "address", "latitude", "longitude") VALUES
('loc_1', 'store_tesco', 'Tesco Jervis Street', 'Jervis Shopping Centre, Dublin 1', 53.3488, -6.2675),
('loc_2', 'store_tesco', 'Tesco Baggot Street', '1 Baggot Street Lower, Dublin 2', 53.3393, -6.2496),
('loc_3', 'store_dunnes', 'Dunnes St Stephens Green', 'St Stephens Green Shopping Centre, Dublin 2', 53.3389, -6.2613),
('loc_4', 'store_dunnes', 'Dunnes Cornelscourt', 'Cornelscourt Shopping Centre, Dublin 18', 53.2771, -6.2178),
('loc_5', 'store_lidl', 'Lidl Phibsborough', 'Phibsborough Road, Dublin 7', 53.3589, -6.2722),
('loc_6', 'store_lidl', 'Lidl Rathmines', 'Rathmines Road, Dublin 6', 53.3228, -6.2632),
('loc_7', 'store_aldi', 'Aldi Parnell Street', 'Parnell Street, Dublin 1', 53.3522, -6.2641),
('loc_8', 'store_aldi', 'Aldi Cork Street', 'Cork Street, Dublin 8', 53.3366, -6.2813),
('loc_9', 'store_supervalu', 'SuperValu Knocklyon', 'Knocklyon Shopping Centre, Dublin 16', 53.2856, -6.3274),
('loc_10', 'store_supervalu', 'SuperValu Ballinteer', 'Ballinteer Shopping Centre, Dublin 16', 53.2759, -6.2585);

-- Categories
INSERT INTO "Category" ("id", "name", "slug") VALUES
('cat_dairy', 'Dairy & Eggs', 'dairy-eggs'),
('cat_meat', 'Meat & Poultry', 'meat-poultry'),
('cat_fruits', 'Fruits & Vegetables', 'fruits-vegetables'),
('cat_bakery', 'Bakery', 'bakery'),
('cat_drinks', 'Drinks', 'drinks'),
('cat_frozen', 'Frozen', 'frozen'),
('cat_snacks', 'Snacks & Sweets', 'snacks-sweets'),
('cat_household', 'Household', 'household'),
('cat_personal', 'Personal Care', 'personal-care'),
('cat_baby', 'Baby', 'baby');

-- Products (37 Irish grocery items)
INSERT INTO "Product" ("id", "name", "slug", "brand", "weight", "weightUnit", "categoryId", "updatedAt") VALUES
-- Dairy & Eggs
('prod_1', 'Avonmore Full Fat Milk 2L', 'avonmore-full-fat-milk-2l', 'Avonmore', 2, 'l', 'cat_dairy', now()),
('prod_2', 'Kerrygold Irish Butter 250g', 'kerrygold-irish-butter-250g', 'Kerrygold', 250, 'g', 'cat_dairy', now()),
('prod_3', 'Free Range Eggs Large 12 Pack', 'free-range-eggs-large-12', NULL, 12, 'units', 'cat_dairy', now()),
('prod_4', 'Cheddar Cheese Block 200g', 'cheddar-cheese-block-200g', NULL, 200, 'g', 'cat_dairy', now()),
('prod_5', 'Greek Style Yoghurt 500g', 'greek-style-yoghurt-500g', NULL, 500, 'g', 'cat_dairy', now()),
-- Meat & Poultry
('prod_6', 'Irish Chicken Breast Fillets 500g', 'irish-chicken-breast-fillets-500g', NULL, 500, 'g', 'cat_meat', now()),
('prod_7', 'Irish Lean Mince Beef 500g', 'irish-lean-mince-beef-500g', NULL, 500, 'g', 'cat_meat', now()),
('prod_8', 'Rashers Back Bacon 200g', 'rashers-back-bacon-200g', NULL, 200, 'g', 'cat_meat', now()),
('prod_9', 'Irish Pork Sausages 8 Pack', 'irish-pork-sausages-8-pack', NULL, 454, 'g', 'cat_meat', now()),
('prod_10', 'Fresh Salmon Fillets 280g', 'fresh-salmon-fillets-280g', NULL, 280, 'g', 'cat_meat', now()),
-- Fruits & Vegetables
('prod_11', 'Bananas Bunch', 'bananas-bunch', NULL, 5, 'units', 'cat_fruits', now()),
('prod_12', 'Baby Potatoes 1kg', 'baby-potatoes-1kg', NULL, 1, 'kg', 'cat_fruits', now()),
('prod_13', 'Broccoli Head', 'broccoli-head', NULL, 1, 'units', 'cat_fruits', now()),
('prod_14', 'Mixed Salad Bag 150g', 'mixed-salad-bag-150g', NULL, 150, 'g', 'cat_fruits', now()),
('prod_15', 'Avocados 2 Pack', 'avocados-2-pack', NULL, 2, 'units', 'cat_fruits', now()),
-- Bakery
('prod_16', 'Brennans White Sliced Pan 800g', 'brennans-white-sliced-pan-800g', 'Brennans', 800, 'g', 'cat_bakery', now()),
('prod_17', 'Sourdough Bread Loaf', 'sourdough-bread-loaf', NULL, 500, 'g', 'cat_bakery', now()),
('prod_18', 'Croissants 4 Pack', 'croissants-4-pack', NULL, 4, 'units', 'cat_bakery', now()),
('prod_19', 'Tortilla Wraps 8 Pack', 'tortilla-wraps-8-pack', NULL, 8, 'units', 'cat_bakery', now()),
-- Drinks
('prod_20', 'Barrys Tea Gold Blend 80s', 'barrys-tea-gold-blend-80s', 'Barrys', 80, 'units', 'cat_drinks', now()),
('prod_21', 'Lyons Original Tea 80s', 'lyons-original-tea-80s', 'Lyons', 80, 'units', 'cat_drinks', now()),
('prod_22', 'Coca-Cola 2L', 'coca-cola-2l', 'Coca-Cola', 2, 'l', 'cat_drinks', now()),
('prod_23', 'Tropicana Orange Juice 1L', 'tropicana-orange-juice-1l', 'Tropicana', 1, 'l', 'cat_drinks', now()),
('prod_24', 'Ballygowan Still Water 2L', 'ballygowan-still-water-2l', 'Ballygowan', 2, 'l', 'cat_drinks', now()),
-- Frozen
('prod_25', 'Fish Fingers 10 Pack', 'fish-fingers-10-pack', NULL, 250, 'g', 'cat_frozen', now()),
('prod_26', 'Frozen Pizza Margherita', 'frozen-pizza-margherita', NULL, 350, 'g', 'cat_frozen', now()),
('prod_27', 'Frozen Garden Peas 900g', 'frozen-garden-peas-900g', NULL, 900, 'g', 'cat_frozen', now()),
-- Snacks & Sweets
('prod_28', 'Tayto Cheese & Onion 6 Pack', 'tayto-cheese-onion-6-pack', 'Tayto', 150, 'g', 'cat_snacks', now()),
('prod_29', 'Cadbury Dairy Milk 200g', 'cadbury-dairy-milk-200g', 'Cadbury', 200, 'g', 'cat_snacks', now()),
('prod_30', 'Digestive Biscuits 400g', 'digestive-biscuits-400g', NULL, 400, 'g', 'cat_snacks', now()),
-- Household
('prod_31', 'Fairy Washing Up Liquid 900ml', 'fairy-washing-up-liquid-900ml', 'Fairy', 900, 'ml', 'cat_household', now()),
('prod_32', 'Toilet Roll 9 Pack', 'toilet-roll-9-pack', NULL, 9, 'units', 'cat_household', now()),
('prod_33', 'Bin Bags 20 Pack', 'bin-bags-20-pack', NULL, 20, 'units', 'cat_household', now()),
-- Personal Care
('prod_34', 'Shampoo 400ml', 'shampoo-400ml', NULL, 400, 'ml', 'cat_personal', now()),
('prod_35', 'Toothpaste 100ml', 'toothpaste-100ml', NULL, 100, 'ml', 'cat_personal', now()),
-- Baby
('prod_36', 'Baby Wipes 64 Pack', 'baby-wipes-64-pack', NULL, 64, 'units', 'cat_baby', now()),
('prod_37', 'Nappies Size 4 (40 Pack)', 'nappies-size-4-40-pack', NULL, 40, 'units', 'cat_baby', now());

-- Prices (37 products x 5 stores = 185 price records)
-- Format: id, productId, storeId, price, unitPrice, unitPriceUnit
-- Cheapest store varies by category:
--   Aldi: dairy, fruits & veg | Tesco: branded items | Dunnes: meat
--   Lidl: bakery, frozen | SuperValu: baby, personal care, some household

-- Avonmore Full Fat Milk 2L (per l) — Aldi cheapest (dairy)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_1_t', 'prod_1', 'store_tesco', 2.09, 1.0450, 'per l'),
('price_1_d', 'prod_1', 'store_dunnes', 2.15, 1.0750, 'per l'),
('price_1_l', 'prod_1', 'store_lidl', 1.99, 0.9950, 'per l'),
('price_1_a', 'prod_1', 'store_aldi', 1.85, 0.9250, 'per l'),
('price_1_s', 'prod_1', 'store_supervalu', 2.19, 1.0950, 'per l');

-- Kerrygold Irish Butter 250g (per kg) — Aldi cheapest (dairy)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_2_t', 'prod_2', 'store_tesco', 3.29, 13.1600, 'per kg'),
('price_2_d', 'prod_2', 'store_dunnes', 3.39, 13.5600, 'per kg'),
('price_2_l', 'prod_2', 'store_lidl', 3.15, 12.6000, 'per kg'),
('price_2_a', 'prod_2', 'store_aldi', 2.99, 11.9600, 'per kg'),
('price_2_s', 'prod_2', 'store_supervalu', 3.45, 13.8000, 'per kg');

-- Free Range Eggs Large 12 Pack (per unit) — Aldi cheapest (dairy)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_3_t', 'prod_3', 'store_tesco', 3.89, 0.3242, 'per unit'),
('price_3_d', 'prod_3', 'store_dunnes', 3.99, 0.3325, 'per unit'),
('price_3_l', 'prod_3', 'store_lidl', 3.69, 0.3075, 'per unit'),
('price_3_a', 'prod_3', 'store_aldi', 3.49, 0.2908, 'per unit'),
('price_3_s', 'prod_3', 'store_supervalu', 4.09, 0.3408, 'per unit');

-- Cheddar Cheese Block 200g (per kg) — Aldi cheapest (dairy), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_4_t', 'prod_4', 'store_tesco', 2.59, 12.9500, 'per kg'),
('price_4_d', 'prod_4', 'store_dunnes', 2.69, 13.4500, 'per kg'),
('price_4_l', 'prod_4', 'store_lidl', 2.55, 12.7500, 'per kg'),
('price_4_a', 'prod_4', 'store_aldi', 2.45, 12.2500, 'per kg'),
('price_4_s', 'prod_4', 'store_supervalu', 2.79, 13.9500, 'per kg');

-- Greek Style Yoghurt 500g (per kg) — Aldi cheapest (dairy)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_5_t', 'prod_5', 'store_tesco', 2.29, 4.5800, 'per kg'),
('price_5_d', 'prod_5', 'store_dunnes', 2.19, 4.3800, 'per kg'),
('price_5_l', 'prod_5', 'store_lidl', 2.09, 4.1800, 'per kg'),
('price_5_a', 'prod_5', 'store_aldi', 1.89, 3.7800, 'per kg'),
('price_5_s', 'prod_5', 'store_supervalu', 2.35, 4.7000, 'per kg');

-- Irish Chicken Breast Fillets 500g (per kg) — Dunnes cheapest (meat), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_6_t', 'prod_6', 'store_tesco', 5.99, 11.9800, 'per kg'),
('price_6_d', 'prod_6', 'store_dunnes', 5.29, 10.5800, 'per kg'),
('price_6_l', 'prod_6', 'store_lidl', 5.79, 11.5800, 'per kg'),
('price_6_a', 'prod_6', 'store_aldi', 5.69, 11.3800, 'per kg'),
('price_6_s', 'prod_6', 'store_supervalu', 6.29, 12.5800, 'per kg');

-- Irish Lean Mince Beef 500g (per kg) — Dunnes cheapest (meat)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_7_t', 'prod_7', 'store_tesco', 5.49, 10.9800, 'per kg'),
('price_7_d', 'prod_7', 'store_dunnes', 4.79, 9.5800, 'per kg'),
('price_7_l', 'prod_7', 'store_lidl', 5.19, 10.3800, 'per kg'),
('price_7_a', 'prod_7', 'store_aldi', 5.09, 10.1800, 'per kg'),
('price_7_s', 'prod_7', 'store_supervalu', 5.69, 11.3800, 'per kg');

-- Rashers Back Bacon 200g (per kg) — Dunnes cheapest (meat), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_8_t', 'prod_8', 'store_tesco', 3.09, 15.4500, 'per kg'),
('price_8_d', 'prod_8', 'store_dunnes', 2.69, 13.4500, 'per kg'),
('price_8_l', 'prod_8', 'store_lidl', 2.89, 14.4500, 'per kg'),
('price_8_a', 'prod_8', 'store_aldi', 2.79, 13.9500, 'per kg'),
('price_8_s', 'prod_8', 'store_supervalu', 3.19, 15.9500, 'per kg');

-- Irish Pork Sausages 8 Pack (per kg) — Dunnes cheapest (meat)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_9_t', 'prod_9', 'store_tesco', 2.89, 6.3656, 'per kg'),
('price_9_d', 'prod_9', 'store_dunnes', 2.39, 5.2643, 'per kg'),
('price_9_l', 'prod_9', 'store_lidl', 2.69, 5.9251, 'per kg'),
('price_9_a', 'prod_9', 'store_aldi', 2.59, 5.7048, 'per kg'),
('price_9_s', 'prod_9', 'store_supervalu', 2.99, 6.5859, 'per kg');

-- Fresh Salmon Fillets 280g (per kg) — Dunnes cheapest (meat), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_10_t', 'prod_10', 'store_tesco', 5.89, 21.0357, 'per kg'),
('price_10_d', 'prod_10', 'store_dunnes', 5.29, 18.8929, 'per kg'),
('price_10_l', 'prod_10', 'store_lidl', 5.69, 20.3214, 'per kg'),
('price_10_a', 'prod_10', 'store_aldi', 5.59, 19.9643, 'per kg'),
('price_10_s', 'prod_10', 'store_supervalu', 5.99, 21.3929, 'per kg');

-- Bananas Bunch (per unit) — Aldi cheapest (fruit & veg), very close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_11_t', 'prod_11', 'store_tesco', 1.15, 0.2300, 'per unit'),
('price_11_d', 'prod_11', 'store_dunnes', 1.09, 0.2180, 'per unit'),
('price_11_l', 'prod_11', 'store_lidl', 1.05, 0.2100, 'per unit'),
('price_11_a', 'prod_11', 'store_aldi', 0.99, 0.1980, 'per unit'),
('price_11_s', 'prod_11', 'store_supervalu', 1.19, 0.2380, 'per unit');

-- Baby Potatoes 1kg (per kg) — Aldi cheapest (fruit & veg)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_12_t', 'prod_12', 'store_tesco', 1.79, 1.7900, 'per kg'),
('price_12_d', 'prod_12', 'store_dunnes', 1.69, 1.6900, 'per kg'),
('price_12_l', 'prod_12', 'store_lidl', 1.59, 1.5900, 'per kg'),
('price_12_a', 'prod_12', 'store_aldi', 1.39, 1.3900, 'per kg'),
('price_12_s', 'prod_12', 'store_supervalu', 1.89, 1.8900, 'per kg');

-- Broccoli Head (per unit) — Aldi cheapest (fruit & veg), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_13_t', 'prod_13', 'store_tesco', 1.15, 1.1500, 'per unit'),
('price_13_d', 'prod_13', 'store_dunnes', 1.09, 1.0900, 'per unit'),
('price_13_l', 'prod_13', 'store_lidl', 0.99, 0.9900, 'per unit'),
('price_13_a', 'prod_13', 'store_aldi', 0.89, 0.8900, 'per unit'),
('price_13_s', 'prod_13', 'store_supervalu', 1.19, 1.1900, 'per unit');

-- Mixed Salad Bag 150g (per kg) — Aldi cheapest (fruit & veg)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_14_t', 'prod_14', 'store_tesco', 1.69, 11.2667, 'per kg'),
('price_14_d', 'prod_14', 'store_dunnes', 1.75, 11.6667, 'per kg'),
('price_14_l', 'prod_14', 'store_lidl', 1.59, 10.6000, 'per kg'),
('price_14_a', 'prod_14', 'store_aldi', 1.45, 9.6667, 'per kg'),
('price_14_s', 'prod_14', 'store_supervalu', 1.79, 11.9333, 'per kg');

-- Avocados 2 Pack (per unit) — Aldi cheapest (fruit & veg), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_15_t', 'prod_15', 'store_tesco', 2.29, 1.1450, 'per unit'),
('price_15_d', 'prod_15', 'store_dunnes', 2.39, 1.1950, 'per unit'),
('price_15_l', 'prod_15', 'store_lidl', 2.09, 1.0450, 'per unit'),
('price_15_a', 'prod_15', 'store_aldi', 1.79, 0.8950, 'per unit'),
('price_15_s', 'prod_15', 'store_supervalu', 2.49, 1.2450, 'per unit');

-- Brennans White Sliced Pan 800g (per kg) — Lidl cheapest (bakery)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_16_t', 'prod_16', 'store_tesco', 1.79, 2.2375, 'per kg'),
('price_16_d', 'prod_16', 'store_dunnes', 1.85, 2.3125, 'per kg'),
('price_16_l', 'prod_16', 'store_lidl', 1.49, 1.8625, 'per kg'),
('price_16_a', 'prod_16', 'store_aldi', 1.65, 2.0625, 'per kg'),
('price_16_s', 'prod_16', 'store_supervalu', 1.89, 2.3625, 'per kg');

-- Sourdough Bread Loaf (per kg) — Lidl cheapest (bakery), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_17_t', 'prod_17', 'store_tesco', 3.29, 6.5800, 'per kg'),
('price_17_d', 'prod_17', 'store_dunnes', 3.49, 6.9800, 'per kg'),
('price_17_l', 'prod_17', 'store_lidl', 2.69, 5.3800, 'per kg'),
('price_17_a', 'prod_17', 'store_aldi', 2.99, 5.9800, 'per kg'),
('price_17_s', 'prod_17', 'store_supervalu', 3.59, 7.1800, 'per kg');

-- Croissants 4 Pack (per unit) — Lidl cheapest (bakery)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_18_t', 'prod_18', 'store_tesco', 2.19, 0.5475, 'per unit'),
('price_18_d', 'prod_18', 'store_dunnes', 2.29, 0.5725, 'per unit'),
('price_18_l', 'prod_18', 'store_lidl', 1.69, 0.4225, 'per unit'),
('price_18_a', 'prod_18', 'store_aldi', 1.89, 0.4725, 'per unit'),
('price_18_s', 'prod_18', 'store_supervalu', 2.25, 0.5625, 'per unit');

-- Tortilla Wraps 8 Pack (per unit) — Lidl cheapest (bakery), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_19_t', 'prod_19', 'store_tesco', 1.79, 0.2238, 'per unit'),
('price_19_d', 'prod_19', 'store_dunnes', 1.85, 0.2313, 'per unit'),
('price_19_l', 'prod_19', 'store_lidl', 1.39, 0.1738, 'per unit'),
('price_19_a', 'prod_19', 'store_aldi', 1.55, 0.1938, 'per unit'),
('price_19_s', 'prod_19', 'store_supervalu', 1.89, 0.2363, 'per unit');

-- Barrys Tea Gold Blend 80s (per unit) — Tesco cheapest (branded)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_20_t', 'prod_20', 'store_tesco', 3.99, 0.0499, 'per unit'),
('price_20_d', 'prod_20', 'store_dunnes', 4.49, 0.0561, 'per unit'),
('price_20_l', 'prod_20', 'store_lidl', 4.59, 0.0574, 'per unit'),
('price_20_a', 'prod_20', 'store_aldi', 4.39, 0.0549, 'per unit'),
('price_20_s', 'prod_20', 'store_supervalu', 4.69, 0.0586, 'per unit');

-- Lyons Original Tea 80s (per unit) — Tesco cheapest (branded), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_21_t', 'prod_21', 'store_tesco', 3.79, 0.0474, 'per unit'),
('price_21_d', 'prod_21', 'store_dunnes', 4.19, 0.0524, 'per unit'),
('price_21_l', 'prod_21', 'store_lidl', 4.29, 0.0536, 'per unit'),
('price_21_a', 'prod_21', 'store_aldi', 4.09, 0.0511, 'per unit'),
('price_21_s', 'prod_21', 'store_supervalu', 4.39, 0.0549, 'per unit');

-- Coca-Cola 2L (per l) — Tesco cheapest (branded), very close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_22_t', 'prod_22', 'store_tesco', 2.29, 1.1450, 'per l'),
('price_22_d', 'prod_22', 'store_dunnes', 2.39, 1.1950, 'per l'),
('price_22_l', 'prod_22', 'store_lidl', 2.45, 1.2250, 'per l'),
('price_22_a', 'prod_22', 'store_aldi', 2.35, 1.1750, 'per l'),
('price_22_s', 'prod_22', 'store_supervalu', 2.49, 1.2450, 'per l');

-- Tropicana Orange Juice 1L (per l) — Tesco cheapest (branded)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_23_t', 'prod_23', 'store_tesco', 2.89, 2.8900, 'per l'),
('price_23_d', 'prod_23', 'store_dunnes', 3.29, 3.2900, 'per l'),
('price_23_l', 'prod_23', 'store_lidl', 3.39, 3.3900, 'per l'),
('price_23_a', 'prod_23', 'store_aldi', 3.19, 3.1900, 'per l'),
('price_23_s', 'prod_23', 'store_supervalu', 3.49, 3.4900, 'per l');

-- Ballygowan Still Water 2L (per l) — Lidl cheapest, very close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_24_t', 'prod_24', 'store_tesco', 1.09, 0.5450, 'per l'),
('price_24_d', 'prod_24', 'store_dunnes', 1.15, 0.5750, 'per l'),
('price_24_l', 'prod_24', 'store_lidl', 0.95, 0.4750, 'per l'),
('price_24_a', 'prod_24', 'store_aldi', 0.99, 0.4950, 'per l'),
('price_24_s', 'prod_24', 'store_supervalu', 1.19, 0.5950, 'per l');

-- Fish Fingers 10 Pack (per kg) — Lidl cheapest (frozen)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_25_t', 'prod_25', 'store_tesco', 2.89, 11.5600, 'per kg'),
('price_25_d', 'prod_25', 'store_dunnes', 2.79, 11.1600, 'per kg'),
('price_25_l', 'prod_25', 'store_lidl', 2.19, 8.7600, 'per kg'),
('price_25_a', 'prod_25', 'store_aldi', 2.49, 9.9600, 'per kg'),
('price_25_s', 'prod_25', 'store_supervalu', 2.99, 11.9600, 'per kg');

-- Frozen Pizza Margherita (per kg) — Lidl cheapest (frozen), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_26_t', 'prod_26', 'store_tesco', 3.29, 9.4000, 'per kg'),
('price_26_d', 'prod_26', 'store_dunnes', 3.49, 9.9714, 'per kg'),
('price_26_l', 'prod_26', 'store_lidl', 2.49, 7.1143, 'per kg'),
('price_26_a', 'prod_26', 'store_aldi', 2.89, 8.2571, 'per kg'),
('price_26_s', 'prod_26', 'store_supervalu', 3.59, 10.2571, 'per kg');

-- Frozen Garden Peas 900g (per kg) — Lidl cheapest (frozen), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_27_t', 'prod_27', 'store_tesco', 1.79, 1.9889, 'per kg'),
('price_27_d', 'prod_27', 'store_dunnes', 1.89, 2.1000, 'per kg'),
('price_27_l', 'prod_27', 'store_lidl', 1.35, 1.5000, 'per kg'),
('price_27_a', 'prod_27', 'store_aldi', 1.49, 1.6556, 'per kg'),
('price_27_s', 'prod_27', 'store_supervalu', 1.95, 2.1667, 'per kg');

-- Tayto Cheese & Onion 6 Pack (per kg) — Dunnes cheapest
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_28_t', 'prod_28', 'store_tesco', 2.79, 18.6000, 'per kg'),
('price_28_d', 'prod_28', 'store_dunnes', 2.49, 16.6000, 'per kg'),
('price_28_l', 'prod_28', 'store_lidl', 2.69, 17.9333, 'per kg'),
('price_28_a', 'prod_28', 'store_aldi', 2.59, 17.2667, 'per kg'),
('price_28_s', 'prod_28', 'store_supervalu', 2.89, 19.2667, 'per kg');

-- Cadbury Dairy Milk 200g (per kg) — Tesco cheapest (branded)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_29_t', 'prod_29', 'store_tesco', 3.29, 16.4500, 'per kg'),
('price_29_d', 'prod_29', 'store_dunnes', 3.69, 18.4500, 'per kg'),
('price_29_l', 'prod_29', 'store_lidl', 3.79, 18.9500, 'per kg'),
('price_29_a', 'prod_29', 'store_aldi', 3.59, 17.9500, 'per kg'),
('price_29_s', 'prod_29', 'store_supervalu', 3.89, 19.4500, 'per kg');

-- Digestive Biscuits 400g (per kg) — Aldi cheapest, close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_30_t', 'prod_30', 'store_tesco', 1.69, 4.2250, 'per kg'),
('price_30_d', 'prod_30', 'store_dunnes', 1.65, 4.1250, 'per kg'),
('price_30_l', 'prod_30', 'store_lidl', 1.59, 3.9750, 'per kg'),
('price_30_a', 'prod_30', 'store_aldi', 1.49, 3.7250, 'per kg'),
('price_30_s', 'prod_30', 'store_supervalu', 1.75, 4.3750, 'per kg');

-- Fairy Washing Up Liquid 900ml (per l) — Tesco cheapest (branded)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_31_t', 'prod_31', 'store_tesco', 2.79, 3.1000, 'per l'),
('price_31_d', 'prod_31', 'store_dunnes', 3.19, 3.5444, 'per l'),
('price_31_l', 'prod_31', 'store_lidl', 3.29, 3.6556, 'per l'),
('price_31_a', 'prod_31', 'store_aldi', 3.09, 3.4333, 'per l'),
('price_31_s', 'prod_31', 'store_supervalu', 3.15, 3.5000, 'per l');

-- Toilet Roll 9 Pack (per unit) — SuperValu cheapest (household)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_32_t', 'prod_32', 'store_tesco', 4.79, 0.5322, 'per unit'),
('price_32_d', 'prod_32', 'store_dunnes', 4.69, 0.5211, 'per unit'),
('price_32_l', 'prod_32', 'store_lidl', 4.29, 0.4767, 'per unit'),
('price_32_a', 'prod_32', 'store_aldi', 4.19, 0.4656, 'per unit'),
('price_32_s', 'prod_32', 'store_supervalu', 3.99, 0.4433, 'per unit');

-- Bin Bags 20 Pack (per unit) — SuperValu cheapest (household), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_33_t', 'prod_33', 'store_tesco', 2.69, 0.1345, 'per unit'),
('price_33_d', 'prod_33', 'store_dunnes', 2.59, 0.1295, 'per unit'),
('price_33_l', 'prod_33', 'store_lidl', 2.49, 0.1245, 'per unit'),
('price_33_a', 'prod_33', 'store_aldi', 2.45, 0.1225, 'per unit'),
('price_33_s', 'prod_33', 'store_supervalu', 2.29, 0.1145, 'per unit');

-- Shampoo 400ml (per l) — SuperValu cheapest (personal care)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_34_t', 'prod_34', 'store_tesco', 3.69, 9.2250, 'per l'),
('price_34_d', 'prod_34', 'store_dunnes', 3.59, 8.9750, 'per l'),
('price_34_l', 'prod_34', 'store_lidl', 3.29, 8.2250, 'per l'),
('price_34_a', 'prod_34', 'store_aldi', 3.19, 7.9750, 'per l'),
('price_34_s', 'prod_34', 'store_supervalu', 2.99, 7.4750, 'per l');

-- Toothpaste 100ml (per l) — SuperValu cheapest (personal care), close prices
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_35_t', 'prod_35', 'store_tesco', 2.39, 23.9000, 'per l'),
('price_35_d', 'prod_35', 'store_dunnes', 2.29, 22.9000, 'per l'),
('price_35_l', 'prod_35', 'store_lidl', 2.19, 21.9000, 'per l'),
('price_35_a', 'prod_35', 'store_aldi', 2.15, 21.5000, 'per l'),
('price_35_s', 'prod_35', 'store_supervalu', 1.99, 19.9000, 'per l');

-- Baby Wipes 64 Pack (per unit) — SuperValu cheapest (baby)
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_36_t', 'prod_36', 'store_tesco', 2.29, 0.0358, 'per unit'),
('price_36_d', 'prod_36', 'store_dunnes', 2.19, 0.0342, 'per unit'),
('price_36_l', 'prod_36', 'store_lidl', 2.09, 0.0327, 'per unit'),
('price_36_a', 'prod_36', 'store_aldi', 1.99, 0.0311, 'per unit'),
('price_36_s', 'prod_36', 'store_supervalu', 1.79, 0.0280, 'per unit');

-- Nappies Size 4 (40 Pack) (per unit) — SuperValu cheapest (baby), big gap
INSERT INTO "Price" ("id", "productId", "storeId", "price", "unitPrice", "unitPriceUnit") VALUES
('price_37_t', 'prod_37', 'store_tesco', 9.99, 0.2498, 'per unit'),
('price_37_d', 'prod_37', 'store_dunnes', 9.49, 0.2373, 'per unit'),
('price_37_l', 'prod_37', 'store_lidl', 8.99, 0.2248, 'per unit'),
('price_37_a', 'prod_37', 'store_aldi', 8.79, 0.2198, 'per unit'),
('price_37_s', 'prod_37', 'store_supervalu', 7.99, 0.1998, 'per unit');

-- Mark ~18 items as on sale at various stores
-- Tesco sales (branded deals)
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 4.49 WHERE "id" = 'price_20_t';  -- Barry's Tea
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 4.29 WHERE "id" = 'price_21_t';  -- Lyons Tea
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.69 WHERE "id" = 'price_29_t';  -- Cadbury

-- Dunnes sales (meat deals)
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 5.99 WHERE "id" = 'price_6_d';   -- Chicken
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 5.49 WHERE "id" = 'price_7_d';   -- Mince Beef
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'price_28_d';  -- Tayto

-- Lidl sales (bakery & frozen)
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.79 WHERE "id" = 'price_16_l';  -- Brennans Bread
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'price_17_l';  -- Sourdough
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'price_26_l';  -- Frozen Pizza
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.69 WHERE "id" = 'price_27_l';  -- Frozen Peas

-- Aldi sales (dairy & fruit)
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.19 WHERE "id" = 'price_1_a';   -- Milk
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.49 WHERE "id" = 'price_3_a';   -- Eggs
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.19 WHERE "id" = 'price_15_a';  -- Avocados
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.19 WHERE "id" = 'price_11_a';  -- Bananas

-- SuperValu sales (baby & personal care)
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 9.49 WHERE "id" = 'price_37_s';  -- Nappies
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.29 WHERE "id" = 'price_36_s';  -- Baby Wipes
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.49 WHERE "id" = 'price_34_s';  -- Shampoo
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 4.49 WHERE "id" = 'price_32_s';  -- Toilet Roll

-- Done! Your database now has:
-- 5 stores (Tesco, Dunnes, Lidl, Aldi, SuperValu)
-- 10 Dublin store locations
-- 10 product categories
-- 37 Irish grocery products
-- 185 price records (37 products x 5 stores)
-- 18 items on sale across all 5 stores
