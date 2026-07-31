import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MELD Rider",
    short_name: "MELD",
    description: "Today's deliveries, payment collection, cash remittance, and your earnings.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F5F0",
    theme_color: "#0C1410",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
