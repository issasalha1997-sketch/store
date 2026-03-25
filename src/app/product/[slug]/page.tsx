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
import { ShoppingCart, ArrowLeft, Check, TrendingDown, Tag } from "lucide-react";
import { useBasket } from "@/hooks/useBasket";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const getEmoji = (name: string) => {
  if (name.includes("Milk")) return "\uD83E\uDD5B";
  if (name.includes("Butter")) return "\uD83E\uDDC8";
  if (name.includes("Egg")) return "\uD83E\uDD5A";
  if (name.includes("Chicken")) return "\uD83C\uDF57";
  if (name.includes("Beef") || name.includes("Mince")) return "\uD83E\uDD69";
  if (name.includes("Bread") || name.includes("Pan") || name.includes("Sourdough")) return "\uD83C\uDF5E";
  if (name.includes("Banana")) return "\uD83C\uDF4C";
  if (name.includes("Broccoli")) return "\uD83E\uDD66";
  if (name.includes("Potato")) return "\uD83E\uDD54";
  if (name.includes("Tea") || name.includes("Coffee")) return "\u2615";
  if (name.includes("Cheese")) return "\uD83E\uDDC0";
  if (name.includes("Salmon") || name.includes("Fish")) return "\uD83C\uDF1F";
  if (name.includes("Bacon") || name.includes("Sausage")) return "\uD83E\uDD53";
  return "\uD83D\uDED2";
};

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useBasket((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

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
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-72 sm:h-80 rounded-2xl" />
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
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-xl font-bold">Product not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This product may have been removed or the link is incorrect.
        </p>
        <Link href="/search">
          <Button variant="outline" className="mt-4 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </Link>
      </div>
    );
  }

  const prices = (product.prices || []).map(
    (p: Record<string, unknown>) => ({
      store: p.store as { name: string; slug: string; color: string | null },
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      isOnSale: p.isOnSale as boolean,
      unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
      unitPriceUnit: p.unitPriceUnit as string | null,
    })
  );

  const minPrice =
    prices.length > 0
      ? Math.min(...prices.map((p: { price: number }) => p.price))
      : 0;
  const maxPrice =
    prices.length > 0
      ? Math.max(...prices.map((p: { price: number }) => p.price))
      : 0;
  const savings = maxPrice - minPrice;

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
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-6 sm:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap pb-1">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        {product.category && (
          <>
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
            <span className="text-muted-foreground/40">/</span>
          </>
        )}
        <span className="text-foreground font-medium truncate">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
        {/* Left - Product Image */}
        <div>
          <motion.div
            className="flex h-64 sm:h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-7xl sm:text-8xl select-none">
              {getEmoji(product.name)}
            </span>
            {/* Sale badge */}
            {prices.some((p: { isOnSale: boolean }) => p.isOnSale) && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-md px-3 py-1">
                  <Tag className="h-3 w-3 mr-1" />
                  ON SALE
                </Badge>
              </div>
            )}
          </motion.div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Cheapest
                </p>
                <p className="text-lg font-bold text-teal-600 tabular-nums">
                  {formatPrice(minPrice)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Most Expensive
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {formatPrice(maxPrice)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-teal-50">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-teal-600 font-medium">
                  You Save
                </p>
                <p className="text-lg font-bold text-teal-600 tabular-nums">
                  {formatPrice(savings)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right - Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {product.brand && (
                <span className="text-muted-foreground">{product.brand}</span>
              )}
              {product.weight && product.weightUnit && (
                <Badge variant="secondary" className="rounded-full">
                  {product.weight}
                  {product.weightUnit}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Rating */}
          {product.averageRating && (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={product.averageRating} size="sm" />
              <span className="text-sm text-muted-foreground">
                ({product.reviewCount} review
                {product.reviewCount !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          <Separator className="my-5" />

          {/* Price Comparison */}
          <PriceComparison prices={prices} />

          <Separator className="my-5" />

          {/* Add to Basket */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border-2 overflow-hidden">
              <button
                className="px-4 py-2.5 hover:bg-accent transition-colors text-lg font-medium"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <span className="px-4 py-2.5 text-sm font-bold tabular-nums min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                className="px-4 py-2.5 hover:bg-accent transition-colors text-lg font-medium"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <AnimatePresence mode="wait">
              {justAdded ? (
                <motion.div
                  key="added"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex-1"
                >
                  <Button
                    size="lg"
                    className="w-full bg-teal-50 text-teal-600 hover:bg-teal-100 border-2 border-teal-200 rounded-xl"
                    disabled
                  >
                    <Check className="mr-2 h-5 w-5" />
                    Added to Basket!
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="add"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex-1"
                >
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl shadow-md shadow-teal-500/20"
                    onClick={handleAddToBasket}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Basket
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reviews section */}
          <Card className="mt-8 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map(
                    (review: {
                      id: string;
                      rating: number;
                      title: string | null;
                      body: string | null;
                      user: { name: string | null };
                      createdAt: string;
                    }) => (
                      <div
                        key={review.id}
                        className="border-b pb-4 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} size="sm" />
                          {review.title && (
                            <span className="text-sm font-medium">
                              {review.title}
                            </span>
                          )}
                        </div>
                        {review.body && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {review.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          by {review.user?.name || "Anonymous"}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Be the first to review this product!
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
