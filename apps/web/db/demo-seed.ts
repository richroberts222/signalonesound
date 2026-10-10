import type { Seed } from "./tooling/seed";

// Sample churches and events for showing the product (demos, screenshots, manual testing). Everything here is
// fictional: names say "(Sample)", streets are made up, and no person is named. It runs only through
// `db:seed:demo`, which accepts dev and qa and refuses production (docs/database.md section 12). Dates are
// relative to the day it runs, so a demo always shows upcoming events. Ids are derived from fixed text, so
// running it twice cannot create duplicates.
type Org = {
  name: string;
  about: string;
  venue: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  zone: string;
  site: string;
};

export const DEMO_ORGS: readonly Org[] = [
  { name: "Harvest Gate Fellowship (Sample)", about: "A neighborhood church that hosts worship nights and seasonal revival weeks.", venue: "Harvest Gate Sanctuary", street: "100 Sample Way", city: "Nashville", state: "TN", zip: "37203", lat: 36.16, lng: -86.78, zone: "America/Chicago", site: "https://example.org/harvest-gate" },
  { name: "River of Mercy Church (Sample)", about: "Prayer and outdoor gatherings across the bay area.", venue: "River of Mercy Hall", street: "250 Sample Avenue", city: "Tampa", state: "FL", zip: "33602", lat: 27.95, lng: -82.46, zone: "America/New_York", site: "https://example.org/river-of-mercy" },
  { name: "Open Heavens Tent Ministry (Sample)", about: "A traveling tent ministry holding multi-night revivals.", venue: "Open Heavens Tent Grounds", street: "40 Fairground Road", city: "Memphis", state: "TN", zip: "38103", lat: 35.15, lng: -90.05, zone: "America/Chicago", site: "https://example.org/open-heavens" },
  { name: "Living Water Chapel (Sample)", about: "Baptisms, youth nights and family gatherings.", venue: "Living Water Chapel", street: "18 Sample Court", city: "Atlanta", state: "GA", zip: "30303", lat: 33.75, lng: -84.39, zone: "America/New_York", site: "https://example.org/living-water" },
  { name: "Cornerstone Revival Center (Sample)", about: "A larger congregation that hosts conferences and city-wide revival weekends.", venue: "Cornerstone Conference Hall", street: "700 Sample Boulevard", city: "Dallas", state: "TX", zip: "75201", lat: 32.78, lng: -96.8, zone: "America/Chicago", site: "https://example.org/cornerstone" },
  { name: "Mountain View Gathering (Sample)", about: "Worship and healing services in the foothills.", venue: "Mountain View Meeting Room", street: "9 Sample Ridge Road", city: "Charlotte", state: "NC", zip: "28202", lat: 35.23, lng: -80.84, zone: "America/New_York", site: "https://example.org/mountain-view" },
  { name: "Grace Harbor Church (Sample)", about: "Men's, women's and family events through the year.", venue: "Grace Harbor Fellowship Hall", street: "321 Sample Lane", city: "Birmingham", state: "AL", zip: "35203", lat: 33.52, lng: -86.8, zone: "America/Chicago", site: "https://example.org/grace-harbor" },
  { name: "Bluegrass Prayer House (Sample)", about: "Weekly prayer gatherings and a monthly night of worship.", venue: "Bluegrass Prayer House", street: "55 Sample Street", city: "Louisville", state: "KY", zip: "40202", lat: 38.25, lng: -85.76, zone: "America/New_York", site: "https://example.org/bluegrass-prayer" },
  { name: "Prairie Fire Ministries (Sample)", about: "Outdoor revival meetings and youth camps on the plains.", venue: "Prairie Fire Pavilion", street: "12 Sample Prairie Road", city: "Oklahoma City", state: "OK", zip: "73102", lat: 35.47, lng: -97.52, zone: "America/Chicago", site: "https://example.org/prairie-fire" },
  { name: "Desert Spring Church (Sample)", about: "A growing church hosting worship nights and community baptisms.", venue: "Desert Spring Sanctuary", street: "88 Sample Palm Drive", city: "Phoenix", state: "AZ", zip: "85004", lat: 33.45, lng: -112.07, zone: "America/Phoenix", site: "https://example.org/desert-spring" },
  { name: "Treasure Valley Fellowship (Sample)", about: "A growing church in the Boise area hosting worship nights, youth events and baptisms.", venue: "Treasure Valley Sanctuary", street: "500 Sample Capitol Boulevard", city: "Boise", state: "ID", zip: "83702", lat: 43.62, lng: -116.2, zone: "America/Boise", site: "https://example.org/treasure-valley" },
  { name: "Canyon County Gathering (Sample)", about: "Prayer gatherings, tent revival weeks and family nights across the valley.", venue: "Canyon County Fairground Pavilion", street: "22 Sample Fairview Road", city: "Nampa", state: "ID", zip: "83651", lat: 43.54, lng: -116.56, zone: "America/Boise", site: "https://example.org/canyon-county" },
  { name: "Meridian Hope Chapel (Sample)", about: "Men's and women's events, healing services and weekly prayer.", venue: "Hope Chapel Hall", street: "8 Sample Locust Grove Lane", city: "Meridian", state: "ID", zip: "83642", lat: 43.61, lng: -116.39, zone: "America/Boise", site: "https://example.org/meridian-hope" },
];

