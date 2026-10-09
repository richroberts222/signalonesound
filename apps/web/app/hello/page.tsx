import { HelloPanel } from "@/components/hello/hello-panel";

// S0 walking skeleton page. Protected by proxy.ts; the API it calls re-authenticates every
// request. Replaced by the real account screens in S1.
export default function HelloPage() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <HelloPanel />
    </main>
  );
}
