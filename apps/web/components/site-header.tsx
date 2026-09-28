import Link from "next/link";
import { Show, SignOutButton, UserButton } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <Link href="/" className="font-heading font-semibold">
        Signal One
      </Link>
      <nav className="flex items-center gap-2">
        <Show when="signed-out">
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants()}>
            Sign up
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/account"
            className={buttonVariants({ variant: "ghost" })}
          >
            Account
          </Link>
          <SignOutButton>
            <Button variant="outline">Sign out</Button>
          </SignOutButton>
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}
