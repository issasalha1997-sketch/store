-- ============================================================
-- GrocerySaver — Realistic Price Update
-- Run this in Supabase SQL Editor AFTER setup.sql
-- This updates prices so different stores are cheapest for different items
-- ============================================================

-- Delete all existing prices and re-insert with varied pricing
DELETE FROM "Price";

-- DAIRY & EGGS: Aldi cheapest for most, but Lidl wins on some
-- Avonmore Full Fat Milk 2L — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p1t','prod_1','store_tesco',2.25,1.125,'per l'),('p1d','prod_1','store_dunnes',2.15,1.075,'per l'),
('p1l','prod_1','store_lidl',1.95,0.975,'per l'),('p1a','prod_1','store_aldi',1.85,0.925,'per l'),
('p1s','prod_1','store_supervalu',2.29,1.145,'per l');
-- Kerrygold Butter — Dunnes cheapest (strong own-brand deals)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p2t','prod_2','store_tesco',3.29,13.16,'per kg'),('p2d','prod_2','store_dunnes',2.89,11.56,'per kg'),
('p2l','prod_2','store_lidl',3.15,12.60,'per kg'),('p2a','prod_2','store_aldi',3.09,12.36,'per kg'),
('p2s','prod_2','store_supervalu',3.49,13.96,'per kg');
-- Free Range Eggs — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p3t','prod_3','store_tesco',4.19,0.349,'per unit'),('p3d','prod_3','store_dunnes',3.99,0.333,'per unit'),
('p3l','prod_3','store_lidl',3.59,0.299,'per unit'),('p3a','prod_3','store_aldi',3.39,0.283,'per unit'),
('p3s','prod_3','store_supervalu',4.29,0.358,'per unit');
-- Cheddar Cheese — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p4t','prod_4','store_tesco',2.89,14.45,'per kg'),('p4d','prod_4','store_dunnes',2.79,13.95,'per kg'),
('p4l','prod_4','store_lidl',2.35,11.75,'per kg'),('p4a','prod_4','store_aldi',2.49,12.45,'per kg'),
('p4s','prod_4','store_supervalu',2.99,14.95,'per kg');
-- Greek Yoghurt — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p5t','prod_5','store_tesco',2.49,4.98,'per kg'),('p5d','prod_5','store_dunnes',2.35,4.70,'per kg'),
('p5l','prod_5','store_lidl',2.09,4.18,'per kg'),('p5a','prod_5','store_aldi',1.89,3.78,'per kg'),
('p5s','prod_5','store_supervalu',2.55,5.10,'per kg');

-- MEAT & POULTRY: Dunnes cheapest for most
-- Chicken Breast — Dunnes cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p6t','prod_6','store_tesco',6.29,12.58,'per kg'),('p6d','prod_6','store_dunnes',5.29,10.58,'per kg'),
('p6l','prod_6','store_lidl',5.99,11.98,'per kg'),('p6a','prod_6','store_aldi',5.79,11.58,'per kg'),
('p6s','prod_6','store_supervalu',6.49,12.98,'per kg');
-- Lean Mince Beef — Dunnes cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p7t','prod_7','store_tesco',5.79,11.58,'per kg'),('p7d','prod_7','store_dunnes',4.79,9.58,'per kg'),
('p7l','prod_7','store_lidl',5.49,10.98,'per kg'),('p7a','prod_7','store_aldi',5.19,10.38,'per kg'),
('p7s','prod_7','store_supervalu',5.99,11.98,'per kg');
-- Back Bacon — Dunnes cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p8t','prod_8','store_tesco',3.19,15.95,'per kg'),('p8d','prod_8','store_dunnes',2.59,12.95,'per kg'),
('p8l','prod_8','store_lidl',2.89,14.45,'per kg'),('p8a','prod_8','store_aldi',2.79,13.95,'per kg'),
('p8s','prod_8','store_supervalu',3.29,16.45,'per kg');
-- Pork Sausages — Tesco cheapest (promo)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p9t','prod_9','store_tesco',2.29,5.04,'per kg'),('p9d','prod_9','store_dunnes',2.69,5.93,'per kg'),
('p9l','prod_9','store_lidl',2.49,5.49,'per kg'),('p9a','prod_9','store_aldi',2.59,5.71,'per kg'),
('p9s','prod_9','store_supervalu',2.89,6.37,'per kg');
-- Salmon Fillets — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p10t','prod_10','store_tesco',5.99,21.39,'per kg'),('p10d','prod_10','store_dunnes',5.79,20.68,'per kg'),
('p10l','prod_10','store_lidl',4.99,17.82,'per kg'),('p10a','prod_10','store_aldi',5.49,19.61,'per kg'),
('p10s','prod_10','store_supervalu',6.19,22.11,'per kg');

