import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-5">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-3 font-heading text-3xl font-bold text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate">Placeholder — replace with reviewed policy before launch.</p>

        <div className="mt-8 flex flex-col gap-5 text-sm leading-relaxed text-ink">
          <div>
            <h2 className="font-heading text-base font-bold text-ink">What we collect</h2>
            <p className="mt-2 text-slate">
              Merchant and rider account details, order and delivery information, and — for
              customers — the name, phone number, and address needed to complete a delivery.
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">How we use it</h2>
            <p className="mt-2 text-slate">
              To fulfil orders, coordinate delivery, confirm payment, and communicate delivery
              status by SMS, email, and in-app notification.
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">Retention</h2>
            <p className="mt-2 text-slate">
              We keep data only as long as needed to provide the service and meet our
              obligations under Nigerian data protection law (NDPR).
            </p>
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-ink">Contact</h2>
            <p className="mt-2 text-slate">
              Questions about this policy can be sent through our <a href="/demo" className="font-semibold text-pine underline">contact form</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
