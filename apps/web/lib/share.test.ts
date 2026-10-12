import { describe, expect, it, vi } from "vitest";

import { shareLink, shareNotice } from "./share";

const data = { title: "Grace Church", text: "Grace Church", url: "https://example.test/churches/1" };

describe("sharing a link", () => {
  it("uses the device's share sheet when there is one, and does not copy", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareLink({ share, clipboard: { writeText } }, data)).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when there is no share sheet", async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareLink({ clipboard: { writeText } }, data)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("treats closing the share sheet, or a refused copy, as cancelled and not as a crash", async () => {
    expect(await shareLink({ share: async () => Promise.reject(new Error("AbortError")) }, data)).toBe("cancelled");
    expect(await shareLink({ clipboard: { writeText: async () => Promise.reject(new Error("denied")) } }, data)).toBe("cancelled");
  });

  it("says so when the device can neither share nor copy", async () => {
    expect(await shareLink({}, data)).toBe("unavailable");
  });

  it("words each outcome, and says nothing after a successful share", () => {
    expect(shareNotice("shared")).toBeNull();
    expect(shareNotice("copied")).toBe("Link copied.");
    expect(shareNotice("cancelled")).toBe("Sharing was cancelled.");
    expect(shareNotice("unavailable")).toMatch(/Copy the address/);
  });
});
