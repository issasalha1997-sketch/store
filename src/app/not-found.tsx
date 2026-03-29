import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-teal-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
        have been moved or no longer exists.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Go Home
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-neutral-50"
        >
          Search Products
        </Link>
      </div>
    </div>
  );
}
