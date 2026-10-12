"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

// Shown when something on a page fails unexpectedly. It never shows the technical error to the visitor (the
// server has already logged it); it offers a retry and a way home.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        <span className="text-gradient-gold">Something went wrong</span>
      </h1>
      <p role="alert" className="leading-relaxed text-muted-foreground">
        We could not load this page. Please try again. If it keeps happening, the service may be busy; wait a minute and try once more.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => reset()} data-testid="error-retry">
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          data-testid="error-home"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
