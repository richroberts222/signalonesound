"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ORG_LINK_MAX,
  ORG_NAME_MAX,
  createApiClient,
  createOrganizationClient,
  firstFieldError,
  normalizeLink,
} from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Claim a Church/Ministry (S2). The person asks; a platform admin decides. This form collects the
// details and shows the server's standard messages; the server validates every field. The contact
// email is used only for the review and is removed once a decision is made.
export function ClaimChurchForm() {
  const client = useMemo(() => createOrganizationClient(createApiClient({ baseUrl: "" })), []);
  const prefill = useSearchParams().get("name") ?? "";
  const [name, setName] = useState(prefill);
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const result = await client.claim({
      name,
      description,
      links: links.map(normalizeLink).filter((l) => l !== ""),
      contactEmail: email,
    });
    if (result.ok) setDone(true);
    else {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
    }
    setPending(false);
  }

  if (done) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Request received</CardTitle>
          <CardDescription data-testid="claim-pending">
            Your request is pending. A platform admin will review it. Until it is approved you cannot publish anything for this church or ministry.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const firstError = (field: string) => firstFieldError(fieldErrors, field);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <h1 className="font-heading text-xl font-semibold">Claim your church or ministry</h1>
        <CardDescription>Tell us who you are. We check each request before anyone can publish events under a church&apos;s name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claim-name">Church or ministry name</Label>
            <Input id="claim-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={ORG_NAME_MAX * 2} data-testid="claim-name-input" />
            {firstError("name") && <p className="text-sm text-destructive">{firstError("name")}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claim-description">Short description (optional)</Label>
            <Input id="claim-description" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="claim-description-input" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Website or social links (1 to {ORG_LINK_MAX})</legend>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Link ${i + 1}`}
                  value={link}
                  onChange={(e) => setLinks(links.map((l, j) => (j === i ? e.target.value : l)))}
                  placeholder="https://"
                  inputMode="url"
                  data-testid={`claim-link-input-${i}`}
                />
                {links.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => setLinks(links.filter((_, j) => j !== i))} data-testid={`claim-remove-link-${i}`}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {links.length < ORG_LINK_MAX && (
              <Button type="button" variant="outline" className="w-fit" onClick={() => setLinks([...links, ""])} data-testid="claim-add-link">
                Add a link
              </Button>
            )}
            {firstError("links") && <p className="text-sm text-destructive">{firstError("links")}</p>}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claim-email">Contact email (used only for this review)</Label>
            <Input id="claim-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="claim-email-input" />
            {firstError("contactEmail") && <p className="text-sm text-destructive">{firstError("contactEmail")}</p>}
          </div>
          <Button type="submit" disabled={pending} data-testid="claim-submit">
            {pending ? "Sending..." : "Send request"}
          </Button>
          {error && Object.keys(fieldErrors).length === 0 && (
            <p role="alert" data-testid="claim-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
