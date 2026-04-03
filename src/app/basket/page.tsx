"use client";

import { useState } from "react";
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
  ArrowRight,
  Check,
  Copy,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  } = useBasket();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMultiStore, setShowMultiStore] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Multi-store savings info
  const multiStoreSavings = optimization?.savings ?? 0;
  const multiStoreCount = optimization?.multiStoreBest.stores.length ?? 0;
  const significantSavings = multiStoreSavings > 5;

  // Build shopping list text for copying
  const buildShoppingListText = () => {
    if (!optimization) return "";
    const storeName = optimization.singleStoreBest.store.name;
    const lines = optimization.singleStoreBest.items.map(
      (item) =>
        `${item.quantity}x ${item.productName} - ${formatPrice(item.price)}`
    );
    return `Shopping List (${storeName})\n${lines.join("\n")}\nTotal: ${formatPrice(optimization.singleStoreBest.total)}`;
  };

  const handleCopyList = async () => {
    const text = buildShoppingListText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text approach won't work here, just ignore
    }
  };

  const handleShareList = async () => {
    const text = buildShoppingListText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Shopping List", text });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyList();
    }
  };

  // Empty basket state
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
          Start adding items to compare prices across stores and find the
          best deals
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
      className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Your Basket</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-red-700">
                Clear all?
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs rounded-md"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  clearBasket();
                  setShowClearConfirm(false);
                }}
              >
                Yes
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {optimizing && (
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Finding the best prices...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main basket total banner */}
      {optimization && !optimizing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-emerald-50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-400 to-emerald-500" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StoreLogo
                    slug={optimization.singleStoreBest.store.slug}
                    name={optimization.singleStoreBest.store.name}
                    size="lg"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Your basket at{" "}
                      <span className="font-semibold text-foreground">
                        {optimization.singleStoreBest.store.name}
                      </span>
                    </p>
                    <p className="text-3xl font-bold text-teal-700 tabular-nums">
                      {formatPrice(optimization.singleStoreBest.total)}
                    </p>
                  </div>
                </div>
              </div>
              {optimization.singleStoreBest.missingItems.length > 0 && (
                <p className="mt-3 text-xs text-amber-600">
                  Not available here:{" "}
                  {optimization.singleStoreBest.missingItems.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Simple savings banner */}
      {optimization && !optimizing && multiStoreSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {significantSavings ? (
            // Prominent nudge for significant savings (>5 EUR)
            <Card className="border-0 shadow-sm border-l-4 border-l-teal-500 bg-teal-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-teal-800">
                        Split across {multiStoreCount} stores to save{" "}
                        {formatPrice(multiStoreSavings)}
                      </p>
                      <p className="text-xs text-teal-600/80 mt-0.5">
                        {optimization.savingsPercentage.toFixed(0)}% less
                        than shopping at one store
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg shrink-0 border-teal-300 text-teal-700 hover:bg-teal-100"
                    onClick={() => setShowMultiStore(!showMultiStore)}
                  >
                    {showMultiStore ? "Hide" : "View split"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Subtle banner for smaller savings
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <TrendingDown className="inline h-3.5 w-3.5 mr-1 text-teal-600" />
                You could save{" "}
                <span className="font-semibold text-foreground">
                  {formatPrice(multiStoreSavings)}
                </span>{" "}
                by splitting across stores
              </p>
              <button
                className="text-xs text-teal-600 hover:underline shrink-0 ml-2"
                onClick={() => setShowMultiStore(!showMultiStore)}
              >
                {showMultiStore ? "Hide" : "Details"}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Expandable multi-store optimization section */}
      <AnimatePresence>
        {showMultiStore && optimization && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    Optimized Multi-Store Split
                  </CardTitle>
                  <Badge variant="success" className="rounded-full">
                    Save {formatPrice(multiStoreSavings)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Buy each item where it costs the least
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {optimization.multiStoreBest.stores.map((sg) => (
                    <div key={sg.store.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <StoreLogo
                          slug={sg.store.slug}
                          name={sg.store.name}
                          size="sm"
                        />
                        <span className="text-sm font-semibold">
                          {sg.store.name}
                        </span>
                        <span className="text-sm text-muted-foreground ml-auto tabular-nums font-semibold">
                          {formatPrice(sg.subtotal)}
                        </span>
                      </div>
                      <div className="ml-8 space-y-1">
                        {sg.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between text-sm text-muted-foreground"
                          >
                            <span>
                              {item.quantity > 1
                                ? `${item.quantity}x `
                                : ""}
                              {item.productName}
                            </span>
                            <span className="tabular-nums">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-bold">
                    <span>Multi-store total</span>
                    <span className="text-teal-600 tabular-nums text-lg">
                      {formatPrice(optimization.multiStoreBest.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items list */}
      {!optimizing && (
        <div className="space-y-2 mb-6">
          <AnimatePresence>
            {items.map((basketItem, idx) => {
              // Best single store price for this item
              const singleStoreItem =
                optimization?.singleStoreBest.items.find(
                  (si) => si.productId === basketItem.productId
                );
              const bestPrice = singleStoreItem?.price;

              return (
                <motion.div
                  key={basketItem.productId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        {/* Product image */}
                        {basketItem.imageUrl && (
                          <Link
                            href={`/product/${basketItem.productSlug}`}
                            className="shrink-0"
                          >
                            <div className="h-12 w-12 rounded-lg bg-neutral-50 overflow-hidden flex items-center justify-center">
                              <Image
                                src={basketItem.imageUrl}
                                alt={basketItem.productName}
                                width={48}
                                height={48}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          </Link>
                        )}

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${basketItem.productSlug}`}
                            className="font-medium text-sm hover:text-teal-600 transition-colors leading-tight line-clamp-1"
                          >
                            {basketItem.productName}
                          </Link>
                          {basketItem.brand && (
                            <p className="text-xs text-muted-foreground">
                              {basketItem.brand}
                            </p>
                          )}
                          {bestPrice != null && (
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(bestPrice)} each
                            </p>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="inline-flex items-center rounded-lg border text-xs shrink-0">
                          <button
                            className="px-2.5 py-1.5 hover:bg-accent transition-colors rounded-l-lg"
                            onClick={() =>
                              updateQuantity(
                                basketItem.productId,
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
                                basketItem.productId,
                                basketItem.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 w-16">
                          <span className="font-bold text-sm tabular-nums">
                            {bestPrice != null
                              ? formatPrice(bestPrice * basketItem.quantity)
                              : "---"}
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 shrink-0"
                          onClick={() =>
                            removeItem(basketItem.productId)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Actions: Copy list / Share */}
      {optimization && !optimizing && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={handleCopyList}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-teal-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy shopping list
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleShareList}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Trip planner link */}
      {items.length > 0 && optimization && !optimizing && (
        <div className="pt-4 border-t">
          <Link
            href="/trip"
            className="flex items-center justify-between text-sm text-muted-foreground hover:text-teal-600 transition-colors group py-2"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Plan your shopping trip</span>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
