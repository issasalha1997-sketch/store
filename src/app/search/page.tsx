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
import { SlidersHorizontal } from "lucide-react";

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
    <div className="container mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="mx-auto max-w-2xl mb-8">
        <SearchBar />
      </div>

      {/* Results header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {q ? `Results for "${q}"` : categoryParam ? `Category: ${categoryParam}` : "All Products"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className={`w-56 shrink-0 ${showFilters ? "block" : "hidden"} sm:block`}>
          <div className="sticky top-20">
            <h3 className="mb-3 text-sm font-semibold">Categories</h3>
            <div className="space-y-1">
              <Link
                href="/search"
                className={`block rounded-md px-3 py-1.5 text-sm ${
                  !categoryParam ? "bg-green-100 text-green-800 font-medium" : "hover:bg-accent"
                }`}
              >
                All
              </Link>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/search?${q ? `q=${q}&` : ""}category=${cat.slug}`}
                  className={`block rounded-md px-3 py-1.5 text-sm ${
                    categoryParam === cat.slug
                      ? "bg-green-100 text-green-800 font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  {cat.icon} {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                  <Skeleton className="mt-3 h-6 w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or browse by category
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product: Record<string, unknown>) => (
                  <ProductCard
                    key={product.id as string}
                    id={product.id as string}
                    name={product.name as string}
                    slug={product.slug as string}
                    brand={product.brand as string | null}
                    imageUrl={product.imageUrl as string | null}
                    weight={product.weight as number | null}
                    weightUnit={product.weightUnit as string | null}
                    minPrice={product.minPrice as number}
                    maxPrice={product.maxPrice as number}
                    cheapestStore={product.cheapestStore as { name: string; slug: string } | null}
                    isOnSale={product.isOnSale as boolean}
                    category={null}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
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
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
