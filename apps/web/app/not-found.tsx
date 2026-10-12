import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

// Shown for any address that does not exist, and for an event or church that is not public. It says what
// happened in plain words and gives one way back. Server component: readable without JavaScript.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">Error 404</p>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        <span className="text-gradient-gold">We could not find that page</span>
      </h1>
      <p className="leading-relaxed text-muted-foreground">
        The link may be old or mistyped, or what you were looking for may have been taken down.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        data-testid="not-found-home"
      >
        Go to the home page
      </Link>
    </main>
  );
}
