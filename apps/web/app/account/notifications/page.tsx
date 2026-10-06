import type { Metadata } from "next";
import Link from "next/link";
import { MemberMockNotice } from "@/components/member/mock-notice";
import { NotificationPreferences } from "@/components/member/notification-preferences";

export const metadata: Metadata = {
  title: "Notification preferences | Signal One Sound",
};

export default function NotificationPreferencesPage() {
  return (
    <>
      <Link href="/account" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        ← My account
      </Link>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Notification preferences
      </h1>
      <MemberMockNotice />
      <NotificationPreferences />
    </>
  );
}
