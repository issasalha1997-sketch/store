import Link from "next/link";
import { STORES } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold shadow-md shadow-teal-500/20">
                G
              </div>
              <span className="text-lg font-bold tracking-tight">
                Grocery<span className="text-gradient">Saver</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Compare grocery prices across Ireland&apos;s top supermarkets.
              Save money on every weekly shop in Dublin.
            </p>
            <div className="mt-4 flex gap-2">
              {STORES.map((store) => (
                <div
                  key={store.slug}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[10px] font-bold opacity-60 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: store.color }}
                  title={store.name}
                >
                  {store.name[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/search", label: "Search Products" },
                { href: "/categories", label: "Browse Categories" },
                { href: "/basket", label: "My Basket" },
                { href: "/trip", label: "Trip Planner" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                  >
                    <span className="w-0 group-hover:w-2 transition-all overflow-hidden text-teal-600">
                      &rarr;
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stores */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
              Stores We Compare
            </h3>
            <ul className="space-y-2.5 text-sm">
              {STORES.map((store) => (
                <li
                  key={store.slug}
                  className="text-muted-foreground flex items-center gap-2"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: store.color }}
                  />
                  {store.name}
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div className="hidden lg:block">
            <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
              About
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} GrocerySaver. Helping Dublin
            families save on groceries.
          </p>
          <p className="text-center sm:text-right">
            Prices updated regularly. May not reflect exact in-store prices.
          </p>
        </div>
      </div>
    </footer>
  );
}
