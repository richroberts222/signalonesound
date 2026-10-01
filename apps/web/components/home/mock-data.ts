// Static mock data for the Signal One home concept (issue #57).
// Not a domain model, not persisted, not fetched. Placeholder content only.

export const eventTypes = [
  "All",
  "Revival",
  "Worship Night",
  "Prayer",
  "Conference",
  "Youth",
] as const;

export type EventType = (typeof eventTypes)[number];

export type MockGathering = {
  id: string;
  title: string;
  type: Exclude<EventType, "All">;
  host: string;
  place: string;
  distance: string;
  when: string;
  blurb: string;
  featured?: boolean;
};

export const gatherings: MockGathering[] = [
  {
    id: "g1",
    title: "Upper Room Revival Nights",
    type: "Revival",
    host: "Example Fellowship",
    place: "Downtown Auditorium",
    distance: "2.4 mi",
    when: "Fri · 7:00 PM",
    blurb: "Three nights of worship, the Word, and waiting on God together.",
    featured: true,
  },
  {
    id: "g2",
    title: "Midnight Worship Gathering",
    type: "Worship Night",
    host: "Sample Worship Collective",
    place: "Riverside Hall",
    distance: "4.1 mi",
    when: "Sat · 9:30 PM",
    blurb: "An unhurried night of live worship and open response.",
  },
  {
    id: "g3",
    title: "Watch & Pray: Citywide",
    type: "Prayer",
    host: "Sample Prayer Network",
    place: "Hilltop Chapel",
    distance: "1.8 mi",
    when: "Wed · 6:00 AM",
    blurb: "Churches across the city praying as one before the day begins.",
  },
  {
    id: "g4",
    title: "Awakened Conference",
    type: "Conference",
    host: "Example Ministries",
    place: "Convention Center",
    distance: "11 mi",
    when: "Oct 24–26",
    blurb: "A weekend of teaching, worship, and testimony from many churches.",
    featured: true,
  },
  {
    id: "g5",
    title: "Ignite Youth Night",
    type: "Youth",
    host: "Sample Youth Alliance",
    place: "Community Gym",
    distance: "3.3 mi",
    when: "Thu · 7:30 PM",
    blurb: "High-energy worship and honest conversation for students.",
  },
  {
    id: "g6",
    title: "Fire on the Altar",
    type: "Revival",
    host: "Example Church",
    place: "Main Sanctuary",
    distance: "6.7 mi",
    when: "Sun · 5:00 PM",
    blurb: "A Sunday evening gathering centered on repentance and renewal.",
  },
];

export const mapPins = [
  { id: "p1", top: "22%", left: "30%", label: "Upper Room Revival Nights" },
  { id: "p2", top: "48%", left: "62%", label: "Midnight Worship Gathering" },
  { id: "p3", top: "70%", left: "28%", label: "Watch and Pray: Citywide" },
  { id: "p4", top: "30%", left: "78%", label: "Awakened Conference" },
  { id: "p5", top: "62%", left: "48%", label: "Ignite Youth Night" },
];
