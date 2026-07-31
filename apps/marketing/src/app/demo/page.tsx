import type { Metadata } from "next";
import { config } from "@/config/site";
import { DemoForm } from "@/components/demo-form";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Book a demo",
  description: "See how MELD runs warehousing, delivery, payment collection, and settlement for your business.",
};

export default function DemoPage() {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-5">
        <Eyebrow>Book a demo</Eyebrow>
        <h1 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">
          See MELD run your operations.
        </h1>
        <p className="mt-4 text-slate">
          A 20-minute walkthrough of inventory, orders, delivery, and settlement — tailored to
          how you sell today.
        </p>

        <div className="mt-10">
          {config.DEMO_BOOKING_URL ? (
            <div className="overflow-hidden rounded-2xl border border-slate/20">
              <iframe
                src={config.DEMO_BOOKING_URL}
                title="Book a demo"
                className="h-[700px] w-full"
                loading="lazy"
              />
            </div>
          ) : (
            <DemoForm />
          )}
        </div>
      </div>
    </section>
  );
}
