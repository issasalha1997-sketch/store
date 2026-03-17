"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingDown } from "lucide-react";
import { StoreLogo } from "@/components/shared/StoreLogo";
import { formatPrice } from "@/lib/utils";
import { useBasket } from "@/hooks/useBasket";

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
}

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
}: ProductCardProps) {
  const addItem = useBasket((s) => s.addItem);

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
  };

  return (
    <Link href={`/product/${slug}`}>
      <Card className="group h-full transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4">
          {/* Product image placeholder */}
          <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-muted">
            <span className="text-4xl opacity-50">
              {name.includes("Milk") ? "\uD83E\uDD5B" :
               name.includes("Butter") ? "\uD83E\uDDC8" :
               name.includes("Egg") ? "\uD83E\uDD5A" :
               name.includes("Chicken") ? "\uD83C\uDF57" :
               name.includes("Beef") || name.includes("Mince") ? "\uD83E\uDD69" :
               name.includes("Bread") || name.includes("Pan") ? "\uD83C\uDF5E" :
               name.includes("Banana") ? "\uD83C\uDF4C" :
               name.includes("Broccoli") ? "\uD83E\uDD66" :
               name.includes("Tea") ? "\u2615" :
               name.includes("Coca-Cola") || name.includes("Juice") ? "\uD83E\uDDC3" :
               name.includes("Pizza") ? "\uD83C\uDF55" :
               name.includes("Chocolate") || name.includes("Cadbury") ? "\uD83C\uDF6B" :
               "\uD83D\uDED2"}
            </span>
          </div>

          {/* Sale badge */}
          <div className="mb-2 flex gap-1.5">
            {isOnSale && (
              <Badge variant="success" className="text-[10px]">
                <TrendingDown className="mr-1 h-3 w-3" />
                ON SALE
              </Badge>
            )}
          </div>

          {/* Product info */}
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-green-600 transition-colors">
            {name}
          </h3>
          {brand && (
            <p className="mt-0.5 text-xs text-muted-foreground">{brand}</p>
          )}
          {weight && weightUnit && (
            <p className="text-xs text-muted-foreground">
              {weight}
              {weightUnit}
            </p>
          )}

          {/* Price range */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-green-600">
                {formatPrice(minPrice)}
              </p>
              {minPrice !== maxPrice && (
                <p className="text-xs text-muted-foreground">
                  to {formatPrice(maxPrice)}
                </p>
              )}
            </div>
            {cheapestStore && (
              <StoreLogo
                slug={cheapestStore.slug}
                name={cheapestStore.name}
                size="sm"
              />
            )}
          </div>

          {/* Add to basket */}
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleAddToBasket}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            Add to Basket
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
