import type { MetadataRoute } from "next";

// The web app manifest: the name, colors and icon a phone uses if someone adds the site to their home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Signal One Sound",
    short_name: "Signal One Sound",
    description: "Find revival gatherings and churches near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b09",
    theme_color: "#0d0b09",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
