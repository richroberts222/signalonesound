import { Hero } from "@/components/home/hero";
import { RevivalFinder } from "@/components/home/revival-finder";

// Experimental home concept (issue #57): static UI only, no data access.
export default function Home() {
  return (
    <main className="signal-home flex flex-1 flex-col">
      <Hero />
      <RevivalFinder />
      <footer className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
        Signal One · Holy. United. Awakened.
      </footer>
    </main>
  );
}
