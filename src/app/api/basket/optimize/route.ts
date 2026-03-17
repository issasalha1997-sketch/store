import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { optimizeBasket } from "@/lib/price-optimizer";

const optimizeRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "At least one item is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = optimizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = parsed.data;
    const productIds = items.map((i) => i.productId);

    // Fetch all products with their latest prices
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        prices: {
          where: { isLatest: true },
          select: {
            price: true,
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // Check for missing products
    const foundIds = new Set(products.map((p) => p.id));
    const missingIds = productIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: "Some products were not found", missingIds },
        { status: 404 }
      );
    }

    // Build input for the optimizer
    const basketInput = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        prices: product.prices.map((p) => ({
          storeId: p.store.id,
          storeName: p.store.name,
          storeSlug: p.store.slug,
          storeColor: p.store.color,
          price: Number(p.price),
        })),
      };
    });

    const result = optimizeBasket(basketInput);

    // Also return all per-item prices for the comparison grid
    const itemPrices = basketInput.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      prices: item.prices.map((p) => ({
        storeId: p.storeId,
        storeName: p.storeName,
        storeSlug: p.storeSlug,
        storeColor: p.storeColor,
        price: p.price,
      })),
    }));

    return NextResponse.json({ ...result, itemPrices });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    console.error("POST /api/basket/optimize error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
