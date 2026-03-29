"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Authenticate via server-side API route (sets HttpOnly cookie)
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("Invalid admin secret");
      }
    } catch {
      setError("Connection error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter the admin secret to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="secret"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Admin Secret
              </label>
              <input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter secret..."
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !secret}
              className="w-full py-2 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
