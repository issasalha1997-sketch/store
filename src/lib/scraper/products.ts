/**
 * TypeScript scraper that runs inside Next.js API routes (works on Vercel).
 * Uses curated product data for all 5 Irish supermarkets.
 */

export interface ScrapedProduct {
  name: string;
  price: number;
  originalPrice?: number;
  isOnSale?: boolean;
  unitPrice?: number;
  unitPriceUnit?: string;
  brand?: string;
  category?: string;
  weight?: number;
  weightUnit?: string;
  barcode?: string;
  imageUrl?: string;
  sourceUrl?: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Curated product data for each store                                */
/* ------------------------------------------------------------------ */

const TESCO_PRODUCTS: ScrapedProduct[] = [
  { name: "Tesco Irish Whole Milk 2L", price: 1.95, brand: "Tesco", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Tesco Low Fat Milk 2L", price: 1.89, brand: "Tesco", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Tesco Whole Milk 1L", price: 1.25, brand: "Tesco", category: "dairy & eggs", weight: 1, weightUnit: "l" },
  { name: "Kerrygold Pure Irish Butter 227g", price: 2.89, brand: "Kerrygold", category: "dairy & eggs", weight: 227, weightUnit: "g" },
  { name: "Tesco Spreadable Butter 500g", price: 3.59, brand: "Tesco", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Tesco Mild Cheddar Cheese 200g", price: 2.15, brand: "Tesco", category: "dairy & eggs", weight: 200, weightUnit: "g" },
  { name: "Glenisk Organic Natural Yoghurt 500g", price: 2.49, brand: "Glenisk", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Tesco Free Range Eggs 10 Pack", price: 3.19, brand: "Tesco", category: "dairy & eggs", weight: 10, weightUnit: "units" },
  { name: "Tesco Free Range Eggs 6 Pack", price: 2.09, brand: "Tesco", category: "dairy & eggs", weight: 6, weightUnit: "units" },
  { name: "Tesco Grated Mozzarella 250g", price: 1.79, brand: "Tesco", category: "dairy & eggs", weight: 250, weightUnit: "g" },
  { name: "Tesco Irish Chicken Breast Fillets 360g", price: 4.69, brand: "Tesco", category: "meat & poultry", weight: 360, weightUnit: "g" },
  { name: "Tesco Irish Chicken Thighs 500g", price: 3.49, brand: "Tesco", category: "meat & poultry", weight: 500, weightUnit: "g" },
  { name: "Tesco Irish Beef Mince 400g", price: 4.19, brand: "Tesco", category: "meat & poultry", weight: 400, weightUnit: "g" },
  { name: "Tesco Irish Beef Mince 750g", price: 6.79, brand: "Tesco", category: "meat & poultry", weight: 750, weightUnit: "g" },
  { name: "Tesco Streaky Bacon Rashers 200g", price: 2.49, brand: "Tesco", category: "meat & poultry", weight: 200, weightUnit: "g" },
  { name: "Tesco Irish Pork Sausages 454g", price: 2.69, brand: "Tesco", category: "meat & poultry", weight: 454, weightUnit: "g" },
  { name: "Tesco Smoked Salmon 100g", price: 4.29, brand: "Tesco", category: "meat & poultry", weight: 100, weightUnit: "g" },
  { name: "Tesco Bananas 5 Pack", price: 1.09, brand: "Tesco", category: "fruits & vegetables", weight: 5, weightUnit: "units" },
  { name: "Tesco Broccoli Head", price: 1.09, brand: "Tesco", category: "fruits & vegetables" },
  { name: "Tesco Carrots 1kg", price: 0.89, brand: "Tesco", category: "fruits & vegetables", weight: 1, weightUnit: "kg" },
  { name: "Tesco Rooster Potatoes 2.5kg", price: 2.69, brand: "Tesco", category: "fruits & vegetables", weight: 2.5, weightUnit: "kg" },
  { name: "Tesco White Potatoes 2kg", price: 1.89, brand: "Tesco", category: "fruits & vegetables", weight: 2, weightUnit: "kg" },
  { name: "Tesco Iceberg Lettuce", price: 0.99, brand: "Tesco", category: "fruits & vegetables" },
  { name: "Tesco Vine Tomatoes 450g", price: 1.59, brand: "Tesco", category: "fruits & vegetables", weight: 450, weightUnit: "g" },
  { name: "Tesco White Sliced Pan 800g", price: 1.35, brand: "Tesco", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Tesco Wholemeal Sliced Pan 800g", price: 1.45, brand: "Tesco", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Brennans Family Pan 800g", price: 2.09, brand: "Brennans", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Tesco 4 Butter Croissants", price: 1.69, brand: "Tesco", category: "bakery", weight: 4, weightUnit: "units" },
  { name: "Tesco Still Water 2L", price: 0.55, brand: "Tesco", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Tesco Orange Juice 1L", price: 1.85, brand: "Tesco", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Tesco Apple Juice 1L", price: 1.59, brand: "Tesco", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Barry's Gold Blend Tea 80s", price: 4.29, brand: "Barry's", category: "drinks", weight: 80, weightUnit: "units" },
  { name: "Nescafé Original Instant Coffee 200g", price: 6.99, brand: "Nescafé", category: "drinks", weight: 200, weightUnit: "g" },
  { name: "Coca-Cola 2L", price: 2.85, brand: "Coca-Cola", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Tesco Cola 2L", price: 0.95, brand: "Tesco", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Birds Eye Fish Fingers 450g", price: 3.99, brand: "Birds Eye", category: "frozen", weight: 450, weightUnit: "g" },
  { name: "Tesco Frozen Pizza Margherita 300g", price: 1.89, brand: "Tesco", category: "frozen", weight: 300, weightUnit: "g" },
  { name: "Tesco Frozen Chips 1.5kg", price: 2.19, brand: "Tesco", category: "frozen", weight: 1.5, weightUnit: "kg" },
  { name: "HB Vanilla Ice Cream 900ml", price: 3.99, brand: "HB", category: "frozen", weight: 900, weightUnit: "ml" },
  { name: "Cadbury Dairy Milk 200g", price: 2.49, brand: "Cadbury", category: "snacks & sweets", weight: 200, weightUnit: "g" },
  { name: "Tesco Dark Chocolate 100g", price: 1.19, brand: "Tesco", category: "snacks & sweets", weight: 100, weightUnit: "g" },
  { name: "Tayto Cheese & Onion Multipack 12 Pack", price: 4.49, brand: "Tayto", category: "snacks & sweets", weight: 12, weightUnit: "units" },
  { name: "Tesco Digestive Biscuits 400g", price: 1.15, brand: "Tesco", category: "snacks & sweets", weight: 400, weightUnit: "g" },
  { name: "Tesco Kitchen Roll 2 Pack", price: 1.99, brand: "Tesco", category: "household", weight: 2, weightUnit: "units" },
  { name: "Tesco Toilet Roll 9 Pack", price: 3.79, brand: "Tesco", category: "household", weight: 9, weightUnit: "units" },
  { name: "Fairy Washing Up Liquid 500ml", price: 2.49, brand: "Fairy", category: "household", weight: 500, weightUnit: "ml" },
  { name: "Persil Laundry Detergent 1.1L", price: 7.99, brand: "Persil", category: "household", weight: 1.1, weightUnit: "l" },
];

const DUNNES_PRODUCTS: ScrapedProduct[] = [
  { name: "Dunnes Irish Whole Milk 2L", price: 1.90, brand: "Dunnes", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Dunnes Low Fat Milk 2L", price: 1.85, brand: "Dunnes", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Dunnes Whole Milk 1L", price: 1.20, brand: "Dunnes", category: "dairy & eggs", weight: 1, weightUnit: "l" },
  { name: "Kerrygold Pure Irish Butter 227g", price: 2.79, brand: "Kerrygold", category: "dairy & eggs", weight: 227, weightUnit: "g" },
  { name: "Dunnes Spreadable Butter 500g", price: 3.45, brand: "Dunnes", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Dunnes Mild Cheddar Cheese 200g", price: 1.99, brand: "Dunnes", category: "dairy & eggs", weight: 200, weightUnit: "g" },
  { name: "Dunnes Grated Mozzarella 250g", price: 1.65, brand: "Dunnes", category: "dairy & eggs", weight: 250, weightUnit: "g" },
  { name: "Dunnes Free Range Eggs 10 Pack", price: 3.09, brand: "Dunnes", category: "dairy & eggs", weight: 10, weightUnit: "units" },
  { name: "Dunnes Free Range Eggs 6 Pack", price: 1.99, brand: "Dunnes", category: "dairy & eggs", weight: 6, weightUnit: "units" },
  { name: "Dunnes Greek Style Yoghurt 500g", price: 1.55, brand: "Dunnes", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Dunnes Natural Yoghurt 500g", price: 1.05, brand: "Dunnes", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Dunnes Irish Chicken Breast Fillets 360g", price: 4.59, brand: "Dunnes", category: "meat & poultry", weight: 360, weightUnit: "g" },
  { name: "Dunnes Irish Chicken Thighs 500g", price: 3.39, brand: "Dunnes", category: "meat & poultry", weight: 500, weightUnit: "g" },
  { name: "Dunnes Irish Beef Mince 400g", price: 4.09, brand: "Dunnes", category: "meat & poultry", weight: 400, weightUnit: "g" },
  { name: "Dunnes Irish Beef Mince 750g", price: 6.59, brand: "Dunnes", category: "meat & poultry", weight: 750, weightUnit: "g" },
  { name: "Dunnes Streaky Bacon 200g", price: 2.39, brand: "Dunnes", category: "meat & poultry", weight: 200, weightUnit: "g" },
  { name: "Dunnes Irish Pork Sausages 454g", price: 2.55, brand: "Dunnes", category: "meat & poultry", weight: 454, weightUnit: "g" },
  { name: "Dunnes Smoked Salmon 100g", price: 4.19, brand: "Dunnes", category: "meat & poultry", weight: 100, weightUnit: "g" },
  { name: "Dunnes Bananas 5 Pack", price: 1.05, brand: "Dunnes", category: "fruits & vegetables", weight: 5, weightUnit: "units" },
  { name: "Dunnes Broccoli Head", price: 1.05, brand: "Dunnes", category: "fruits & vegetables" },
  { name: "Dunnes Carrots 1kg", price: 0.85, brand: "Dunnes", category: "fruits & vegetables", weight: 1, weightUnit: "kg" },
  { name: "Dunnes Rooster Potatoes 2.5kg", price: 2.59, brand: "Dunnes", category: "fruits & vegetables", weight: 2.5, weightUnit: "kg" },
  { name: "Dunnes White Potatoes 2kg", price: 1.85, brand: "Dunnes", category: "fruits & vegetables", weight: 2, weightUnit: "kg" },
  { name: "Dunnes Iceberg Lettuce", price: 0.95, brand: "Dunnes", category: "fruits & vegetables" },
  { name: "Dunnes Vine Tomatoes 450g", price: 1.49, brand: "Dunnes", category: "fruits & vegetables", weight: 450, weightUnit: "g" },
  { name: "Dunnes White Sliced Pan 800g", price: 1.29, brand: "Dunnes", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Dunnes Wholemeal Sliced Pan 800g", price: 1.39, brand: "Dunnes", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Brennans Family Pan 800g", price: 2.05, brand: "Brennans", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Dunnes 4 Croissants", price: 1.55, brand: "Dunnes", category: "bakery", weight: 4, weightUnit: "units" },
  { name: "Dunnes Still Water 2L", price: 0.49, brand: "Dunnes", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Dunnes Orange Juice 1L", price: 1.75, brand: "Dunnes", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Dunnes Apple Juice 1L", price: 1.55, brand: "Dunnes", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Barry's Gold Blend Tea 80s", price: 4.19, brand: "Barry's", category: "drinks", weight: 80, weightUnit: "units" },
  { name: "Nescafé Original Instant Coffee 200g", price: 6.89, brand: "Nescafé", category: "drinks", weight: 200, weightUnit: "g" },
  { name: "Coca-Cola 2L", price: 2.79, brand: "Coca-Cola", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Dunnes Fish Fingers 450g", price: 2.69, brand: "Dunnes", category: "frozen", weight: 450, weightUnit: "g" },
  { name: "Dunnes Frozen Pizza Margherita 300g", price: 1.79, brand: "Dunnes", category: "frozen", weight: 300, weightUnit: "g" },
  { name: "Dunnes Frozen Chips 1.5kg", price: 2.09, brand: "Dunnes", category: "frozen", weight: 1.5, weightUnit: "kg" },
  { name: "HB Vanilla Ice Cream 900ml", price: 3.89, brand: "HB", category: "frozen", weight: 900, weightUnit: "ml" },
  { name: "Cadbury Dairy Milk 200g", price: 2.39, brand: "Cadbury", category: "snacks & sweets", weight: 200, weightUnit: "g" },
  { name: "Dunnes Dark Chocolate 100g", price: 1.09, brand: "Dunnes", category: "snacks & sweets", weight: 100, weightUnit: "g" },
  { name: "Tayto Cheese & Onion Multipack 12 Pack", price: 4.39, brand: "Tayto", category: "snacks & sweets", weight: 12, weightUnit: "units" },
  { name: "Dunnes Digestive Biscuits 400g", price: 1.09, brand: "Dunnes", category: "snacks & sweets", weight: 400, weightUnit: "g" },
  { name: "Dunnes Kitchen Roll 2 Pack", price: 1.89, brand: "Dunnes", category: "household", weight: 2, weightUnit: "units" },
  { name: "Dunnes Toilet Roll 9 Pack", price: 3.59, brand: "Dunnes", category: "household", weight: 9, weightUnit: "units" },
  { name: "Fairy Washing Up Liquid 500ml", price: 2.39, brand: "Fairy", category: "household", weight: 500, weightUnit: "ml" },
  { name: "Persil Laundry Detergent 1.1L", price: 7.79, brand: "Persil", category: "household", weight: 1.1, weightUnit: "l" },
];

const SUPERVALU_PRODUCTS: ScrapedProduct[] = [
  { name: "SuperValu Irish Whole Milk 2L", price: 1.99, brand: "SuperValu", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "SuperValu Low Fat Milk 2L", price: 1.95, brand: "SuperValu", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "SuperValu Whole Milk 1L", price: 1.29, brand: "SuperValu", category: "dairy & eggs", weight: 1, weightUnit: "l" },
  { name: "Kerrygold Pure Irish Butter 227g", price: 2.95, brand: "Kerrygold", category: "dairy & eggs", weight: 227, weightUnit: "g" },
  { name: "SuperValu Spreadable Butter 500g", price: 3.65, brand: "SuperValu", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "SuperValu Mild Cheddar Cheese 200g", price: 2.25, brand: "SuperValu", category: "dairy & eggs", weight: 200, weightUnit: "g" },
  { name: "SuperValu Grated Mozzarella 250g", price: 1.85, brand: "SuperValu", category: "dairy & eggs", weight: 250, weightUnit: "g" },
  { name: "SuperValu Free Range Eggs 10 Pack", price: 3.29, brand: "SuperValu", category: "dairy & eggs", weight: 10, weightUnit: "units" },
  { name: "SuperValu Free Range Eggs 6 Pack", price: 2.15, brand: "SuperValu", category: "dairy & eggs", weight: 6, weightUnit: "units" },
  { name: "SuperValu Greek Style Yoghurt 500g", price: 1.65, brand: "SuperValu", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "SuperValu Natural Yoghurt 500g", price: 1.15, brand: "SuperValu", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "SuperValu Irish Chicken Breast Fillets 360g", price: 4.79, brand: "SuperValu", category: "meat & poultry", weight: 360, weightUnit: "g" },
  { name: "SuperValu Irish Chicken Thighs 500g", price: 3.55, brand: "SuperValu", category: "meat & poultry", weight: 500, weightUnit: "g" },
  { name: "SuperValu Irish Beef Mince 400g", price: 4.29, brand: "SuperValu", category: "meat & poultry", weight: 400, weightUnit: "g" },
  { name: "SuperValu Irish Beef Mince 750g", price: 6.89, brand: "SuperValu", category: "meat & poultry", weight: 750, weightUnit: "g" },
  { name: "SuperValu Streaky Bacon 200g", price: 2.55, brand: "SuperValu", category: "meat & poultry", weight: 200, weightUnit: "g" },
  { name: "SuperValu Irish Pork Sausages 454g", price: 2.75, brand: "SuperValu", category: "meat & poultry", weight: 454, weightUnit: "g" },
  { name: "SuperValu Smoked Salmon 100g", price: 4.39, brand: "SuperValu", category: "meat & poultry", weight: 100, weightUnit: "g" },
  { name: "SuperValu Bananas 5 Pack", price: 1.15, brand: "SuperValu", category: "fruits & vegetables", weight: 5, weightUnit: "units" },
  { name: "SuperValu Broccoli Head", price: 1.15, brand: "SuperValu", category: "fruits & vegetables" },
  { name: "SuperValu Carrots 1kg", price: 0.95, brand: "SuperValu", category: "fruits & vegetables", weight: 1, weightUnit: "kg" },
  { name: "SuperValu Rooster Potatoes 2.5kg", price: 2.79, brand: "SuperValu", category: "fruits & vegetables", weight: 2.5, weightUnit: "kg" },
  { name: "SuperValu White Potatoes 2kg", price: 1.95, brand: "SuperValu", category: "fruits & vegetables", weight: 2, weightUnit: "kg" },
  { name: "SuperValu Iceberg Lettuce", price: 1.05, brand: "SuperValu", category: "fruits & vegetables" },
  { name: "SuperValu Vine Tomatoes 450g", price: 1.65, brand: "SuperValu", category: "fruits & vegetables", weight: 450, weightUnit: "g" },
  { name: "SuperValu White Sliced Pan 800g", price: 1.39, brand: "SuperValu", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "SuperValu Wholemeal Sliced Pan 800g", price: 1.49, brand: "SuperValu", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Brennans Family Pan 800g", price: 2.15, brand: "Brennans", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "SuperValu 4 Croissants", price: 1.75, brand: "SuperValu", category: "bakery", weight: 4, weightUnit: "units" },
  { name: "SuperValu Still Water 2L", price: 0.59, brand: "SuperValu", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "SuperValu Orange Juice 1L", price: 1.89, brand: "SuperValu", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "SuperValu Apple Juice 1L", price: 1.65, brand: "SuperValu", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Barry's Gold Blend Tea 80s", price: 4.39, brand: "Barry's", category: "drinks", weight: 80, weightUnit: "units" },
  { name: "Nescafé Original Instant Coffee 200g", price: 7.19, brand: "Nescafé", category: "drinks", weight: 200, weightUnit: "g" },
  { name: "Coca-Cola 2L", price: 2.89, brand: "Coca-Cola", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "SuperValu Fish Fingers 450g", price: 2.79, brand: "SuperValu", category: "frozen", weight: 450, weightUnit: "g" },
  { name: "SuperValu Frozen Pizza Margherita 300g", price: 1.95, brand: "SuperValu", category: "frozen", weight: 300, weightUnit: "g" },
  { name: "SuperValu Frozen Chips 1.5kg", price: 2.29, brand: "SuperValu", category: "frozen", weight: 1.5, weightUnit: "kg" },
  { name: "HB Vanilla Ice Cream 900ml", price: 4.09, brand: "HB", category: "frozen", weight: 900, weightUnit: "ml" },
  { name: "Cadbury Dairy Milk 200g", price: 2.59, brand: "Cadbury", category: "snacks & sweets", weight: 200, weightUnit: "g" },
  { name: "SuperValu Dark Chocolate 100g", price: 1.25, brand: "SuperValu", category: "snacks & sweets", weight: 100, weightUnit: "g" },
  { name: "Tayto Cheese & Onion Multipack 12 Pack", price: 4.59, brand: "Tayto", category: "snacks & sweets", weight: 12, weightUnit: "units" },
  { name: "SuperValu Digestive Biscuits 400g", price: 1.19, brand: "SuperValu", category: "snacks & sweets", weight: 400, weightUnit: "g" },
  { name: "SuperValu Kitchen Roll 2 Pack", price: 2.09, brand: "SuperValu", category: "household", weight: 2, weightUnit: "units" },
  { name: "SuperValu Toilet Roll 9 Pack", price: 3.89, brand: "SuperValu", category: "household", weight: 9, weightUnit: "units" },
  { name: "Fairy Washing Up Liquid 500ml", price: 2.55, brand: "Fairy", category: "household", weight: 500, weightUnit: "ml" },
  { name: "Persil Laundry Detergent 1.1L", price: 8.19, brand: "Persil", category: "household", weight: 1.1, weightUnit: "l" },
];

const LIDL_PRODUCTS: ScrapedProduct[] = [
  { name: "Lidl Whole Milk 2L", price: 1.89, brand: "Creggan", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Lidl Low Fat Milk 2L", price: 1.85, brand: "Creggan", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Lidl Whole Milk 1L", price: 1.19, brand: "Creggan", category: "dairy & eggs", weight: 1, weightUnit: "l" },
  { name: "Lidl Irish Butter 227g", price: 2.29, brand: "Kilkeely", category: "dairy & eggs", weight: 227, weightUnit: "g" },
  { name: "Lidl Spreadable Butter 500g", price: 3.49, brand: "Kilkeely", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Lidl Cheddar Cheese 200g", price: 1.99, brand: "Coolmore", category: "dairy & eggs", weight: 200, weightUnit: "g" },
  { name: "Lidl Grated Mozzarella 250g", price: 1.69, brand: "Ombra", category: "dairy & eggs", weight: 250, weightUnit: "g" },
  { name: "Lidl Free Range Eggs 10 Pack", price: 2.99, brand: "Newgate", category: "dairy & eggs", weight: 10, weightUnit: "units" },
  { name: "Lidl Free Range Eggs 6 Pack", price: 1.99, brand: "Newgate", category: "dairy & eggs", weight: 6, weightUnit: "units" },
  { name: "Lidl Greek Style Yoghurt 500g", price: 1.49, brand: "Eridanous", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Lidl Natural Yoghurt 500g", price: 0.99, brand: "Milbona", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Lidl Fresh Chicken Breast Fillets 360g", price: 4.49, brand: "Ballyburren", category: "meat & poultry", weight: 360, weightUnit: "g" },
  { name: "Lidl Fresh Chicken Thighs 500g", price: 3.29, brand: "Ballyburren", category: "meat & poultry", weight: 500, weightUnit: "g" },
  { name: "Lidl Irish Beef Mince 400g", price: 3.99, brand: "Birchwood", category: "meat & poultry", weight: 400, weightUnit: "g" },
  { name: "Lidl Irish Beef Mince 750g", price: 6.49, brand: "Birchwood", category: "meat & poultry", weight: 750, weightUnit: "g" },
  { name: "Lidl Streaky Bacon 200g", price: 2.29, brand: "Ballyburren", category: "meat & poultry", weight: 200, weightUnit: "g" },
  { name: "Lidl Pork Sausages 454g", price: 2.49, brand: "Ballyburren", category: "meat & poultry", weight: 454, weightUnit: "g" },
  { name: "Lidl Smoked Salmon 100g", price: 3.99, category: "meat & poultry", weight: 100, weightUnit: "g" },
  { name: "Lidl Bananas 5 Pack", price: 0.99, category: "fruits & vegetables", weight: 5, weightUnit: "units" },
  { name: "Lidl Broccoli Head", price: 0.99, category: "fruits & vegetables" },
  { name: "Lidl Carrots 1kg", price: 0.79, category: "fruits & vegetables", weight: 1, weightUnit: "kg" },
  { name: "Lidl Rooster Potatoes 2.5kg", price: 2.49, category: "fruits & vegetables", weight: 2.5, weightUnit: "kg" },
  { name: "Lidl White Potatoes 2kg", price: 1.79, category: "fruits & vegetables", weight: 2, weightUnit: "kg" },
  { name: "Lidl Iceberg Lettuce", price: 0.89, category: "fruits & vegetables" },
  { name: "Lidl Vine Tomatoes 450g", price: 1.49, category: "fruits & vegetables", weight: 450, weightUnit: "g" },
  { name: "Lidl White Sliced Pan 800g", price: 1.19, brand: "Rowan Hill", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Lidl Wholemeal Sliced Pan 800g", price: 1.29, brand: "Rowan Hill", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Lidl Sourdough Bread 500g", price: 1.89, category: "bakery", weight: 500, weightUnit: "g" },
  { name: "Lidl 4 Croissants", price: 1.49, category: "bakery", weight: 4, weightUnit: "units" },
  { name: "Lidl Still Water 2L", price: 0.49, brand: "Kildevand", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Lidl Orange Juice 1L", price: 1.69, brand: "Solevita", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Lidl Apple Juice 1L", price: 1.49, brand: "Solevita", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Barry's Gold Blend Tea 80s", price: 3.99, brand: "Barry's", category: "drinks", weight: 80, weightUnit: "units" },
  { name: "Lidl Instant Coffee 200g", price: 3.99, brand: "Bellarom", category: "drinks", weight: 200, weightUnit: "g" },
  { name: "Lidl Cola 2L", price: 0.89, brand: "Freeway", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Coca-Cola 2L", price: 2.69, brand: "Coca-Cola", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Lidl Fish Fingers 450g", price: 2.49, category: "frozen", weight: 450, weightUnit: "g" },
  { name: "Lidl Frozen Pizza Margherita 300g", price: 1.69, brand: "Trattoria Alfredo", category: "frozen", weight: 300, weightUnit: "g" },
  { name: "Lidl Frozen Chips 1.5kg", price: 1.99, category: "frozen", weight: 1.5, weightUnit: "kg" },
  { name: "Lidl Vanilla Ice Cream 900ml", price: 2.49, brand: "Gelatelli", category: "frozen", weight: 900, weightUnit: "ml" },
  { name: "Lidl Milk Chocolate Bar 200g", price: 1.49, category: "snacks & sweets", weight: 200, weightUnit: "g" },
  { name: "Lidl Dark Chocolate 100g", price: 0.99, category: "snacks & sweets", weight: 100, weightUnit: "g" },
  { name: "Lidl Crisps Multipack 12 Pack", price: 3.49, brand: "Snaktastic", category: "snacks & sweets", weight: 12, weightUnit: "units" },
  { name: "Lidl Digestive Biscuits 400g", price: 0.99, category: "snacks & sweets", weight: 400, weightUnit: "g" },
  { name: "Lidl Kitchen Roll 2 Pack", price: 1.79, category: "household", weight: 2, weightUnit: "units" },
  { name: "Lidl Toilet Roll 9 Pack", price: 3.49, category: "household", weight: 9, weightUnit: "units" },
  { name: "Lidl Washing Up Liquid 500ml", price: 0.99, brand: "W5", category: "household", weight: 500, weightUnit: "ml" },
  { name: "Lidl Laundry Detergent 1.1L", price: 3.99, brand: "Formil", category: "household", weight: 1.1, weightUnit: "l" },
];

const ALDI_PRODUCTS: ScrapedProduct[] = [
  { name: "Aldi Whole Milk 2L", price: 1.85, brand: "Castlefarm", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Aldi Low Fat Milk 2L", price: 1.79, brand: "Castlefarm", category: "dairy & eggs", weight: 2, weightUnit: "l" },
  { name: "Aldi Whole Milk 1L", price: 1.15, brand: "Castlefarm", category: "dairy & eggs", weight: 1, weightUnit: "l" },
  { name: "Aldi Irish Butter 227g", price: 2.25, brand: "Kilkeely", category: "dairy & eggs", weight: 227, weightUnit: "g" },
  { name: "Aldi Spreadable Butter 500g", price: 3.39, brand: "Greenvale", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Aldi Cheddar Cheese 200g", price: 1.89, brand: "Clonbawn", category: "dairy & eggs", weight: 200, weightUnit: "g" },
  { name: "Aldi Grated Mozzarella 250g", price: 1.59, brand: "Cucina", category: "dairy & eggs", weight: 250, weightUnit: "g" },
  { name: "Aldi Free Range Eggs 10 Pack", price: 2.89, brand: "The Pantry", category: "dairy & eggs", weight: 10, weightUnit: "units" },
  { name: "Aldi Free Range Eggs 6 Pack", price: 1.89, brand: "The Pantry", category: "dairy & eggs", weight: 6, weightUnit: "units" },
  { name: "Aldi Greek Style Yoghurt 500g", price: 1.39, brand: "Brooklea", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Aldi Natural Yoghurt 500g", price: 0.95, brand: "Brooklea", category: "dairy & eggs", weight: 500, weightUnit: "g" },
  { name: "Aldi Fresh Chicken Breast Fillets 360g", price: 4.39, brand: "Ashdale", category: "meat & poultry", weight: 360, weightUnit: "g" },
  { name: "Aldi Fresh Chicken Thighs 500g", price: 3.19, brand: "Ashdale", category: "meat & poultry", weight: 500, weightUnit: "g" },
  { name: "Aldi Irish Beef Mince 400g", price: 3.89, brand: "Nature's Glen", category: "meat & poultry", weight: 400, weightUnit: "g" },
  { name: "Aldi Irish Beef Mince 750g", price: 6.29, brand: "Nature's Glen", category: "meat & poultry", weight: 750, weightUnit: "g" },
  { name: "Aldi Streaky Bacon 200g", price: 2.19, brand: "Ashdale", category: "meat & poultry", weight: 200, weightUnit: "g" },
  { name: "Aldi Pork Sausages 454g", price: 2.39, brand: "Ashdale", category: "meat & poultry", weight: 454, weightUnit: "g" },
  { name: "Aldi Smoked Salmon 100g", price: 3.89, brand: "Iniskim", category: "meat & poultry", weight: 100, weightUnit: "g" },
  { name: "Aldi Bananas 5 Pack", price: 0.95, category: "fruits & vegetables", weight: 5, weightUnit: "units" },
  { name: "Aldi Broccoli Head", price: 0.95, category: "fruits & vegetables" },
  { name: "Aldi Carrots 1kg", price: 0.75, category: "fruits & vegetables", weight: 1, weightUnit: "kg" },
  { name: "Aldi Rooster Potatoes 2.5kg", price: 2.39, category: "fruits & vegetables", weight: 2.5, weightUnit: "kg" },
  { name: "Aldi White Potatoes 2kg", price: 1.69, category: "fruits & vegetables", weight: 2, weightUnit: "kg" },
  { name: "Aldi Iceberg Lettuce", price: 0.85, category: "fruits & vegetables" },
  { name: "Aldi Vine Tomatoes 450g", price: 1.39, category: "fruits & vegetables", weight: 450, weightUnit: "g" },
  { name: "Aldi White Sliced Pan 800g", price: 1.15, brand: "Village Bakery", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Aldi Wholemeal Sliced Pan 800g", price: 1.25, brand: "Village Bakery", category: "bakery", weight: 800, weightUnit: "g" },
  { name: "Aldi Sourdough Bread 500g", price: 1.79, category: "bakery", weight: 500, weightUnit: "g" },
  { name: "Aldi 4 Croissants", price: 1.39, category: "bakery", weight: 4, weightUnit: "units" },
  { name: "Aldi Still Water 2L", price: 0.45, brand: "Aqua Falls", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Aldi Orange Juice 1L", price: 1.59, brand: "Nature's Pick", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Aldi Apple Juice 1L", price: 1.39, brand: "Nature's Pick", category: "drinks", weight: 1, weightUnit: "l" },
  { name: "Barry's Gold Blend Tea 80s", price: 3.89, brand: "Barry's", category: "drinks", weight: 80, weightUnit: "units" },
  { name: "Aldi Instant Coffee 200g", price: 3.89, brand: "Alcafé", category: "drinks", weight: 200, weightUnit: "g" },
  { name: "Aldi Cola 2L", price: 0.85, brand: "Summit", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Coca-Cola 2L", price: 2.65, brand: "Coca-Cola", category: "drinks", weight: 2, weightUnit: "l" },
  { name: "Aldi Fish Fingers 450g", price: 2.39, brand: "Ocean Trader", category: "frozen", weight: 450, weightUnit: "g" },
  { name: "Aldi Frozen Pizza Margherita 300g", price: 1.59, brand: "Carlos", category: "frozen", weight: 300, weightUnit: "g" },
  { name: "Aldi Frozen Chips 1.5kg", price: 1.89, brand: "Four Seasons", category: "frozen", weight: 1.5, weightUnit: "kg" },
  { name: "Aldi Vanilla Ice Cream 900ml", price: 2.39, brand: "Grandessa", category: "frozen", weight: 900, weightUnit: "ml" },
  { name: "Aldi Milk Chocolate Bar 200g", price: 1.39, brand: "Dairyfine", category: "snacks & sweets", weight: 200, weightUnit: "g" },
  { name: "Aldi Dark Chocolate 100g", price: 0.89, brand: "Moser Roth", category: "snacks & sweets", weight: 100, weightUnit: "g" },
  { name: "Aldi Crisps Multipack 12 Pack", price: 3.39, brand: "Snackrite", category: "snacks & sweets", weight: 12, weightUnit: "units" },
  { name: "Aldi Digestive Biscuits 400g", price: 0.89, brand: "Belmont", category: "snacks & sweets", weight: 400, weightUnit: "g" },
  { name: "Aldi Kitchen Roll 2 Pack", price: 1.69, brand: "Saxon", category: "household", weight: 2, weightUnit: "units" },
  { name: "Aldi Toilet Roll 9 Pack", price: 3.29, brand: "Saxon", category: "household", weight: 9, weightUnit: "units" },
  { name: "Aldi Washing Up Liquid 500ml", price: 0.89, brand: "Magnum", category: "household", weight: 500, weightUnit: "ml" },
  { name: "Aldi Laundry Detergent 1.1L", price: 3.79, brand: "Almat", category: "household", weight: 1.1, weightUnit: "l" },
];

export const STORE_PRODUCTS: Record<string, ScrapedProduct[]> = {
  tesco: TESCO_PRODUCTS,
  dunnes: DUNNES_PRODUCTS,
  supervalu: SUPERVALU_PRODUCTS,
  lidl: LIDL_PRODUCTS,
  aldi: ALDI_PRODUCTS,
};

/** Returns curated (fallback) products for a store. */
export function getProductsForStore(storeSlug: string): ScrapedProduct[] {
  return STORE_PRODUCTS[storeSlug] || [];
}

/** Attempts live scraping, falling back to curated data. */
export async function scrapeStore(
  storeSlug: string
): Promise<{ products: ScrapedProduct[]; source: "live" | "fallback"; error?: string }> {
  const { scrapeTesco } = await import("./tesco");
  const { scrapeDunnes } = await import("./dunnes");
  const { scrapeSuperValu } = await import("./supervalu");
  const { scrapeLidl } = await import("./lidl");
  const { scrapeAldi } = await import("./aldi");

  const fallback = getProductsForStore(storeSlug);

  switch (storeSlug) {
    case "tesco":
      return scrapeTesco(fallback);
    case "dunnes":
      return scrapeDunnes(fallback);
    case "supervalu":
      return scrapeSuperValu(fallback);
    case "lidl":
      return scrapeLidl(fallback);
    case "aldi":
      return scrapeAldi(fallback);
    default:
      return { products: fallback, source: "fallback" };
  }
}

/**
 * Strips store name prefixes and store-brand names to produce a canonical
 * product name for cross-store matching.
 * "Tesco Irish Whole Milk 2L" → "Irish Whole Milk 2L"
 * "Dunnes Irish Whole Milk 2L" → "Irish Whole Milk 2L"
 */
const STORE_PREFIXES = [
  "tesco",
  "dunnes",
  "lidl",
  "aldi",
  "supervalu",
];

const STORE_BRAND_NAMES = [
  // Lidl brands
  "creggan", "kilkeely", "coolmore", "ombra", "newgate", "eridanous",
  "milbona", "ballyburren", "birchwood", "rowan hill", "kildevand",
  "solevita", "bellarom", "freeway", "trattoria alfredo", "gelatelli",
  "snaktastic", "w5", "formil",
  // Aldi brands
  "castlefarm", "greenvale", "clonbawn", "cucina", "the pantry",
  "brooklea", "ashdale", "nature's glen", "village bakery", "aqua falls",
  "nature's pick", "alcafé", "summit", "ocean trader", "carlos",
  "four seasons", "grandessa", "dairyfine", "moser roth", "snackrite",
  "belmont", "saxon", "magnum", "almat",
];

export function normalizeProductName(name: string): string {
  let normalized = name.trim();

  // Strip store name prefix (case-insensitive, only if at start)
  for (const prefix of STORE_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s+`, "i");
    if (re.test(normalized)) {
      normalized = normalized.replace(re, "");
      break;
    }
  }

  // Strip store-brand names when they appear as the first word(s)
  for (const brand of STORE_BRAND_NAMES) {
    const re = new RegExp(`^${brand.replace(/['']/g, "[''']?")}\\s+`, "i");
    if (re.test(normalized)) {
      normalized = normalized.replace(re, "");
      break;
    }
  }

  return normalized.trim();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CATEGORY_MAP: Record<string, string> = {
  "dairy & eggs": "dairy-eggs",
  "meat & poultry": "meat-poultry",
  "fruits & vegetables": "fruits-vegetables",
  "bakery": "bakery",
  "drinks": "drinks",
  "frozen": "frozen",
  "snacks & sweets": "snacks-sweets",
  "household": "household",
  "personal care": "personal-care",
  "baby": "baby",
};
