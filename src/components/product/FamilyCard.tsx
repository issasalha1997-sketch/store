"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ImageOff, ShoppingCart, Check, ArrowRight } from "lucide-react";
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
  // Tier-grouped fields (optional, from new grouped API)
  sizeTier?: string | null;
  sizeTierLabel?: string | null;
  cheapestStore?: string | null;
  cheapestStoreSlug?: string | null;
  cheapestProductName?: string | null;
  cheapestPrice?: number | null;
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
  sizeTier,
  sizeTierLabel,
  cheapestStore,
  cheapestPrice,
}: FamilyCardProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useBasket((s) => s.addItem);

  // Resolve the display price: prefer cheapestPrice (tier-grouped), then salePrice, then minPrice
  const displayPrice = cheapestPrice ?? salePrice ?? minPrice;

  // Resolve the display store name: prefer cheapestStore (tier-grouped), then dealStore, then first store
  const displayStoreName = cheapestStore ?? dealStore ?? (stores.length > 0 ? stores[0].name : null);

  // Link target: prefer cheapestProductSlug for direct product page, fallback to family slug
  const linkHref = `/product/${cheapestProductSlug || slug}`;

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
    <Link href={linkHref} className="block h-full">
      <Card className="group h-full border border-neutral-100 shadow-sm hover:shadow-xl bg-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
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

            {/* Add to basket button - top right */}
            <button
              onClick={handleAddToBasket}
              className={`absolute top-2 right-2 z-10 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
                justAdded
                  ? "bg-emerald-500 text-white scale-110"
                  : "bg-white/90 text-neutral-400 hover:text-teal-600 hover:bg-white hover:scale-110 active:scale-95"
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

          {/* Content */}
          <div className="p-3.5 pt-3 flex flex-col flex-1">
            {/* Name */}
            <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 text-neutral-900 group-hover:text-teal-700 transition-colors">
              {familyName}
            </h3>

            {/* Size tier label (subtle, muted) */}
            {sizeTierLabel && (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                {sizeTierLabel}
              </p>
            )}

            {/* Brand (only if no tier label shown) */}
            {!sizeTierLabel && brand && (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{brand}</p>
            )}

            {/* Price + store - pushed to bottom */}
            <div className="mt-auto pt-3">
              <div className="border-t border-neutral-100 pt-2.5">
                {/* Deal: was -> now pricing */}
                {originalPrice && salePrice && originalPrice > salePrice ? (
                  <div>
                    <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                      {formatPrice(salePrice)}
                      {displayStoreName && (
                        <span className="text-xs font-semibold text-neutral-400 ml-1">
                          at {displayStoreName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400 tabular-nums">
                      <span className="line-through">{formatPrice(originalPrice)}</span>
                    </p>
                  </div>
                ) : (
                  /* Standard: single cheapest price */
                  <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                    {formatPrice(displayPrice)}
                    {displayStoreName && (
                      <span className="text-xs font-semibold text-neutral-400 ml-1">
                        at {displayStoreName}
                      </span>
                    )}
                  </p>
                )}

                {isOnSale && !(originalPrice && salePrice && originalPrice > salePrice) && (
                  <span className="inline-block mt-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                    SALE
                  </span>
                )}

                {/* Store count + see prices link */}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-neutral-400">
                    {storeCount > 0
                      ? `${storeCount} store${storeCount !== 1 ? "s" : ""}`
                      : ""}
                  </p>
                  <span className="text-[11px] font-semibold text-teal-600 group-hover:text-teal-700 flex items-center gap-0.5 transition-colors">
                    See prices
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
