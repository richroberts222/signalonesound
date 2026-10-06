import type { Metadata } from "next";
import { OrgBrowser } from "@/components/admin/org-browser";
import { MOCK_ORGS } from "@/lib/admin/mock-data";

export const metadata: Metadata = {
  title: "Churches & Ministries (admin mock) | Signal One Sound",
};

export default function AdminOrganizationsPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Churches &amp; ministries</h1>
      <OrgBrowser orgs={MOCK_ORGS} />
    </>
  );
}
