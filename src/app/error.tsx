"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <p className="mt-2 max-w-md text-xs text-muted-foreground break-all">
        {error.stack?.split("\n").slice(0, 3).join(" → ")}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
      >
        Try again
      </button>
    </div>
  );
}
