"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CURRENT_POLICY_VERSION, createApiClient, createProfileClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// The acceptance step (S1 AC1/AC2): the member confirms they are 18 or older and accepts the current
// Terms and Privacy Policy. The server records the version and the time and decides everything; this
// form only collects the two confirmations.
export function AcceptTermsForm() {
  const router = useRouter();
  const client = useMemo(() => createProfileClient(createApiClient({ baseUrl: "" })), []);
  const [age, setAge] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!age || !policy) return;
    setPending(true);
    setError(null);
    const result = await client.acceptPolicy({ version: CURRENT_POLICY_VERSION, ageAttested: true });
    if (result.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(result.error.message);
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="font-heading text-2xl font-bold">Before you continue</h1>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex items-start gap-3">
            <Checkbox id="accept-age" checked={age} onCheckedChange={(v) => setAge(v === true)} data-testid="signup-age-checkbox" />
            <Label htmlFor="accept-age">I am 18 years old or older.</Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-policy"
              checked={policy}
              onCheckedChange={(v) => setPolicy(v === true)}
              data-testid="signup-policy-checkbox"
            />
            <Label htmlFor="accept-policy" className="block">
              I accept the{" "}
              <Link href="/terms" className="underline" data-testid="accept-terms-link">
                Terms of Use
              </Link>{" "}
              and the{" "}
              <Link href="/privacy" className="underline" data-testid="accept-privacy-link">
                Privacy Policy
              </Link>
              .
            </Label>
          </div>
          <Button type="submit" disabled={!age || !policy || pending} data-testid="policy-accept-button">
            {pending ? "Saving..." : "Continue"}
          </Button>
          {error && (
            <p role="alert" data-testid="accept-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
