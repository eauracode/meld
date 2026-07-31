import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MELD Merchant",
    short_name: "MELD",
    description: "Run everything after the sale — inventory, orders, deliveries, and your money.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F5F0",
    theme_color: "#0C1410",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
