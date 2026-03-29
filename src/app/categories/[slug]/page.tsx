"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FamilyCard } from "@/components/product/FamilyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/constants";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const category = CATEGORIES.find((c) => c.slug === slug);

  const { data, isLoading } = useQuery({
    queryKey: ["products", "category", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products?category=${slug}&limit=60&group=family`);
      return res.json();
    },
  });

  const results = data?.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/categories">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All Categories
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-8">
        {category && <span className="text-4xl">{category.icon}</span>}
        <div>
          <h1 className="text-3xl font-bold">
            {category?.name || slug}
          </h1>
          <p className="text-muted-foreground">
            {results.length} product{results.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-3 h-6 w-1/3" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-4">{category?.icon || "🔍"}</p>
          <h3 className="text-lg font-semibold">No products in this category yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon as we add more products
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item: Record<string, unknown>) => (
            <FamilyCard
              key={item.familySlug as string}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
