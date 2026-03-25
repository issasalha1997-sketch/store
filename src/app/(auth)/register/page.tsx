"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xl">
            G
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Save baskets, write reviews, and get personalized trip planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3">
            <Input type="text" placeholder="Full name" />
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Input type="password" placeholder="Confirm password" />
            <Button className="w-full bg-teal-600 hover:bg-teal-700" disabled>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Authentication coming soon. The app works fully without an account!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
