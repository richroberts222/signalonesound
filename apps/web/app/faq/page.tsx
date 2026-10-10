import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/legal-page";
import { FAQ } from "@/lib/marketing/content";

export const metadata: Metadata = { title: "Frequently asked questions | Signal One Sound", description: "Answers to common questions about finding revival gatherings, listing a church, alerts, privacy and cost." };

// Plain collapsible items (the browser's own details element), so it works without JavaScript and with a
// keyboard. Every answer is written in lib/marketing/content.ts and checked by its tests.
export default function FaqPage() {
  return (
    <LegalPage title="Frequently asked questions">
      <div className="flex flex-col gap-2">
        {FAQ.map((item, i) => (
          <details key={item.question} className="group rounded-lg border px-4 py-3" data-testid={`faq-item-${i}`}>
            <summary className="cursor-pointer font-medium marker:text-primary" data-testid={`faq-question-${i}`}>
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
      <p>
        Did not find your answer? <Link href="/contact" className="underline underline-offset-4" data-testid="faq-contact-link">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
