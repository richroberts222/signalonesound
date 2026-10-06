import type { Metadata } from "next";
import { SubmissionQueue } from "@/components/admin/submission-queue";
import { MOCK_ADMIN_EVENTS, MOCK_SUBMISSIONS } from "@/lib/admin/mock-data";

export const metadata: Metadata = {
  title: "Submissions (admin mock) | Signal One Sound",
};

export default function AdminSubmissionsPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Submission moderation</h1>
      <p className="text-muted-foreground">
        Fictional community submissions awaiting review. How submissions are created is not part of
        this mock.
      </p>
      <SubmissionQueue submissions={MOCK_SUBMISSIONS} events={MOCK_ADMIN_EVENTS} />
    </>
  );
}
