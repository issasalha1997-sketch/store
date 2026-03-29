"use client";

import { useQuery } from "@tanstack/react-query";
import { FamilyCard } from "@/components/product/FamilyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

export default function DealsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["deals", page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("onSaleOnly", "true");
      params.set("sortBy", "price_asc");
      params.set("page", String(page));
      params.set("limit", "24");
      params.set("group", "family");
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  const results = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 page-enter">
      {/* Hero section */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-6 w-6" />
            <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1">
              This Week
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Deals & Offers
          </h1>
          <p className="mt-2 text-white/80 max-w-lg text-sm sm:text-base">
            Find the best sales and discounts across all Irish grocery stores.
            Updated daily with the latest offers.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-sm font-medium">
              <TrendingDown className="h-4 w-4" />
              {total} deal{total !== 1 ? "s" : ""} found
            </div>
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
            Check back soon -- new deals are added regularly
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
            {results.map(
              (item: Record<string, unknown>) => (
                <motion.div
                  key={(item.familySlug as string) || (item.slug as string)}
                  variants={{
                    initial: { opacity: 0, y: 12 },
                    animate: { opacity: 1, y: 0 },
                  }}
                >
                  <FamilyCard
                    familyName={item.familyName as string}
                    slug={item.slug as string}
                    imageUrl={item.imageUrl as string | null}
                    brand={item.brand as string | null}
                    optionCount={item.optionCount as number}
                    storeCount={item.storeCount as number}
                    stores={
                      item.stores as Array<{
                        name: string;
                        slug: string;
                        color: string | null;
                      }>
                    }
                    minPrice={item.minPrice as number}
                    maxPrice={item.maxPrice as number}
                    bestUnitPrice={item.bestUnitPrice as number | null}
                    bestUnitPriceUnit={
                      item.bestUnitPriceUnit as string | null
                    }
                    bestUnitStore={item.bestUnitStore as string | null}
                    isOnSale={item.isOnSale as boolean}
                    cheapestProductId={
                      item.cheapestProductId as string | undefined
                    }
                    cheapestProductSlug={
                      item.cheapestProductSlug as string | undefined
                    }
                    weight={item.cheapestWeight as number | null | undefined}
                    weightUnit={
                      item.cheapestWeightUnit as string | null | undefined
                    }
                  />
                </motion.div>
              )
            )}
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
