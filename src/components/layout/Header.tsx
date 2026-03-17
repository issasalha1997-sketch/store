"use client";

import Link from "next/link";
import { ShoppingCart, Search, Menu, X, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/hooks/useBasket";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = useBasket((s) => s.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-lg">
            G
          </div>
          <span className="text-xl font-bold hidden sm:inline">
            Grocery<span className="text-green-600">Saver</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
          <Link
            href="/categories"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/trip"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Trip Planner
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link href="/basket">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/profile" className="hidden md:block">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden">
          <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="h-4 w-4" />
              Search Products
            </Link>
            <Link
              href="/categories"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              Categories
            </Link>
            <Link
              href="/trip"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MapPin className="h-4 w-4" />
              Trip Planner
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
