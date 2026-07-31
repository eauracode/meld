import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0C1410",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#B6F542" }} />
          <div style={{ fontSize: 40, fontWeight: 700, color: "#FFFFFF" }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 36, fontSize: 56, fontWeight: 700, color: "#FFFFFF", maxWidth: 900, lineHeight: 1.1 }}>
          Run every operation from one screen.
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: "#9DB3A8", maxWidth: 800 }}>{SITE.tagline}</div>
      </div>
    ),
    { ...size },
  );
}
