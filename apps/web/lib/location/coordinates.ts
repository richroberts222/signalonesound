import { pinSchema, type Pin } from "@signalone/validation";

// Reading and showing a map position (S17, docs/features/s17-event-location.md). People copy a position out of a
// phone map app as text such as "36.1627, -86.7816"; this turns that into a pin, or says plainly what is wrong.
// The server checks the pin again, whatever sent it.

export const COORDINATES_HELP = "Enter latitude and longitude, for example 36.1627, -86.7816";

export type ParsedCoordinates = { ok: true; pin: Pin } | { ok: false; message: string };

const NUMBER = "([-+]?\\d{1,3}(?:\\.\\d+)?)";
// Optional "lat"/"lng" words, optional N/S and E/W letters before or after each number, and a comma, semicolon or space between.
const PAIR = new RegExp(
  `^\\(?\\s*(?:lat(?:itude)?\\s*[:=]?\\s*)?([NS])?\\s*${NUMBER}\\s*([NS])?\\s*[,;\\s]\\s*(?:(?:lng|lon|long|longitude)\\s*[:=]?\\s*)?([EW])?\\s*${NUMBER}\\s*([EW])?\\s*\\)?$`,
  "i",
);

/** Round to 5 decimal places (about a metre): enough for a venue, and no false precision. */
export const roundPin = (pin: Pin): Pin => ({ lat: Math.round(pin.lat * 1e5) / 1e5, lng: Math.round(pin.lng * 1e5) / 1e5 });

/** "36.16270, -86.78160": how a pin is written back to the organizer. */
export const formatPin = (pin: Pin): string => `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;

export function parseCoordinates(text: string): ParsedCoordinates {
  const m = PAIR.exec(text.replace(/[°º]/g, " ").trim());
  if (!m) return { ok: false, message: COORDINATES_HELP };
  const [, latBefore, latText, latAfter, lngBefore, lngText, lngAfter] = m;
  const south = (latBefore ?? latAfter ?? "").toUpperCase() === "S";
  const west = (lngBefore ?? lngAfter ?? "").toUpperCase() === "W";
  const lat = Number(latText) * (south ? -1 : 1);
  const lng = Number(lngText) * (west ? -1 : 1);
  const checked = pinSchema.safeParse({ lat: south ? -Math.abs(lat) : lat, lng: west ? -Math.abs(lng) : lng });
  if (!checked.success) return { ok: false, message: checked.error.issues[0]?.message ?? COORDINATES_HELP };
  return { ok: true, pin: roundPin(checked.data) };
}
