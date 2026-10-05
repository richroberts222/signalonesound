import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Signal One</h1>
      <Show when="signed-out">
        <p className="text-muted-foreground">Sign in to continue.</p>
        <div className="flex gap-2">
          <SignInButton>
            <Button variant="outline">Sign in</Button>
          </SignInButton>
          <SignUpButton>
            <Button>Sign up</Button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <p className="text-muted-foreground">You are signed in.</p>
        <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
      </Show>
    </main>
  );
}
