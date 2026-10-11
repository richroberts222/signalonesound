import { type EventView } from "@signalone/validation";

// The address part of the event form (S17): a United States address has a state and a ZIP code; anywhere else
// there is a free-text region and an optional postal code. The form keeps all four fields; this decides what is
// sent, so a state left over from an earlier country choice is never sent for a place elsewhere.

export type AddressForm = { country: string; state: string; region: string; zip: string };

export const emptyAddress = (): AddressForm => ({ country: "US", state: "", region: "", zip: "" });

/** The form's starting values for an event being edited (outside the United States the stored state is the region). */
export function addressFromEvent(event: Pick<EventView, "country" | "state" | "zip">): AddressForm {
  return event.country === "US"
    ? { country: "US", state: event.state, region: "", zip: event.zip }
    : { country: event.country, state: "", region: event.state, zip: event.zip };
}

/** What to send for the address fields. */
export function addressPayload(a: AddressForm): { country: string; state: string; zip: string; region?: string } {
  return a.country === "US"
    ? { country: "US", state: a.state, zip: a.zip.trim() }
    : { country: a.country, state: "", zip: a.zip.trim(), region: a.region.trim() };
}
