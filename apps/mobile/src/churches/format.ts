import { formatServiceWhen, type ChurchResult } from "@signalone/validation";

// The words on the Find a Church screens. Plain data with no React Native import, so a test can check them.

/** "Boise, ID" (or the country when there is no region). */
export function placeLine(church: { city: string; state: string; country: string }): string {
  return [church.city, church.state || church.country].filter(Boolean).join(", ");
}

/** "Next: Sunday, 10:00 AM · Wednesday, 7:00 PM", or a plain line when the church has not added times. */
export function nextServicesLine(church: Pick<ChurchResult, "nextServices" | "serviceCount">): string {
  if (church.serviceCount === 0 || church.nextServices.length === 0) return "Service times not added yet";
  return `Next: ${church.nextServices.map((s) => formatServiceWhen(s.weekday, s.startTime)).join(" · ")}`;
}

/** "2.4 miles", or nothing when no position was searched. */
export function churchDistance(miles: number | null): string | null {
  if (miles === null) return null;
  return miles < 0.1 ? "Under 0.1 miles" : `${miles.toFixed(1)} miles`;
}

export const CHURCH_ERROR_TEXT = "We could not load churches. Check your connection and try again.";
export const CHURCH_EMPTY_TEXT = "No churches match yet. Try a wider distance or a different place.";

export function churchCountText(count: number): string {
  return count === 1 ? "1 church found" : `${count} churches found`;
}

/** The address as one line, for the map link; empty parts are left out. */
export function addressLine(p: { street: string; city: string; state: string; zip: string; country: string }): string {
  return [p.street, p.city, [p.state, p.zip].filter(Boolean).join(" "), p.country].filter(Boolean).join(", ");
}
