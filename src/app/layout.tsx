import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";

const siteUrl = "https://store-alpha-nine-44.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "GrocerySaver - Compare Grocery Prices in Dublin",
    template: "%s | GrocerySaver",
  },
  description:
    "Compare grocery prices across Tesco, Dunnes, Lidl, Aldi and SuperValu. Build your basket, find the cheapest store, and plan your shopping trip in Dublin.",
  keywords: ["grocery", "price comparison", "Dublin", "Ireland", "Tesco", "Lidl", "Aldi", "Dunnes", "SuperValu"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "GrocerySaver - Compare Grocery Prices in Dublin",
    description:
      "Compare grocery prices across Tesco, Dunnes, Lidl, Aldi and SuperValu. Build your basket, find the cheapest store, and plan your shopping trip in Dublin.",
    url: siteUrl,
    siteName: "GrocerySaver",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GrocerySaver - Compare grocery prices across Dublin supermarkets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GrocerySaver - Compare Grocery Prices in Dublin",
    description:
      "Compare grocery prices across Tesco, Dunnes, Lidl, Aldi and SuperValu. Build your basket, find the cheapest store, and plan your shopping trip in Dublin.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "GrocerySaver",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
