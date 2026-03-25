"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingDown, Check } from "lucide-react";
import { StoreLogo } from "@/components/shared/StoreLogo";
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

const getEmoji = (name: string) => {
  if (name.includes("Milk")) return "\uD83E\uDD5B";
  if (name.includes("Butter")) return "\uD83E\uDDC8";
  if (name.includes("Egg")) return "\uD83E\uDD5A";
  if (name.includes("Chicken")) return "\uD83C\uDF57";
  if (name.includes("Beef") || name.includes("Mince")) return "\uD83E\uDD69";
  if (name.includes("Bread") || name.includes("Pan") || name.includes("Sourdough")) return "\uD83C\uDF5E";
  if (name.includes("Banana")) return "\uD83C\uDF4C";
  if (name.includes("Broccoli")) return "\uD83E\uDD66";
  if (name.includes("Potato")) return "\uD83E\uDD54";
  if (name.includes("Tea") || name.includes("Coffee")) return "\u2615";
  if (name.includes("Coca-Cola") || name.includes("Juice") || name.includes("Water")) return "\uD83E\uDDC3";
  if (name.includes("Pizza")) return "\uD83C\uDF55";
  if (name.includes("Chocolate") || name.includes("Cadbury")) return "\uD83C\uDF6B";
  if (name.includes("Cheese")) return "\uD83E\uDDC0";
  if (name.includes("Salmon") || name.includes("Fish")) return "\uD83C\uDF1F";
  if (name.includes("Bacon") || name.includes("Sausage")) return "\uD83E\uDD53";
  if (name.includes("Yoghurt") || name.includes("Yogurt")) return "\uD83E\uDD5B";
  if (name.includes("Croissant")) return "\uD83E\uDD50";
  return "\uD83D\uDED2";
};

export function ProductCard({
  id,
  name,
  slug,
  brand,
  weight,
  weightUnit,
  minPrice,
  maxPrice,
  cheapestStore,
  isOnSale,
  priceCount,
}: ProductCardProps) {
  const addItem = useBasket((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: id,
      productName: name,
      productSlug: slug,
      brand,
      imageUrl: null,
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
          {/* Product image placeholder */}
          <div className="mb-3 flex h-28 sm:h-32 items-center justify-center rounded-xl bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden group-hover:from-teal-50/50 group-hover:to-emerald-50/50 transition-colors duration-300">
            <motion.span
              className="text-5xl select-none"
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {getEmoji(name)}
            </motion.span>
          </div>

          {/* Product info */}
          <div className="min-h-[3.5rem]">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-teal-600 transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {brand && (
                <p className="text-[11px] text-muted-foreground">{brand}</p>
              )}
              {weight && weightUnit && (
                <p className="text-[11px] text-muted-foreground">
                  {brand ? "·" : ""} {weight}{weightUnit}
                </p>
              )}
            </div>
          </div>

          {/* Price section */}
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold text-teal-600 tabular-nums">
                  {formatPrice(minPrice)}
                </p>
                {hasSavings && (
                  <p className="text-[11px] text-muted-foreground">
                    to {formatPrice(maxPrice)}
                  </p>
                )}
              </div>
              {cheapestStore && (
                <div className="flex items-center gap-1.5">
                  <StoreLogo
                    slug={cheapestStore.slug}
                    name={cheapestStore.name}
                    size="sm"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    {cheapestStore.name.split(" ")[0]}
                  </span>
                </div>
              )}
            </div>

            {hasSavings && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                    style={{ width: `${Math.min(100, (savings / maxPrice) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-teal-600 whitespace-nowrap">
                  Save {formatPrice(savings)}
                </span>
              </div>
            )}

            {priceCount && priceCount > 1 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Compared at {priceCount} stores
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
