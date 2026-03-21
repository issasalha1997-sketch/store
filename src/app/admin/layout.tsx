import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "GrocerySaver scraper control panel and monitoring dashboard",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
