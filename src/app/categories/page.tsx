import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/constants";

export const metadata = {
  title: "Categories",
  description: "Browse grocery categories and compare prices across Irish supermarkets.",
};

export default function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Browse Categories</h1>
      <p className="mt-2 text-muted-foreground">
        Find and compare products organized by aisle
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Card className="group h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <span className="text-5xl">{category.icon}</span>
                <span className="mt-3 text-base font-semibold group-hover:text-green-600 transition-colors">
                  {category.name}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
