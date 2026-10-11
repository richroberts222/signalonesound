import Link from "next/link";

// Links to the public pages every visitor must be able to reach (S1 AC10, S15 AC10): the policies they
// accept, who we are, what we offer, the common questions, and how to reach us.
const LINKS = [
  { href: "/terms", label: "Terms", testId: "footer-terms" },
  { href: "/privacy", label: "Privacy", testId: "footer-privacy" },
  { href: "/fire-map", label: "Fire Map", testId: "footer-fire-map" },
  { href: "/about", label: "About", testId: "footer-about" },
  { href: "/services", label: "Services", testId: "footer-services" },
  { href: "/faq", label: "FAQ", testId: "footer-faq" },
  { href: "/contact", label: "Contact", testId: "footer-contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6 text-sm text-muted-foreground">
      <nav aria-label="Footer" className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} data-testid={link.testId} className="underline-offset-4 hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
