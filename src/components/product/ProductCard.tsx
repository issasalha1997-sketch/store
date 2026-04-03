"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Check, ImageOff, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useBasket } from "@/hooks/useBasket";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  weight: number | null;
  weightUnit: string | null;
  minPrice: number;
  maxPrice: number;
  cheapestStore: { name: string; slug: string } | null;
  isOnSale: boolean;
  category?: string | null;
  priceCount?: number;
}

export function ProductCard({
  id,
  name,
  slug,
  brand,
  imageUrl,
  weight,
  weightUnit,
  minPrice,
  cheapestStore,
  isOnSale,
  priceCount,
}: ProductCardProps) {
  const addItem = useBasket((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: id,
      productName: name,
      productSlug: slug,
      brand,
      imageUrl,
      weight,
      weightUnit,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const storeCount = priceCount ?? 0;

  return (
    <Link href={`/product/${slug}`} className="block h-full">
      <Card className="group h-full border border-neutral-100 shadow-sm hover:shadow-xl bg-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Product image */}
          <div className="relative h-36 sm:h-40 flex items-center justify-center bg-gradient-to-b from-neutral-50 to-white overflow-hidden">
            {imageUrl && !imgError ? (
              <Image
                src={imageUrl}
                alt={name}
                width={180}
                height={180}
                className="object-contain h-full w-auto p-4 transition-transform duration-500 group-hover:scale-110"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-200">
                <ImageOff className="h-10 w-10" />
              </div>
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
            {/* Product name */}
            <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 text-neutral-900 group-hover:text-teal-700 transition-colors">
              {name}
            </h3>
            {brand && (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{brand}</p>
            )}

            {/* Price + store - pushed to bottom */}
            <div className="mt-auto pt-3">
              <div className="border-t border-neutral-100 pt-2.5">
                <p className="text-lg font-extrabold text-neutral-900 tabular-nums leading-tight">
                  {formatPrice(minPrice)}
                  {cheapestStore && (
                    <span className="text-xs font-semibold text-neutral-400 ml-1">
                      at {cheapestStore.name}
                    </span>
                  )}
                </p>

                {isOnSale && (
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
