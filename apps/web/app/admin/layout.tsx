import { AdminMockNotice } from "@/components/admin/mock-notice";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { getUserId } from "@/lib/auth/server";

// The Clerk proxy already protects /admin(.*); this re-verifies on the server.
// This is NOT an admin authorization check: which signed-in users count as
// Signal One Sound admins is undecided, so the mock lets any signed-in user explore.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await getUserId())) return null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <AdminMockNotice />
      <AdminSubnav />
      {children}
    </main>
  );
}
