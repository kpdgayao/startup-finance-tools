"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium">You&apos;re subscribed!</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container mx-auto px-4 max-w-xl text-center">
        <p className="text-sm font-medium mb-3">
          Get startup finance tips in your inbox
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-center justify-center"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="newsletter-email"
            type="email"
            placeholder="you@company.com"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Subscribe"
            )}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-red-400 mt-2">{error}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
