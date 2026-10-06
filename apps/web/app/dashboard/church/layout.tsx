import { getUserId } from "@/lib/auth/server";

// The Clerk proxy already protects /dashboard(.*); this re-verifies on the server.
// Which signed-in users count as a Church/Ministry (account type or role) is not
// decided, so the mock treats any signed-in user as one for exploration.
export default async function ChurchLayout({ children }: LayoutProps<"/dashboard/church">) {
  if (!(await getUserId())) return null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </main>
  );
}
