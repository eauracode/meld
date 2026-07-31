/**
 * Single source of truth for every external destination this site links to
 * (02_PRD_Marketing FR-1). No app URL is ever hardcoded in a component —
 * everything reads from here, which reads from environment config so staging
 * and production can point at different app deployments.
 */

export const SITE = {
  name: "MELD",
  tagline: "Powering every step of e-commerce.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3080",
} as const;

/** The merchant app's sign-up route. "Start free" hands off here. */
const MERCHANT_APP_SIGNUP_URL =
  process.env.NEXT_PUBLIC_MERCHANT_APP_SIGNUP_URL ?? "http://localhost:3060/signup";

/**
 * The rider app's own URL, once it has public-facing sign-up. Null in v1
 * (04_PRD_Rider: riders are invited after Ops approval) — while null, the
 * marketing site collects applications itself via the /riders form (FR-5).
 */
const RIDER_APP_URL: string | null = process.env.NEXT_PUBLIC_RIDER_APP_URL ?? null;

/** Calendly (or similar) booking link. Null falls back to the /demo contact form. */
const DEMO_BOOKING_URL: string | null = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ?? null;

/** The merchant app's sign-in route, for the nav's "Sign in" link. */
const MERCHANT_APP_SIGNIN_URL =
  process.env.NEXT_PUBLIC_MERCHANT_APP_SIGNIN_URL ?? "http://localhost:3060";

export const config = {
  MERCHANT_APP_SIGNUP_URL,
  MERCHANT_APP_SIGNIN_URL,
  RIDER_APP_URL,
  DEMO_BOOKING_URL,
} as const;

/**
 * Builds the merchant sign-up URL with source=website plus any UTM params
 * carried on the incoming request (FR-2). utmParams should be the page's
 * searchParams, already stringified to a plain record.
 */
export function buildMerchantSignupUrl(utmParams: Record<string, string | undefined> = {}): string {
  const url = new URL(MERCHANT_APP_SIGNUP_URL);
  url.searchParams.set("source", "website");
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = utmParams[key];
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Where the "Become a rider partner" CTA points — the real app once it exists, our own form until then (FR-5). */
export function riderCtaHref(): string {
  return RIDER_APP_URL ?? "/riders";
}
