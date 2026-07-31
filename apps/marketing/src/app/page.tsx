import Link from "next/link";
import type { Metadata } from "next";
import { buildMerchantSignupUrl, riderCtaHref } from "@/config/site";
import { buttonVariants, Eyebrow, IconCircle, SectionLabel } from "@/components/ui";
import { Icons } from "@/components/icons";

export const metadata: Metadata = {
  title: "Run every operation from one screen",
};

const chain = [
  { label: "Inventory", icon: Icons.warehouse, detail: "Stock lands in a MELD warehouse" },
  { label: "Processed", icon: Icons.clipboard, detail: "Orders created, fee resolved" },
  { label: "Delivered", icon: Icons.truck, detail: "Rider collects payment on the way" },
  { label: "Settled", icon: Icons.scale, detail: "Ledger splits the money, instantly" },
  { label: "Updated", icon: Icons.bell, detail: "Everyone sees where things stand" },
];

const services = [
  { icon: Icons.warehouse, title: "Warehousing & inventory", body: "Drop off stock, track levels in real time, get low-stock alerts before you run out." },
  { icon: Icons.clipboard, title: "Order management", body: "Create orders manually or bulk-import by CSV — the delivery fee resolves automatically." },
  { icon: Icons.truck, title: "Nationwide delivery", body: "A dispatch network that covers intrastate and interstate, with live status on every order." },
  { icon: Icons.card, title: "Prepaid collection", body: "A one-time virtual account per delivery — payment confirms instantly, no phone calls." },
  { icon: Icons.cash, title: "Cash on delivery", body: "Riders collect cash and remit it through MELD, with every naira reconciled." },
  { icon: Icons.scale, title: "Money settlement", body: "A double-entry ledger splits every delivery fee and settles what you're owed." },
  { icon: Icons.bell, title: "Tracking & notifications", body: "SMS, email, and in-app updates for you, your rider, and your customer." },
];

const riderBenefits = [
  { icon: Icons.card, title: "Paid on time", body: "Your share lands in your wallet the moment a delivery is confirmed paid — withdraw anytime." },
  { icon: Icons.clock, title: "No office calls", body: "Payment confirmation is instant. You'll never have to phone in to check if a customer paid." },
  { icon: Icons.map, title: "A clear list, every day", body: "Today's deliveries in one place — address, items, payment type, and what you'll earn." },
];

const testimonials = [
  {
    quote: "I used to spend my mornings on the phone confirming payments. Now I just look at the app.",
    name: "Amara Eze",
    role: "Founder, Amara Fashion House",
  },
  {
    quote: "MELD's riders always know exactly what they're collecting. It's cut our COD disputes to almost nothing.",
    name: "Chuka Obi",
    role: "Operations Lead, a Lagos fashion retailer",
  },
];

// Placeholder figures — replace with real numbers before launch (00_MASTER_PRD §6).
const stats = [
  { value: "500+", label: "deliveries a week" },
  { value: "98%", label: "on-time delivery rate" },
  { value: "< 24h", label: "from delivery to settlement" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const utm: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") utm[key] = value;
  }
  const signupUrl = buildMerchantSignupUrl(utm);

  return (
    <>
      {/* Hero — dark */}
      <section className="bg-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow dark>Operations, melded into one</Eyebrow>
            <h1 className="mt-4 font-heading text-[34px] font-bold leading-[1.1] text-white sm:text-[44px]">
              Run every operation from one screen.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-dark sm:text-lg">
              MELD stores your goods, fulfils every order, delivers nationwide, collects
              payment — transfer or cash — and settles your money. One partner, instead of a
              warehouse, two riders, and a spreadsheet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={signupUrl} className={buttonVariants.limeSolid}>
                Start free
              </a>
              <Link href="/demo" className={buttonVariants.inkOutline + " !border-white/30 !text-white hover:!bg-white hover:!text-ink"}>
                Book a demo
              </Link>
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-dark">
              Trusted by growing sellers across Lagos, Abuja &amp; Port Harcourt
            </p>
          </div>

          {/* Static "operations overview" dashboard preview — visual mock only */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl" aria-hidden>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-dark">Operations overview</p>
              <span className="h-2 w-2 rounded-full bg-lime" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Orders today", value: "48" },
                { label: "In transit", value: "17" },
                { label: "Settled today", value: "₦1.2m" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-dark">{s.label}</p>
                  <p className="mt-1 font-heading text-lg font-bold text-lime">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {["MELD-2044 — delivered, paid", "MELD-2045 — out for delivery", "MELD-2046 — awaiting assignment"].map((row) => (
                <div key={row} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                  {row}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — light */}
      <section id="platform" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-2 max-w-xl font-heading text-2xl font-bold text-ink sm:text-3xl">
            Five steps, one place to watch them all.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {chain.map((step, i) => (
              <div key={step.label} className="relative flex flex-col items-start gap-3">
                <IconCircle>
                  <step.icon className="h-5 w-5" />
                </IconCircle>
                <p className="font-heading text-base font-bold text-ink">{step.label}</p>
                <p className="text-sm text-slate">{step.detail}</p>
                {i < chain.length - 1 ? (
                  <span className="absolute right-[-1.25rem] top-6 hidden text-lime lg:block" aria-hidden>
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services — mist band */}
      <section id="services" className="bg-mist py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>What MELD runs for you</SectionLabel>
          <h2 className="mt-2 max-w-xl font-heading text-2xl font-bold text-ink sm:text-3xl">
            Everything after the sale, handled.
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate/15 bg-white p-6">
                <IconCircle tone="green">
                  <s.icon className="h-5 w-5" />
                </IconCircle>
                <h3 className="mt-4 font-heading text-base font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-slate">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For riders — dark, distinct */}
      <section className="bg-ink py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow dark>For riders</Eyebrow>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">
                Deliver for a partner that pays on time.
              </h2>
              <p className="mt-4 max-w-md text-muted-dark">
                Steady deliveries, instant payment confirmation, and a wallet you can withdraw
                from whenever you like. No more calling the office to check if a customer paid.
              </p>
              <Link href={riderCtaHref()} className={`${buttonVariants.limeSolid} mt-8`}>
                Become a rider partner
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {riderBenefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <IconCircle>
                    <b.icon className="h-5 w-5" />
                  </IconCircle>
                  <div>
                    <p className="font-heading text-base font-bold text-white">{b.title}</p>
                    <p className="mt-1 text-sm text-muted-dark">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — light */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-mist p-6 text-center">
                <p className="font-heading text-3xl font-bold text-pine">{s.value}</p>
                <p className="mt-1 text-sm text-slate">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-slate/15 p-6">
                <blockquote className="font-heading text-lg font-semibold leading-snug text-ink">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm text-slate">
                  <span className="font-semibold text-ink">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — lime band, inverted */}
      <section className="bg-lime py-16 md:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 text-center">
          <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
            Ready to hand off everything after the sale?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={signupUrl} className={buttonVariants.inkSolid}>
              Start free
            </a>
            <Link href="/demo" className={buttonVariants.inkOutline}>
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
