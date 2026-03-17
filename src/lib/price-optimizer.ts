import type { OptimizationResult, StoreInfo } from "@/types";

interface BasketInput {
  productId: string;
  productName: string;
  quantity: number;
  prices: {
    storeId: string;
    storeName: string;
    storeSlug: string;
    storeColor: string | null;
    price: number;
  }[];
}

export function optimizeBasket(items: BasketInput[]): OptimizationResult {
  // Collect all unique stores
  const storeMap = new Map<string, StoreInfo>();
  for (const item of items) {
    for (const p of item.prices) {
      if (!storeMap.has(p.storeId)) {
        storeMap.set(p.storeId, {
          id: p.storeId,
          name: p.storeName,
          slug: p.storeSlug,
          color: p.storeColor,
          logoUrl: null,
          websiteUrl: null,
        });
      }
    }
  }

  // Calculate single-store best
  const singleStoreResults: {
    store: StoreInfo;
    total: number;
    items: { productId: string; productName: string; price: number; quantity: number }[];
    missingItems: string[];
  }[] = [];

  for (const [storeId, store] of storeMap) {
    let total = 0;
    const storeItems: { productId: string; productName: string; price: number; quantity: number }[] = [];
    const missing: string[] = [];

    for (const item of items) {
      const storePrice = item.prices.find((p) => p.storeId === storeId);
      if (storePrice) {
        const lineTotal = storePrice.price * item.quantity;
        total += lineTotal;
        storeItems.push({
          productId: item.productId,
          productName: item.productName,
          price: storePrice.price,
          quantity: item.quantity,
        });
      } else {
        missing.push(item.productName);
        total += 999999; // Penalize missing items
      }
    }

    singleStoreResults.push({ store, total, items: storeItems, missingItems: missing });
  }

  // Sort by total (cheapest first)
  singleStoreResults.sort((a, b) => a.total - b.total);
  const singleStoreBest = singleStoreResults[0];

  // Calculate multi-store best (per-item cheapest)
  const multiStoreMap = new Map<
    string,
    {
      store: StoreInfo;
      items: { productId: string; productName: string; price: number; quantity: number }[];
      subtotal: number;
    }
  >();

  let multiStoreTotal = 0;

  for (const item of items) {
    if (item.prices.length === 0) continue;

    // Find cheapest store for this item
    const cheapest = item.prices.reduce((min, p) => (p.price < min.price ? p : min));
    const lineTotal = cheapest.price * item.quantity;
    multiStoreTotal += lineTotal;

    const existing = multiStoreMap.get(cheapest.storeId);
    if (existing) {
      existing.items.push({
        productId: item.productId,
        productName: item.productName,
        price: cheapest.price,
        quantity: item.quantity,
      });
      existing.subtotal += lineTotal;
    } else {
      multiStoreMap.set(cheapest.storeId, {
        store: storeMap.get(cheapest.storeId)!,
        items: [
          {
            productId: item.productId,
            productName: item.productName,
            price: cheapest.price,
            quantity: item.quantity,
          },
        ],
        subtotal: lineTotal,
      });
    }
  }

  const multiStoreBest = {
    stores: Array.from(multiStoreMap.values()).sort((a, b) => b.subtotal - a.subtotal),
    total: multiStoreTotal,
  };

  // Recalculate singleStoreBest total without penalty for display
  const realSingleStoreTotal = singleStoreBest.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const savings = realSingleStoreTotal - multiStoreTotal;
  const savingsPercentage = realSingleStoreTotal > 0 ? (savings / realSingleStoreTotal) * 100 : 0;

  return {
    singleStoreBest: {
      ...singleStoreBest,
      total: realSingleStoreTotal,
    },
    multiStoreBest,
    savings: Math.max(0, savings),
    savingsPercentage: Math.max(0, savingsPercentage),
  };
}
