"use client";

import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, ACTIVE_STORES } from "@/lib/constants";
import { motion } from "framer-motion";

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/60 to-transparent" />

        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            className="mx-auto max-w-2xl"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.h1
              variants={staggerItem}
              className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground"
            >
              Find the Cheapest Groceries in Dublin
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto"
            >
              Compare prices across Tesco, Dunnes, Aldi and SuperValu
            </motion.p>

            <motion.div variants={staggerItem} className="mx-auto mt-8 max-w-xl">
              <SearchBar size="large" />
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <span className="font-medium">Popular:</span>
              {["Milk", "Bread", "Eggs", "Chicken", "Bananas"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${term}`}
                  className="rounded-full border bg-white/60 px-3.5 py-1.5 hover:bg-white hover:border-teal-300 hover:text-teal-700 transition-all hover:shadow-sm"
                >
                  {term}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Store Logos */}
      <section className="border-y bg-white/50 py-5">
        <div className="container mx-auto px-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
            Comparing prices across
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {ACTIVE_STORES.map((store) => (
              <div
                key={store.slug}
                className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: store.color }}
                >
                  {store.name[0]}
                </div>
                <span
                  className="hidden sm:inline text-sm font-medium text-muted-foreground"
                >
                  {store.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Browse by Category</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Find what you need, organized by aisle
              </p>
            </div>
            <Link href="/categories">
              <Button variant="outline" size="sm" className="rounded-full group">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <motion.div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {CATEGORIES.map((category) => (
              <motion.div key={category.slug} variants={staggerItem}>
                <Link href={`/categories/${category.slug}`}>
                  <Card className="group cursor-pointer border shadow-sm hover:shadow-md hover:border-teal-200 bg-white transition-all">
                    <CardContent className="flex flex-col items-center p-5 text-center">
                      <span className="text-3xl">{category.icon}</span>
                      <span className="mt-2 text-sm font-medium group-hover:text-teal-600 transition-colors">
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
    </div>
  );
}
