import { describe, expect, it } from "vitest";

import { addressFromEvent, addressPayload, emptyAddress } from "./address";

// S17 AC5: the form sends a state and ZIP for a US address, and a region for anywhere else.
describe("event form address", () => {
  it("starts as a United States address", () => {
    expect(emptyAddress()).toEqual({ country: "US", state: "", region: "", zip: "" });
  });

  it("sends the state and ZIP for the United States, and never a region", () => {
    expect(addressPayload({ country: "US", state: "TN", region: "left over", zip: " 37201 " })).toEqual({ country: "US", state: "TN", zip: "37201" });
  });

  it("sends the region for anywhere else, and never a state left over from an earlier choice", () => {
    expect(addressPayload({ country: "KE", state: "TN", region: " Nairobi County ", zip: "" })).toEqual({ country: "KE", state: "", zip: "", region: "Nairobi County" });
  });

  it("loads an event back into the form, putting an overseas region where it is edited", () => {
    expect(addressFromEvent({ country: "US", state: "TN", zip: "37201" })).toEqual({ country: "US", state: "TN", region: "", zip: "37201" });
    expect(addressFromEvent({ country: "KE", state: "Nairobi County", zip: "" })).toEqual({ country: "KE", state: "", region: "Nairobi County", zip: "" });
  });

  it("saves and loads without changing an address", () => {
    for (const event of [{ country: "US", state: "CA", zip: "94103" }, { country: "GB", state: "England", zip: "SW1A 1AA" }, { country: "PH", state: "", zip: "" }]) {
      const sent = addressPayload(addressFromEvent(event));
      expect({ country: sent.country, state: sent.country === "US" ? sent.state : (sent.region ?? ""), zip: sent.zip }).toEqual(event);
    }
  });
});
