"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/constants";
import Link from "next/link";
import { Suspense, useState } from "react";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["products", q, categoryParam, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (categoryParam) params.set("category", categoryParam);
      params.set("sortBy", sortBy);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const products = data?.data || [];
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
            {total} product{total !== 1 ? "s" : ""} found
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
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                1
              </span>
            )}
          </Button>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm"
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </Select>
        </div>
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
                    ? "bg-green-50 text-green-700 font-medium"
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
                      ? "bg-green-50 text-green-700 font-medium"
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
          ) : products.length === 0 ? (
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
                {products.map((product: Record<string, unknown>) => (
                  <motion.div
                    key={product.id as string}
                    variants={{
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                    }}
                  >
                    <ProductCard
                      id={product.id as string}
                      name={product.name as string}
                      slug={product.slug as string}
                      brand={product.brand as string | null}
                      imageUrl={product.imageUrl as string | null}
                      weight={product.weight as number | null}
                      weightUnit={product.weightUnit as string | null}
                      minPrice={product.minPrice as number}
                      maxPrice={product.maxPrice as number}
                      cheapestStore={
                        product.cheapestStore
                          ? (
                              product.cheapestStore as {
                                store: { name: string; slug: string };
                              }
                            ).store
                          : null
                      }
                      isOnSale={
                        !!(product.cheapestStore as { isOnSale?: boolean })
                          ?.isOnSale
                      }
                      priceCount={product.priceCount as number}
                      category={null}
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
                    <ChevronLeft className="h-4 w-4 mr-1" />
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
                                ? "bg-green-600 text-white"
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
