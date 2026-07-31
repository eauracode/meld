# MELD — Marketing Website PRD

**Version:** 1.0
**Surface:** `apps/marketing`
**Depends on:** `00_MASTER_PRD.md`, `01_SHARED_FOUNDATIONS.md`
**Auth:** none (public)

---

## 1. Purpose

Convert two distinct audiences:
1. **Merchants** — understand MELD, then "Start free" (hand off to the merchant app).
2. **Riders** — understand the opportunity, then apply to become a delivery partner.

The site also carries brand, SEO, and credibility. It holds no business data beyond
lead capture.

---

## 2. Audiences and their paths

| Audience | CTA | Destination |
|----------|-----|-------------|
| Merchant | **Start free** | Redirect to merchant app sign-up (`MERCHANT_APP_SIGNUP_URL`), passing `source=website` + any UTM params |
| Merchant | **Book a demo** | `/demo` page (Calendly embed via config, or fallback contact form → `demo_requests`) |
| Rider | **Become a rider partner** | `/riders` onboarding form → `rider_applications` table (visible in Ops tool) |

The two paths must be visually and structurally separate so neither audience is
confused about where to go.

---

## 3. Pages

### Homepage (product-led)
Sections in order (design in `09_UIUX_SPEC.md`):
1. Sticky nav — logo; Platform, Solutions, Pricing, For riders; Sign in (outline) +
   Book a demo (lime). Mobile hamburger.
2. Hero — split. Left: eyebrow, serif H1 "Run every operation from one screen.",
   subcopy, two equal-weight CTAs (Start free + Book a demo), trust logos. Right:
   static "Operations overview" dashboard preview (visual mock only).
3. How it works — the 5-step chain (Inventory → Processed → Delivered → Settled →
   Updated), lime arrows.
4. Services — light Mist band, 7 service cards (explicit ink text — see contrast rule).
5. For riders — distinct section: "Deliver for a partner that pays on time," benefits,
   "Become a rider partner" CTA.
6. Social proof — testimonials (placeholder) + stat strip (placeholder numbers,
   comment-flagged to replace).
7. Final CTA band — lime bg, both CTAs inverted.
8. Footer — logo, tagline, link columns (Product, Company, For riders, Legal).

### `/riders`
Fuller rider landing + the multi-step application form. Collects: full name, phone,
city/state, vehicle type (bike/car/van), has valid rider's licence (yes/no). POSTs to
`/api/rider-applications`. On success: confirmation + "Ops will review and contact
you." When `RIDER_APP_URL` config is set (future), this CTA redirects to the real
rider app instead.

### `/demo`
Book-a-demo. Calendly embed via `DEMO_BOOKING_URL`; fallback contact form →
`/api/demo-requests`.

### `/pricing`
Explains the delivery-fee model at a high level (zone-based, transparent split
messaging optional). v1 can be simple.

### Legal pages, 404
Terms, Privacy, and an on-brand 404.

---

## 4. Functional requirements

- **FR-1** All external destinations live in `config/site.ts` (single source of
  truth). No hardcoded app URLs.
- **FR-2** `buildMerchantSignupUrl()` appends `source=website` + incoming UTM params.
- **FR-3** Rider application POSTs to a validated API route (zod), writes to
  `rider_applications`, returns success/failure with proper status codes.
- **FR-4** Demo requests POST to a validated API route, write to `demo_requests`.
- **FR-5** Rider path toggles: form (when `RIDER_APP_URL` null) vs redirect (when set).
- **FR-6** Fully responsive: correct at 375 / 768 / 1280 px. Mobile nav works.
- **FR-7** Accessible: semantic HTML, heading hierarchy, keyboard nav, visible focus,
  WCAG AA contrast.
- **FR-8** SEO: per-page metadata, Open Graph, sitemap, robots.

---

## 5. Data this surface touches

Writes only: `rider_applications`, `demo_requests`. Reads: none (no auth). All other
tables are off-limits to this surface.

---

## 6. Out of scope

No merchant sign-up logic *itself* (that's the merchant app — this only hands off), no
pricing calculator, no live data, no customer tracking pages (tracking links are
served by the backend/merchant flows, not the marketing app in v1).
