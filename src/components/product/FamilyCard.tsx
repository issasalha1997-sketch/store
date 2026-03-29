"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ImageOff, ShoppingCart, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useState } from "react";
import { useBasket } from "@/hooks/useBasket";

interface FamilyCardProps {
  familyName: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  optionCount: number;
  storeCount: number;
  stores: Array<{ name: string; slug: string; color: string | null }>;
  minPrice: number;
  maxPrice: number;
  bestUnitPrice: number | null;
  bestUnitPriceUnit: string | null;
  bestUnitStore: string | null;
  isOnSale: boolean;
  // Product data for the cheapest variant (for add-to-basket)
  cheapestProductId?: string;
  cheapestProductSlug?: string;
  weight?: number | null;
  weightUnit?: string | null;
}

export function FamilyCard({
  familyName,
  slug,
  imageUrl,
  brand,
  optionCount,
  storeCount,
  stores,
  minPrice,
  maxPrice,
  bestUnitPrice,
  bestUnitPriceUnit,
  bestUnitStore,
  isOnSale,
  cheapestProductId,
  cheapestProductSlug,
  weight,
  weightUnit,
}: FamilyCardProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useBasket((s) => s.addItem);
  const savings = maxPrice - minPrice;
  const hasSavings = savings > 0.05;

  const handleAddToBasket = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const productId = cheapestProductId || slug;
    const productSlug = cheapestProductSlug || slug;
    addItem({
      productId,
      productName: familyName,
      productSlug,
      brand: brand || null,
      imageUrl: imageUrl || null,
      weight: weight ?? null,
      weightUnit: weightUnit ?? null,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <Link href={`/product/${slug}`}>
      <Card className="group h-full border border-neutral-100 shadow-sm hover:shadow-xl bg-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 rounded-2xl">
        {/* Sale badge */}
        {isOnSale && (
          <div className="absolute top-3 left-0 z-10">
            <div className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold pl-2 pr-3 py-0.5 rounded-r-full shadow-sm">
              <TrendingDown className="h-3 w-3" />
              SALE
            </div>
          </div>
        )}

        <CardContent className="p-0">
          {/* Image section */}
          <div className="relative h-36 sm:h-40 flex items-center justify-center bg-gradient-to-b from-neutral-50 to-white overflow-hidden">
            {imageUrl && !imgError ? (
              <Image
                src={imageUrl}
                alt={familyName}
                width={180}
                height={180}
                className="object-contain h-full w-auto p-4 transition-transform duration-500 group-hover:scale-110"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <ImageOff className="h-10 w-10 text-neutral-200" />
            )}
            {/* Options count */}
            {optionCount > 1 && (
              <div className="absolute bottom-2 right-2">
                <span className="text-[11px] font-semibold bg-neutral-900/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {optionCount} options
                </span>
              </div>
            )}
          </div>

          {/* Content section */}
          <div className="p-3.5 pt-3">
            {/* Name & brand */}
            <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 text-neutral-900 group-hover:text-teal-700 transition-colors">
              {familyName}
            </h3>
            {brand && (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{brand}</p>
            )}

            {/* Store pills */}
            <div className="flex items-center gap-1 mt-2">
              {stores.slice(0, 4).map((store) => (
                <div
                  key={store.slug}
                  className="h-[18px] px-1.5 rounded-full flex items-center justify-center text-white text-[11px] font-bold tracking-tight"
                  style={{ backgroundColor: store.color || "#666" }}
                  title={store.name}
                >
                  {store.name.length <= 5 ? store.name : store.name.split(" ")[0]}
                </div>
              ))}
              {stores.length > 4 && (
                <span className="text-[11px] text-neutral-400">
                  +{stores.length - 4}
                </span>
              )}
            </div>

            {/* Price section */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    From
                  </span>
                  <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                    {formatPrice(minPrice)}
                  </p>
                </div>

                {/* Best value badge */}
                {bestUnitPrice && bestUnitPriceUnit && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded-md">
                      {formatPrice(bestUnitPrice)}/{bestUnitPriceUnit}
                    </span>
                    {bestUnitStore && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        best at {bestUnitStore.split(" ")[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Savings bar + Add to basket button */}
              <div className="mt-2 flex items-center gap-2">
                {hasSavings ? (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                          style={{
                            width: `${Math.min(100, (savings / maxPrice) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 whitespace-nowrap tabular-nums">
                        Save {formatPrice(savings)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1" />
                )}
                {/* Add to basket button */}
                <button
                  onClick={handleAddToBasket}
                  className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    justAdded
                      ? "bg-emerald-500 text-white scale-110"
                      : "bg-teal-50 text-teal-600 hover:bg-teal-100 hover:scale-110 active:scale-95"
                  }`}
                  title="Add to basket"
                >
                  {justAdded ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <ShoppingCart className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
