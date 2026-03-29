import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "GrocerySaver scraper control panel and monitoring dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Admin navigation */}
      <nav className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-lg w-fit">
        <Link
          href="/admin"
          className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/staging"
          className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all"
        >
          Staging
        </Link>
        <Link
          href="/admin/merge"
          className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all"
        >
          Merge
        </Link>
      </nav>
      {children}
    </div>
  );
}
