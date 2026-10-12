import { ImageResponse } from "next/og";

// The picture shown when a link to the site is shared in a message or on social media (S4 AC8 "share/preview
// metadata"). Drawn here so it needs no stored file: the name over the fire gradient on the dark background.
export const alt = "Signal One Sound: discover the fire near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "radial-gradient(900px 500px at 50% 120%, #7a3410 0%, #0d0b09 70%)",
          color: "#fff4d6",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 112,
            fontWeight: 800,
            letterSpacing: -2,
            backgroundImage: "linear-gradient(100deg, #f0782c, #f5c542 50%, #fff6dc)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Signal One Sound
        </div>
        <div style={{ display: "flex", fontSize: 44, color: "#e8dcc0" }}>Discover the fire near you</div>
      </div>
    ),
    size,
  );
}
