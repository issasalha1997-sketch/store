import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";

const BASE_URL = "https://store-alpha-nine-44.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/deals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/basket`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/trip`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Product pages: one URL per unique familySlug (using the cheapest product's slug)
  // We group by familySlug, pick the product with the lowest current price in each family
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.$queryRaw<
      Array<{ slug: string; updatedAt: Date }>
    >`
      SELECT DISTINCT ON (p."familySlug")
        p.slug,
        p."updatedAt"
      FROM "Product" p
      INNER JOIN "Price" pr ON pr."productId" = p.id AND pr."isLatest" = true
      WHERE p."isActive" = true
        AND p."familySlug" IS NOT NULL
      ORDER BY p."familySlug", pr.price ASC
      LIMIT 5000
    `;

    productPages = products.map((p) => ({
      url: `${BASE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("Sitemap: failed to fetch product pages:", error);
    // Return sitemap without product pages if DB query fails
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
