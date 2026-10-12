// Sharing a link from a web page: the device's own share sheet when there is one, otherwise copy the link. The device
// is passed in, so the rule can be tested without a browser. A person closing the share sheet is not an error.
export type ShareDevice = {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export async function shareLink(device: ShareDevice, data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  try {
    if (typeof device.share === "function") {
      await device.share(data);
      return "shared";
    }
    if (device.clipboard) {
      await device.clipboard.writeText(data.url);
      return "copied";
    }
    return "unavailable";
  } catch {
    return "cancelled";
  }
}

/** The words shown after sharing; nothing after a successful share sheet. */
export function shareNotice(outcome: ShareOutcome): string | null {
  if (outcome === "copied") return "Link copied.";
  if (outcome === "cancelled") return "Sharing was cancelled.";
  if (outcome === "unavailable") return "Copy the address from your browser to share this page.";
  return null;
}
