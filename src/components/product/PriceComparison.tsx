"use client";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface PriceEntry {
  store: { name: string; slug: string; color: string | null };
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  unitPrice: number | null;
  unitPriceUnit: string | null;
  freshness?: "fresh" | "recent" | "stale";
  sourceUrl?: string | null;
}

export interface StoreComparisonEntry {
  storeName: string;
  storeSlug: string;
  storeColor?: string | null;
  price: number;
  originalPrice?: number | null;
  isOnSale?: boolean;
  productName?: string;
  productSlug?: string;
  unitPrice?: string | null;
  freshness?: string;
}

/**
 * Detect promotion text patterns from a product description.
 * Tesco stores promo descriptions like "Clubcard Price" or "Any 4 for ..." in the product description field.
 */
function extractPromoText(description: string | null | undefined): string | null {
  if (!description) return null;
  if (/clubcard\s*price/i.test(description)) return "Clubcard Price";
  if (/any\s+\d+\s+for/i.test(description)) {
    const match = description.match(/any\s+\d+\s+for\s+[\u20ac][\d.]+/i);
    return match ? match[0] : "Multi-buy Deal";
  }
  if (/meal\s*deal/i.test(description)) return "Meal Deal";
  if (/half\s*price/i.test(description)) return "Half Price";
  if (/buy\s+\d+\s+get/i.test(description)) {
    const match = description.match(/buy\s+\d+\s+get\s+\d+\s+free/i);
    return match ? match[0] : "Multi-buy Deal";
  }
  return null;
}

interface PriceComparisonProps {
  /** Legacy format: per-price entries from the product */
  prices?: PriceEntry[];
  /** New format: best price per store (from storeComparison API) */
  storeComparison?: StoreComparisonEntry[];
  /** The main product name — used to detect when a sibling product differs */
  mainProductName?: string;
  productDescription?: string | null;
}

export function PriceComparison({
  prices,
  storeComparison,
  mainProductName,
  productDescription,
}: PriceComparisonProps) {
  // Try to extract promo text from description
  const promoText = extractPromoText(productDescription);

  // Use new storeComparison format if provided, otherwise fall back to legacy
  if (storeComparison && storeComparison.length > 0) {
    return (
      <StoreComparisonTable
        entries={storeComparison}
        mainProductName={mainProductName}
        promoText={promoText}
      />
    );
  }

  // Legacy fallback
  if (!prices || prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const cheapestPrice = sorted[0].price;
  const mostExpensive = sorted[sorted.length - 1];
  const savings = mostExpensive.price - cheapestPrice;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-neutral-900">Price Comparison</h3>

      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Store
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Price
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                Unit Price
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => {
              const isCheapest = index === 0 && sorted.length > 1;
              const isTesco = entry.store.slug === "tesco";
              const showPromo = isTesco && promoText && entry.isOnSale;

              return (
                <tr
                  key={entry.store.slug}
                  className={
                    isCheapest
                      ? "bg-emerald-50"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-neutral-50/40"
                  }
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-1 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.store.color || "#999" }}
                      />
                      <span className={`font-medium ${isCheapest ? "text-emerald-800" : "text-neutral-800"}`}>
                        {entry.store.name}
                      </span>
                      {isCheapest && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          CHEAPEST
                        </span>
                      )}
                      {entry.isOnSale && !showPromo && (
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] px-1.5 py-0">
                          SALE
                        </Badge>
                      )}
                      {showPromo && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">
                          {promoText}
                        </Badge>
                      )}
                      {entry.freshness === "stale" && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded" title="Price may be outdated">
                          may be outdated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold tabular-nums ${isCheapest ? "text-emerald-700" : "text-neutral-800"}`}>
                      {entry.sourceUrl ? (
                        <a
                          href={entry.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatPrice(entry.price)}
                        </a>
                      ) : (
                        formatPrice(entry.price)
                      )}
                    </span>
                    {entry.isOnSale && entry.originalPrice && (
                      <span className="block text-[11px] text-neutral-400 line-through tabular-nums">
                        {formatPrice(entry.originalPrice)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                    {entry.unitPrice && entry.unitPriceUnit ? (
                      <span className="text-xs text-neutral-500 tabular-nums">
                        {formatPrice(entry.unitPrice)}/{entry.unitPriceUnit}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {savings > 0.01 && sorted.length > 1 && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg py-2 px-3 text-center">
          Cheapest at <span className="font-bold">{sorted[0].store.name}</span>
          {" "}&mdash; Save <span className="font-bold">{formatPrice(savings)}</span> vs{" "}
          <span className="font-semibold">{mostExpensive.store.name}</span>
        </p>
      )}
    </div>
  );
}

/**
 * New store comparison table — one row per store, shows the best price
 * that store offers within the same size tier.
 */
function StoreComparisonTable({
  entries,
  mainProductName,
  promoText,
}: {
  entries: StoreComparisonEntry[];
  mainProductName?: string;
  promoText: string | null;
}) {
  const sorted = [...entries].sort((a, b) => a.price - b.price);
  const cheapestPrice = sorted[0]?.price ?? 0;
  const mostExpensive = sorted[sorted.length - 1];
  const savings = mostExpensive ? mostExpensive.price - cheapestPrice : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-neutral-900">Price Comparison</h3>

      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Store
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Price
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => {
              const isCheapest = index === 0 && sorted.length > 1;
              const isTesco = entry.storeSlug === "tesco";
              const showPromo = isTesco && promoText && entry.isOnSale;
              const isDifferentProduct =
                mainProductName && entry.productName && entry.productName !== mainProductName;

              return (
                <tr
                  key={entry.storeSlug}
                  className={
                    isCheapest
                      ? "bg-emerald-50"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-neutral-50/40"
                  }
                >
                  {/* Store name + optional "via different product" subtitle */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-1 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.storeColor || "#999" }}
                      />
                      <div className="min-w-0">
                        <span className={`font-medium ${isCheapest ? "text-emerald-800" : "text-neutral-800"}`}>
                          {entry.storeName}
                        </span>
                        {isDifferentProduct && (
                          <span className="block text-[11px] text-neutral-400 truncate">
                            via {entry.productName}
                          </span>
                        )}
                      </div>
                      {entry.freshness === "stale" && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded" title="Price may be outdated">
                          may be outdated
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold tabular-nums ${isCheapest ? "text-emerald-700" : "text-neutral-800"}`}>
                      {formatPrice(entry.price)}
                    </span>
                    {entry.isOnSale && entry.originalPrice && (
                      <span className="block text-[11px] text-neutral-400 line-through tabular-nums">
                        {formatPrice(entry.originalPrice)}
                      </span>
                    )}
                    {entry.unitPrice && (
                      <span className="block text-[11px] text-neutral-400 tabular-nums">
                        {entry.unitPrice}
                      </span>
                    )}
                  </td>

                  {/* Note column: badges */}
                  <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {isCheapest && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          CHEAPEST
                        </span>
                      )}
                      {entry.isOnSale && !showPromo && (
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] px-1.5 py-0">
                          SALE
                        </Badge>
                      )}
                      {showPromo && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">
                          {promoText}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Savings summary */}
      {savings > 0.01 && sorted.length > 1 && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg py-2 px-3 text-center">
          Save <span className="font-bold">{formatPrice(savings)}</span> by choosing{" "}
          <span className="font-bold">{sorted[0].storeName}</span>
        </p>
      )}
    </div>
  );
}