type Ev = {
  org: number;
  title: string;
  about: string;
  types: readonly string[];
  inDays: number;
  start: string;
  hours: number;
  speakers?: string;
  directions?: string;
  cancelled?: boolean;
};

export const DEMO_EVENTS: readonly Ev[] = [
  { org: 0, title: "Worship Night: Come and Sing", about: "An evening of worship, open to everyone. Doors open at 6:30 pm.", types: ["worship-nights"], inDays: 3, start: "19:00", hours: 2, directions: "Park in the rear lot; the entrance is by the bell tower." },
  { org: 0, title: "Autumn Revival Week: Night One", about: "The first of five nights of preaching, worship and prayer.", types: ["church-revivals"], inDays: 6, start: "19:00", hours: 2, speakers: "Guest speaker (sample)" },
  { org: 0, title: "Autumn Revival Week: Night Two", about: "Second night of the revival week.", types: ["church-revivals"], inDays: 7, start: "19:00", hours: 2, speakers: "Guest speaker (sample)" },
  { org: 0, title: "Community Prayer Gathering", about: "Come pray for the city and for one another.", types: ["prayer-gatherings"], inDays: 12, start: "18:30", hours: 1 },
  { org: 0, title: "Family Fall Festival", about: "Games, food and a short message for the whole family.", types: ["family-events"], inDays: 20, start: "16:00", hours: 3 },
  { org: 1, title: "Bayside Prayer Walk", about: "Meet at the hall, then walk and pray through the neighborhood.", types: ["prayer-gatherings"], inDays: 4, start: "08:00", hours: 2 },
  { org: 1, title: "Night of Healing and Deliverance", about: "A service of prayer for healing, with ministry teams available.", types: ["healing-deliverance", "worship-nights"], inDays: 11, start: "19:00", hours: 2 },
  { org: 1, title: "Sunrise Baptisms on the Water", about: "Baptisms at sunrise. Bring a change of clothes and a towel.", types: ["baptisms"], inDays: 25, start: "07:00", hours: 2 },
  { org: 2, title: "Open Heavens Tent Revival: Night One", about: "Five nights under the big tent with worship and a message each evening.", types: ["tent-revivals"], inDays: 9, start: "19:30", hours: 2, directions: "Follow the signs from the fairgrounds main gate." },
  { org: 2, title: "Open Heavens Tent Revival: Night Two", about: "Second night under the tent.", types: ["tent-revivals"], inDays: 10, start: "19:30", hours: 2 },
  { org: 2, title: "Open Heavens Tent Revival: Night Three", about: "Third night; this night was cancelled because of the weather forecast.", types: ["tent-revivals"], inDays: 11, start: "19:30", hours: 2, cancelled: true },
  { org: 3, title: "Youth Night: Louder", about: "Music, a short talk and games for students in grades 7 to 12.", types: ["youth-events", "worship-nights"], inDays: 5, start: "18:30", hours: 2 },
  { org: 3, title: "Community Baptism Sunday", about: "Baptisms during the morning service. Everyone is welcome to watch and celebrate.", types: ["baptisms"], inDays: 14, start: "10:30", hours: 2 },
  { org: 3, title: "Family Movie and Message Night", about: "A family-friendly film with a short reflection afterward.", types: ["family-events"], inDays: 28, start: "18:00", hours: 3 },
  { org: 4, title: "City Revival Weekend: Friday", about: "A weekend of preaching and worship with a visiting speaker.", types: ["conferences", "church-revivals"], inDays: 16, start: "19:00", hours: 2, speakers: "Visiting speaker (sample)" },
  { org: 4, title: "City Revival Weekend: Saturday", about: "Day two of the revival weekend, with a morning prayer session.", types: ["conferences", "church-revivals"], inDays: 17, start: "10:00", hours: 6, speakers: "Visiting speaker (sample)" },
  { org: 4, title: "Worship Night Live", about: "Two hours of live worship and open prayer.", types: ["worship-nights"], inDays: 8, start: "19:00", hours: 2 },
  { org: 5, title: "Foothills Worship and Healing Service", about: "A quiet evening of worship and prayer for healing.", types: ["healing-deliverance", "worship-nights"], inDays: 13, start: "18:30", hours: 2 },
  { org: 5, title: "Men's Breakfast and Prayer", about: "Breakfast, a short message and prayer for the week ahead.", types: ["mens-events"], inDays: 6, start: "07:30", hours: 2 },
  { org: 6, title: "Women's Night of Encouragement", about: "An evening of worship and a message, with refreshments.", types: ["womens-events"], inDays: 15, start: "18:30", hours: 2 },
  { org: 6, title: "Men's Revival Breakfast", about: "A morning gathering for men, with a guest speaker.", types: ["mens-events", "church-revivals"], inDays: 22, start: "07:30", hours: 2, speakers: "Guest speaker (sample)" },
  { org: 6, title: "Family Prayer Evening", about: "Parents and children praying together.", types: ["family-events", "prayer-gatherings"], inDays: 9, start: "18:00", hours: 1 },
  { org: 7, title: "Wednesday Prayer Gathering", about: "Our weekly midweek prayer meeting. Come as you are.", types: ["prayer-gatherings"], inDays: 2, start: "19:00", hours: 1 },
  { org: 7, title: "Monthly Night of Worship", about: "A full evening of worship with no program, just praise.", types: ["worship-nights"], inDays: 18, start: "19:00", hours: 3 },
  { org: 8, title: "Prairie Fire Outdoor Revival", about: "Three evenings of worship and preaching at the pavilion. Bring a lawn chair.", types: ["tent-revivals", "church-revivals"], inDays: 21, start: "19:00", hours: 2, directions: "Gravel parking is on the north side of the pavilion." },
  { org: 8, title: "Student Summer Camp Reunion", about: "A reunion night for last summer's campers and their friends.", types: ["youth-events"], inDays: 30, start: "18:00", hours: 3 },
  { org: 9, title: "Desert Spring Worship Night", about: "An evening of worship in the sanctuary, open to all.", types: ["worship-nights"], inDays: 7, start: "19:00", hours: 2 },
  { org: 9, title: "Community Baptisms at the Park", about: "Baptisms at the park pool, followed by a picnic.", types: ["baptisms", "family-events"], inDays: 35, start: "09:00", hours: 4 },
  { org: 10, title: "Valley Worship Night", about: "An evening of worship and prayer, open to everyone in the valley.", types: ["worship-nights"], inDays: 5, start: "19:00", hours: 2 },
  { org: 10, title: "Youth Night: Boise Rally", about: "Games, music and a short message for teens and students.", types: ["youth-events"], inDays: 11, start: "18:30", hours: 3 },
  { org: 10, title: "Baptism Sunday at the River Park", about: "Baptisms at the river park, with a potluck afterward.", types: ["baptisms", "family-events"], inDays: 24, start: "13:00", hours: 3 },
  { org: 11, title: "Canyon County Tent Revival: Night One", about: "Preaching, worship and prayer under the tent, nightly for a week.", types: ["tent-revivals"], inDays: 14, start: "19:00", hours: 2, speakers: "Visiting evangelist (sample)" },
  { org: 11, title: "Canyon County Tent Revival: Night Two", about: "The second night of the tent revival, with testimonies.", types: ["tent-revivals"], inDays: 15, start: "19:00", hours: 2, speakers: "Visiting evangelist (sample)" },
  { org: 11, title: "Neighborhood Prayer Walk", about: "A short walk and prayer around the neighborhood. Dress for the weather.", types: ["prayer-gatherings"], inDays: 4, start: "09:00", hours: 1 },
  { org: 12, title: "Healing and Worship Evening", about: "A calm evening of worship and prayer for healing.", types: ["healing-deliverance", "worship-nights"], inDays: 9, start: "18:30", hours: 2 },
  { org: 12, title: "Men's Breakfast and Message", about: "Breakfast, a short message and prayer for the week.", types: ["mens-events"], inDays: 7, start: "07:30", hours: 2 },
  { org: 12, title: "Women's Evening of Worship", about: "An evening of worship and encouragement, with refreshments.", types: ["womens-events"], inDays: 19, start: "18:30", hours: 2 },
];

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
// A stable, valid version-4-shaped UUID: the app's contracts validate ids strictly, and a plain md5 hash is
// not one (its version and variant digits are arbitrary), which made every client reject the reply.
const id = (kind: string, n: number) => `overlay(overlay(md5('demo-${kind}-${n}') placing '4' from 13 for 1) placing '8' from 17 for 1)::uuid`;
// The first version of this seed used the plain hash. Databases that already hold those rows keep them
// (the seed never overwrites), so they are removed here before the valid ones are inserted.
const legacyId = (kind: string, n: number) => `md5('demo-${kind}-${n}')::uuid`;
const nameKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
/** A local wall-clock time `inDays` from today in the event's own time zone, as an exact moment. */
const when = (inDays: number, time: string, zone: string, plusHours = 0) =>
  `((current_date + ${inDays}) + time ${q(time)} + interval '${plusHours} hours') AT TIME ZONE ${q(zone)}`;

