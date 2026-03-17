"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  minPrice: number;
  maxPrice: number;
}

export function SearchBar({ size = "default" }: { size?: "default" | "large" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=5`);
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
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
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
      <div className="relative flex items-center">
        <Search
          className={`absolute left-3 text-muted-foreground ${isLarge ? "h-5 w-5" : "h-4 w-4"}`}
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
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          className={`${isLarge ? "h-14 pl-11 pr-28 text-lg" : "h-10 pl-10 pr-20"} rounded-full border-2 focus-visible:ring-green-500`}
        />
        <Button
          type="submit"
          className={`absolute right-1.5 rounded-full bg-green-600 hover:bg-green-700 ${
            isLarge ? "h-11 px-6" : "h-7 px-3 text-xs"
          }`}
        >
          Search
        </Button>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border bg-background shadow-lg">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent transition-colors ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onMouseDown={() => {
                router.push(`/product/${item.slug}`);
                setShowSuggestions(false);
              }}
            >
              <div>
                <p className="font-medium">{item.name}</p>
                {item.brand && (
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-green-600">
                {item.minPrice !== undefined
                  ? `\u20AC${item.minPrice.toFixed(2)} - \u20AC${item.maxPrice.toFixed(2)}`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
