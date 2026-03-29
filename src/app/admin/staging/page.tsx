"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface StagedBatch {
  id: string;
  storeSlug: string;
  totalProducts: number;
  newProducts: number;
  priceChanges: number;
  unchanged: number;
  status: string;
  createdAt: string;
  appliedAt: string | null;
}

interface StagedProduct {
  id: string;
  rawName: string;
  canonName: string;
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  weight: number | null;
  weightUnit: string | null;
  existingProductId: string | null;
  priceChange: number | null;
  status: string;
}

const storeNames: Record<string, string> = {
  supervalu: "SuperValu",
  dunnes: "Dunnes Stores",
  aldi: "Aldi Ireland",
  tesco: "Tesco Ireland",
  lidl: "Lidl Ireland",
};

const storeColors: Record<string, string> = {
  supervalu: "bg-red-100 text-red-700",
  dunnes: "bg-gray-100 text-gray-700",
  aldi: "bg-blue-100 text-blue-700",
  tesco: "bg-sky-100 text-sky-700",
  lidl: "bg-indigo-100 text-indigo-700",
};

export default function StagingPage() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ["staging-batches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/staging?status=pending");
      return res.json();
    },
  });

  const { data: batchDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["staging-batch", selectedBatch],
    queryFn: async () => {
      const res = await fetch(`/api/admin/staging?batchId=${selectedBatch}`);
      return res.json();
    },
    enabled: !!selectedBatch,
  });

  const approveMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch("/api/admin/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, action: "approve" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staging-batches"] });
      queryClient.invalidateQueries({ queryKey: ["staging-batch"] });
      setSelectedBatch(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await fetch("/api/admin/staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, action: "reject" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staging-batches"] });
      setSelectedBatch(null);
    },
  });

  const batches: StagedBatch[] = batchesData?.batches || [];
  const products: StagedProduct[] = batchDetail?.products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="rounded-lg">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Admin
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Staging Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review scraped data before it goes live. Run{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
              npx tsx scripts/scrape-to-staging.ts
            </code>{" "}
            to create a new batch.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["staging-batches"] })}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Batch list or detail view */}
      {selectedBatch ? (
        // Batch detail view
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBatch(null)}
              className="rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to batches
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-red-600 hover:bg-red-50"
                onClick={() => rejectMutation.mutate(selectedBatch)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Reject All
              </Button>
              <Button
                size="sm"
                className="rounded-lg bg-teal-600 hover:bg-teal-700"
                onClick={() => approveMutation.mutate(selectedBatch)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve & Apply
              </Button>
            </div>
          </div>

          {approveMutation.isSuccess && (
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-4 text-sm text-teal-700">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Batch approved and applied successfully!
              </CardContent>
            </Card>
          )}

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Plus className="h-5 w-5 mx-auto mb-1 text-teal-600" />
                    <p className="text-2xl font-bold">
                      {products.filter((p) => !p.existingProductId).length}
                    </p>
                    <p className="text-xs text-muted-foreground">New Products</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <RefreshCw className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                    <p className="text-2xl font-bold">
                      {products.filter((p) => p.priceChange !== null).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Price Changes</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Package className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-2xl font-bold">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Total Staged</p>
                  </CardContent>
                </Card>
              </div>

              {/* Product list */}
              <div className="space-y-2">
                {products.map((p) => (
                  <Card key={p.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Image */}
                      <div className="h-12 w-12 rounded-lg bg-muted/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.canonName}
                            width={48}
                            height={48}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.canonName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.brand && (
                            <span className="text-xs text-muted-foreground">
                              {p.brand}
                            </span>
                          )}
                          {p.category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {p.category}
                            </Badge>
                          )}
                          {p.weight && p.weightUnit && (
                            <span className="text-xs text-muted-foreground">
                              {p.weight}{p.weightUnit}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums">
                          {formatPrice(Number(p.price))}
                        </p>
                        {p.priceChange !== null && (
                          <div
                            className={`flex items-center gap-0.5 text-xs ${
                              p.priceChange < 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {p.priceChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                            {formatPrice(Math.abs(p.priceChange))}
                          </div>
                        )}
                      </div>
                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {!p.existingProductId ? (
                          <Badge className="bg-teal-100 text-teal-700 border-0 text-[10px]">
                            NEW
                          </Badge>
                        ) : p.priceChange !== null ? (
                          <Badge
                            className={`border-0 text-[10px] ${
                              p.priceChange < 0
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {p.priceChange < 0 ? "CHEAPER" : "PRICE UP"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            UPDATE
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        // Batch list view
        <>
          {loadingBatches ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : batches.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="font-semibold text-lg">No pending batches</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run the staging scraper to create a new batch for review.
                </p>
                <pre className="mt-4 bg-muted/50 rounded-lg p-3 text-xs text-left inline-block">
                  npx tsx scripts/scrape-to-staging.ts
                </pre>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <Card
                  key={batch.id}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedBatch(batch.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`${
                            storeColors[batch.storeSlug] || "bg-gray-100 text-gray-700"
                          } border-0`}
                        >
                          {storeNames[batch.storeSlug] || batch.storeSlug}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {batch.totalProducts} products staged
                          </p>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="text-teal-600 font-medium">
                              {batch.newProducts} new
                            </span>
                            <span className="text-amber-600 font-medium">
                              {batch.priceChanges} price changes
                            </span>
                            <span>{batch.unchanged} unchanged</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className="text-xs rounded-full"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(batch.createdAt).toLocaleDateString("en-IE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
