import { auth, currentUser } from "@clerk/nextjs/server";

export default async function AccountPage() {
  // Identity is derived server-side from the authenticated request (see /docs/auth.md).
  const { userId } = await auth.protect();
  const user = await currentUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Clerk user ID</dt>
        <dd className="font-mono">{userId}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{user?.primaryEmailAddress?.emailAddress ?? "—"}</dd>
      </dl>
    </main>
  );
}
