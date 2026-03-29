"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl mb-4">&#x26A0;&#xFE0F;</p>
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again, or go back to the
        homepage if the problem persists.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-neutral-50"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
