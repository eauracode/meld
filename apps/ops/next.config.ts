import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@meld/auth",
    "@meld/fees",
    "@meld/ledger",
    "@meld/notifications",
    "@meld/payments",
    "@meld/types",
    "@meld/ui",
  ],
};

export default nextConfig;
