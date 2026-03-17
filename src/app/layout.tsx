import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "GrocerySaver - Compare Grocery Prices in Dublin",
    template: "%s | GrocerySaver",
  },
  description:
    "Compare grocery prices across Tesco, Dunnes, Lidl, Aldi and SuperValu. Build your basket, find the cheapest store, and plan your shopping trip in Dublin.",
  keywords: ["grocery", "price comparison", "Dublin", "Ireland", "Tesco", "Lidl", "Aldi", "Dunnes", "SuperValu"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
