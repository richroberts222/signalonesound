"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { shareLink, shareNotice } from "@/lib/share";

// Share a church page (S18): the device's own share sheet when there is one, otherwise the link is copied.
export function ChurchShare({ name }: { name: string }) {
  const [notice, setNotice] = useState<string | null>(null);

  async function share() {
    const outcome = await shareLink(
      { share: typeof navigator.share === "function" ? (d) => navigator.share(d) : undefined, clipboard: navigator.clipboard },
      { title: name, text: name, url: window.location.href },
    );
    setNotice(shareNotice(outcome));
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" className="w-fit" onClick={() => void share()} data-testid="church-share">
        Share this church
      </Button>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="church-share-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
