# MELD — UI/UX Specification

**Version:** 1.0
**Depends on:** all PRDs, `01_SHARED_FOUNDATIONS.md`
**Design system:** MELD "Bold Tech" (locked)

> This spec defines the shared design system and the screen inventory for each
> surface. It is descriptive, not pixel-final — agents build components in
> `packages/ui` and compose screens per surface. Visual references were produced
> separately (brand guidelines, homepage mockups).

---

## 1. Design system (shared — `packages/ui`)

### Color tokens
| Token | Hex | Role |
|-------|-----|------|
| `ink` | `#0C1410` | Dominant bg + text anchor (~65%) |
| `lime` | `#B6F542` | Accent ONLY (≤10%): primary CTAs, key stats, logo node, active states |
| `green` | `#3F8A66` | Support: icons, secondary UI |
| `pine` | `#2E6B4F` | Deep support, hover, eyebrows on light |
| `mist` | `#F2F5F0` | Light surfaces |
| `slate` | `#5F7D6E` | Muted text |
| `white` | `#FFFFFF` | |

Ratio ≈ 65% ink / 25% greens+mist / 10% lime. Never a large lime fill behind body.

### Typography
- Headings/subheads: **Century Schoolbook** (fallback Georgia), bold serif.
- Body/UI/numbers: **Calibri** (fallback Arial), regular sans.
- Scale: H1 34–44 / H2 28–32 / H3 18–22 / body 14–16 / caption 11–13.

### Critical contrast rule
Set text color **explicitly** per section. Dark bg → white headings, `#9DB3A8`
muted. Light bg → `ink` headings, `slate` muted. Never inherit. (This exact bug
appeared once — an ink heading rendered white on a light band. Do not repeat.)

### Components (build once, reuse)
- `Button` variants: `limeSolid`, `limeOutline`, `inkSolid`, `inkOutline`, `ghost`.
- `MeldLogo` (SVG, dark/light variants).
- `StatCard` (label + big number, lime for money highlights).
- `StatusBadge` (order/delivery/payment states, color-coded but AA-contrast).
- `DataTable` (paginated lists — orders, deliveries, ledger).
- `MoneyText` (formats kobo → ₦, right-aligned, never floats).
- `IconCircle` (ink circle + lime/green icon — the brand motif).
- `AppShell` (nav + content) per surface, mobile-first with bottom nav on rider/
  merchant.
- Form primitives (input, select, stepper) with visible focus rings.

### Motion & feel
Flat, confident, minimal. No gradients or heavy shadows. The convergence motif
(strands → node, concentric hub, node-chain) appears in empty states and headers.

### Accessibility
WCAG AA contrast, semantic HTML, keyboard nav, visible focus, form labels, reduced-
motion respect.

---

## 2. Marketing website — screens
(Full detail in `02_PRD_Marketing.md`.)
- Homepage (hero, how-it-works chain, services grid on Mist, riders section, social
  proof, final CTA, footer).
- `/riders` (landing + multi-step application form).
- `/demo`, `/pricing`, legal, 404.
Design: product-led, dark→light→dark rhythm, two equal-weight CTAs.

---

## 3. Merchant app — screens

| Screen | Key elements |
|--------|--------------|
| Dashboard | StatCards: available balance (lime hero), orders today/week, deliveries in progress, low-stock alerts |
| Orders list | DataTable + status badges; filters; "Create order" + "Import CSV" |
| Create order | Form: customer, address (state/area), items from inventory, value, payment type; **shows resolved delivery fee + money breakdown** |
| CSV import | Upload, validation preview with per-row errors, confirm import |
| Order detail | Items, customer, assigned rider, payment status, fee, breakdown; realtime status |
| Inventory | Product list + stock levels; add/edit product; stock movement history; low-stock |
| Wallet | Available balance, transaction history (from ledger), **Withdraw** action |
| Reports | Per-delivery breakdown (fee charged, customer paid, method, net owed); CSV export |
| Settings/Profile | Business details, bank account, notification prefs |

Layout: mobile-first, bottom nav (Home, Orders, Inventory, Wallet, More).

---

## 4. Rider app — screens

| Screen | Key elements |
|--------|--------------|
| Today (deliveries) | List of assigned deliveries; status; payment type badge; realtime new assignments |
| Delivery detail | Customer, address, items, value, fee; **payment actions** |
| — Prepaid | "Generate account number" → show VA; live "Paid" flip (Realtime) |
| — COD | "Mark cash collected" (amount) → unblocks Delivered |
| Complete delivery | "Delivered" disabled until payment gate passed |
| Cash to remit | Outstanding COD cash; "Remit cash" → VA to pay into; status |
| Wallet | Wallet balance (lime hero), earnings history, **Withdraw** |
| Profile | Details, vehicle, bank account |

Layout: mobile-first, bottom nav (Today, Cash, Wallet, Profile). Big tap targets,
works on low-end Android + patchy networks. Money confirmations never optimistic.

---

## 5. Operations tool — screens

| Screen | Key elements |
|--------|--------------|
| Dashboard | Deliveries in progress, stuck deliveries, unremitted cash, pending approvals, failed payouts |
| Merchant approvals | Queue; review; approve (set fee_borne_by + override) / reject |
| Rider approvals | Queue from applications; review + manual licence check; approve/reject |
| Orders & dispatch | All orders; filters; **assign rider** (manual); reassign/cancel |
| Warehouses & inventory | Register warehouse; **receive inventory**; adjust stock (reason) |
| Fee management | Global fee table (intrastate flat + interstate by state); per-merchant overrides; versioned (admin only) |
| Cash reconciliation | Cash collected vs remitted per rider; reconcile; flag mismatches |
| Ledger | All accounts + entries, running balances, filters; daily partner-float vs real reconciliation |
| Withdrawals | Requested/processing/paid; retry failures |
| Users & audit | Invite/manage Ops staff; suspend merchants/riders; audit log viewer |

Layout: desktop-first (data-dense), responsive. Sidebar nav. Tables, filters, detail
drawers. Sensitive actions (fees, adjustments, payouts) gated to `ops_admin` and
confirmed with a dialog + reason field (audited).

Design note: Ops can lean more utilitarian/dense than the consumer apps, but stays on
the ink/lime system — lime reserved for primary actions and key figures.
