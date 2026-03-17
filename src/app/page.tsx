import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  BarChart3,
  ShoppingCart,
  MapPin,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { CATEGORIES, STORES } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Find the{" "}
              <span className="text-green-600">Cheapest Groceries</span>
              <br />
              in Dublin
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Compare prices across Tesco, Dunnes, Lidl, Aldi and SuperValu.
              Build your basket and plan the smartest shopping trip.
            </p>

            <div className="mx-auto mt-8 max-w-xl">
              <SearchBar size="large" />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Popular:</span>
              {["Milk", "Bread", "Eggs", "Chicken", "Bananas"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${term}`}
                  className="rounded-full border px-3 py-1 hover:bg-accent transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-green-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
      </section>

      {/* Store Logos */}
      <section className="border-b bg-background py-8">
        <div className="container mx-auto px-4">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            Comparing prices across Ireland&apos;s top supermarkets
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {STORES.map((store) => (
              <div
                key={store.slug}
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: store.color }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                  style={{ backgroundColor: store.color }}
                >
                  {store.name?.[0] ?? "?"}
                </div>
                <span className="hidden sm:inline">{store.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Three simple steps to save on your weekly shop
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: "1. Search & Compare",
                description:
                  "Search for any grocery item and instantly see prices across all 5 major supermarkets.",
                color: "bg-blue-100 text-blue-600",
              },
              {
                icon: ShoppingCart,
                title: "2. Build Your Basket",
                description:
                  "Add items to your basket. We calculate the cheapest way to buy everything \u2014 even across multiple stores.",
                color: "bg-green-100 text-green-600",
              },
              {
                icon: MapPin,
                title: "3. Plan Your Trip",
                description:
                  "Get an optimized route with Google Maps directions, fuel costs, and a clear verdict on whether splitting stores is worth it.",
                color: "bg-purple-100 text-purple-600",
              },
            ].map((step) => (
              <Card key={step.title} className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}
                  >
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/50 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Browse by Category</h2>
              <p className="mt-1 text-muted-foreground">
                Find what you need, organized by aisle
              </p>
            </div>
            <Link href="/categories">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((category) => (
              <Link key={category.slug} href={`/categories/${category.slug}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <span className="text-4xl">{category.icon}</span>
                    <span className="mt-2 text-sm font-medium group-hover:text-green-600 transition-colors">
                      {category.name}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">Why GrocerySaver?</h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BarChart3,
                title: "Real-Time Prices",
                description:
                  "Prices updated daily from all 5 supermarkets so you always have accurate data.",
              },
              {
                icon: TrendingDown,
                title: "Smart Savings",
                description:
                  "Our optimizer calculates the best way to split your shop across stores for maximum savings.",
              },
              {
                icon: MapPin,
                title: "Trip Planning",
                description:
                  'Get Google Maps directions, estimated fuel costs, and a clear "is it worth it?" verdict.',
              },
              {
                icon: ShoppingCart,
                title: "Easy Basket",
                description:
                  "Build your shopping list, save it for later, and share it with family members.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">
            Start Saving on Your Groceries Today
          </h2>
          <p className="mt-3 text-green-100">
            No sign-up required. Search, compare, and save in seconds.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search">
              <Button size="lg" variant="secondary" className="rounded-full">
                <Search className="mr-2 h-4 w-4" />
                Start Searching
              </Button>
            </Link>
            <Link href="/categories">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white text-white hover:bg-white/10"
              >
                Browse Categories
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