-- FRUITS & VEG: Aldi cheapest for most, Lidl close
-- Bananas — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p11t','prod_11','store_tesco',1.39,0.278,'per unit'),('p11d','prod_11','store_dunnes',1.25,0.250,'per unit'),
('p11l','prod_11','store_lidl',1.05,0.210,'per unit'),('p11a','prod_11','store_aldi',0.95,0.190,'per unit'),
('p11s','prod_11','store_supervalu',1.45,0.290,'per unit');
-- Baby Potatoes — SuperValu cheapest (Irish produce)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p12t','prod_12','store_tesco',1.89,1.89,'per kg'),('p12d','prod_12','store_dunnes',1.79,1.79,'per kg'),
('p12l','prod_12','store_lidl',1.59,1.59,'per kg'),('p12a','prod_12','store_aldi',1.55,1.55,'per kg'),
('p12s','prod_12','store_supervalu',1.39,1.39,'per kg');
-- Broccoli — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p13t','prod_13','store_tesco',1.29,1.29,'per unit'),('p13d','prod_13','store_dunnes',1.19,1.19,'per unit'),
('p13l','prod_13','store_lidl',0.99,0.99,'per unit'),('p13a','prod_13','store_aldi',0.89,0.89,'per unit'),
('p13s','prod_13','store_supervalu',1.35,1.35,'per unit');
-- Mixed Salad — Tesco cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p14t','prod_14','store_tesco',1.39,9.27,'per kg'),('p14d','prod_14','store_dunnes',1.69,11.27,'per kg'),
('p14l','prod_14','store_lidl',1.49,9.93,'per kg'),('p14a','prod_14','store_aldi',1.55,10.33,'per kg'),
('p14s','prod_14','store_supervalu',1.75,11.67,'per kg');
-- Avocados — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p15t','prod_15','store_tesco',2.49,1.245,'per unit'),('p15d','prod_15','store_dunnes',2.29,1.145,'per unit'),
('p15l','prod_15','store_lidl',1.79,0.895,'per unit'),('p15a','prod_15','store_aldi',1.99,0.995,'per unit'),
('p15s','prod_15','store_supervalu',2.39,1.195,'per unit');

-- BAKERY: Lidl cheapest for most
-- Brennans Bread — SuperValu cheapest (Irish brand loyalty)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p16t','prod_16','store_tesco',1.89,2.36,'per kg'),('p16d','prod_16','store_dunnes',1.85,2.31,'per kg'),
('p16l','prod_16','store_lidl',1.75,2.19,'per kg'),('p16a','prod_16','store_aldi',1.79,2.24,'per kg'),
('p16s','prod_16','store_supervalu',1.65,2.06,'per kg');
-- Sourdough — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p17t','prod_17','store_tesco',3.49,6.98,'per kg'),('p17d','prod_17','store_dunnes',3.29,6.58,'per kg'),
('p17l','prod_17','store_lidl',2.49,4.98,'per kg'),('p17a','prod_17','store_aldi',2.89,5.78,'per kg'),
('p17s','prod_17','store_supervalu',3.39,6.78,'per kg');
-- Croissants — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p18t','prod_18','store_tesco',2.29,0.573,'per unit'),('p18d','prod_18','store_dunnes',2.19,0.548,'per unit'),
('p18l','prod_18','store_lidl',1.49,0.373,'per unit'),('p18a','prod_18','store_aldi',1.79,0.448,'per unit'),
('p18s','prod_18','store_supervalu',2.25,0.563,'per unit');
-- Tortilla Wraps — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p19t','prod_19','store_tesco',1.99,0.249,'per unit'),('p19d','prod_19','store_dunnes',1.89,0.236,'per unit'),
('p19l','prod_19','store_lidl',1.55,0.194,'per unit'),('p19a','prod_19','store_aldi',1.39,0.174,'per unit'),
('p19s','prod_19','store_supervalu',1.95,0.244,'per unit');

