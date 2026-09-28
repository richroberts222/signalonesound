import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="font-semibold tracking-tight">
        Signal One
      </Link>
      <div className="flex items-center gap-2">
        <Show when="signed-out">
          <SignInButton>
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
          <SignUpButton>
            <Button>Sign up</Button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Button variant="ghost" render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
