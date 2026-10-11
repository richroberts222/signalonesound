import type { MapEvent } from "./compute";

// Sample fires for looking at the Fire Map before real gatherings exist (S16). They are invented places, shown only
// when the page is opened with ?sample=1 and always labeled as samples. They never touch the database.
export const SAMPLE_FIRES: MapEvent[] = [
  { id: "sample-1", title: "Sample revival night", place: "Boise, ID", lat: 43.615, lng: -116.202 },
  { id: "sample-2", title: "Sample tent meeting", place: "Dallas, TX", lat: 32.777, lng: -96.797 },
  { id: "sample-3", title: "Sample worship gathering", place: "Nashville, TN", lat: 36.163, lng: -86.781 },
  { id: "sample-4", title: "Sample prayer night", place: "Atlanta, GA", lat: 33.749, lng: -84.388 },
  { id: "sample-5", title: "Sample healing service", place: "Phoenix, AZ", lat: 33.449, lng: -112.074 },
  { id: "sample-6", title: "Sample youth revival", place: "Denver, CO", lat: 39.739, lng: -104.99 },
  { id: "sample-7", title: "Sample city-wide gathering", place: "Chicago, IL", lat: 41.878, lng: -87.63 },
  { id: "sample-8", title: "Sample coastal revival", place: "Seattle, WA", lat: 47.606, lng: -122.332 },
  { id: "sample-9", title: "Sample harvest night", place: "Kansas City, MO", lat: 39.1, lng: -94.579 },
  { id: "sample-10", title: "Sample worship night", place: "Orlando, FL", lat: 28.538, lng: -81.379 },
  { id: "sample-11", title: "Sample revival week", place: "Charlotte, NC", lat: 35.227, lng: -80.843 },
  { id: "sample-12", title: "Sample gathering", place: "Anchorage, AK", lat: 61.218, lng: -149.9 },
  { id: "sample-13", title: "Sample gathering", place: "Honolulu, HI", lat: 21.307, lng: -157.858 },
  { id: "sample-14", title: "Sample revival", place: "Lagos, Nigeria", lat: 6.524, lng: 3.379 },
  { id: "sample-15", title: "Sample revival", place: "Seoul, South Korea", lat: 37.566, lng: 126.978 },
  { id: "sample-16", title: "Sample revival", place: "Sao Paulo, Brazil", lat: -23.55, lng: -46.633 },
  { id: "sample-17", title: "Sample revival", place: "Nairobi, Kenya", lat: -1.286, lng: 36.817 },
  { id: "sample-18", title: "Sample revival", place: "London, UK", lat: 51.507, lng: -0.128 },
];
