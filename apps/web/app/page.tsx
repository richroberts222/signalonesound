import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl">
        <BrandWordmark className="text-3xl" />
      </h1>
      <Button size="lg" nativeButton={false} render={<Link href="/discover" />}>
        Discover revival near you
      </Button>
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
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Go to dashboard
        </Button>
      </Show>
    </main>
  );
}
