import type { Metadata } from "next";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata: Metadata = {
  title: "Bulk import (admin mock) | Signal One Sound",
};

export default function AdminImportPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Bulk import</h1>
      <p className="text-muted-foreground">
        Explore a CSV or spreadsheet import: preview, validation, duplicates and conflicts, then a
        result. There is no real ingestion.
      </p>
      <ImportWizard />
    </>
  );
}
