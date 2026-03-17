import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white font-bold">
                G
              </div>
              <span className="text-lg font-bold">
                Grocery<span className="text-green-600">Saver</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Compare grocery prices across Ireland&apos;s top supermarkets. Save money on every shop.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-foreground transition-colors">Search Products</Link></li>
              <li><Link href="/categories" className="hover:text-foreground transition-colors">Browse Categories</Link></li>
              <li><Link href="/basket" className="hover:text-foreground transition-colors">My Basket</Link></li>
              <li><Link href="/trip" className="hover:text-foreground transition-colors">Trip Planner</Link></li>
            </ul>
          </div>

          {/* Stores */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Stores We Compare</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Tesco Ireland</li>
              <li>Dunnes Stores</li>
              <li>Lidl Ireland</li>
              <li>Aldi Ireland</li>
              <li>SuperValu</li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GrocerySaver. Helping Dublin families save on groceries.</p>
          <p className="mt-1">Prices are updated regularly but may not reflect in-store prices exactly.</p>
        </div>
      </div>
    </footer>
  );
}
