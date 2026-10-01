"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROOF_ITEM_LABEL_MAX,
  createApiClient,
  createProofItemClient,
  type ProofItem,
} from "@signalone/validation";

import { Button } from "@/components/ui/button";

// Intentionally minimal infrastructure proof (Issue 49), not product UI. It calls
// the API only through the shared client; the browser sends the Clerk session
// cookie. No business rules live here: the server decides everything and the UI
// just shows the standard error message/field errors.
export function ProofItemsPanel() {
  const client = useMemo(() => createProofItemClient(createApiClient({ baseUrl: "" })), []);
  const [items, setItems] = useState<ProofItem[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const result = await client.list();
    if (result.ok) setItems(result.data.items);
    else setError(result.error.message);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldError(null);
    setNotice(null);
    const result = await client.create({ label });
    if (result.ok) {
      setLabel("");
      setNotice(`Created "${result.data.label}"`);
      await refresh();
    } else {
      setFieldError(result.error.fieldErrors?.label?.[0] ?? null);
      setError(result.error.message);
    }
    setPending(false);
  }

  async function onDelete(id: string) {
    setError(null);
    setNotice(null);
    const result = await client.remove(id);
    if (result.ok) {
      setNotice("Deleted");
      await refresh();
    } else {
      setError(result.error.message);
    }
  }

  return (
    <section className="flex w-full max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold">Proof items</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <label htmlFor="proof-label" className="text-sm">
          Label
        </label>
        <input
          id="proof-label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "proof-label-error" : undefined}
          maxLength={PROOF_ITEM_LABEL_MAX * 2}
          className="rounded-md border px-3 py-2"
        />
        {fieldError && (
          <p id="proof-label-error" className="text-sm text-red-600">
            {fieldError}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add item"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items yet.</p>
      ) : (
        <ul aria-label="Proof items" className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span>{item.label}</span>
              <Button variant="outline" size="sm" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.label}`}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
