import type { Metadata } from "next";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      brand: true,
      imageUrl: true,
      prices: {
        where: { isLatest: true },
        select: { price: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
  });

  if (!product) {
    return {
      title: "Product Not Found",
      description: "This product could not be found on GrocerySaver.",
    };
  }

  const minPrice = product.prices[0]
    ? Number(product.prices[0].price).toFixed(2)
    : null;

  const title = `${product.name} - Best Price in Dublin`;
  const description = minPrice
    ? `Compare prices for ${product.name} across Tesco, Dunnes, SuperValu, Aldi. From \u20AC${minPrice}.`
    : `Compare prices for ${product.name} across Tesco, Dunnes, SuperValu, Aldi.`;

  return {
    title,
    description,
    openGraph: {
      title: `${product.name} - Best Price in Dublin | GrocerySaver`,
      description,
      type: "website",
      ...(product.imageUrl
        ? {
            images: [
              {
                url: product.imageUrl,
                alt: product.name,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} - Best Price in Dublin | GrocerySaver`,
      description,
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
