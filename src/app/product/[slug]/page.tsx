"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { PriceComparison } from "@/components/product/PriceComparison";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ArrowLeft, Check, ImageOff, Clock, ChevronDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useBasket } from "@/hooks/useBasket";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useBasket((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

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
      freshness: p.freshness as "fresh" | "recent" | "stale" | undefined,
      sourceUrl: p.sourceUrl as string | null | undefined,
    })
  );

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

  // Build "Other Sizes" data from familyMembers
  type FamilyMember = {
    id: string;
    name: string;
    slug: string;
    weight: number | null;
    weightUnit: string | null;
    store: string;
    storeSlug: string;
    storeColor: string | null;
    price: number;
    unitPrice: number | null;
    unitPriceUnit: string | null;
  };

  function toGrams(w: number | null, u: string | null): number {
    if (!w || !u) return 0;
    const unit = u.toLowerCase();
    if (unit === "kg") return w * 1000;
    if (unit === "g") return w;
    if (unit === "l" || unit === "ltr" || unit === "litre") return w * 1000;
    if (unit === "ml") return w;
    if (unit === "cl") return w * 10;
    if (unit.includes("pack") || unit.includes("pk")) return w * 10000;
    return w;
  }

  type SizeGroup = { label: string; slug: string; cheapestPrice: number; cheapestStore: string };
  const otherSizes: SizeGroup[] = [];

  if (product.familyMembers && product.familyMembers.length > 1) {
    const others = (product.familyMembers as FamilyMember[]).filter(m => m.slug !== product.slug);
    // Group by slug (each slug = a size variant)
    const bySlug = new Map<string, FamilyMember[]>();
    for (const m of others) {
      const existing = bySlug.get(m.slug) || [];
      existing.push(m);
      bySlug.set(m.slug, existing);
    }

    for (const [memberSlug, members] of bySlug) {
      const cheapest = members.reduce((min, m) => m.price < min.price ? m : min);
      // Build a weight label
      let label: string;
      const m0 = members[0];
      if (m0.weight && m0.weightUnit) {
        const w = m0.weight;
        const u = m0.weightUnit.toLowerCase();
        if (u === "kg" && w < 1) label = `${Math.round(w * 1000)}g`;
        else if (u === "l" && w < 1) label = `${Math.round(w * 1000)}ml`;
        else label = `${w}${u}`;
      } else {
        const wMatch = m0.name.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cl|pk|pack)/i);
        label = wMatch ? `${wMatch[1]}${wMatch[2].toLowerCase()}` : m0.name;
      }

      otherSizes.push({
        label,
        slug: memberSlug,
        cheapestPrice: cheapest.price,
        cheapestStore: cheapest.store,
      });
    }
    // Sort by weight
    otherSizes.sort((a, b) => {
      // Extract a rough numeric for sorting
      const numA = parseFloat(a.label) || 0;
      const numB = parseFloat(b.label) || 0;
      return numA - numB;
    });
  }

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
        <motion.div
          className="flex h-64 sm:h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/60 relative overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {product.imageUrl && !imgError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={320}
              height={320}
              className="object-contain h-full w-auto p-4"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/40">
              <ImageOff className="h-16 w-16" />
              <span className="text-sm mt-2">No image available</span>
            </div>
          )}
          {prices.some((p: { isOnSale: boolean }) => p.isOnSale) && (
            <div className="absolute top-4 left-4">
              <span className="inline-block bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                ON SALE
              </span>
            </div>
          )}
        </motion.div>

        {/* Right - Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* 1. Name / brand / weight */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {product.brand && (
                <span className="text-muted-foreground">{product.brand}</span>
              )}
              {product.weight && product.weightUnit && (
                <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {product.weight}{product.weightUnit}
                </span>
              )}
            </div>
            {product.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <Separator className="my-5" />

          {/* 2. Price Comparison Table -- THE main feature */}
          <PriceComparison prices={prices} productDescription={product.description} />

          {/* Price freshness indicator */}
          {prices.length > 0 && (() => {
            const freshness = product.overallFreshness as string | undefined;
            const latest = prices
              .map((p: { scrapedAt?: string }) => p.scrapedAt ? new Date(p.scrapedAt).getTime() : 0)
              .reduce((a: number, b: number) => Math.max(a, b), 0);
            const diff = latest ? Date.now() - latest : 0;
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            const timeText = days > 0
              ? `${days} day${days > 1 ? "s" : ""} ago`
              : hours > 0
                ? `${hours} hour${hours > 1 ? "s" : ""} ago`
                : "just now";

            if (freshness === "stale") {
              return (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    Prices may be outdated — last checked {timeText}
                  </span>
                </div>
              );
            }
            return (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Prices updated {timeText}</span>
              </div>
            );
          })()}

          {/* Price History / Trend */}
          {product.priceTrend && (
            <div className="mt-3 mb-1">
              <PriceHistorySection
                trend={product.priceTrend}
                history={product.priceHistory}
              />
            </div>
          )}

          <Separator className="my-5" />

          {/* 3. Add to Basket -- prominent */}
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

          {/* 4. Other Sizes -- simplified inline list */}
          {otherSizes.length > 0 && (
            <div className="mt-6 bg-neutral-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-neutral-700 mb-2">Also available</p>
              <div className="flex flex-wrap gap-2">
                {otherSizes.map((size) => (
                  <Link
                    key={size.slug}
                    href={`/product/${size.slug}`}
                    className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 hover:border-teal-300 hover:bg-teal-50 rounded-lg px-3 py-1.5 transition-colors text-sm"
                  >
                    <span className="font-semibold text-neutral-800">{size.label}</span>
                    <span className="text-neutral-400">from</span>
                    <span className="font-bold text-teal-600 tabular-nums">{formatPrice(size.cheapestPrice)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 5. Reviews -- collapsible */}
          {(product.reviews && product.reviews.length > 0 || product.averageRating) && (
            <div className="mt-6 border border-neutral-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setReviewsOpen(!reviewsOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-700">Reviews</span>
                  {product.averageRating && (
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={product.averageRating} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        ({product.reviewCount || 0})
                      </span>
                    </div>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-400 transition-transform ${reviewsOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {reviewsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-neutral-100 pt-3">
                      {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.map(
                          (review: {
                            id: string;
                            rating: number;
                            title: string | null;
                            body: string | null;
                            user: { name: string | null };
                            createdAt: string;
                          }) => (
                            <div key={review.id} className="border-b border-neutral-50 pb-3 last:border-0">
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
                          )
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No reviews yet. Be the first to review this product!
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Similar Products -- simplified to a compact row */}
      {product.similarProducts && product.similarProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-3">Similar Products</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {product.similarProducts.slice(0, 6).map(
              (sp: {
                id: string;
                name: string;
                slug: string;
                imageUrl: string | null;
                minPrice: number | null;
              }) => (
                <Link
                  key={sp.id}
                  href={`/product/${sp.slug}`}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="h-20 flex items-center justify-center rounded-lg bg-muted/30 mb-1.5 overflow-hidden">
                    {sp.imageUrl ? (
                      <Image
                        src={sp.imageUrl}
                        alt={sp.name}
                        width={80}
                        height={80}
                        className="object-contain h-full w-auto p-1 group-hover:scale-110 transition-transform"
                        unoptimized
                      />
                    ) : (
                      <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-2 group-hover:text-teal-600 transition-colors">
                    {sp.name}
                  </p>
                  {sp.minPrice && (
                    <p className="text-xs font-bold text-teal-600 mt-0.5 tabular-nums">
                      from {formatPrice(sp.minPrice)}
                    </p>
                  )}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Price History section with a sparkline SVG and text summary.
 */
function PriceHistorySection({
  trend,
  history,
}: {
  trend: {
    direction: "down" | "up" | "stable";
    oldPrice: number | null;
    newPrice: number | null;
    changePercent: number | null;
    dataPoints: number;
  };
  history: Array<{
    price: number;
    scrapedAt: string;
    store: { name: string; slug: string; color: string | null };
  }>;
}) {
  // Build sparkline from history data
  const pricePoints = history.map((h) => Number(h.price));

  const TrendIcon =
    trend.direction === "down"
      ? TrendingDown
      : trend.direction === "up"
        ? TrendingUp
        : Minus;

  const trendColor =
    trend.direction === "down"
      ? "text-emerald-600"
      : trend.direction === "up"
        ? "text-red-500"
        : "text-neutral-500";

  const trendBg =
    trend.direction === "down"
      ? "bg-emerald-50"
      : trend.direction === "up"
        ? "bg-red-50"
        : "bg-neutral-50";

  // Build inline SVG sparkline
  let sparklineSvg: React.ReactNode = null;
  if (pricePoints.length >= 3) {
    const width = 200;
    const height = 40;
    const padding = 2;
    const min = Math.min(...pricePoints);
    const max = Math.max(...pricePoints);
    const range = max - min || 1;
    const points = pricePoints.map((p, i) => {
      const x = padding + (i / (pricePoints.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (p - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const strokeColor =
      trend.direction === "down" ? "#059669" : trend.direction === "up" ? "#ef4444" : "#737373";

    sparklineSvg = (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="flex-shrink-0"
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot on last point */}
        {(() => {
          const lastPoint = points[points.length - 1].split(",");
          return (
            <circle
              cx={lastPoint[0]}
              cy={lastPoint[1]}
              r="3"
              fill={strokeColor}
            />
          );
        })()}
      </svg>
    );
  }

  return (
    <div className={`rounded-xl px-3 py-2.5 ${trendBg}`}>
      <div className="flex items-center gap-2 mb-1">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className="text-sm font-semibold text-neutral-800">
          Price Trend (30 days)
        </span>
      </div>
      <div className="flex items-center gap-3">
        {sparklineSvg && <div className="flex-shrink-0">{sparklineSvg}</div>}
        <p className={`text-sm ${trendColor}`}>
          {trend.direction === "stable" && trend.newPrice != null && (
            <>Price stable at <span className="font-bold">{formatPrice(trend.newPrice)}</span></>
          )}
          {trend.direction === "down" && trend.oldPrice != null && trend.newPrice != null && (
            <>
              <span className="font-bold">{formatPrice(trend.oldPrice)}</span>
              {" "}&rarr;{" "}
              <span className="font-bold">{formatPrice(trend.newPrice)}</span>
              {trend.changePercent != null && (
                <span className="ml-1 text-xs">({trend.changePercent}%)</span>
              )}
            </>
          )}
          {trend.direction === "up" && trend.oldPrice != null && trend.newPrice != null && (
            <>
              <span className="font-bold">{formatPrice(trend.oldPrice)}</span>
              {" "}&rarr;{" "}
              <span className="font-bold">{formatPrice(trend.newPrice)}</span>
              {trend.changePercent != null && (
                <span className="ml-1 text-xs">(+{trend.changePercent}%)</span>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
