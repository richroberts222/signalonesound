import { getUserId } from "@/lib/auth/server";

// The Clerk proxy already protects /account(.*); this re-verifies on the server.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  if (!(await getUserId())) return null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </main>
  );
}
