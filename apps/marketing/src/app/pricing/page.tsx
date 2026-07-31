import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants, Eyebrow, IconCircle } from "@/components/ui";
import { Icons } from "@/components/icons";

export const metadata: Metadata = {
  title: "Pricing",
  description: "MELD charges one delivery fee per order — set by zone and distance, with no setup cost or subscription in v1.",
};

const points = [
  {
    icon: Icons.map,
    title: "Priced by zone",
    body: "A flat fee for deliveries within the same state, and a fee by destination state for interstate deliveries.",
  },
  {
    icon: Icons.clipboard,
    title: "Resolved automatically",
    body: "Every order shows its delivery fee the moment you create it — no surprises at settlement.",
  },
  {
    icon: Icons.scale,
    title: "One fee, fully split",
    body: "That fee pays the rider who delivers and funds the platform — you're never billed separately for either.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-ink py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow dark>Pricing</Eyebrow>
          <h1 className="mt-3 max-w-xl font-heading text-3xl font-bold text-white sm:text-4xl">
            One delivery fee. No setup cost, no subscription.
          </h1>
          <p className="mt-4 max-w-xl text-muted-dark">
            MELD charges a delivery fee per order, set by zone and distance. Warehousing and
            order management are included — you only pay when something ships.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-5 sm:grid-cols-3">
            {points.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate/15 p-6">
                <IconCircle tone="green">
                  <p.icon className="h-5 w-5" />
                </IconCircle>
                <h2 className="mt-4 font-heading text-base font-bold text-ink">{p.title}</h2>
                <p className="mt-2 text-sm text-slate">{p.body}</p>
              </div>
            ))}
          </div>

          {/* Illustrative only — replace with the live fee table before launch. */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate/15">
            <table className="w-full text-left text-sm">
              <caption className="bg-mist px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate">
                Illustrative fees — your exact rate is confirmed when Ops approves your account
              </caption>
              <thead>
                <tr className="border-b border-slate/15 bg-mist/60 text-xs font-semibold uppercase tracking-wide text-slate">
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Typical fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                <tr>
                  <td className="px-5 py-3 text-ink">Within Lagos</td>
                  <td className="px-5 py-3 text-ink">₦1,500 – ₦2,500</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-ink">Lagos → Abuja</td>
                  <td className="px-5 py-3 text-ink">₦3,000 – ₦3,500</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-ink">Lagos → other states</td>
                  <td className="px-5 py-3 text-ink">₦3,000 – ₦4,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-mist p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate">
              Negotiated volume rates are available — Ops sets these per merchant on approval.
            </p>
            <Link href="/demo" className={buttonVariants.inkSolid}>
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
