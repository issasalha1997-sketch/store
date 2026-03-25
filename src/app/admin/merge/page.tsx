"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Merge,
  Trash2,
  Check,
  ArrowRight,
  AlertTriangle,
  Package,
  X,
} from "lucide-react";
import Link from "next/link";

interface ProductWithPrices {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  weight: number | null;
  weightUnit: string | null;
  imageUrl: string | null;
  category: string | null;
  storeCount: number;
  prices: Array<{
    store: string;
    storeSlug: string;
    storeColor: string | null;
    price: number;
  }>;
}

export default function MergePage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<ProductWithPrices | null>(null);
  const [source, setSource] = useState<ProductWithPrices | null>(null);
  const [merging, setMerging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const searchProducts = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/products?q=${encodeURIComponent(search)}&limit=100`
      );
      const data = await res.json();
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleMerge = async () => {
    if (!target || !source) return;
    setMerging(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.id, sourceId: source.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `Merged "${source.name}" into "${target.name}" — ${data.pricesMoved} prices moved`,
        });
        setSource(null);
        // Remove the merged product from results
        setProducts((prev) => prev.filter((p) => p.id !== source.id));
        // Refresh target
        const refreshed = await fetch(`/api/admin/products?q=${encodeURIComponent(target.name)}&limit=5`);
        const refreshData = await refreshed.json();
        const updatedTarget = refreshData.data?.find((p: ProductWithPrices) => p.id === target.id);
        if (updatedTarget) {
          setTarget(updatedTarget);
          setProducts((prev) =>
            prev.map((p) => (p.id === updatedTarget.id ? updatedTarget : p))
          );
        }
      } else {
        setMessage({ type: "error", text: data.error || "Merge failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setMerging(false);
  };

  const storeColorClass = (slug: string) => {
    switch (slug) {
      case "tesco": return "bg-blue-100 text-blue-800";
      case "dunnes": return "bg-gray-100 text-gray-800";
      case "lidl": return "bg-blue-50 text-blue-700";
      case "aldi": return "bg-indigo-100 text-indigo-800";
      case "supervalu": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Merge className="h-6 w-6" />
            Merge Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search for products, select two to merge them into one
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm">Back to Admin</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search products (e.g. milk, butter, chicken)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchProducts()}
          className="flex-1"
        />
        <Button onClick={searchProducts} disabled={loading}>
          <Search className="h-4 w-4 mr-1.5" />
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-teal-50 text-teal-800 border border-teal-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Merge preview */}
      {(target || source) && (
        <Card className="mb-6 border-teal-200 bg-teal-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Merge className="h-4 w-4" />
              Merge Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Target */}
              <div className="flex-1">
                {target ? (
                  <div className="rounded-lg border-2 border-teal-500 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-teal-700 uppercase">Keep (Target)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setTarget(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-sm">{target.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {target.prices.map((p) => (
                        <Badge
                          key={p.storeSlug}
                          variant="outline"
                          className={`text-[10px] ${storeColorClass(p.storeSlug)}`}
                        >
                          {p.store}: €{p.price.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-3 text-center text-sm text-gray-400">
                    Click a product to set as target (keep)
                  </div>
                )}
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />

              {/* Source */}
              <div className="flex-1">
                {source ? (
                  <div className="rounded-lg border-2 border-orange-400 bg-white p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-orange-600 uppercase">Merge In (Delete)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setSource(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-sm">{source.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {source.prices.map((p) => (
                        <Badge
                          key={p.storeSlug}
                          variant="outline"
                          className={`text-[10px] ${storeColorClass(p.storeSlug)}`}
                        >
                          {p.store}: €{p.price.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-3 text-center text-sm text-gray-400">
                    Click another product to merge into target
                  </div>
                )}
              </div>
            </div>

            {/* Merge button */}
            {target && source && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={handleMerge}
                  disabled={merging}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Merge className="h-4 w-4 mr-1.5" />
                  {merging ? "Merging..." : `Merge "${source.name}" into "${target.name}"`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setTarget(null); setSource(null); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      <div className="space-y-2">
        {products.length > 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            {products.length} products found. Click to select for merging.
          </p>
        )}
        {products.map((product) => {
          const isTarget = target?.id === product.id;
          const isSource = source?.id === product.id;
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:border-teal-300 ${
                isTarget
                  ? "border-teal-500 bg-teal-50"
                  : isSource
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white"
              }`}
              onClick={() => {
                if (isTarget) {
                  setTarget(null);
                } else if (isSource) {
                  setSource(null);
                } else if (!target) {
                  setTarget(product);
                } else if (!source) {
                  setSource(product);
                } else {
                  // Both set — replace source
                  setSource(product);
                }
              }}
            >
              {/* Icon/image */}
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {product.brand && (
                    <span className="text-xs text-muted-foreground">
                      {product.brand}
                    </span>
                  )}
                  {product.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Store prices */}
              <div className="flex gap-1 flex-wrap justify-end">
                {product.prices.map((p) => (
                  <Badge
                    key={p.storeSlug}
                    variant="outline"
                    className={`text-[10px] ${storeColorClass(p.storeSlug)}`}
                  >
                    {p.store.replace(" Ireland", "").replace(" Stores", "")}: €{p.price.toFixed(2)}
                  </Badge>
                ))}
                {product.storeCount === 0 && (
                  <Badge variant="outline" className="text-[10px] text-gray-400">
                    No prices
                  </Badge>
                )}
              </div>

              {/* Selection indicator */}
              <div className="shrink-0">
                {isTarget && (
                  <Badge className="bg-teal-600 text-white text-[10px]">TARGET</Badge>
                )}
                {isSource && (
                  <Badge className="bg-orange-500 text-white text-[10px]">MERGE</Badge>
                )}
              </div>
            </div>
          );
        })}

        {products.length === 0 && search && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="mx-auto h-8 w-8 mb-2 opacity-30" />
            <p>No products found for &ldquo;{search}&rdquo;</p>
          </div>
        )}

        {!search && products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="mx-auto h-8 w-8 mb-2 opacity-30" />
            <p>Search for products to start merging</p>
            <p className="text-xs mt-1">
              Try searching &ldquo;milk&rdquo;, &ldquo;butter&rdquo;, or &ldquo;yoghurt&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
