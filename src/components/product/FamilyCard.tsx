"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ImageOff, ShoppingCart, Check } from "lucide-react";
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
  cheapestProductId?: string;
  cheapestProductSlug?: string;
  weight?: number | null;
  weightUnit?: string | null;
  // Deal-specific (optional, passed from deals page)
  originalPrice?: number | null;
  salePrice?: number | null;
  dealStore?: string | null;
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
  isOnSale,
  cheapestProductId,
  cheapestProductSlug,
  weight,
  weightUnit,
  originalPrice,
  salePrice,
  dealStore,
}: FamilyCardProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useBasket((s) => s.addItem);
  const savings = maxPrice - minPrice;
  const hasSavings = savings > 0.05;

  // Find cheapest store name
  const cheapestStoreName = stores.length > 0 ? stores[0].name : null;

  // Build sizes/stores summary text
  const summaryParts: string[] = [];
  if (storeCount > 0) summaryParts.push(`${storeCount} store${storeCount !== 1 ? "s" : ""}`);
  if (optionCount > 1) summaryParts.push(`${optionCount} sizes`);
  const summaryText = summaryParts.join(", ");

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
        <CardContent className="p-0">
          {/* Image */}
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
          </div>

          {/* Content */}
          <div className="p-3.5 pt-3">
            {/* Name & brand */}
            <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 text-neutral-900 group-hover:text-teal-700 transition-colors">
              {familyName}
            </h3>
            {brand && (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{brand}</p>
            )}

            {/* Price + store */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100">
              {/* Show "Was -> Now" if deal data is available */}
              {originalPrice && salePrice && originalPrice > salePrice ? (
                <div>
                  <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                    {formatPrice(salePrice)}
                    {dealStore && (
                      <span className="text-xs font-semibold text-neutral-400 ml-1">
                        at {dealStore}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-400 tabular-nums">
                    <span className="line-through">{formatPrice(originalPrice)}</span>
                  </p>
                </div>
              ) : (
                <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                  <span className="text-xs font-medium text-neutral-400 mr-1">From</span>
                  {formatPrice(minPrice)}
                  {cheapestStoreName && (
                    <span className="text-xs font-semibold text-neutral-400 ml-1">
                      at {cheapestStoreName}
                    </span>
                  )}
                </p>
              )}

              {isOnSale && !(originalPrice && salePrice && originalPrice > salePrice) && (
                <span className="inline-block mt-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  SALE
                </span>
              )}

              {hasSavings && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  Save up to {formatPrice(savings)}
                </p>
              )}

              {/* Summary + add to basket */}
              <div className="mt-2 flex items-center justify-between">
                {summaryText && (
                  <p className="text-[11px] text-neutral-400">{summaryText}</p>
                )}
                <button
                  onClick={handleAddToBasket}
                  className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
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
