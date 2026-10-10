// Opening an event from a link: signalone://event/<id>. The id comes from outside the app, so it is only
// accepted when it has the exact shape of an event id (S5 AC4 and the tampered-link hostile case).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isEventId = (value: string): boolean => UUID.test(value);

/** The event id in a link, or null when the link is not an event link or the id is malformed. */
export function parseEventLink(url: string): string | null {
  const match = /^signalone:\/\/\/?event\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(url.trim());
  return match && isEventId(match[1]) ? match[1] : null;
}