export function demoStatements(): string[] {
  const out: string[] = [];
  DEMO_EVENTS.forEach((_, n) => {
    out.push(
      `DELETE FROM event_revival_type WHERE event_id = ${legacyId("event", n)}`,
      `DELETE FROM event_link WHERE event_id = ${legacyId("event", n)}`,
      `DELETE FROM event WHERE id = ${legacyId("event", n)}`,
    );
  });
  DEMO_ORGS.forEach((_, i) => {
    out.push(`DELETE FROM organization_link WHERE org_id = ${legacyId("org", i)}`, `DELETE FROM organization WHERE id = ${legacyId("org", i)}`);
  });
  DEMO_ORGS.forEach((o, i) => {
    out.push(
      `INSERT INTO organization (id, name, name_key, description, status) VALUES (${id("org", i)}, ${q(o.name)}, ${q(nameKey(o.name))}, ${q(`${o.about} Sample listing for demonstration only; not a real church.`)}, 'approved') ON CONFLICT DO NOTHING`,
      `INSERT INTO organization_link (org_id, url, position) VALUES (${id("org", i)}, ${q(o.site)}, 0) ON CONFLICT DO NOTHING`,
    );
  });
  DEMO_EVENTS.forEach((e, n) => {
    const o = DEMO_ORGS[e.org];
    out.push(
      `INSERT INTO event (id, org_id, title, description, status, moderation_state, starts_at, ends_at, time_zone, venue_name, street, city, state, zip, lat, lng, speakers, directions) VALUES (${id("event", n)}, ${id("org", e.org)}, ${q(e.title)}, ${q(e.about)}, ${q(e.cancelled ? "cancelled" : "published")}, 'published', ${when(e.inDays, e.start, o.zone)}, ${when(e.inDays, e.start, o.zone, e.hours)}, ${q(o.zone)}, ${q(o.venue)}, ${q(o.street)}, ${q(o.city)}, ${q(o.state)}, ${q(o.zip)}, ${o.lat}, ${o.lng}, ${e.speakers ? q(e.speakers) : "NULL"}, ${e.directions ? q(e.directions) : "NULL"}) ON CONFLICT DO NOTHING`,
      ...e.types.map((slug) => `INSERT INTO event_revival_type (event_id, type_slug) VALUES (${id("event", n)}, ${q(slug)}) ON CONFLICT DO NOTHING`),
      `INSERT INTO event_link (event_id, url, position) VALUES (${id("event", n)}, ${q(o.site)}, 0) ON CONFLICT DO NOTHING`,
    );
  });
  return out;
}

export const DEMO_SEEDS: readonly Seed[] = [
  {
    id: "demo-churches-and-events-v3",
    description: "Thirteen sample churches (including three in the Boise area) and about forty upcoming sample events, for demonstrations.",
    statements: demoStatements(),
  },
];
