"use client";

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
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { CATEGORIES, STORES } from "@/lib/constants";
import { STORE_COLORS } from "@/lib/constants";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/80 to-amber-50/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-[10%] h-72 w-72 rounded-full bg-green-200/40 blur-3xl animate-float-slow" />
          <div className="absolute bottom-10 right-[15%] h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl animate-float" />
          <div className="absolute top-40 right-[30%] h-48 w-48 rounded-full bg-amber-100/40 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        </div>

        {/* Floating grocery items */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
          {["🥛", "🥦", "🍞", "🥩", "🧀"].map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-3xl opacity-20"
              style={{
                left: `${12 + i * 18}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -15, 0],
                rotate: [0, i % 2 === 0 ? 5 : -5, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.7,
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>

        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            className="mx-auto max-w-3xl"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100/80 px-4 py-1.5 text-sm font-medium text-green-700 mb-6 border border-green-200/50">
                <Sparkles className="h-3.5 w-3.5" />
                Compare 5 supermarkets instantly
              </span>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl leading-[1.1]"
            >
              Find the{" "}
              <span className="text-gradient-hero">Best Prices</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-muted-foreground/80">
                for your weekly shop in Dublin
              </span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            >
              Compare prices across Tesco, Dunnes, Lidl, Aldi and SuperValu.
              Build your basket, and our algorithm finds the cheapest way to
              buy everything.
            </motion.p>

            <motion.div variants={staggerItem} className="mx-auto mt-8 max-w-xl">
              <SearchBar size="large" />
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <span className="font-medium">Popular:</span>
              {["Milk", "Bread", "Eggs", "Chicken", "Bananas"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${term}`}
                  className="rounded-full border bg-white/60 px-3.5 py-1.5 hover:bg-white hover:border-green-300 hover:text-green-700 transition-all hover:shadow-sm"
                >
                  {term}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Store Logos — animated ticker */}
      <section className="border-y bg-white/50 py-6 overflow-hidden">
        <div className="container mx-auto px-4">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Comparing prices across
          </p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {STORES.map((store) => (
              <motion.div
                key={store.slug}
                variants={staggerItem}
                className="flex items-center gap-2.5 group"
                whileHover={{ scale: 1.05 }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-md transition-shadow group-hover:shadow-lg"
                  style={{
                    backgroundColor: store.color,
                    boxShadow: `0 4px 12px ${store.color}30`,
                  }}
                >
                  {store.name[0]}
                </div>
                <span
                  className="hidden sm:inline text-sm font-semibold"
                  style={{ color: store.color }}
                >
                  {store.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-green-600">
              Simple as 1-2-3
            </span>
            <h2 className="mt-2 text-3xl font-bold lg:text-4xl">
              How It Works
            </h2>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 sm:grid-cols-3"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {[
              {
                icon: Search,
                title: "Search & Compare",
                description:
                  "Search for any grocery item and instantly see prices across all 5 major supermarkets.",
                gradient: "from-blue-500 to-cyan-500",
                bg: "bg-blue-50",
                step: "01",
              },
              {
                icon: ShoppingCart,
                title: "Build Your Basket",
                description:
                  "Add items to your basket. We calculate the cheapest way to buy everything — even split across multiple stores.",
                gradient: "from-green-500 to-emerald-500",
                bg: "bg-green-50",
                step: "02",
              },
              {
                icon: MapPin,
                title: "Plan Your Trip",
                description:
                  "Get an optimized route with Google Maps, fuel costs, and a clear verdict on whether splitting stores is worth it.",
                gradient: "from-purple-500 to-violet-500",
                bg: "bg-purple-50",
                step: "03",
              },
            ].map((step) => (
              <motion.div key={step.title} variants={staggerItem}>
                <Card className="card-hover h-full border-0 shadow-sm hover:shadow-lg group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${step.gradient}`} />
                  <CardContent className="pt-8 pb-6 px-6">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.bg} transition-transform group-hover:scale-110`}
                      >
                        <step.icon className="h-6 w-6" style={{ color: `var(--tw-gradient-from)` }} />
                      </div>
                      <span className="text-4xl font-black text-muted-foreground/10">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-muted/30 to-muted/60">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold">Browse by Category</h2>
              <p className="mt-1 text-muted-foreground">
                Find what you need, organized by aisle
              </p>
            </motion.div>
            <Link href="/categories">
              <Button variant="outline" className="rounded-full group">
                View All
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <motion.div
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {CATEGORIES.map((category) => (
              <motion.div key={category.slug} variants={staggerItem}>
                <Link href={`/categories/${category.slug}`}>
                  <Card className="card-hover group cursor-pointer border-0 shadow-sm hover:shadow-md bg-white/80">
                    <CardContent className="flex flex-col items-center p-5 text-center">
                      <motion.span
                        className="text-4xl"
                        whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        {category.icon}
                      </motion.span>
                      <span className="mt-2 text-sm font-medium group-hover:text-green-600 transition-colors">
                        {category.name}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-green-600">
              Why choose us
            </span>
            <h2 className="mt-2 text-3xl font-bold lg:text-4xl">
              Why GrocerySaver?
            </h2>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {[
              {
                icon: Zap,
                title: "Real-Time Prices",
                description:
                  "Prices updated daily from all 5 supermarkets so you always have accurate data.",
                color: "text-amber-500",
                bg: "bg-amber-50",
              },
              {
                icon: TrendingDown,
                title: "Smart Savings",
                description:
                  "Our optimizer calculates the best way to split your shop across stores for maximum savings.",
                color: "text-green-500",
                bg: "bg-green-50",
              },
              {
                icon: MapPin,
                title: "Trip Planning",
                description:
                  "Get Google Maps directions, estimated fuel costs, and a clear \"is it worth it?\" verdict.",
                color: "text-blue-500",
                bg: "bg-blue-50",
              },
              {
                icon: Shield,
                title: "Your Choice",
                description:
                  "Override the algorithm for any item. Prefer Dunnes eggs over Aldi? You're in control.",
                color: "text-purple-500",
                bg: "bg-purple-50",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="group text-center"
              >
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} transition-transform group-hover:scale-110`}
                >
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />

        <motion.div
          className="container mx-auto px-4 text-center relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white lg:text-4xl">
            Start Saving on Your Groceries Today
          </h2>
          <p className="mt-3 text-green-100/80 max-w-md mx-auto">
            No sign-up required. Search, compare, and save in seconds.
            Free for all Dublin shoppers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/search">
              <Button
                size="lg"
                className="rounded-full bg-white text-green-700 hover:bg-green-50 font-semibold shadow-lg shadow-green-900/20 px-8"
              >
                <Search className="mr-2 h-4 w-4" />
                Start Searching
              </Button>
            </Link>
            <Link href="/categories">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 text-white hover:bg-white/10 px-8"
              >
                Browse Categories
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
