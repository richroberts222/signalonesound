import type { Geocoder } from "../services/events";
import { locateAddress } from "./gazetteer";

// The geocoder for event addresses: the centre of the address's ZIP area (or of its city), from the
// Census data shipped with the app. It never calls an outside service. A street-level geocoder can
// replace it later behind the same port.
export const gazetteerGeocoder: Geocoder = {
  async geocode(address) {
    return locateAddress(address);
  },
};
