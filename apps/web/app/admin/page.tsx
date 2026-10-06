import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarDays, FileUp, Inbox, ShieldHalf } from "lucide-react";
import { IMPORT_ROWS, MOCK_ADMIN_EVENTS, MOCK_ORGS, MOCK_SUBMISSIONS } from "@/lib/admin/mock-data";
import { classifyRows, summarize } from "@/lib/admin/import";
import { SourceBadge } from "@/components/admin/badges";

export const metadata: Metadata = {
  title: "Admin / Content Management (mock) | Signal One Sound",
};

export default function AdminDashboardPage() {
  const imp = summarize(classifyRows(IMPORT_ROWS, MOCK_ADMIN_EVENTS));
  const cards = [
    {
      href: "/admin/organizations",
      icon: Building2,
      title: "Churches & ministries",
      count: MOCK_ORGS.length,
      detail: `${MOCK_ORGS.filter((o) => o.status !== "active").length} need attention (unverified or paused)`,
    },
    {
      href: "/admin/events",
      icon: CalendarDays,
      title: "Events",
      count: MOCK_ADMIN_EVENTS.length,
      detail: `${MOCK_ADMIN_EVENTS.filter((e) => e.status === "pending-review").length} pending review, ${MOCK_ADMIN_EVENTS.filter((e) => e.status === "hidden").length} hidden`,
    },
    {
      href: "/admin/submissions",
      icon: Inbox,
      title: "Pending submissions",
      count: MOCK_SUBMISSIONS.length,
      detail: "Community submissions awaiting a decision",
    },
    {
      href: "/admin/import",
      icon: FileUp,
      title: "Import activity",
      count: imp.total,
      detail: `Sample file: ${imp.ready} ready, ${imp.invalid} errors, ${imp.duplicates + imp.conflicts} duplicates/conflicts`,
    },
  ];
  const sources = [...new Set(MOCK_ADMIN_EVENTS.map((e) => e.source))];

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <ShieldHalf aria-hidden className="size-4" /> Signal One Sound staff (exploratory)
        </p>
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          Content management
        </h1>
        <p className="text-muted-foreground">
          Explore how staff could keep churches, ministries, and events accurate when data arrives from
          several places, not just Church/Ministry accounts.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <c.icon aria-hidden className="size-4 text-primary" /> {c.title}
              </span>
              <span className="font-heading text-4xl font-semibold">{c.count}</span>
              <span className="text-sm text-muted-foreground">{c.detail}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="sources-heading" className="flex flex-col gap-2 rounded-xl border p-4">
        <h2 id="sources-heading" className="font-heading text-lg font-semibold">
          Where events come from (illustrative)
        </h2>
        <p className="text-sm text-muted-foreground">
          Every event shows its source so staff can tell who is responsible for it. The final list of
          sources is not decided.
        </p>
        <ul className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <li key={s}>
              <SourceBadge source={s} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
