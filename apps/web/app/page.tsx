import { Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Signal One</h1>
      <Show when="signed-in">
        <p className="text-muted-foreground">
          Signed in as <span className="font-mono">{userId}</span>
        </p>
      </Show>
      <Show when="signed-out">
        <p className="text-muted-foreground">You are signed out.</p>
      </Show>
    </main>
  );
}
