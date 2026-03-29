import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const locationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(500).default(10),
  storeId: z.string().optional(),
});

/**
 * Haversine formula to calculate distance between two coordinates in km.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = locationQuerySchema.safeParse({
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      radius: searchParams.get("radius") ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { lat, lng, radius, storeId } = parsed.data;

    // Fetch locations with optional store filter
    // Use a bounding box to narrow candidates before exact Haversine calculation
    const latDelta = radius / 111; // ~111 km per degree latitude
    const lngDelta = radius / (111 * Math.cos(toRad(lat)));

    const where: {
      latitude: { gte: number; lte: number };
      longitude: { gte: number; lte: number };
      storeId?: string;
    } = {
      latitude: { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const locations = await prisma.storeLocation.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            color: true,
            websiteUrl: true,
          },
        },
      },
    });

    // Calculate exact distances and filter by radius
    const results = locations
      .map((location) => {
        const distance = haversineDistance(
          lat,
          lng,
          location.latitude,
          location.longitude
        );
        return {
          id: location.id,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          openingHours: location.openingHours,
          phone: location.phone,
          store: location.store,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places (km)
        };
      })
      .filter((loc) => loc.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("GET /api/stores/locations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
