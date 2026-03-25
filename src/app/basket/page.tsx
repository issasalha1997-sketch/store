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
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

  const effectiveSelections = useMemo(() => {
    const map = new Map<string, string>();
    for (const [productId, algoStoreId] of algorithmChoices) {
      map.set(productId, preferredStores[productId] ?? algoStoreId);
    }
    return map;
  }, [algorithmChoices, preferredStores]);

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
      <motion.div
        className="container mx-auto px-4 py-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-2xl font-bold">Your basket is empty</h1>
        <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
          Start adding items to compare prices across all 5 stores and plan
          your shopping trip
        </p>
        <Link href="/search">
          <Button className="mt-6 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 px-8 shadow-md shadow-teal-500/20">
            Start Shopping
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="container mx-auto px-4 py-6 sm:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Basket Comparison</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} &mdash; compare
            prices across all stores
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => {
                for (const productId of Object.keys(preferredStores)) {
                  clearPreferredStore(productId);
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={clearBasket}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>
      </div>

      {/* On mobile: sidebar cards first, then comparison */}
      <div className="grid gap-6 xl:grid-cols-4">
        {/* Sidebar — shown first on mobile, right on desktop */}
        <div className="xl:col-span-1 xl:order-2 space-y-4">
          {optimizing ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Finding the best prices...
                </p>
              </CardContent>
            </Card>
          ) : optimization ? (
            <>
              {/* Summary cards on mobile: horizontal scroll */}
              <div className="flex xl:flex-col gap-3 overflow-x-auto pb-2 xl:pb-0 -mx-4 px-4 xl:mx-0 xl:px-0 snap-x">
                {/* Best Single Store */}
                <Card className="border-0 shadow-sm min-w-[240px] xl:min-w-0 snap-start shrink-0 xl:shrink">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Best Single Store
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StoreLogo
                        slug={optimization.singleStoreBest.store.slug}
                        name={optimization.singleStoreBest.store.name}
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          {optimization.singleStoreBest.store.name}
                        </p>
                        <p className="text-2xl font-bold tabular-nums">
                          {formatPrice(optimization.singleStoreBest.total)}
                        </p>
                      </div>
                    </div>
                    {optimization.singleStoreBest.missingItems.length > 0 && (
                      <p className="mt-2 text-[10px] text-amber-600">
                        Missing:{" "}
                        {optimization.singleStoreBest.missingItems.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Smart Split */}
                <Card className="border-0 shadow-sm min-w-[240px] xl:min-w-0 snap-start shrink-0 xl:shrink bg-gradient-to-br from-teal-50 to-emerald-50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                        Smart Split
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-teal-600 tabular-nums">
                      {formatPrice(optimization.multiStoreBest.total)}
                    </p>
                    {optimization.savings > 0 && (
                      <Badge
                        variant="success"
                        className="mt-2 rounded-full"
                      >
                        <TrendingDown className="mr-1 h-3 w-3" />
                        Save {formatPrice(optimization.savings)} (
                        {optimization.savingsPercentage.toFixed(1)}%)
                      </Badge>
                    )}
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      {optimization.multiStoreBest.stores.map((sg) => (
                        <div
                          key={sg.store.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <StoreLogo
                              slug={sg.store.slug}
                              name={sg.store.name}
                              size="sm"
                            />
                            <div>
                              <p className="text-xs font-medium">
                                {sg.store.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {sg.items.length} item
                                {sg.items.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums">
                            {formatPrice(sg.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Custom choice */}
                {hasOverrides && (
                  <Card className="border-0 shadow-sm min-w-[240px] xl:min-w-0 snap-start shrink-0 xl:shrink bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Your Choice
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600 tabular-nums">
                        {formatPrice(customTotal)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {overrideCount} override
                        {overrideCount !== 1 ? "s" : ""}
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
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Plan Trip CTA */}
              <Link href="/trip" className="block">
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/20"
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

        {/* Main comparison grid */}
        <div className="xl:col-span-3 xl:order-1 space-y-4">
          {optimizing ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="animate-spin h-10 w-10 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-muted-foreground">
                  Comparing prices across all stores...
                </p>
              </CardContent>
            </Card>
          ) : optimization?.itemPrices ? (
            <>
              {/* Desktop: Table view */}
              <Card className="border-0 shadow-sm hidden md:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Price Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click any price to select that store for an item
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-semibold min-w-[180px]">
                            Product
                          </th>
                          <th className="text-center p-3 font-semibold w-16">
                            Qty
                          </th>
                          {allStores.map((store) => (
                            <th
                              key={store.id}
                              className="text-center p-2 min-w-[100px]"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <StoreLogo
                                  slug={store.slug}
                                  name={store.name}
                                  size="sm"
                                />
                                <span className="text-[10px] font-medium leading-tight">
                                  {store.name.split(" ")[0]}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold min-w-[80px]">
                            Total
                          </th>
                          <th className="text-center p-3 w-10" />
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
                              className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                            >
                              <td className="p-3">
                                <Link
                                  href={`/product/${basketItem.productSlug}`}
                                  className="hover:text-teal-600 transition-colors"
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
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center rounded-lg border text-xs">
                                  <button
                                    className="px-2.5 py-1.5 hover:bg-accent transition-colors rounded-l-lg"
                                    onClick={() =>
                                      updateQuantity(
                                        itemData.productId,
                                        basketItem.quantity - 1
                                      )
                                    }
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 py-1.5 font-bold tabular-nums">
                                    {basketItem.quantity}
                                  </span>
                                  <button
                                    className="px-2.5 py-1.5 hover:bg-accent transition-colors rounded-r-lg"
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
                                        className={`relative w-full rounded-lg px-2 py-2 text-sm transition-all cursor-pointer tabular-nums ${
                                          isSelected
                                            ? "font-bold shadow-sm"
                                            : isCheapest
                                              ? "bg-teal-50/60 text-teal-700 hover:bg-teal-50"
                                              : isMostExpensive
                                                ? "text-red-400 hover:bg-red-50/50"
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
                                          <Check className="absolute -top-1 -right-1 h-4 w-4 text-white rounded-full p-0.5 bg-teal-500" />
                                        )}
                                        {isCheapest && !isSelected && (
                                          <span className="block text-[9px] text-teal-600 font-normal">
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
                              <td className="p-3 text-center">
                                <span className="font-bold text-sm tabular-nums">
                                  {selectedPrice
                                    ? formatPrice(
                                        selectedPrice.price * itemData.quantity
                                      )
                                    : "---"}
                                </span>
                                {isOverridden && (
                                  <span className="block text-[10px] text-amber-600 font-medium">
                                    override
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
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
                        <tr className="bg-muted/20 font-bold">
                          <td className="p-3" colSpan={2}>
                            Total
                          </td>
                          {allStores.map((store) => {
                            const storeTotal =
                              optimization.itemPrices.reduce((sum, item) => {
                                const p = item.prices.find(
                                  (pr) => pr.storeId === store.id
                                );
                                return (
                                  sum + (p ? p.price * item.quantity : 0)
                                );
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
                                className="p-2 text-center text-sm tabular-nums"
                              >
                                {allAvailable ? (
                                  formatPrice(storeTotal)
                                ) : (
                                  <span className="text-muted-foreground text-xs font-normal">
                                    N/A
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center text-base text-teal-600 tabular-nums">
                            {formatPrice(customTotal)}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile: Card view */}
              <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Price Comparison</h2>
                  <p className="text-xs text-muted-foreground">
                    Tap a store to select it
                  </p>
                </div>

                <AnimatePresence>
                  {optimization.itemPrices.map((itemData, idx) => {
                    const basketItem = items.find(
                      (i) => i.productId === itemData.productId
                    );
                    if (!basketItem) return null;

                    const cheapestPrice = Math.min(
                      ...itemData.prices.map((p) => p.price)
                    );
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
                      <motion.div
                        key={itemData.productId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-0 shadow-sm overflow-hidden">
                          <CardContent className="p-4">
                            {/* Product header */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/product/${basketItem.productSlug}`}
                                  className="font-semibold text-sm hover:text-teal-600 transition-colors leading-tight line-clamp-1"
                                >
                                  {itemData.productName}
                                </Link>
                                {basketItem.brand && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {basketItem.brand}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="inline-flex items-center rounded-lg border text-xs">
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
                                  <span className="px-2 py-1 font-bold tabular-nums">
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
                                <button
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                  onClick={() =>
                                    removeItem(itemData.productId)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Store price buttons - grid */}
                            <div className="grid grid-cols-5 gap-1.5">
                              {allStores.map((store) => {
                                const storePrice = itemData.prices.find(
                                  (p) => p.storeId === store.id
                                );
                                const isCheapest =
                                  storePrice?.price === cheapestPrice;
                                const isSelected =
                                  selectedStoreId === store.id;
                                const storeColor =
                                  STORE_COLORS[store.slug] || "#666";

                                return (
                                  <button
                                    key={store.id}
                                    onClick={() => {
                                      if (!storePrice) return;
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
                                    disabled={!storePrice}
                                    className={`relative rounded-xl p-2 text-center transition-all ${
                                      isSelected
                                        ? "shadow-sm"
                                        : isCheapest
                                          ? "bg-teal-50/60"
                                          : "bg-muted/30"
                                    } ${!storePrice ? "opacity-40" : "active:scale-95"}`}
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
                                  >
                                    <StoreLogo
                                      slug={store.slug}
                                      name={store.name}
                                      size="sm"
                                    />
                                    <p className="mt-1 text-[11px] font-bold tabular-nums">
                                      {storePrice
                                        ? formatPrice(storePrice.price)
                                        : "N/A"}
                                    </p>
                                    {isCheapest && storePrice && (
                                      <p className="text-[8px] text-teal-600 font-medium">
                                        best
                                      </p>
                                    )}
                                    {isSelected && (
                                      <Check className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-white rounded-full p-0.5 bg-teal-500" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected total */}
                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-dashed">
                              <span className="text-xs text-muted-foreground">
                                {isOverridden ? (
                                  <span className="text-amber-600 font-medium">
                                    Override active
                                  </span>
                                ) : (
                                  "Algorithm pick"
                                )}
                              </span>
                              <span className="font-bold tabular-nums">
                                {selectedPrice
                                  ? formatPrice(
                                      selectedPrice.price * itemData.quantity
                                    )
                                  : "---"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Mobile total */}
                <Card className="border-0 shadow-sm bg-muted/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-bold">Your Total</span>
                    <span className="text-xl font-bold text-teal-600 tabular-nums">
                      {formatPrice(customTotal)}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Override comparison bar */}
              {hasOverrides && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/50 border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                              Algorithm
                            </p>
                            <p className="text-lg font-bold text-teal-600 tabular-nums">
                              {formatPrice(
                                optimization.multiStoreBest.total
                              )}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                              Your Choice
                            </p>
                            <p className="text-lg font-bold tabular-nums">
                              {formatPrice(customTotal)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {customTotal >
                            optimization.multiStoreBest.total && (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300 rounded-full"
                            >
                              +
                              {formatPrice(
                                customTotal -
                                  optimization.multiStoreBest.total
                              )}{" "}
                              vs optimal
                            </Badge>
                          )}
                          {customTotal <
                            optimization.multiStoreBest.total && (
                            <Badge
                              variant="success"
                              className="rounded-full"
                            >
                              {formatPrice(
                                optimization.multiStoreBest.total -
                                  customTotal
                              )}{" "}
                              saved
                            </Badge>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {overrideCount} override
                            {overrideCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
