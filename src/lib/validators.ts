import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  store: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  onSaleOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "name", "relevance", "savings_desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

export const basketItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const tripRequestSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    })
  ),
  homeLat: z.number().min(-90).max(90),
  homeLng: z.number().min(-180).max(180),
  transportMode: z.enum(["driving", "transit", "bicycling", "walking"]).default("driving"),
});
