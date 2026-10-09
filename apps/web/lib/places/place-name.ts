// Matching what a person types ("nashville", "St. Louis", "Winston-Salem") to the place names in the
// Census gazetteer ("Nashville-Davidson metropolitan government (balance)", "St. Louis city").
// The same functions build the data file and read it, so a name is always keyed the same way.

const DESIGNATIONS = [
  "city and borough",
  "metropolitan government",
  "consolidated government",
  "unified government",
  "urban county",
  "municipality",
  "township",
  "plantation",
  "comunidad",
  "zona urbana",
  "borough",
  "village",
  "town",
  "city",
  "cdp",
];

const strip = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "(balance)"
    .replace(/[.'\u2019]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** One searchable key: lower-case words with the official designation (city, town, CDP...) removed. */
export function normalizePlaceName(raw: string): string {
  let name = strip(raw);
  for (let changed = true; changed; ) {
    changed = false;
    for (const word of DESIGNATIONS) {
      if (name.endsWith(` ${word}`)) {
        name = name.slice(0, -(word.length + 1)).trim();
        changed = true;
      }
    }
  }
  return name.replace(/[/-]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * All keys a gazetteer name should be found under: the full name, the part before the first hyphen or
 * slash ("Nashville-Davidson" is found as "nashville"), and the "saint" / "st" spellings.
 */
export function placeKeys(raw: string): string[] {
  const name = strip(raw);
  const keys = new Set<string>([normalizePlaceName(raw)]);
  const head = name.split(/[/-]/)[0]?.trim();
  if (head && head !== name) keys.add(normalizePlaceName(head));
  for (const key of [...keys]) {
    if (key.startsWith("st ")) keys.add(`saint ${key.slice(3)}`);
    if (key.startsWith("saint ")) keys.add(`st ${key.slice(6)}`);
    if (key.startsWith("mt ")) keys.add(`mount ${key.slice(3)}`);
    if (key.startsWith("mount ")) keys.add(`mt ${key.slice(6)}`);
    if (key.startsWith("ft ")) keys.add(`fort ${key.slice(3)}`);
  }
  return [...keys].filter((k) => k.length > 0);
}

export const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};
const STATE_CODES = new Set(Object.values(STATE_NAMES));

export type ParsedPlaceQuery = { kind: "zip"; zip: string } | { kind: "city"; name: string; state: string | null };

/**
 * Reads what a person typed: a 5-digit ZIP (or ZIP+4), or "City", "City, ST", "City ST" or
 * "City, State name". Anything else is not a place we can find.
 */
export function parsePlaceQuery(input: string): ParsedPlaceQuery | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (text.length === 0 || text.length > 100) return null;
  const zip = /^(\d{5})(?:-\d{4})?$/.exec(text);
  if (zip) return { kind: "zip", zip: zip[1] };
  if (/\d/.test(text)) return null;

  const comma = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (comma.length === 2) {
    const state = stateFrom(comma[1]);
    return state ? { kind: "city", name: normalizePlaceName(comma[0]), state } : null;
  }
  if (comma.length > 2) return null;
  // "Nashville TN" or "Nashville Tennessee" or "San Antonio Texas"
  const words = text.split(" ");
  for (const take of [2, 1]) {
    if (words.length > take) {
      const state = stateFrom(words.slice(-take).join(" "));
      if (state) return { kind: "city", name: normalizePlaceName(words.slice(0, -take).join(" ")), state };
    }
  }
  return { kind: "city", name: normalizePlaceName(text), state: null };
}

function stateFrom(value: string): string | null {
  const upper = value.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;
  return STATE_NAMES[strip(value)] ?? null;
}
