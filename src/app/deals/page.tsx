"use client";

import { useQuery } from "@tanstack/react-query";
import { FamilyCard } from "@/components/product/FamilyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tag, Clock, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";

type SortMode = "savings_desc" | "price_asc" | "price_desc";

interface DealItem {
  familySlug: string;
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
  cheapestProductId?: string;
  cheapestProductSlug?: string;
  cheapestWeight?: number | null;
  cheapestWeightUnit?: string | null;
  // Deal-specific
  savingsAmount: number | null;
  savingsPercent: number | null;
  salePrice: number | null;
  originalPrice: number | null;
  dealStore: string | null;
  dealStoreSlug: string | null;
  latestScrapedAt: string | null;
}

export default function DealsPage() {
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>("savings_desc");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["deals", page, sortMode, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("onSaleOnly", "true");
      params.set("sortBy", sortMode);
      params.set("page", String(page));
      params.set("limit", "24");
      params.set("group", "family");
      if (storeFilter !== "all") {
        params.set("store", storeFilter);
      }
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const results: DealItem[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const lastUpdated: string | null = data?.lastUpdated || null;

  // Extract unique stores from current results for filter tabs
  const availableStores = useMemo(() => {
    const storeMap = new Map<string, { name: string; slug: string; color: string | null }>();
    for (const item of results) {
      for (const store of item.stores) {
        if (!storeMap.has(store.slug)) {
          storeMap.set(store.slug, store);
        }
      }
    }
    return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  // Format the last-updated time
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    const diff = Date.now() - new Date(lastUpdated).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "just now";
  }, [lastUpdated]);

  // Reset page when filters change
  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    setPage(1);
  };
  const handleStoreChange = (slug: string) => {
    setStoreFilter(slug);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 page-enter">
      {/* Header — clean, informative */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="h-5 w-5 text-red-500" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
            Deals & Offers
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-neutral-700">
            {total} deal{total !== 1 ? "s" : ""} available
          </span>
          {lastUpdatedText && (
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Updated {lastUpdatedText}
            </span>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-6 space-y-3">
        {/* Sort + Store filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => handleSortChange(e.target.value as SortMode)}
              className="appearance-none bg-white border border-neutral-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-neutral-700 cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="savings_desc">Biggest Savings</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
          </div>

          <div className="h-5 w-px bg-neutral-200 hidden sm:block" />

          {/* Store filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleStoreChange("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                storeFilter === "all"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All Stores
            </button>
            {availableStores.map((store) => (
              <button
                key={store.slug}
                onClick={() => handleStoreChange(store.slug)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  storeFilter === store.slug
                    ? "text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                style={
                  storeFilter === store.slug
                    ? { backgroundColor: store.color || "#333" }
                    : undefined
                }
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 bg-white">
              <Skeleton className="h-28 sm:h-32 w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-3 h-6 w-1/3" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-16 text-center"
        >
          <p className="text-5xl mb-4">🏷️</p>
          <h3 className="text-lg font-bold">No deals right now</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {storeFilter !== "all"
              ? "Try selecting a different store or check back later."
              : "Check back soon -- new deals are added regularly."}
          </p>
          <Link href="/search">
            <Button variant="outline" className="mt-4 rounded-full">
              Browse All Products
            </Button>
          </Link>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {results.map((item) => (
              <motion.div
                key={item.familySlug || item.slug}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                }}
                className="relative"
              >
                {/* Savings overlay badge */}
                {item.savingsAmount != null && item.savingsAmount > 0 && (
                  <div className="absolute top-2 right-2 z-20">
                    <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {item.savingsPercent != null && item.savingsPercent > 0
                        ? `-${item.savingsPercent}%`
                        : `Save ${formatPrice(item.savingsAmount)}`}
                    </div>
                  </div>
                )}
                <FamilyCard
                  familyName={item.familyName}
                  slug={item.slug}
                  imageUrl={item.imageUrl}
                  brand={item.brand}
                  optionCount={item.optionCount}
                  storeCount={item.storeCount}
                  stores={item.stores}
                  minPrice={item.minPrice}
                  maxPrice={item.maxPrice}
                  bestUnitPrice={item.bestUnitPrice}
                  bestUnitPriceUnit={item.bestUnitPriceUnit}
                  bestUnitStore={item.bestUnitStore}
                  isOnSale={item.isOnSale}
                  cheapestProductId={item.cheapestProductId}
                  cheapestProductSlug={item.cheapestProductSlug}
                  weight={item.cheapestWeight}
                  weightUnit={item.cheapestWeightUnit}
                  originalPrice={item.originalPrice}
                  salePrice={item.salePrice}
                  dealStore={item.dealStore}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(totalPages, 5) }).map(
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? "bg-teal-600 text-white"
                            : "hover:bg-accent"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
