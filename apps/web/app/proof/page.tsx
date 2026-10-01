import { ProofItemsPanel } from "@/components/proof/proof-items-panel";

// Generic proof page (Issue 49). Protected by proxy.ts; the API it calls
// re-authenticates every request. Not a product screen.
export default function ProofPage() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <ProofItemsPanel />
    </main>
  );
}