-- DRINKS: Tesco cheapest for branded, Aldi for own-brand
-- Barry's Tea — Tesco cheapest (brand deals)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p20t','prod_20','store_tesco',3.99,0.050,'per unit'),('p20d','prod_20','store_dunnes',4.49,0.056,'per unit'),
('p20l','prod_20','store_lidl',4.79,0.060,'per unit'),('p20a','prod_20','store_aldi',4.69,0.059,'per unit'),
('p20s','prod_20','store_supervalu',4.39,0.055,'per unit');
-- Lyons Tea — Tesco cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p21t','prod_21','store_tesco',3.89,0.049,'per unit'),('p21d','prod_21','store_dunnes',4.29,0.054,'per unit'),
('p21l','prod_21','store_lidl',4.59,0.057,'per unit'),('p21a','prod_21','store_aldi',4.49,0.056,'per unit'),
('p21s','prod_21','store_supervalu',4.19,0.052,'per unit');
-- Coca-Cola — Tesco cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p22t','prod_22','store_tesco',2.15,1.075,'per l'),('p22d','prod_22','store_dunnes',2.45,1.225,'per l'),
('p22l','prod_22','store_lidl',2.55,1.275,'per l'),('p22a','prod_22','store_aldi',2.49,1.245,'per l'),
('p22s','prod_22','store_supervalu',2.59,1.295,'per l');
-- Tropicana OJ — Tesco cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p23t','prod_23','store_tesco',2.79,2.79,'per l'),('p23d','prod_23','store_dunnes',3.19,3.19,'per l'),
('p23l','prod_23','store_lidl',3.29,3.29,'per l'),('p23a','prod_23','store_aldi',3.09,3.09,'per l'),
('p23s','prod_23','store_supervalu',3.39,3.39,'per l');
-- Ballygowan Water — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p24t','prod_24','store_tesco',1.19,0.595,'per l'),('p24d','prod_24','store_dunnes',1.09,0.545,'per l'),
('p24l','prod_24','store_lidl',0.99,0.495,'per l'),('p24a','prod_24','store_aldi',0.89,0.445,'per l'),
('p24s','prod_24','store_supervalu',1.25,0.625,'per l');

-- FROZEN: Lidl cheapest
-- Fish Fingers — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p25t','prod_25','store_tesco',2.99,11.96,'per kg'),('p25d','prod_25','store_dunnes',2.79,11.16,'per kg'),
('p25l','prod_25','store_lidl',1.99,7.96,'per kg'),('p25a','prod_25','store_aldi',2.29,9.16,'per kg'),
('p25s','prod_25','store_supervalu',2.89,11.56,'per kg');
-- Frozen Pizza — Lidl cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p26t','prod_26','store_tesco',3.49,9.97,'per kg'),('p26d','prod_26','store_dunnes',3.29,9.40,'per kg'),
('p26l','prod_26','store_lidl',2.19,6.26,'per kg'),('p26a','prod_26','store_aldi',2.49,7.11,'per kg'),
('p26s','prod_26','store_supervalu',3.39,9.69,'per kg');
-- Frozen Peas — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p27t','prod_27','store_tesco',1.99,2.21,'per kg'),('p27d','prod_27','store_dunnes',1.89,2.10,'per kg'),
('p27l','prod_27','store_lidl',1.49,1.66,'per kg'),('p27a','prod_27','store_aldi',1.35,1.50,'per kg'),
('p27s','prod_27','store_supervalu',1.95,2.17,'per kg');

-- SNACKS: Mixed winners
-- Tayto — Dunnes cheapest (Irish brand)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p28t','prod_28','store_tesco',2.89,19.27,'per kg'),('p28d','prod_28','store_dunnes',2.39,15.93,'per kg'),
('p28l','prod_28','store_lidl',2.79,18.60,'per kg'),('p28a','prod_28','store_aldi',2.69,17.93,'per kg'),
('p28s','prod_28','store_supervalu',2.99,19.93,'per kg');
-- Cadbury Dairy Milk — Tesco cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p29t','prod_29','store_tesco',3.19,15.95,'per kg'),('p29d','prod_29','store_dunnes',3.59,17.95,'per kg'),
('p29l','prod_29','store_lidl',3.79,18.95,'per kg'),('p29a','prod_29','store_aldi',3.69,18.45,'per kg'),
('p29s','prod_29','store_supervalu',3.89,19.45,'per kg');
-- Digestive Biscuits — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p30t','prod_30','store_tesco',1.89,4.73,'per kg'),('p30d','prod_30','store_dunnes',1.79,4.48,'per kg'),
('p30l','prod_30','store_lidl',1.49,3.73,'per kg'),('p30a','prod_30','store_aldi',1.29,3.23,'per kg'),
('p30s','prod_30','store_supervalu',1.95,4.88,'per kg');

