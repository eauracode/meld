import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-5">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-3 font-heading text-3xl font-bold text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate">Placeholder — replace with reviewed terms before launch.</p>

        <div className="prose-sm mt-8 flex flex-col gap-5 text-sm leading-relaxed text-ink">
          <p>
            These Terms govern your use of MELD&apos;s platform for warehousing, order
            fulfilment, delivery, payment collection, and settlement services in Nigeria.
          </p>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">1. The service</h2>
            <p className="mt-2 text-slate">
              MELD stores merchant inventory, processes orders, arranges delivery, collects
              payment on delivery (by transfer or cash), and settles proceeds to merchants and
              riders, less applicable fees.
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">2. Money handling</h2>
            <p className="mt-2 text-slate">
              MELD does not hold customer or merchant funds as a licensed deposit-taker. Funds
              are held with a licensed payment partner; MELD maintains an internal ledger of
              amounts owed and executes payouts through that partner.
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">3. Merchant &amp; rider obligations</h2>
            <p className="mt-2 text-slate">
              Merchants must provide accurate order and product information. Riders must
              account for every payment collected before a delivery is marked complete.
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">4. Changes</h2>
            <p className="mt-2 text-slate">We may update these Terms; continued use constitutes acceptance of the current version.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
