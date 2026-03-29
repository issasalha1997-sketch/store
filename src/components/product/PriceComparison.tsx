"use client";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Trophy } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-neutral-900">Price Comparison</h3>
        {sorted.length > 1 && (
          <span className="text-[11px] text-neutral-400">
            {sorted.length} stores compared
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {sorted.map((entry, index) => {
          const isCheapest = index === 0 && sorted.length > 1;
          const diff = entry.price - cheapestPrice;

          return (
            <div
              key={entry.store.slug}
              className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                isCheapest
                  ? "bg-emerald-50 ring-1 ring-emerald-200"
                  : "bg-neutral-50/80 hover:bg-neutral-50"
              }`}
            >
              {/* Store color bar + name */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.store.color || "#999" }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-800 truncate">
                      {entry.store.name}
                    </span>
                    {isCheapest && (
                      <span className="inline-flex items-center gap-0.5 bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                        <Trophy className="h-2.5 w-2.5" />
                        BEST
                      </span>
                    )}
                    {entry.isOnSale && (
                      <Badge className="bg-orange-100 text-orange-700 border-0 text-[11px] px-1.5 py-0">
                        SALE
                      </Badge>
                    )}
                  </div>
                  {entry.unitPrice && entry.unitPriceUnit && (
                    <p className="text-[11px] text-neutral-400 tabular-nums">
                      {formatPrice(entry.unitPrice)}/{entry.unitPriceUnit}
                    </p>
                  )}
                </div>
              </div>

              {/* Price + diff */}
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-base font-extrabold tabular-nums ${
                    isCheapest ? "text-emerald-700" : "text-neutral-800"
                  }`}
                >
                  {formatPrice(entry.price)}
                </span>
                {entry.isOnSale && entry.originalPrice && (
                  <p className="text-[11px] text-neutral-400 line-through tabular-nums">
                    {formatPrice(entry.originalPrice)}
                  </p>
                )}
                {!isCheapest && diff > 0.01 && (
                  <p className="text-xs text-red-500 font-semibold tabular-nums">
                    +{formatPrice(diff)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Savings summary */}
      {range > 0.05 && (
        <div className="flex items-center justify-center gap-2 bg-emerald-50 rounded-xl py-2.5 px-4">
          <span className="text-sm text-emerald-800">
            Save <span className="font-bold">{formatPrice(range)}</span> by choosing{" "}
            <span className="font-semibold">{sorted[0].store.name}</span>
          </span>
        </div>
      )}
    </div>
  );
}
