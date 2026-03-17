"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  MapPin,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/hooks/useBasket";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/categories", label: "Categories", icon: null },
  { href: "/trip", label: "Trip Planner", icon: MapPin },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const items = useBasket((s) => s.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "glass-strong shadow-sm"
          : "bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-white font-bold text-lg shadow-md shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
            G
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline">
            Grocery<span className="text-gradient">Saver</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-green-700 bg-green-50"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-green-600"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <Link href="/basket">
            <Button
              variant="ghost"
              size="icon"
              className="relative group/cart"
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover/cart:scale-110" />
              <AnimatePresence mode="popLayout">
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600 text-[11px] font-bold text-white shadow-sm"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileMenuOpen ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t md:hidden overflow-hidden bg-background"
          >
            <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
              {[
                ...navLinks,
                { href: "/profile", label: "Profile", icon: User },
              ].map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-green-50 text-green-700"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {link.icon && <link.icon className="h-4 w-4" />}
                        {link.label}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
