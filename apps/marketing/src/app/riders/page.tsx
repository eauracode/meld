import type { Metadata } from "next";
import { RiderForm } from "@/components/rider-form";
import { Eyebrow, IconCircle } from "@/components/ui";
import { Icons } from "@/components/icons";

export const metadata: Metadata = {
  title: "Become a rider partner",
  description: "Deliver for MELD — steady deliveries, instant payment confirmation, and a wallet you can withdraw from anytime.",
};

const benefits = [
  { icon: Icons.card, title: "Paid on time", body: "Your 80% share lands the moment a delivery is confirmed paid." },
  { icon: Icons.bike, title: "Steady work", body: "A daily list of deliveries near you, not one-off gigs." },
  { icon: Icons.shield, title: "No cash disputes", body: "Every COD delivery is tracked and reconciled — you're always covered." },
];

export default function RidersPage() {
  return (
    <>
      <section className="bg-ink py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow dark>For riders</Eyebrow>
          <h1 className="mt-3 max-w-2xl font-heading text-3xl font-bold text-white sm:text-4xl">
            Deliver for a partner that pays on time.
          </h1>
          <p className="mt-4 max-w-xl text-muted-dark">
            Apply below. Ops reviews every application — including a manual licence check —
            and reaches out to get you set up.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="flex flex-col gap-4">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-4 rounded-2xl border border-slate/15 bg-mist/60 p-5">
                <IconCircle tone="green">
                  <b.icon className="h-5 w-5" />
                </IconCircle>
                <div>
                  <p className="font-heading text-base font-bold text-ink">{b.title}</p>
                  <p className="mt-1 text-sm text-slate">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
          <RiderForm />
        </div>
      </section>
    </>
  );
}
