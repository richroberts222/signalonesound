// The words on the public pages (S15, docs/features/s15-public-pages.md), drafted from the requirements
// (docs/product/product-plan.md: mission, vision, scripture, the problem, the Phase 1 features and the church
// portal). Rules for this file: say only what the app does today or what the plan lists, label anything
// planned as "coming", never state a number of users, churches, events or ratings, and keep example content
// labeled "Example". `content.test.ts` enforces these. The owner and partner review the wording before launch.

export const MISSION = "Connect believers with churches, ministries, and revival gatherings while strengthening local churches and encouraging spiritual awakening through technology.";
export const VISION = "To be the largest Christian revival discovery platform in the U.S., and eventually around the world.";
export const PROBLEM = "Revival gatherings, tent meetings and church events are shared in a hundred places, and the posts that announce them quickly disappear. There has been no widely used place that gathers them across denominations and independent ministries.";
export const SCRIPTURE = { text: "A voice of one who cries: Prepare in the wilderness the way of the Lord [clear away the obstacles]; make straight and smooth in the desert a highway for our God!", reference: "Isaiah 40:3 (AMPC)" };

export const HOW_IT_WORKS = [
  { title: "Search", text: "Type a city, state or ZIP code, choose how far you will travel and what kind of gathering you want." },
  { title: "Save and share", text: "Keep the events that matter to you, and send an event link to a friend, with or without the app." },
  { title: "Be told", text: "Set what you care about, a place, a timeframe and the kinds of gathering, and we tell you when a match is coming." },
] as const;

export const FOR_PEOPLE = [
  "Search by place, distance (10, 25, 50 miles or any), date and kind of gathering",
  "No account needed to search",
  "Save events, share them and invite friends with a free account",
  "Set alerts for the places and kinds of gathering you care about",
] as const;

export const FOR_CHURCHES = [
  "A free church or ministry profile",
  "Submit unlimited events, with more than one kind of gathering per event",
  "Add up to three website or social links, plus speakers and directions",
  "Manage current and recurring events: edit, update, replace or remove",
] as const;

/** Free features, as the product plan lists them for the startup scope. */
export const SERVICES = {
  members: {
    free: [
      "Search by city, state or ZIP code, distance, date and kind of gathering",
      "A free member account to save events, share them and invite friends",
      "Alerts for the places, timeframes and kinds of gathering you choose",
      "Download or delete your information from your account at any time",
    ],
    coming: ["Reminders for events you pick", "Comments on active events", "A revival journey log for the events you save", "Optional paid membership with extra features"],
  },
  churches: {
    free: [
      "A free church or ministry profile with your website or social links",
      "Unlimited events, tagged with the kinds of gathering they are",
      "A dashboard to manage current and recurring events",
      "Your listing is reviewed by a person before it appears, so people can trust what they find",
    ],
    coming: ["Flyer uploads and livestream links", "Guest speakers with their own profiles", "Optional paid church accounts: featured placement, custom ministry pages, analytics and event promotion"],
  },
} as const;

/** Static example events for the landing page. They are never presented as real. */
export const EXAMPLE_EVENTS = [
  { title: "Worship Night: Come and Sing", kind: "Worship night", where: "Example Fellowship", when: "Friday, 7:00 pm", about: "An evening of worship, open to everyone." },
  { title: "Tent Revival, Night One", kind: "Tent revival", where: "Example Fairgrounds", when: "Saturday, 7:00 pm", about: "Preaching, worship and prayer under the tent." },
  { title: "Youth Night", kind: "Youth event", where: "Example Chapel", when: "Sunday, 6:30 pm", about: "Music, games and a short message for students." },
] as const;

export type FaqItem = { question: string; answer: string };

// Every answer describes what the app does today. Where a feature is still being switched on, it says so.
export const FAQ: readonly FaqItem[] = [
  { question: "What is Signal One Sound?", answer: `${MISSION}` },
  { question: "Is it free?", answer: "Yes, during early access. Searching, saving events, alerts and listing a church or ministry are free. Optional paid features may come later, and we will say so clearly before anything is charged." },
  { question: "Do I need an account to search?", answer: "No. Anyone can search for events. You need a free account to save events, set alerts and invite friends." },
  { question: "How do I find a revival near me?", answer: "Type a city, state or ZIP code, pick how far you will travel (10, 25 or 50 miles, or any distance), and choose a date range or a kind of gathering if you want to narrow it down." },
  { question: "What kinds of gatherings are listed?", answer: "Tent revivals, church revivals, baptisms, worship nights, prayer gatherings, healing and deliverance, conferences, youth events, women's events, men's events, family events and others. An event can be more than one kind." },
  { question: "Can I save an event or share it?", answer: "Yes. Create a free account to save events. You can share an event link with anyone, whether or not they use Signal One Sound." },
  { question: "How do alerts work?", answer: "You choose a place, a distance, a timeframe and the kinds of gathering you care about, and we tell you when a matching event is published. To avoid flooding you, alerts come in a daily digest by default, never between 9 pm and 8 am, and with a weekly limit per church. Delivery by email and phone is being switched on during early access." },
  { question: "How does a church or ministry list its events?", answer: "Create a free account, claim your church or ministry, and once it is approved you can submit unlimited events, with your website or social links, speakers and directions. You can edit, update or remove events and manage recurring ones." },
  { question: "Does it cost churches anything?", answer: "Listing is free. Optional paid features, such as featured placement and analytics, may come later. We will announce any price before anyone is charged." },
  { question: "How do you make sure listings are real?", answer: "A person reviews each church or ministry before it appears. Anyone can report an event or a church with the Report button, and our moderators can hide a listing while they look into it." },
  { question: "What information do you keep about me?", answer: "Your sign-in email is kept by our sign-in service. We keep your saved events and alert settings, and an alert stores a place rounded to about a kilometre, never your exact location or a history of where you have been. Our Privacy Policy has the details." },
  { question: "How do I delete my account or download my information?", answer: "Open your Account page. You can download everything we hold about you, or delete your account, which removes your information from Signal One Sound." },
  { question: "How do I report a problem or a listing?", answer: "Use the Report button on an event or a church page, or write to us from the Contact page." },
  { question: "Is there a phone app?", answer: "The website works on any phone today. Android and iPhone apps are in testing and are not in the app stores yet." },
  { question: "Does it include every denomination?", answer: "Yes. The goal is to gather revival gatherings across denominations and independent ministries in one place." },
  { question: "How do I contact you?", answer: "Write to contact@signalonesound.com, or use the Contact page." },
];

export const ABOUT_PARAGRAPHS = [
  "Signal One Sound exists to help people find the gatherings where revival is happening, and to help churches and ministries be found.",
  PROBLEM,
  "Search by place, distance, date and kind of gathering, save the events that matter to you, and be told when one is coming near you. Churches and ministries can list their events for free.",
] as const;
