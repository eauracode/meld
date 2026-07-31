import { describe, expect, it } from "vitest";
import { MockTransport, Notifier, type Recipient } from "./index";

const merchant: Recipient = {
  profileId: "p_merchant",
  email: "amara@example.com",
  phone: "+2348000000001",
  name: "Amara",
};
const rider: Recipient = {
  profileId: "p_rider",
  phone: "+2348000000002",
  name: "Tunde",
};
const customer: Recipient = { profileId: null, phone: "+2348000000003" };

describe("Notifier", () => {
  it("fans out to the requested channels only", async () => {
    const sms = new MockTransport("sms");
    const email = new MockTransport("email");
    const inApp = new MockTransport("in_app");
    const notifier = new Notifier([sms, email, inApp]);

    const report = await notifier.notify(
      "rider_assigned",
      [customer, rider],
      ["sms", "in_app"],
      { riderName: "Tunde", orderRef: "MELD-0001" },
    );

    expect(sms.sent).toHaveLength(2); // customer + rider have phones
    expect(inApp.sent).toHaveLength(1); // only the rider has a profile
    expect(email.sent).toHaveLength(0); // email wasn't requested
    expect(report.delivered).toBe(3);
    expect(sms.sent[0]?.message.body).toContain("Tunde");
  });

  it("skips channels a recipient has no address for", async () => {
    const email = new MockTransport("email");
    const notifier = new Notifier([email]);
    const report = await notifier.notify("delivered", [customer, merchant], ["email"], {
      orderRef: "MELD-0002",
    });
    expect(email.sent).toHaveLength(1); // customer has no email address
    expect(email.sent[0]?.recipient.name).toBe("Amara");
    expect(report.attempted).toBe(1);
  });

  it("one transport failure never blocks other deliveries", async () => {
    const sms = new MockTransport("sms", (r) => r.profileId === "p_rider");
    const notifier = new Notifier([sms]);
    const report = await notifier.notify("payment_received", [rider, customer], ["sms"], {
      amount: "₦22,000",
    });
    expect(report.attempted).toBe(2);
    expect(report.delivered).toBe(1);
    expect(report.failures).toHaveLength(1);
    expect(sms.sent).toHaveLength(1);
  });

  it("unconfigured channels are ignored gracefully", async () => {
    const notifier = new Notifier([new MockTransport("in_app")]);
    const report = await notifier.notify("account_approved", [merchant], ["sms", "in_app"], {
      role: "merchant",
    });
    expect(report.attempted).toBe(1);
    expect(report.delivered).toBe(1);
  });
});
