"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmMockActionProps = {
  /** e.g. "Remove event" */
  label: string;
  /** Question shown on the confirmation step. */
  prompt: string;
  /** Shown after confirming; must say nothing was changed. */
  doneMessage: string;
};

/** Destructive-looking action with a confirmation step. Confirming changes nothing. */
export function ConfirmMockAction({ label, prompt, doneMessage }: ConfirmMockActionProps) {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");

  if (step === "done") {
    return (
      <p role="status" className="text-sm">
        {doneMessage}
      </p>
    );
  }
  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm">
          {prompt} This is a mock, so nothing will actually change.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" onClick={() => setStep("done")}>
            <Trash2 aria-hidden /> Confirm (mock)
          </Button>
          <Button variant="outline" onClick={() => setStep("idle")}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Button variant="destructive" className="w-fit" onClick={() => setStep("confirm")}>
      <Trash2 aria-hidden /> {label}
    </Button>
  );
}
