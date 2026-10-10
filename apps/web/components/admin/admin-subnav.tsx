"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav";
import { isNavItemActive } from "@/lib/navigation/nav-config";
import { cn } from "@/lib/utils";

/** Section navigation inside the admin mock; scrolls horizontally on narrow screens. */
export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 sm:w-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={`admin-${item.label.toLowerCase()}-link`}
                className={cn(
                  "block rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
