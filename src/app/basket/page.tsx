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
  Check,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { STORE_COLORS } from "@/lib/constants";

interface ItemPrice {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeColor: string | null;
  price: number;
}

interface ItemPriceData {
  productId: string;
  productName: string;
  quantity: number;
  prices: ItemPrice[];
}

interface OptimizeResponse {
  singleStoreBest: {
    store: { id: string; name: string; slug: string; color: string | null; logoUrl: string | null; websiteUrl: string | null };
    total: number;
    items: { productId: string; productName: string; price: number; quantity: number }[];
    missingItems: string[];
  };
  multiStoreBest: {
    stores: {
      store: { id: string; name: string; slug: string; color: string | null; logoUrl: string | null; websiteUrl: string | null };
      items: { productId: string; productName: string; price: number; quantity: number }[];
      subtotal: number;
    }[];
    total: number;
  };
  savings: number;
  savingsPercentage: number;
  itemPrices: ItemPriceData[];
}

export default function BasketPage() {
  const { items, updateQuantity, removeItem, clearBasket, preferredStores, setPreferredStore, clearPreferredStore } = useBasket();

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
      return res.json() as Promise<OptimizeResponse>;
    },
    enabled: items.length > 0,
  });

  // Get all unique stores from the price data
  const allStores = useMemo(() => {
    if (!optimization?.itemPrices) return [];
    const storeMap = new Map<string, { id: string; name: string; slug: string; color: string | null }>();
    for (const item of optimization.itemPrices) {
      for (const p of item.prices) {
        if (!storeMap.has(p.storeId)) {
          storeMap.set(p.storeId, {
            id: p.storeId,
            name: p.storeName,
            slug: p.storeSlug,
            color: p.storeColor,
          });
        }
      }
    }
    return Array.from(storeMap.values());
  }, [optimization?.itemPrices]);

  // Calculate custom total based on user selections
  const customTotal = useMemo(() => {
    if (!optimization?.itemPrices) return 0;
    let total = 0;
    for (const item of optimization.itemPrices) {
      const preferredStoreId = preferredStores[item.productId];
      let selectedPrice: number;
      if (preferredStoreId) {
        const found = item.prices.find((p) => p.storeId === preferredStoreId);
        selectedPrice = found ? found.price : Math.min(...item.prices.map((p) => p.price));
      } else {
        selectedPrice = Math.min(...item.prices.map((p) => p.price));
      }
      total += selectedPrice * item.quantity;
    }
    return total;
  }, [optimization?.itemPrices, preferredStores]);

  const hasOverrides = Object.keys(preferredStores).length > 0;

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
            {items.length} item{items.length !== 1 ? "s" : ""} — compare prices across all stores
          </p>
        </div>
        <div className="flex gap-2">
          {hasOverrides && (
            <Button variant="outline" size="sm" onClick={() => {
              for (const productId of Object.keys(preferredStores)) {
                clearPreferredStore(productId);
              }
            }}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset Choices
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearBasket}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {optimizing ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-10 w-10 border-3 border-green-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">
              Comparing prices across all stores...
            </p>
          </CardContent>
        </Card>
      ) : optimization ? (
        <div className="space-y-8">
          {/* Price Comparison Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Comparison — Click a price to select your preferred store</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold min-w-[200px]">Product</th>
                      <th className="text-center p-3 font-semibold">Qty</th>
                      {allStores.map((store) => (
                        <th key={store.id} className="text-center p-2 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <StoreLogo slug={store.slug} name={store.name} size="sm" />
                            <span className="text-[10px] font-medium leading-tight">{store.name}</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-3 min-w-[60px]">
                        <Trash2 className="h-4 w-4 mx-auto text-muted-foreground" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimization.itemPrices.map((itemData) => {
                      const basketItem = items.find((i) => i.productId === itemData.productId);
                      if (!basketItem) return null;

                      const cheapestPrice = Math.min(...itemData.prices.map((p) => p.price));
                      const mostExpensivePrice = Math.max(...itemData.prices.map((p) => p.price));
                      const preferredStoreId = preferredStores[itemData.productId];

                      // Determine which store is selected
                      const selectedStoreId = preferredStoreId || itemData.prices.find((p) => p.price === cheapestPrice)?.storeId;

                      return (
                        <tr key={itemData.productId} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <Link href={`/product/${basketItem.productSlug}`} className="hover:text-green-600 transition-colors">
                              <p className="font-medium text-sm leading-tight">{itemData.productName}</p>
                            </Link>
                            {basketItem.brand && (
                              <p className="text-[10px] text-muted-foreground">{basketItem.brand}</p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center rounded border text-xs">
                              <button
                                className="px-2 py-1 hover:bg-accent transition-colors"
                                onClick={() => updateQuantity(itemData.productId, basketItem.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="px-2 py-1 font-medium">{basketItem.quantity}</span>
                              <button
                                className="px-2 py-1 hover:bg-accent transition-colors"
                                onClick={() => updateQuantity(itemData.productId, basketItem.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          {allStores.map((store) => {
                            const storePrice = itemData.prices.find((p) => p.storeId === store.id);
                            const isCheapest = storePrice?.price === cheapestPrice;
                            const isMostExpensive = storePrice?.price === mostExpensivePrice && cheapestPrice !== mostExpensivePrice;
                            const isSelected = selectedStoreId === store.id;
                            const isOverride = preferredStoreId === store.id;

                            return (
                              <td key={store.id} className="p-2 text-center">
                                {storePrice ? (
                                  <button
                                    onClick={() => {
                                      if (isOverride) {
                                        clearPreferredStore(itemData.productId);
                                      } else {
                                        setPreferredStore(itemData.productId, store.id);
                                      }
                                    }}
                                    className={`relative w-full rounded-lg px-2 py-2 text-sm font-semibold transition-all cursor-pointer
                                      ${isSelected
                                        ? "ring-2 ring-green-500 bg-green-50 text-green-700"
                                        : isCheapest
                                        ? "bg-green-50/50 text-green-700 hover:bg-green-50"
                                        : isMostExpensive
                                        ? "text-red-500 hover:bg-red-50/50"
                                        : "text-foreground hover:bg-accent"
                                      }`}
                                    title={`Select ${store.name} for this item — ${formatPrice(storePrice.price)}`}
                                  >
                                    {formatPrice(storePrice.price)}
                                    {isSelected && (
                                      <Check className="absolute -top-1 -right-1 h-4 w-4 text-white bg-green-500 rounded-full p-0.5" />
                                    )}
                                    {isCheapest && !isSelected && (
                                      <span className="block text-[9px] text-green-600 font-normal">cheapest</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">N/A</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center">
                            <button
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              onClick={() => removeItem(itemData.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Best Single Store */}
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Everything from one store — no extra trips
                </p>
                {optimization.singleStoreBest.missingItems.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Not available: {optimization.singleStoreBest.missingItems.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Smart Split */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-green-800">
                  <TrendingDown className="h-4 w-4" />
                  Smart Split (Algorithm)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {formatPrice(optimization.multiStoreBest.total)}
                </p>
                {optimization.savings > 0 && (
                  <Badge variant="success" className="mt-2">
                    Save {formatPrice(optimization.savings)} vs single store
                  </Badge>
                )}
                <Separator className="my-3" />
                <div className="space-y-1.5">
                  {optimization.multiStoreBest.stores.map((sg) => (
                    <div key={sg.store.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <StoreLogo slug={sg.store.slug} name={sg.store.name} size="sm" />
                        <span>{sg.store.name}</span>
                        <span className="text-muted-foreground">({sg.items.length})</span>
                      </div>
                      <span className="font-semibold">{formatPrice(sg.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Your Choice */}
            <Card className={hasOverrides ? "border-blue-200 bg-blue-50" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" />
                  {hasOverrides ? "Your Custom Choice" : "Your Total"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${hasOverrides ? "text-blue-600" : "text-green-600"}`}>
                  {formatPrice(customTotal)}
                </p>
                {hasOverrides && (
                  <>
                    {customTotal > optimization.multiStoreBest.total ? (
                      <p className="mt-1 text-xs text-amber-600">
                        {formatPrice(customTotal - optimization.multiStoreBest.total)} more than smart split
                      </p>
                    ) : customTotal < optimization.multiStoreBest.total ? (
                      <Badge variant="success" className="mt-1">
                        {formatPrice(optimization.multiStoreBest.total - customTotal)} less than smart split
                      </Badge>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Same as smart split</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Object.keys(preferredStores).length} item{Object.keys(preferredStores).length !== 1 ? "s" : ""} overridden
                    </p>
                  </>
                )}
                {!hasOverrides && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Click prices in the table to customize
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plan Trip CTA */}
          <div className="flex justify-center">
            <Link href="/trip">
              <Button className="bg-green-600 hover:bg-green-700 px-8" size="lg">
                <MapPin className="mr-2 h-5 w-5" />
                Plan My Shopping Trip
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
