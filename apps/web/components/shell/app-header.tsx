"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, isNavItemActive, type NavItem } from "@/lib/navigation/nav-config";
import { cn } from "@/lib/utils";

function visibleItems(signedIn: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.signedInOnly || signedIn);
}

function NavLinks({
  items,
  pathname,
  orientation,
}: {
  items: NavItem[];
  pathname: string;
  orientation: "row" | "column";
}) {
  return (
    <ul className={cn("flex gap-1", orientation === "column" ? "flex-col" : "items-center")}>
      {items.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-primary/15 text-primary shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Global header: wordmark home link, primary navigation (inline from `sm` up, a
 * disclosure menu below), and Clerk account actions. Navigation destinations come
 * from lib/navigation/nav-config.ts.
 */
export function AppHeader() {
  const pathname = usePathname();
  // The menu is open only for the route it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="Signal One Sound home"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandWordmark />
        </Link>

        <nav aria-label="Primary" className="hidden sm:block">
          <Show when="signed-out">
            <NavLinks items={visibleItems(false)} pathname={pathname} orientation="row" />
          </Show>
          <Show when="signed-in">
            <NavLinks items={visibleItems(true)} pathname={pathname} orientation="row" />
          </Show>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton>
              <Button variant="ghost">Sign in</Button>
            </SignInButton>
            <SignUpButton>
              <Button className="hidden sm:inline-flex">Sign up</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 sm:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setOpenOn(menuOpen ? null : pathname)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Primary" className="border-t px-4 py-3 sm:hidden">
          <Show when="signed-out">
            <NavLinks items={visibleItems(false)} pathname={pathname} orientation="column" />
            <SignUpButton>
              <Button className="mt-3 w-full">Sign up</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <NavLinks items={visibleItems(true)} pathname={pathname} orientation="column" />
          </Show>
        </nav>
      )}
    </header>
  );
}
