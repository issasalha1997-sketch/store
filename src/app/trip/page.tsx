"use client";

import { useBasket } from "@/hooks/useBasket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StoreLogo } from "@/components/shared/StoreLogo";
import { formatPrice } from "@/lib/utils";
import {
  MapPin,
  Navigation,
  Clock,
  Fuel,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Car,
  Bus,
  Bike,
  Footprints,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { OptimizationResult } from "@/types";
import {
  FUEL_PRICE_PER_LITRE,
  FUEL_CONSUMPTION_PER_100KM,
  DEFAULT_HOURLY_RATE,
  WORTH_IT_THRESHOLD,
} from "@/lib/constants";

type TransportMode = "driving" | "transit" | "bicycling" | "walking";

export default function TripPage() {
  const { items } = useBasket();
  const [transportMode, setTransportMode] = useState<TransportMode>("driving");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Default to Dublin city center
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 53.3498, lng: -6.2603 })
      );
    } else {
      setUserLocation({ lat: 53.3498, lng: -6.2603 });
    }
  }, []);

  // Get optimization results
  const { data: optimization } = useQuery({
    queryKey: ["basket-optimize", items.map((i) => `${i.productId}:${i.quantity}`).join(",")],
    queryFn: async () => {
      if (items.length === 0) return null;
      const res = await fetch("/api/basket/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) return null;
      return res.json() as Promise<OptimizationResult>;
    },
    enabled: items.length > 0,
  });

  // Get store locations
  const { data: locations } = useQuery({
    queryKey: ["store-locations", userLocation],
    queryFn: async () => {
      if (!userLocation) return [];
      const res = await fetch(
        `/api/stores/locations?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10`
      );
      return res.json();
    },
    enabled: !!userLocation,
  });

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <MapPin className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h1 className="mt-4 text-2xl font-bold">No items to plan a trip for</h1>
        <p className="mt-2 text-muted-foreground">
          Add items to your basket first, then come back to plan your route
        </p>
        <Link href="/search">
          <Button className="mt-6 bg-green-600 hover:bg-green-700">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate trip metrics
  const storeCount = optimization?.multiStoreBest.stores.length || 1;
  const estimatedDistance = storeCount * 3.5; // rough estimate: 3.5km between stores in Dublin
  const estimatedDuration =
    transportMode === "driving" ? storeCount * 12 :
    transportMode === "transit" ? storeCount * 25 :
    transportMode === "bicycling" ? storeCount * 18 :
    storeCount * 35; // walking

  const fuelCost =
    transportMode === "driving"
      ? (estimatedDistance / 100) * FUEL_CONSUMPTION_PER_100KM * FUEL_PRICE_PER_LITRE
      : transportMode === "transit"
      ? storeCount * 2.0 // Dublin Bus fare estimate
      : 0;

  const timeCost = (estimatedDuration / 60) * DEFAULT_HOURLY_RATE;
  const savings = optimization?.savings || 0;
  const netBenefit = savings - fuelCost - timeCost;
  const verdict = netBenefit > WORTH_IT_THRESHOLD ? "WORTH_IT" : netBenefit > 0 ? "MARGINAL" : "NOT_WORTH_IT";

  // Build Google Maps directions URL
  const buildDirectionsUrl = () => {
    if (!userLocation || !optimization) return "#";
    const storeNames = optimization.multiStoreBest.stores.map(
      (s) => `${s.store.name}+Dublin`
    );
    const waypoints = storeNames.join("/");
    const travelMode =
      transportMode === "driving" ? "driving" :
      transportMode === "transit" ? "transit" :
      transportMode === "bicycling" ? "bicycling" :
      "walking";
    return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${waypoints}/${userLocation.lat},${userLocation.lng}/@${userLocation.lat},${userLocation.lng},13z/data=!4m2!4m1!3e${travelMode === "driving" ? "0" : travelMode === "transit" ? "3" : travelMode === "bicycling" ? "1" : "2"}`;
  };

  const transportModes: { mode: TransportMode; icon: typeof Car; label: string }[] = [
    { mode: "driving", icon: Car, label: "Drive" },
    { mode: "transit", icon: Bus, label: "Bus" },
    { mode: "bicycling", icon: Bike, label: "Cycle" },
    { mode: "walking", icon: Footprints, label: "Walk" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Trip Planner</h1>
      <p className="text-muted-foreground mb-8">
        Your optimized shopping route across Dublin
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left - Map and Route */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transport mode toggle */}
          <div className="flex gap-2">
            {transportModes.map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={transportMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setTransportMode(mode)}
                className={transportMode === mode ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Map placeholder */}
          <Card>
            <CardContent className="p-0">
              <div className="flex h-80 items-center justify-center rounded-xl bg-muted">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Map view requires Google Maps API key
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env
                  </p>
                  <a
                    href={buildDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Open in Google Maps
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itinerary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Your Itinerary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Start: Home */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    H
                  </div>
                  <div>
                    <p className="font-medium">Your Location</p>
                    <p className="text-xs text-muted-foreground">Start here</p>
                  </div>
                </div>

                {optimization?.multiStoreBest.stores.map((storeGroup, index) => (
                  <div key={storeGroup.store.id}>
                    <div className="ml-4 border-l-2 border-dashed border-muted-foreground/20 h-6" />
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StoreLogo
                            slug={storeGroup.store.slug}
                            name={storeGroup.store.name}
                            size="sm"
                          />
                          <p className="font-medium">{storeGroup.store.name}</p>
                          <span className="text-sm text-green-600 font-semibold">
                            {formatPrice(storeGroup.subtotal)}
                          </span>
                        </div>
                        <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          {storeGroup.items.map((item) => (
                            <li key={item.productId}>
                              {item.productName} x{item.quantity} — {formatPrice(item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}

                {/* End: Home */}
                <div className="ml-4 border-l-2 border-dashed border-muted-foreground/20 h-6" />
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                    H
                  </div>
                  <div>
                    <p className="font-medium">Back Home</p>
                    <p className="text-xs text-muted-foreground">End of trip</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Trip Summary */}
        <div className="space-y-4">
          {/* Worth It Verdict */}
          <Card
            className={
              verdict === "WORTH_IT"
                ? "border-green-200 bg-green-50"
                : verdict === "MARGINAL"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
            }
          >
            <CardContent className="p-6 text-center">
              {verdict === "WORTH_IT" ? (
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              ) : verdict === "MARGINAL" ? (
                <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
              ) : (
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
              )}
              <h3 className="mt-3 text-xl font-bold">
                {verdict === "WORTH_IT"
                  ? "Worth It!"
                  : verdict === "MARGINAL"
                  ? "Marginal"
                  : "Not Worth It"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {verdict === "WORTH_IT"
                  ? "Splitting across stores saves you money even after travel costs."
                  : verdict === "MARGINAL"
                  ? "Savings are close to travel costs. Consider convenience."
                  : "Travel costs outweigh savings. Buy from one store instead."}
              </p>
            </CardContent>
          </Card>

          {/* Trip Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Stores to visit
                </span>
                <span className="font-semibold">{storeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  Est. distance
                </span>
                <span className="font-semibold">{estimatedDistance.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Est. time
                </span>
                <span className="font-semibold">{estimatedDuration} min</span>
              </div>
              {fuelCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Fuel className="h-4 w-4" />
                    {transportMode === "transit" ? "Bus fare" : "Fuel cost"}
                  </span>
                  <span className="font-semibold">{formatPrice(fuelCost)}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  Grocery savings
                </span>
                <span className="font-semibold text-green-600">
                  {formatPrice(savings)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net benefit</span>
                <Badge
                  variant={netBenefit > 0 ? "success" : "destructive"}
                  className="text-sm"
                >
                  {netBenefit >= 0 ? "+" : ""}{formatPrice(netBenefit)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Get Directions */}
          <a
            href={buildDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
              <ExternalLink className="mr-2 h-5 w-5" />
              Get Directions in Google Maps
            </Button>
          </a>

          {/* Back to basket */}
          <Link href="/basket">
            <Button variant="outline" className="w-full" size="lg">
              Back to Basket
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
