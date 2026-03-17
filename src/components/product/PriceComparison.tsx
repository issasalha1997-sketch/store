"use client";

import { StoreLogo } from "@/components/shared/StoreLogo";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface PriceEntry {
  store: { name: string; slug: string; color: string | null };
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  unitPrice: number | null;
  unitPriceUnit: string | null;
}

export function PriceComparison({ prices }: { prices: PriceEntry[] }) {
  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const cheapestPrice = sorted[0].price;
  const maxPrice = sorted[sorted.length - 1].price;
  const range = maxPrice - cheapestPrice;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Price Comparison</h3>
      <div className="space-y-2">
        {sorted.map((entry, index) => {
          const isCheapest = index === 0;
          const barWidth = range > 0 ? ((entry.price - cheapestPrice) / range) * 50 + 50 : 100;

          return (
            <div
              key={entry.store.slug}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isCheapest ? "border-green-200 bg-green-50" : ""
              }`}
            >
              <StoreLogo slug={entry.store.slug} name={entry.store.name} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.store.name}</span>
                  {isCheapest && (
                    <Badge variant="success" className="text-[10px]">
                      CHEAPEST
                    </Badge>
                  )}
                  {entry.isOnSale && (
                    <Badge variant="warning" className="text-[10px]">
                      SALE
                    </Badge>
                  )}
                </div>

                {/* Price bar */}
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCheapest ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {entry.unitPrice && entry.unitPriceUnit && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(entry.unitPrice)} {entry.unitPriceUnit}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className={`text-lg font-bold ${isCheapest ? "text-green-600" : ""}`}>
                  {formatPrice(entry.price)}
                </span>
                {entry.isOnSale && entry.originalPrice && (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatPrice(entry.originalPrice)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {range > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          You save <span className="font-semibold text-green-600">{formatPrice(range)}</span> by
          buying from {sorted[0].store.name} instead of {sorted[sorted.length - 1].store.name}
        </p>
      )}
    </div>
  );
}
