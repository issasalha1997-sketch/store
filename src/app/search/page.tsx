"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { FamilyCard } from "@/components/product/FamilyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES, ACTIVE_STORES } from "@/lib/constants";
import Link from "next/link";
import { Suspense, useState, useCallback } from "react";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const sortBy = searchParams.get("sortBy") || "relevance";
  const page = Number(searchParams.get("page") || "1");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router]
  );

  const toggleStore = (slug: string) => {
    setSelectedStores((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    updateSearchParams({ page: null });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["products", q, categoryParam, sortBy, page, selectedStores],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (categoryParam) params.set("category", categoryParam);
      params.set("sortBy", sortBy);
      params.set("page", String(page));
      params.set("limit", "24");
      params.set("group", "family");
      if (selectedStores.length > 0) {
        params.set("store", selectedStores.join(","));
      }
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const results = data?.data || [];
  const isGrouped = data?.grouped === true;
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 page-enter">
      {/* Search bar */}
      <div className="mx-auto max-w-2xl mb-8">
        <SearchBar />
      </div>

      {/* Results header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {q
              ? <>Results for &ldquo;{q}&rdquo;</>
              : categoryParam
                ? `Category: ${categoryParam}`
                : "All Products"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} result{total !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden flex-1 rounded-lg"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filters
            {categoryParam && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                1
              </span>
            )}
          </Button>
          <Select
            value={sortBy}
            onChange={(e) => updateSearchParams({ sortBy: e.target.value === "relevance" ? null : e.target.value, page: null })}
            className="text-sm"
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </Select>
        </div>
      </div>

      {/* Store filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mr-1">
          Stores:
        </span>
        {ACTIVE_STORES.map((store) => {
          const isActive = selectedStores.includes(store.slug);
          return (
            <button
              key={store.slug}
              onClick={() => toggleStore(store.slug)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${
                isActive
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
              }`}
              style={
                isActive
                  ? { backgroundColor: store.color }
                  : undefined
              }
            >
              <div
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  isActive ? "bg-white/40" : ""
                }`}
                style={!isActive ? { backgroundColor: store.color } : undefined}
              />
              {store.name}
            </button>
          );
        })}
        {selectedStores.length > 0 && (
          <button
            onClick={() => setSelectedStores([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear stores
          </button>
        )}
      </div>

      <div className="flex gap-8">
        {/* Mobile filter overlay */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 sm:hidden"
              onClick={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar filters */}
        <aside
          className={`
            ${showFilters ? "translate-x-0" : "-translate-x-full"}
            sm:translate-x-0
            fixed sm:relative
            inset-y-0 left-0 z-50 sm:z-auto
            w-72 sm:w-56
            shrink-0
            bg-background sm:bg-transparent
            p-6 sm:p-0
            shadow-xl sm:shadow-none
            transition-transform duration-300 sm:duration-0
            sm:block
            overflow-y-auto
          `}
        >
          <div className="sticky top-20">
            {/* Mobile close button */}
            <div className="flex items-center justify-between mb-4 sm:hidden">
              <h3 className="text-base font-bold">Filters</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <h3 className="mb-3 text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide hidden sm:block">
              Categories
            </h3>
            <div className="space-y-0.5">
              <Link
                href="/search"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  !categoryParam
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "hover:bg-accent"
                }`}
                onClick={() => setShowFilters(false)}
              >
                All
              </Link>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/search?${q ? `q=${q}&` : ""}category=${cat.slug}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    categoryParam === cat.slug
                      ? "bg-teal-50 text-teal-700 font-medium"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setShowFilters(false)}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1 min-w-0">
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
              <p className="text-5xl mb-4">🔍</p>
              <h3 className="text-lg font-bold">No products found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or browse by category
              </p>
              <Link href="/categories">
                <Button variant="outline" className="mt-4 rounded-full">
                  Browse Categories
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
                {results.map((item: Record<string, unknown>) => (
                  <motion.div
                    key={(item.familySlug as string) || (item.id as string)}
                    variants={{
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                    }}
                  >
                    {isGrouped ? (
                      <FamilyCard
                        familyName={item.familyName as string}
                        slug={item.slug as string}
                        imageUrl={item.imageUrl as string | null}
                        brand={item.brand as string | null}
                        optionCount={item.optionCount as number}
                        storeCount={item.storeCount as number}
                        stores={item.stores as Array<{ name: string; slug: string; color: string | null }>}
                        minPrice={item.minPrice as number}
                        maxPrice={item.maxPrice as number}
                        bestUnitPrice={item.bestUnitPrice as number | null}
                        bestUnitPriceUnit={item.bestUnitPriceUnit as string | null}
                        bestUnitStore={item.bestUnitStore as string | null}
                        isOnSale={item.isOnSale as boolean}
                        cheapestProductId={item.cheapestProductId as string | undefined}
                        cheapestProductSlug={item.cheapestProductSlug as string | undefined}
                        weight={item.cheapestWeight as number | null | undefined}
                        weightUnit={item.cheapestWeightUnit as string | null | undefined}
                      />
                    ) : (
                      <ProductCard
                        id={item.id as string}
                        name={item.name as string}
                        slug={item.slug as string}
                        brand={item.brand as string | null}
                        imageUrl={item.imageUrl as string | null}
                        weight={item.weight as number | null}
                        weightUnit={item.weightUnit as string | null}
                        minPrice={item.minPrice as number}
                        maxPrice={item.maxPrice as number}
                        cheapestStore={
                          item.cheapestStore
                            ? (item.cheapestStore as { store: { name: string; slug: string } }).store
                            : null
                        }
                        isOnSale={!!(item.cheapestStore as { isOnSale?: boolean })?.isOnSale}
                        priceCount={item.priceCount as number}
                        category={null}
                      />
                    )}
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
                    onClick={() => updateSearchParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {(() => {
                      const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
                      const SIBLING_COUNT = 2;

                      // Always include first page
                      pages.push(1);

                      const rangeStart = Math.max(2, page - SIBLING_COUNT);
                      const rangeEnd = Math.min(totalPages - 1, page + SIBLING_COUNT);

                      // Add start ellipsis if there's a gap after page 1
                      if (rangeStart > 2) {
                        pages.push("ellipsis-start");
                      }

                      // Add pages in the window around current page
                      for (let i = rangeStart; i <= rangeEnd; i++) {
                        pages.push(i);
                      }

                      // Add end ellipsis if there's a gap before last page
                      if (rangeEnd < totalPages - 1) {
                        pages.push("ellipsis-end");
                      }

                      // Always include last page (if more than 1 page)
                      if (totalPages > 1) {
                        pages.push(totalPages);
                      }

                      return pages.map((item) => {
                        if (item === "ellipsis-start" || item === "ellipsis-end") {
                          return (
                            <span
                              key={item}
                              className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }
                        const pageNum = item;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => updateSearchParams({ page: pageNum <= 1 ? null : String(pageNum) })}
                            className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? "bg-teal-600 text-white"
                                : "hover:bg-accent"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => updateSearchParams({ page: String(page + 1) })}
                    className="rounded-lg"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl mb-8">
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-3 h-6 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
