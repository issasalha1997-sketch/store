"use client";

import { useBasket } from "@/hooks/useBasket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StoreLogo } from "@/components/shared/StoreLogo";
import { formatPrice } from "@/lib/utils";
import {
  ShoppingCart,
  Trash2,
  MapPin,
  TrendingDown,
  Store,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { OptimizationResult } from "@/types";

export default function BasketPage() {
  const { items, updateQuantity, removeItem, clearBasket } = useBasket();

  const { data: optimization, isLoading: optimizing } = useQuery({
    queryKey: ["basket-optimize", items.map((i) => `${i.productId}:${i.quantity}`).join(",")],
    queryFn: async () => {
      if (items.length === 0) return null;
      const res = await fetch("/api/basket/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });
      if (!res.ok) return null;
      return res.json() as Promise<OptimizationResult>;
    },
    enabled: items.length > 0,
  });

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h1 className="mt-4 text-2xl font-bold">Your basket is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Start adding items to compare prices and plan your trip
        </p>
        <Link href="/search">
          <Button className="mt-6 bg-green-600 hover:bg-green-700">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Your Basket</h1>
          <p className="text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} in your basket
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearBasket}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Clear All
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <Card key={item.productId}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Product emoji */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                  {item.productName.includes("Milk") ? "\uD83E\uDD5B" :
                   item.productName.includes("Butter") ? "\uD83E\uDDC8" :
                   item.productName.includes("Egg") ? "\uD83E\uDD5A" :
                   item.productName.includes("Chicken") ? "\uD83C\uDF57" :
                   "\uD83D\uDED2"}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.productSlug}`}
                    className="text-sm font-semibold hover:text-green-600 transition-colors"
                  >
                    {item.productName}
                  </Link>
                  {item.brand && (
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                  )}
                  {item.weight && item.weightUnit && (
                    <p className="text-xs text-muted-foreground">
                      {item.weight}{item.weightUnit}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex items-center rounded-md border">
                  <button
                    className="px-2.5 py-1 text-sm hover:bg-accent transition-colors"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                  <button
                    className="px-2.5 py-1 text-sm hover:bg-accent transition-colors"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Optimization sidebar */}
        <div className="space-y-4">
          {optimizing ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Finding the best prices...
                </p>
              </CardContent>
            </Card>
          ) : optimization ? (
            <>
              {/* Single Store Best */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="h-4 w-4" />
                    Best Single Store
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <StoreLogo
                      slug={optimization.singleStoreBest.store.slug}
                      name={optimization.singleStoreBest.store.name}
                    />
                    <div>
                      <p className="font-semibold">{optimization.singleStoreBest.store.name}</p>
                      <p className="text-2xl font-bold">
                        {formatPrice(optimization.singleStoreBest.total)}
                      </p>
                    </div>
                  </div>
                  {optimization.singleStoreBest.missingItems.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      Missing: {optimization.singleStoreBest.missingItems.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Multi Store Best */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-green-800">
                    <TrendingDown className="h-4 w-4" />
                    Smart Split (Cheapest)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(optimization.multiStoreBest.total)}
                  </p>

                  {optimization.savings > 0 && (
                    <Badge variant="success" className="mt-2">
                      Save {formatPrice(optimization.savings)} ({optimization.savingsPercentage.toFixed(1)}%)
                    </Badge>
                  )}

                  <Separator className="my-3" />

                  <div className="space-y-2">
                    {optimization.multiStoreBest.stores.map((storeGroup) => (
                      <div key={storeGroup.store.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StoreLogo
                            slug={storeGroup.store.slug}
                            name={storeGroup.store.name}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-medium">{storeGroup.store.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {storeGroup.items.length} item{storeGroup.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatPrice(storeGroup.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Plan Trip CTA */}
              <Link href="/trip">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  <MapPin className="mr-2 h-5 w-5" />
                  Plan My Trip
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
