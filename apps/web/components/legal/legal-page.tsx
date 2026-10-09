import type { ReactNode } from "react";

// Shared frame for the plain-language public pages (Terms, Privacy, About, Contact). Server
// component: readable without JavaScript. Content is written in each page, not generated.
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">{title}</h1>
      {updated && <p className="text-sm text-muted-foreground">Version {updated}</p>}
      <div className="flex flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}
