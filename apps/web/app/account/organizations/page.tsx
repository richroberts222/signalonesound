import type { Metadata } from "next";

import { MyOrganizationsList } from "@/components/church/my-organizations";

export const metadata: Metadata = { title: "My churches and ministries | Signal One Sound" };

// Protected by proxy.ts (everything under /account).
export default function MyOrganizationsPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">My churches and ministries</h1>
      <MyOrganizationsList />
    </>
  );
}