-- HOUSEHOLD: Mixed winners
-- Fairy Liquid — Tesco cheapest (brand deal)
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p31t','prod_31','store_tesco',2.69,2.99,'per l'),('p31d','prod_31','store_dunnes',3.19,3.54,'per l'),
('p31l','prod_31','store_lidl',3.29,3.66,'per l'),('p31a','prod_31','store_aldi',3.09,3.43,'per l'),
('p31s','prod_31','store_supervalu',3.39,3.77,'per l');
-- Toilet Roll — Aldi cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p32t','prod_32','store_tesco',4.99,0.554,'per unit'),('p32d','prod_32','store_dunnes',4.79,0.532,'per unit'),
('p32l','prod_32','store_lidl',4.19,0.466,'per unit'),('p32a','prod_32','store_aldi',3.79,0.421,'per unit'),
('p32s','prod_32','store_supervalu',4.89,0.543,'per unit');
-- Bin Bags — SuperValu cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p33t','prod_33','store_tesco',2.99,0.150,'per unit'),('p33d','prod_33','store_dunnes',2.79,0.140,'per unit'),
('p33l','prod_33','store_lidl',2.49,0.125,'per unit'),('p33a','prod_33','store_aldi',2.39,0.120,'per unit'),
('p33s','prod_33','store_supervalu',2.19,0.110,'per unit');

-- PERSONAL CARE: SuperValu cheapest
-- Shampoo — SuperValu cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p34t','prod_34','store_tesco',3.99,9.98,'per l'),('p34d','prod_34','store_dunnes',3.79,9.48,'per l'),
('p34l','prod_34','store_lidl',3.29,8.23,'per l'),('p34a','prod_34','store_aldi',3.19,7.98,'per l'),
('p34s','prod_34','store_supervalu',2.89,7.23,'per l');
-- Toothpaste — SuperValu cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p35t','prod_35','store_tesco',2.49,24.90,'per l'),('p35d','prod_35','store_dunnes',2.39,23.90,'per l'),
('p35l','prod_35','store_lidl',2.19,21.90,'per l'),('p35a','prod_35','store_aldi',2.09,20.90,'per l'),
('p35s','prod_35','store_supervalu',1.89,18.90,'per l');

-- BABY: SuperValu cheapest
-- Baby Wipes — SuperValu cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p36t','prod_36','store_tesco',2.49,0.039,'per unit'),('p36d','prod_36','store_dunnes',2.39,0.037,'per unit'),
('p36l','prod_36','store_lidl',2.09,0.033,'per unit'),('p36a','prod_36','store_aldi',1.99,0.031,'per unit'),
('p36s','prod_36','store_supervalu',1.79,0.028,'per unit');
-- Nappies — SuperValu cheapest
INSERT INTO "Price" ("id","productId","storeId","price","unitPrice","unitPriceUnit") VALUES
('p37t','prod_37','store_tesco',9.99,0.250,'per unit'),('p37d','prod_37','store_dunnes',9.49,0.237,'per unit'),
('p37l','prod_37','store_lidl',8.49,0.212,'per unit'),('p37a','prod_37','store_aldi',8.29,0.207,'per unit'),
('p37s','prod_37','store_supervalu',7.49,0.187,'per unit');

-- ON SALE items — spread across all stores
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.49 WHERE "id" = 'p1l';   -- Milk at Lidl
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.49 WHERE "id" = 'p2d';   -- Butter at Dunnes
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 6.99 WHERE "id" = 'p6d';   -- Chicken at Dunnes
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 5.99 WHERE "id" = 'p7d';   -- Mince at Dunnes
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.29 WHERE "id" = 'p11a';  -- Bananas at Aldi
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.99 WHERE "id" = 'p14t';  -- Salad at Tesco
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.29 WHERE "id" = 'p17l';  -- Sourdough at Lidl
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 1.99 WHERE "id" = 'p18l';  -- Croissants at Lidl
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 4.99 WHERE "id" = 'p20t';  -- Barry's at Tesco
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.79 WHERE "id" = 'p22t';  -- Coca-Cola at Tesco
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'p25l';  -- Fish Fingers at Lidl
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'p26l';  -- Pizza at Lidl
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.99 WHERE "id" = 'p28d';  -- Tayto at Dunnes
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.99 WHERE "id" = 'p29t';  -- Cadbury at Tesco
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 3.49 WHERE "id" = 'p31t';  -- Fairy at Tesco
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 2.49 WHERE "id" = 'p35s';  -- Toothpaste at SuperValu
UPDATE "Price" SET "isOnSale" = true, "originalPrice" = 9.99 WHERE "id" = 'p37s';  -- Nappies at SuperValu

-- Summary of cheapest stores:
-- Tesco: Barry's Tea, Lyons Tea, Coca-Cola, Tropicana, Cadbury, Fairy, Sausages, Mixed Salad
-- Dunnes: Chicken, Mince Beef, Bacon, Tayto, Butter
-- Lidl: Sourdough, Croissants, Fish Fingers, Pizza, Cheese, Salmon, Avocados
-- Aldi: Milk, Eggs, Yoghurt, Bananas, Broccoli, Wraps, Water, Biscuits, Peas, Toilet Roll
-- SuperValu: Potatoes, Bread, Bin Bags, Shampoo, Toothpaste, Baby Wipes, Nappies
