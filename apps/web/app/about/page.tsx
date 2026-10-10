import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { ABOUT_PARAGRAPHS, MISSION, SCRIPTURE, VISION } from "@/lib/marketing/content";

export const metadata: Metadata = { title: "About | Signal One Sound" };

// Drawn from the product plan (docs/product/product-plan.md): the mission, the vision, the scripture and the
// problem the product solves.
export default function AboutPage() {
  return (
    <LegalPage title="About Signal One Sound">
      {ABOUT_PARAGRAPHS.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <h2>Our mission</h2>
      <p data-testid="about-mission">{MISSION}</p>

      <h2>Our vision</h2>
      <p data-testid="about-vision">{VISION}</p>

      <blockquote className="border-l-2 border-primary pl-4 italic">
        &ldquo;{SCRIPTURE.text}&rdquo;
        <footer className="mt-1 text-sm not-italic text-muted-foreground">{SCRIPTURE.reference}</footer>
      </blockquote>
    </LegalPage>
  );
}
