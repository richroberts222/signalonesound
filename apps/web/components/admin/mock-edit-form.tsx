"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EditField = { name: string; label: string; value: string; required?: boolean };

type MockEditFormProps = {
  /** Used to make field ids unique and to word the confirmation. */
  idPrefix: string;
  subject: string;
  fields: EditField[];
};

/** Inline edit affordance. Validates required fields, then says plainly that nothing was saved. */
export function MockEditForm({ idPrefix, subject, fields }: MockEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !values[f.name].trim()) next[f.name] = `${f.label} is required.`;
    }
    setErrors(next);
    setSaved(Object.keys(next).length === 0);
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        {saved ? (
          <p role="status" className="text-sm">
            Mock only: nothing was saved. {subject} is unchanged, and your edits are discarded when
            you leave this page.
          </p>
        ) : null}
        <Button variant="outline" className="w-fit" onClick={() => { setEditing(true); setSaved(false); }}>
          <Pencil aria-hidden /> Edit {subject.toLowerCase()}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border p-4">
      {Object.keys(errors).length > 0 ? (
        <p role="alert" className="text-sm text-destructive">
          Fix the highlighted fields before saving.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `${idPrefix}-${f.name}`;
          return (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {f.label}
                {f.required ? <span className="text-muted-foreground"> (required)</span> : null}
              </label>
              <Input
                id={id}
                value={values[f.name]}
                aria-invalid={errors[f.name] ? true : undefined}
                aria-describedby={errors[f.name] ? `${id}-error` : undefined}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
              {errors[f.name] ? (
                <p id={`${id}-error`} className="text-sm text-destructive">
                  {errors[f.name]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save changes (mock)</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditing(false);
            setErrors({});
          }}
        >
          Cancel
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Saving is a mock. No change is stored, and audit history is not recorded.
      </p>
    </form>
  );
}
