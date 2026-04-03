"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, ImageOff } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useBasket } from "@/hooks/useBasket";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  maxPrice,
  cheapestStore,
  isOnSale,
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

  const savings = maxPrice - minPrice;
  const hasSavings = savings > 0.01;

  return (
    <Link href={`/product/${slug}`}>
      <Card className="card-hover group h-full border-0 shadow-sm hover:shadow-lg bg-white relative overflow-hidden">
        <CardContent className="p-4">
          {/* Product image */}
          <div className="mb-3 flex h-28 sm:h-32 items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-muted/60 relative overflow-hidden group-hover:from-teal-50/50 group-hover:to-emerald-50/50 transition-colors duration-300">
            {imageUrl && !imgError ? (
              <Image
                src={imageUrl}
                alt={name}
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
          </div>

          {/* Product name */}
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-teal-600 transition-colors">
            {name}
          </h3>
          {brand && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{brand}</p>
          )}

          {/* Cheapest price + store */}
          <div className="mt-3 pt-3 border-t border-dashed">
            <p className="text-lg font-bold text-teal-600 tabular-nums leading-tight">
              {formatPrice(minPrice)}
              {cheapestStore && (
                <span className="text-xs font-semibold text-muted-foreground ml-1">
                  at {cheapestStore.name}
                </span>
              )}
            </p>

            {isOnSale && (
              <span className="inline-block mt-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                SALE
              </span>
            )}

            {hasSavings && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Save up to {formatPrice(savings)}
              </p>
            )}
          </div>

          {/* Add to basket button */}
          <AnimatePresence mode="wait">
            {justAdded ? (
              <motion.div
                key="added"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-teal-50 py-2 text-sm font-medium text-teal-600"
              >
                <Check className="h-4 w-4" />
                Added!
              </motion.div>
            ) : (
              <motion.div
                key="add"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full sm:opacity-0 sm:group-hover:opacity-100 transition-all rounded-lg hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200"
                  onClick={handleAddToBasket}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  Add to Basket
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </Link>
  );
}
