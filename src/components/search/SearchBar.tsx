"use client";

import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { formatPrice } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  minPrice: number;
  maxPrice: number;
}

export function SearchBar({
  size = "default",
}: {
  size?: "default" | "large";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(q)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.data || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        Math.min(prev + 1, suggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      router.push(`/product/${selected.slug}`);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div
        className={`relative flex items-center transition-all duration-300 ${
          isFocused
            ? "drop-shadow-lg"
            : "drop-shadow-sm"
        }`}
      >
        <Search
          className={`absolute left-4 text-muted-foreground transition-colors ${
            isFocused ? "text-green-500" : ""
          } ${isLarge ? "h-5 w-5" : "h-4 w-4"}`}
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for groceries... e.g. milk, bread, eggs"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setShowSuggestions(true);
            setIsFocused(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
            setIsFocused(false);
          }}
          onKeyDown={handleKeyDown}
          className={`${
            isLarge ? "h-14 pl-12 pr-28 text-lg" : "h-11 pl-11 pr-20"
          } rounded-full border-2 bg-white transition-all duration-200 ${
            isFocused
              ? "border-green-400 ring-4 ring-green-100"
              : "border-border hover:border-green-200"
          }`}
        />
        <Button
          type="submit"
          className={`absolute right-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md shadow-green-500/20 transition-all hover:shadow-green-500/30 ${
            isLarge ? "h-11 px-6" : "h-8 px-4 text-xs"
          }`}
        >
          Search
        </Button>
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-xl"
          >
            {suggestions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-green-50"
                    : "hover:bg-muted/50"
                } ${index > 0 ? "border-t border-border/50" : ""}`}
                onMouseDown={() => {
                  router.push(`/product/${item.slug}`);
                  setShowSuggestions(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground">
                        {item.brand}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-600 tabular-nums">
                    {formatPrice(item.minPrice)}
                  </span>
                  {item.minPrice !== item.maxPrice && (
                    <span className="text-[10px] text-muted-foreground">
                      - {formatPrice(item.maxPrice)}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
            <div className="border-t bg-muted/30 px-4 py-2.5">
              <button
                type="submit"
                className="text-xs text-green-600 font-medium hover:text-green-700"
                onMouseDown={handleSubmit as () => void}
              >
                See all results for &ldquo;{query}&rdquo; &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
