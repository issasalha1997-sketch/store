"use client";

import { useMemo } from "react";
import { useBasket } from "@/hooks/useBasket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StoreLogo } from "@/components/shared/StoreLogo";
import { formatPrice } from "@/lib/utils";
import { STORE_COLORS } from "@/lib/constants";
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
    store: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
      logoUrl: string | null;
      websiteUrl: string | null;
    };
    total: number;
    items: {
      productId: string;
      productName: string;
      price: number;
      quantity: number;
    }[];
    missingItems: string[];
  };
  multiStoreBest: {
    stores: {
      store: {
        id: string;
        name: string;
        slug: string;
        color: string | null;
        logoUrl: string | null;
        websiteUrl: string | null;
      };
      items: {
        productId: string;
        productName: string;
        price: number;
        quantity: number;
      }[];
      subtotal: number;
    }[];
    total: number;
  };
  savings: number;
  savingsPercentage: number;
  itemPrices: ItemPriceData[];
}

export default function BasketPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearBasket,
    preferredStores,
    setPreferredStore,
    clearPreferredStore,
  } = useBasket();

  const { data: optimization, isLoading: optimizing } = useQuery({
    queryKey: [
      "basket-optimize",
      items.map((i) => `${i.productId}:${i.quantity}`).join(","),
    ],
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

  // Collect all unique stores from the price data for column headers
  const allStores = useMemo(() => {
    if (!optimization?.itemPrices) return [];
    const storeMap = new Map<
      string,
      { id: string; name: string; slug: string; color: string | null }
    >();
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

  // Determine the algorithm's cheapest store per item
  const algorithmChoices = useMemo(() => {
    if (!optimization?.itemPrices) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const item of optimization.itemPrices) {
      if (item.prices.length === 0) continue;
      const cheapest = item.prices.reduce((min, p) =>
        p.price < min.price ? p : min
      );
      map.set(item.productId, cheapest.storeId);
    }
    return map;
  }, [optimization?.itemPrices]);

  // Build effective selections: user override takes priority, then algorithm choice
  const effectiveSelections = useMemo(() => {
    const map = new Map<string, string>();
    for (const [productId, algoStoreId] of algorithmChoices) {
      map.set(productId, preferredStores[productId] ?? algoStoreId);
    }
    return map;
  }, [algorithmChoices, preferredStores]);

  // Calculate custom total from effective selections
  const customTotal = useMemo(() => {
    if (!optimization?.itemPrices) return 0;
    let total = 0;
    for (const item of optimization.itemPrices) {
      const selectedStoreId = effectiveSelections.get(item.productId);
      const selectedPrice = item.prices.find(
        (p) => p.storeId === selectedStoreId
      );
      if (selectedPrice) {
        total += selectedPrice.price * item.quantity;
      }
    }
    return total;
  }, [optimization?.itemPrices, effectiveSelections]);

  // Count how many overrides differ from algorithm
  const overrideCount = useMemo(() => {
    let count = 0;
    for (const [productId, storeId] of Object.entries(preferredStores)) {
      const algo = algorithmChoices.get(productId);
      if (algo && algo !== storeId) count++;
    }
    return count;
  }, [preferredStores, algorithmChoices]);

  const hasOverrides = overrideCount > 0;

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Basket Comparison</h1>
          <p className="text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} &mdash; compare
            prices across all stores
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                for (const productId of Object.keys(preferredStores)) {
                  clearPreferredStore(productId);
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset Overrides
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearBasket}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-4">
        {/* Main comparison grid */}
        <div className="xl:col-span-3 space-y-4">
          {optimizing ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin h-10 w-10 border-2 border-green-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-muted-foreground">
                  Comparing prices across all stores...
                </p>
              </CardContent>
            </Card>
          ) : optimization?.itemPrices ? (
            <>
              {/* Comparison Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Price Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click any price to select that store for an item. The
                    cheapest price is highlighted in green.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-semibold min-w-[200px]">
                            Product
                          </th>
                          <th className="text-center p-3 font-semibold w-16">
                            Qty
                          </th>
                          {allStores.map((store) => (
                            <th
                              key={store.id}
                              className="text-center p-2 min-w-[110px]"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <StoreLogo
                                  slug={store.slug}
                                  name={store.name}
                                  size="sm"
                                />
                                <span className="text-[10px] font-medium leading-tight">
                                  {store.name}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold min-w-[90px]">
                            Selected
                          </th>
                          <th className="text-center p-3 w-10">
                            <Trash2 className="h-4 w-4 mx-auto text-muted-foreground" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimization.itemPrices.map((itemData) => {
                          const basketItem = items.find(
                            (i) => i.productId === itemData.productId
                          );
                          if (!basketItem) return null;

                          const cheapestPrice = Math.min(
                            ...itemData.prices.map((p) => p.price)
                          );
                          const mostExpensivePrice = Math.max(
                            ...itemData.prices.map((p) => p.price)
                          );
                          const pricesVary =
                            cheapestPrice !== mostExpensivePrice;
                          const selectedStoreId = effectiveSelections.get(
                            itemData.productId
                          );
                          const algoStoreId = algorithmChoices.get(
                            itemData.productId
                          );
                          const isOverridden =
                            preferredStores[itemData.productId] !== undefined &&
                            preferredStores[itemData.productId] !== algoStoreId;
                          const selectedPrice = itemData.prices.find(
                            (p) => p.storeId === selectedStoreId
                          );

                          return (
                            <tr
                              key={itemData.productId}
                              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                              {/* Product info */}
                              <td className="p-3">
                                <Link
                                  href={`/product/${basketItem.productSlug}`}
                                  className="hover:text-green-600 transition-colors"
                                >
                                  <p className="font-medium text-sm leading-tight">
                                    {itemData.productName}
                                  </p>
                                </Link>
                                {basketItem.brand && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {basketItem.brand}
                                  </p>
                                )}
                                {basketItem.weight && basketItem.weightUnit && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {basketItem.weight}
                                    {basketItem.weightUnit}
                                  </p>
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center rounded border text-xs">
                                  <button
                                    className="px-2 py-1 hover:bg-accent transition-colors"
                                    onClick={() =>
                                      updateQuantity(
                                        itemData.productId,
                                        basketItem.quantity - 1
                                      )
                                    }
                                  >
                                    -
                                  </button>
                                  <span className="px-2 py-1 font-medium">
                                    {basketItem.quantity}
                                  </span>
                                  <button
                                    className="px-2 py-1 hover:bg-accent transition-colors"
                                    onClick={() =>
                                      updateQuantity(
                                        itemData.productId,
                                        basketItem.quantity + 1
                                      )
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Store price cells */}
                              {allStores.map((store) => {
                                const storePrice = itemData.prices.find(
                                  (p) => p.storeId === store.id
                                );
                                const isCheapest =
                                  storePrice?.price === cheapestPrice;
                                const isMostExpensive =
                                  pricesVary &&
                                  storePrice?.price === mostExpensivePrice;
                                const isSelected =
                                  selectedStoreId === store.id;
                                const storeColor =
                                  STORE_COLORS[store.slug] || "#666";

                                return (
                                  <td
                                    key={store.id}
                                    className="p-1.5 text-center"
                                  >
                                    {storePrice ? (
                                      <button
                                        onClick={() => {
                                          if (
                                            preferredStores[
                                              itemData.productId
                                            ] === store.id
                                          ) {
                                            clearPreferredStore(
                                              itemData.productId
                                            );
                                          } else {
                                            setPreferredStore(
                                              itemData.productId,
                                              store.id
                                            );
                                          }
                                        }}
                                        className={`relative w-full rounded-lg px-2 py-2 text-sm transition-all cursor-pointer
                                          ${
                                            isSelected
                                              ? "font-bold shadow-sm"
                                              : isCheapest
                                                ? "bg-green-50/60 text-green-700 hover:bg-green-50"
                                                : isMostExpensive
                                                  ? "text-red-500 hover:bg-red-50/50"
                                                  : "text-foreground hover:bg-accent"
                                          }`}
                                        style={
                                          isSelected
                                            ? {
                                                backgroundColor: isCheapest
                                                  ? "#dcfce7"
                                                  : "#f3f4f6",
                                                boxShadow: `0 0 0 2px ${storeColor}`,
                                              }
                                            : undefined
                                        }
                                        title={`Select ${store.name} for ${itemData.productName}`}
                                      >
                                        {formatPrice(storePrice.price)}
                                        {isSelected && (
                                          <Check className="absolute -top-1 -right-1 h-4 w-4 text-white rounded-full p-0.5 bg-green-500" />
                                        )}
                                        {isCheapest && !isSelected && (
                                          <span className="block text-[9px] text-green-600 font-normal">
                                            cheapest
                                          </span>
                                        )}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">
                                        N/A
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Selected line total */}
                              <td className="p-3 text-center">
                                <span className="font-semibold text-sm">
                                  {selectedPrice
                                    ? formatPrice(
                                        selectedPrice.price *
                                          itemData.quantity
                                      )
                                    : "---"}
                                </span>
                                {isOverridden && (
                                  <span className="block text-[10px] text-amber-600 font-medium">
                                    override
                                  </span>
                                )}
                              </td>

                              {/* Remove */}
                              <td className="p-2 text-center">
                                <button
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                  onClick={() =>
                                    removeItem(itemData.productId)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Totals row */}
                        <tr className="bg-muted/30 font-semibold">
                          <td className="p-3" colSpan={2}>
                            Total
                          </td>
                          {allStores.map((store) => {
                            const storeTotal =
                              optimization.itemPrices.reduce((sum, item) => {
                                const p = item.prices.find(
                                  (pr) => pr.storeId === store.id
                                );
                                return sum + (p ? p.price * item.quantity : 0);
                              }, 0);
                            const allAvailable =
                              optimization.itemPrices.every((item) =>
                                item.prices.some(
                                  (p) => p.storeId === store.id
                                )
                              );
                            return (
                              <td
                                key={store.id}
                                className="p-2 text-center text-sm"
                              >
                                {allAvailable ? (
                                  formatPrice(storeTotal)
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    Incomplete
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center text-base text-green-700">
                            {formatPrice(customTotal)}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary bar comparing algorithm vs your choice */}
              {hasOverrides && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                            Algorithm Recommendation
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            {formatPrice(optimization.multiStoreBest.total)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                            Your Custom Choice
                          </p>
                          <p className="text-lg font-bold">
                            {formatPrice(customTotal)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {customTotal > optimization.multiStoreBest.total && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            +{formatPrice(customTotal - optimization.multiStoreBest.total)} vs optimal
                          </Badge>
                        )}
                        {customTotal < optimization.multiStoreBest.total && (
                          <Badge variant="success">
                            {formatPrice(optimization.multiStoreBest.total - customTotal)} saved vs algorithm
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {overrideCount} override{overrideCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>

        {/* Sidebar */}
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
                      <p className="font-semibold">
                        {optimization.singleStoreBest.store.name}
                      </p>
                      <p className="text-2xl font-bold">
                        {formatPrice(optimization.singleStoreBest.total)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Everything from one store
                  </p>
                  {optimization.singleStoreBest.missingItems.length > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Not available:{" "}
                      {optimization.singleStoreBest.missingItems.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Smart Split */}
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
                      Save {formatPrice(optimization.savings)} (
                      {optimization.savingsPercentage.toFixed(1)}%)
                    </Badge>
                  )}

                  <Separator className="my-3" />

                  <div className="space-y-2">
                    {optimization.multiStoreBest.stores.map((storeGroup) => (
                      <div
                        key={storeGroup.store.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <StoreLogo
                            slug={storeGroup.store.slug}
                            name={storeGroup.store.name}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-medium">
                              {storeGroup.store.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {storeGroup.items.length} item
                              {storeGroup.items.length !== 1 ? "s" : ""}
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

              {/* Custom choice card when overrides exist */}
              {hasOverrides && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-blue-800">
                      <ShoppingCart className="h-4 w-4" />
                      Your Custom Choice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatPrice(customTotal)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {overrideCount} item
                      {overrideCount !== 1 ? "s" : ""} overridden
                    </p>
                    {customTotal > optimization.multiStoreBest.total && (
                      <p className="mt-1 text-xs text-amber-600">
                        +
                        {formatPrice(
                          customTotal - optimization.multiStoreBest.total
                        )}{" "}
                        vs smart split
                      </p>
                    )}
                    {customTotal < optimization.multiStoreBest.total && (
                      <Badge variant="success" className="mt-1">
                        {formatPrice(
                          optimization.multiStoreBest.total - customTotal
                        )}{" "}
                        less than smart split
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Plan Trip CTA */}
              <Link href="/trip">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
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
