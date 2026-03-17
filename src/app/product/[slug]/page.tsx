"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PriceComparison } from "@/components/product/PriceComparison";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useBasket } from "@/hooks/useBasket";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useBasket((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">404</p>
        <h2 className="text-xl font-semibold">Product not found</h2>
        <Link href="/search">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </Link>
      </div>
    );
  }

  const prices = (product.prices || []).map((p: Record<string, unknown>) => ({
    store: p.store as { name: string; slug: string; color: string | null },
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    isOnSale: p.isOnSale as boolean,
    unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
    unitPriceUnit: p.unitPriceUnit as string | null,
  }));

  const minPrice = prices.length > 0 ? Math.min(...prices.map((p: { price: number }) => p.price)) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices.map((p: { price: number }) => p.price)) : 0;

  const handleAddToBasket = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        brand: product.brand,
        imageUrl: product.imageUrl,
        weight: product.weight,
        weightUnit: product.weightUnit,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left - Product Image */}
        <div>
          <div className="flex h-80 items-center justify-center rounded-2xl bg-muted text-8xl">
            {product.name.includes("Milk") ? "\uD83E\uDD5B" :
             product.name.includes("Butter") ? "\uD83E\uDDC8" :
             product.name.includes("Egg") ? "\uD83E\uDD5A" :
             product.name.includes("Chicken") ? "\uD83C\uDF57" :
             product.name.includes("Beef") || product.name.includes("Mince") ? "\uD83E\uDD69" :
             product.name.includes("Bread") || product.name.includes("Pan") ? "\uD83C\uDF5E" :
             product.name.includes("Banana") ? "\uD83C\uDF4C" :
             product.name.includes("Broccoli") ? "\uD83E\uDD66" :
             product.name.includes("Tea") ? "\u2615" :
             "\uD83D\uDED2"}
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Cheapest</p>
                <p className="text-lg font-bold text-green-600">{formatPrice(minPrice)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Most Expensive</p>
                <p className="text-lg font-bold">{formatPrice(maxPrice)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">You Save</p>
                <p className="text-lg font-bold text-green-600">
                  {formatPrice(maxPrice - minPrice)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right - Product Info */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {product.brand && (
                <p className="mt-1 text-muted-foreground">{product.brand}</p>
              )}
              {product.weight && product.weightUnit && (
                <Badge variant="secondary" className="mt-2">
                  {product.weight}{product.weightUnit}
                </Badge>
              )}
            </div>
          </div>

          {/* Rating */}
          {product.averageRating && (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={product.averageRating} size="sm" />
              <span className="text-sm text-muted-foreground">
                ({product.reviewCount} review{product.reviewCount !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          <Separator className="my-6" />

          {/* Price Comparison */}
          <PriceComparison prices={prices} />

          <Separator className="my-6" />

          {/* Add to Basket */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border">
              <button
                className="px-3 py-2 hover:bg-accent transition-colors"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <span className="px-4 py-2 text-sm font-medium">{quantity}</span>
              <button
                className="px-3 py-2 hover:bg-accent transition-colors"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleAddToBasket}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Basket
            </Button>
          </div>

          {/* Reviews section placeholder */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((review: { id: string; rating: number; title: string | null; body: string | null; user: { name: string | null }; createdAt: string }) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size="sm" />
                        {review.title && (
                          <span className="text-sm font-medium">{review.title}</span>
                        )}
                      </div>
                      {review.body && (
                        <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        by {review.user?.name || "Anonymous"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first to review this product!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
