"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, MapPin, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      {/* Login prompt - since auth is not yet set up */}
      <Card className="mb-8">
        <CardContent className="p-8 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 text-xl font-semibold">Sign in to save your data</h2>
          <p className="mt-2 text-muted-foreground">
            Create an account to save your baskets, set your home address for trip planning,
            and write product reviews.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login">
              <Button className="bg-green-600 hover:bg-green-700">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick settings (works without login via localStorage) */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Home Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Set your home address for more accurate trip planning
            </p>
            <div className="flex gap-2">
              <Input placeholder="Enter your address in Dublin..." />
              <Button variant="outline">Save</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Saved Baskets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sign in to save multiple baskets and access them from any device.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              Your Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sign in to write and manage your product reviews.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
