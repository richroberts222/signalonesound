import type { MockEvent, MockOrigin, MockOrganization } from "./types";

// MOCK DATA ONLY (Issue #66). Every church, ministry, speaker, venue address,
// and event below is fictional; cities and coordinates are real so distance and
// map behavior are believable. Nothing here is persisted or read from a
// database. Links use the reserved example.org domain.

/** Fixed "today" so the mock is deterministic. Monday. */
export const MOCK_TODAY = "2026-10-05";

export const MOCK_ORIGINS: MockOrigin[] = [
  { id: "nashville", label: "Nashville, TN", lat: 36.1627, lng: -86.7816 },
  { id: "dallas", label: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { id: "tulsa", label: "Tulsa, OK", lat: 36.154, lng: -95.9928 },
];

const org = (name: string, slug: string, extra = false): MockOrganization => ({
  name,
  links: [
    { label: "Website", url: `https://example.org/${slug}` },
    ...(extra ? [{ label: "Facebook", url: `https://example.org/${slug}/social` }] : []),
  ],
});

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "monday-night-prayer-nashville",
    title: "Monday Night Prayer Watch",
    summary: "An open hour of corporate prayer for the city. Come as you are.",
    description:
      "A simple, unhurried hour of prayer for Nashville, our schools, and our families. No program, no pressure: worship softly, pray together, and leave with a heart refreshed.",
    revivalTypes: ["prayer-gathering"],
    date: "2026-10-05",
    startTime: "19:00",
    endTime: "20:00",
    venue: { name: "Upper Room Chapel", street: "410 Church Street", city: "Nashville", state: "TN", zip: "37219", lat: 36.1646, lng: -86.7813 },
    organization: org("Cornerstone Fellowship Nashville", "cornerstone-nashville"),
  },
  {
    id: "fire-fall-tent-revival-franklin",
    title: "Fire Fall Tent Revival",
    summary: "Four nights under the canvas with preaching, worship, and prayer for the sick.",
    description:
      "Join us for four nights of old-fashioned tent revival. Expect passionate worship, bold preaching, altar calls, and time set apart each night for healing prayer. Bring a lawn chair and a friend. Nightly child care is available.",
    revivalTypes: ["tent-revival", "healing-deliverance"],
    date: "2026-10-08",
    endDate: "2026-10-11",
    startTime: "19:00",
    endTime: "21:30",
    venue: { name: "Harpeth Fairgrounds", street: "1200 Mallory Lane", city: "Franklin", state: "TN", zip: "37067", lat: 35.9251, lng: -86.8689 },
    organization: org("Harvest Gate Tent Ministries", "harvest-gate", true),
    speakers: [
      { name: "Evangelist Daniel Reyes", role: "Nightly preacher" },
      { name: "Pastor Naomi Whitfield", role: "Guest speaker, Friday" },
    ],
  },
  {
    id: "rise-and-sing-worship-night",
    title: "Rise & Sing Worship Night",
    summary: "Two hours of unbroken worship with a live band and open-mic testimonies.",
    description:
      "An evening of extended worship with no agenda but His presence. A short testimony time opens the night; doors open at 6:30 PM and seating is first come.",
    revivalTypes: ["worship-night"],
    date: "2026-10-09",
    startTime: "19:30",
    endTime: "21:30",
    venue: { name: "Riverside Community Church", street: "88 Woodland Street", city: "Nashville", state: "TN", zip: "37206", lat: 36.1735, lng: -86.7527 },
    organization: org("Riverside Community Church", "riverside-community", true),
  },
  {
    id: "dallas-womens-prayer-breakfast",
    title: "Women's Prayer Breakfast",
    summary: "Breakfast, worship, and a morning of prayer for women of every age.",
    description:
      "Gather with women from across the city for a hot breakfast, a short word, and extended prayer. Reservations are appreciated but not required.",
    revivalTypes: ["women", "prayer-gathering"],
    date: "2026-10-10",
    startTime: "09:00",
    endTime: "11:30",
    venue: { name: "Lakewood Fellowship Hall", street: "5300 Abrams Road", city: "Dallas", state: "TX", zip: "75214", lat: 32.8194, lng: -96.7566 },
    organization: org("Lakewood Fellowship", "lakewood-fellowship"),
    speakers: [{ name: "Rev. Carla Montgomery" }],
  },
  {
    id: "baptism-sunday-hendersonville",
    title: "Baptism Sunday at the Lake",
    summary: "An outdoor baptism service followed by a shared picnic.",
    description:
      "Celebrate new life in Christ with an outdoor baptism service on the lake shore. Family and friends welcome; a picnic lunch follows. Please bring a towel and a change of clothes if you plan to be baptized.",
    revivalTypes: ["baptism", "family"],
    date: "2026-10-11",
    startTime: "14:00",
    endTime: "16:30",
    venue: { name: "Old Hickory Lake Shelter 4", street: "2 Rockland Road", city: "Hendersonville", state: "TN", zip: "37075", lat: 36.3048, lng: -86.62 },
    organization: org("Grace Harbor Church", "grace-harbor"),
  },
  {
    id: "metroplex-tent-revival-fort-worth",
    title: "Metroplex Tent Revival",
    summary: "Nightly revival services with a focus on healing and deliverance.",
    description:
      "A five-night tent revival in the heart of Fort Worth. Nightly services feature worship, preaching, and ministry time. All are welcome, no matter your church background.",
    revivalTypes: ["tent-revival", "healing-deliverance"],
    date: "2026-10-07",
    endDate: "2026-10-11",
    startTime: "19:00",
    endTime: "21:30",
    venue: { name: "Trinity Park Pavilion Lot", street: "2900 Rogers Avenue", city: "Fort Worth", state: "TX", zip: "76109", lat: 32.7555, lng: -97.3308 },
    organization: org("Lone Star Revival Ministries", "lone-star-revival", true),
    speakers: [{ name: "Evangelist Marcus Bell", role: "Nightly preacher" }],
  },
  {
    id: "plano-worship-encounter",
    title: "Plano Worship Encounter",
    summary: "A night of worship and prayer led by regional worship teams.",
    description:
      "Worship teams from across North Texas come together for one evening of praise. Parking is free; childcare provided for ages 0 to 5.",
    revivalTypes: ["worship-night"],
    date: "2026-10-09",
    startTime: "19:00",
    endTime: "21:00",
    venue: { name: "Legacy Church Sanctuary", street: "7700 Preston Road", city: "Plano", state: "TX", zip: "75024", lat: 33.0198, lng: -96.6989 },
    organization: org("Legacy Church Plano", "legacy-plano"),
  },
  {
    id: "green-country-revival-tulsa",
    title: "Green Country Revival",
    summary: "Three nights of preaching and worship in the heart of Tulsa.",
    description:
      "Three nights of Spirit-led worship and preaching. Friday and Saturday include extended altar ministry; Sunday closes with communion.",
    revivalTypes: ["church-revival"],
    date: "2026-10-09",
    endDate: "2026-10-11",
    startTime: "18:30",
    endTime: "21:00",
    venue: { name: "Cherry Street Chapel", street: "1530 East 15th Street", city: "Tulsa", state: "OK", zip: "74120", lat: 36.1438, lng: -95.9745 },
    organization: org("Cherry Street Chapel", "cherry-street-chapel", true),
    speakers: [{ name: "Pastor Isaiah Cole" }],
  },
  {
    id: "broken-arrow-family-night",
    title: "Family Revival Night",
    summary: "An all-ages evening with worship, a short message, and kids' activities.",
    description:
      "A relaxed evening built for the whole family: worship everyone can join, a short message, and a separate kids' program in the next room.",
    revivalTypes: ["family", "church-revival"],
    date: "2026-10-10",
    startTime: "18:00",
    endTime: "20:00",
    venue: { name: "Broken Arrow Family Church", street: "400 West Kenosha Street", city: "Broken Arrow", state: "OK", zip: "74012", lat: 36.0609, lng: -95.7975 },
    organization: org("Broken Arrow Family Church", "ba-family-church"),
  },
  {
    id: "clarksville-revival-nights",
    title: "Clarksville Revival Nights",
    summary: "Three nights of church revival with guest preaching.",
    description:
      "Our congregation is hosting three evenings of revival. Come expecting an encounter with God; nursery provided every night.",
    revivalTypes: ["church-revival"],
    date: "2026-10-12",
    endDate: "2026-10-14",
    startTime: "19:00",
    endTime: "21:00",
    venue: { name: "Redeemer Baptist Church", street: "1100 Madison Street", city: "Clarksville", state: "TN", zip: "37040", lat: 36.5298, lng: -87.3595 },
    organization: org("Redeemer Baptist Church", "redeemer-clarksville"),
    speakers: [{ name: "Dr. Thomas Ainsley", role: "Guest preacher" }],
  },
  {
    id: "smyrna-harvest-family-night",
    title: "Harvest Family Revival Night",
    summary: "A harvest-themed family night with worship, a message, and fellowship.",
    description:
      "A midweek family night with a harvest theme: chili supper at 6 PM, then worship and a message at 6:30 PM. Costumes are not required.",
    revivalTypes: ["family", "church-revival"],
    date: "2026-10-14",
    startTime: "18:00",
    endTime: "20:00",
    venue: { name: "Smyrna Vineyard Fellowship", street: "301 Sam Ridley Parkway", city: "Smyrna", state: "TN", zip: "37167", lat: 35.9828, lng: -86.5186 },
    organization: org("Smyrna Vineyard Fellowship", "smyrna-vineyard"),
  },
  {
    id: "waco-prayer-healing-night",
    title: "Prayer & Healing Night",
    summary: "An evening of prayer for the sick, with testimonies of recent healings.",
    description:
      "A quiet, prayerful evening centered on healing. Come for yourself or on behalf of someone you love; our prayer team will be available throughout the night.",
    revivalTypes: ["prayer-gathering", "healing-deliverance"],
    date: "2026-10-15",
    startTime: "19:00",
    endTime: "21:00",
    venue: { name: "Brazos Valley Chapel", street: "2201 Franklin Avenue", city: "Waco", state: "TX", zip: "76701", lat: 31.5493, lng: -97.1467 },
    organization: org("Brazos Valley Chapel", "brazos-valley"),
  },
  {
    id: "murfreesboro-24-hour-prayer",
    title: "24-Hour Prayer Watch",
    summary: "Around-the-clock prayer from Friday evening to Saturday evening.",
    description:
      "Sign up for an hour, or drop in any time. We will keep a continuous watch of prayer and worship for 24 hours. A prayer guide is provided at the door.",
    revivalTypes: ["prayer-gathering"],
    date: "2026-10-16",
    endDate: "2026-10-17",
    startTime: "18:00",
    endTime: "18:00",
    venue: { name: "Middle Tennessee Prayer House", street: "55 Church Street", city: "Murfreesboro", state: "TN", zip: "37130", lat: 35.8456, lng: -86.3903 },
    organization: org("Middle Tennessee Prayer House", "mt-prayer-house", true),
  },
  {
    id: "lebanon-youth-ignite",
    title: "Youth Ignite Night",
    summary: "High-energy worship, games, and a message for students in grades 6 to 12.",
    description:
      "Students from across the region gather for worship, games, and a challenging message. Free pizza at 6 PM. Parents are welcome to stay.",
    revivalTypes: ["youth"],
    date: "2026-10-17",
    startTime: "18:30",
    endTime: "21:00",
    venue: { name: "Wilson County Student Center", street: "800 West Main Street", city: "Lebanon", state: "TN", zip: "37087", lat: 36.2081, lng: -86.2911 },
    organization: org("Wilson County Youth Alliance", "wilson-youth"),
    speakers: [{ name: "Youth Pastor Jordan Lee" }],
  },
  {
    id: "antioch-outreach-day",
    title: "Community Gospel Outreach Day",
    summary: "Serve the neighborhood with a cleanup, a free meal, and open-air worship.",
    description:
      "Teams will spread out across the neighborhood for a morning of service, then gather for a free community meal and open-air worship.",
    revivalTypes: ["other"],
    date: "2026-10-17",
    startTime: "09:00",
    endTime: "14:00",
    venue: { name: "Antioch Community Park", street: "5000 Hickory Hollow Parkway", city: "Antioch", state: "TN", zip: "37013", lat: 36.0606, lng: -86.6722 },
    organization: org("Antioch Neighbors Ministry", "antioch-neighbors"),
  },
  {
    id: "arlington-youth-revival-rally",
    title: "Texas Youth Revival Rally",
    summary: "A stadium-style rally with worship, testimonies, and altar time for students.",
    description:
      "Thousands of students are expected for an evening rally with worship bands, powerful testimonies, and a live altar call. Church groups can pre-register for reserved seating.",
    revivalTypes: ["youth", "conference"],
    date: "2026-10-18",
    startTime: "17:00",
    endTime: "20:30",
    venue: { name: "Arlington Event Center", street: "1500 Randol Mill Road", city: "Arlington", state: "TX", zip: "76011", lat: 32.7357, lng: -97.1081 },
    organization: org("North Texas Youth Revival", "nt-youth-revival", true),
  },
  {
    id: "brentwood-women-of-wonder",
    title: "Women of Wonder Conference",
    summary: "Two days of worship, teaching, and fellowship for women.",
    description:
      "Women of Wonder gathers women from across Middle Tennessee for two days of worship, teaching, and breakout sessions on prayer, purpose, and community.",
    revivalTypes: ["women", "conference"],
    date: "2026-10-23",
    endDate: "2026-10-24",
    startTime: "09:00",
    endTime: "16:00",
    venue: { name: "Brentwood Conference Center", street: "7000 Church Street East", city: "Brentwood", state: "TN", zip: "37027", lat: 36.0331, lng: -86.7828 },
    organization: org("Women of Wonder Ministries", "women-of-wonder", true),
    speakers: [
      { name: "Dr. Elena Park", role: "Keynote" },
      { name: "Pastor Rachel Owens", role: "Breakout leader" },
    ],
  },
  {
    id: "gallatin-mens-iron-breakfast",
    title: "Men's Iron Breakfast",
    summary: "Breakfast, accountability, and a straight-talk message for men.",
    description:
      "Start your Saturday with breakfast, a short challenging message, and small-group prayer. Open to men of all ages.",
    revivalTypes: ["men"],
    date: "2026-10-24",
    startTime: "08:00",
    endTime: "10:00",
    venue: { name: "Sumner County Fellowship Hall", street: "310 North Water Avenue", city: "Gallatin", state: "TN", zip: "37066", lat: 36.3884, lng: -86.4467 },
    organization: org("Sumner County Men's Fellowship", "sumner-mens"),
  },
  {
    id: "garland-baptism-celebration",
    title: "Baptism & Celebration Day",
    summary: "A community baptism service followed by a celebration.",
    description:
      "Join us as new believers are baptized, followed by a community celebration with food and music.",
    revivalTypes: ["baptism"],
    date: "2026-10-25",
    startTime: "15:00",
    endTime: "17:00",
    venue: { name: "Lake Ray Hubbard Overlook", street: "3000 Lakeview Parkway", city: "Garland", state: "TX", zip: "75040", lat: 32.9126, lng: -96.6389 },
    organization: org("Eastside Christian Fellowship", "eastside-christian"),
  },
  {
    id: "chattanooga-awakening-conference",
    title: "Awakening Conference",
    summary: "A three-day conference of worship, teaching, and prayer for revival.",
    description:
      "Three days of main sessions and workshops on prayer, evangelism, and church renewal, with worship led by regional teams. Group rates are available for churches.",
    revivalTypes: ["conference", "prayer-gathering"],
    date: "2026-11-06",
    endDate: "2026-11-08",
    startTime: "18:30",
    endTime: "21:00",
    venue: { name: "Tennessee Valley Convention Hall", street: "1150 Market Street", city: "Chattanooga", state: "TN", zip: "37402", lat: 35.0456, lng: -85.3097 },
    organization: org("Awakening Network", "awakening-network", true),
    speakers: [
      { name: "Bishop Samuel Okafor", role: "Keynote" },
      { name: "Evangelist Ruth Delaney", role: "Evening sessions" },
      { name: "Pastor Luis Herrera", role: "Prayer track" },
    ],
  },
];

export function findMockEvent(id: string): MockEvent | undefined {
  return MOCK_EVENTS.find((e) => e.id === id);
}

export function findMockOrigin(id: string | null): MockOrigin | undefined {
  return id ? MOCK_ORIGINS.find((o) => o.id === id) : undefined;
}
