"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ImageOff, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";

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
  isOnSale,
}: FamilyCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasSavings = maxPrice - minPrice > 0.01;

  return (
    <Link href={`/product/${slug}`}>
      <Card className="card-hover group h-full border-0 shadow-sm hover:shadow-lg bg-white relative overflow-hidden">
        {/* Sale ribbon */}
        {isOnSale && (
          <div className="absolute top-3 left-0 z-10">
            <div className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold pl-2 pr-3 py-1 rounded-r-full shadow-sm">
              <TrendingDown className="h-3 w-3" />
              SALE
            </div>
          </div>
        )}

        <CardContent className="p-4">
          {/* Product image */}
          <div className="mb-3 flex h-28 sm:h-32 items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-muted/60 relative overflow-hidden group-hover:from-teal-50/50 group-hover:to-emerald-50/50 transition-colors duration-300">
            {imageUrl && !imgError ? (
              <Image
                src={imageUrl}
                alt={familyName}
                width={160}
                height={160}
                className="object-contain h-full w-auto p-2 transition-transform duration-300 group-hover:scale-110"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
            {/* Option count badge */}
            {optionCount > 1 && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-white/90 text-foreground border-0 shadow-sm text-[10px] px-1.5 py-0.5 backdrop-blur-sm">
                  {optionCount} options
                </Badge>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="min-h-[3.5rem]">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-teal-600 transition-colors">
              {familyName}
            </h3>
            {brand && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{brand}</p>
            )}
          </div>

          {/* Store dots */}
          <div className="flex items-center gap-1 mt-1.5">
            {stores.slice(0, 5).map((store) => (
              <motion.div
                key={store.slug}
                className="h-4 w-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold"
                style={{ backgroundColor: store.color || "#666" }}
                title={store.name}
                whileHover={{ scale: 1.3 }}
              >
                {store.name[0]}
              </motion.div>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              {storeCount} store{storeCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Price section */}
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  From
                </p>
                <p className="text-xl font-bold text-teal-600 tabular-nums">
                  {formatPrice(minPrice)}
                </p>
                {hasSavings && (
                  <p className="text-[11px] text-muted-foreground">
                    to {formatPrice(maxPrice)}
                  </p>
                )}
              </div>
              {bestUnitPrice && bestUnitPriceUnit && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Best value
                  </p>
                  <p className="text-sm font-bold text-teal-600 tabular-nums">
                    {formatPrice(bestUnitPrice)}/{bestUnitPriceUnit}
                  </p>
                </div>
              )}
            </div>

            {hasSavings && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                    style={{
                      width: `${Math.min(100, ((maxPrice - minPrice) / maxPrice) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-teal-600 whitespace-nowrap">
                  Save {formatPrice(maxPrice - minPrice)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
