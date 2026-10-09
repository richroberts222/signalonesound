import type { Metadata } from "next";

import { AuditViewer } from "@/components/admin/audit-viewer";

export const metadata: Metadata = { title: "Audit log | Signal One Sound" };

// Protected by proxy.ts (everything under /admin); the API answers "not found" to anyone who is not an admin.
export default function AuditPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Audit log</h1>
      <AuditViewer />
    </main>
  );
}
