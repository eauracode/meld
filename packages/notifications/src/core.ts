import type { NotificationChannel } from "@meld/types";

/**
 * Channel-agnostic notification dispatch (01_SHARED_FOUNDATIONS §7).
 * v1 channels: SMS (Termii), email (Resend), in-app (notifications table).
 * WhatsApp can be added later as another Transport without touching callers.
 * Dev/tests use MockTransport; real transports arrive in Phase 6.
 */

export interface Recipient {
  /** profiles.id for logged-in users; null for external customers. */
  profileId: string | null;
  phone?: string;
  email?: string;
  name?: string;
}

export interface RenderedMessage {
  title: string;
  body: string;
}

export type TemplateData = Record<string, string>;

export interface Transport {
  readonly channel: NotificationChannel;
  send(recipient: Recipient, message: RenderedMessage): Promise<void>;
}

export type NotificationEvent =
  | "order_created"
  | "rider_assigned"
  | "out_for_delivery"
  | "payment_received"
  | "delivered"
  | "cash_remittance_due"
  | "withdrawal_processed"
  | "account_approved";

type Template = (data: TemplateData) => RenderedMessage;

/** Default templates. Callers can register/override per event. */
const defaultTemplates: Record<NotificationEvent, Template> = {
  order_created: (d) => ({
    title: "Order created",
    body: `Order ${d.orderRef ?? ""} has been created and is awaiting dispatch.`.trim(),
  }),
  rider_assigned: (d) => ({
    title: "Rider assigned",
    body: `${d.riderName ?? "A rider"} has been assigned to order ${d.orderRef ?? ""}.`.trim(),
  }),
  out_for_delivery: (d) => ({
    title: "Out for delivery",
    body: `Your order ${d.orderRef ?? ""} is out for delivery.${d.trackingUrl ? ` Track it: ${d.trackingUrl}` : ""}`.trim(),
  }),
  payment_received: (d) => ({
    title: "Payment received",
    body: `Payment of ${d.amount ?? ""} confirmed for order ${d.orderRef ?? ""}.`.trim(),
  }),
  delivered: (d) => ({
    title: "Delivered",
    body: `Order ${d.orderRef ?? ""} has been delivered.`.trim(),
  }),
  cash_remittance_due: (d) => ({
    title: "Cash remittance due",
    body: `You are holding ${d.amount ?? "collected cash"} to remit to MELD.`,
  }),
  withdrawal_processed: (d) => ({
    title: "Withdrawal processed",
    body: `Your withdrawal of ${d.amount ?? ""} has been paid to your bank account.`.trim(),
  }),
  account_approved: (d) => ({
    title: "You're approved",
    body: `Your MELD ${d.role ?? ""} account has been approved. Welcome aboard!`.trim(),
  }),
};

export interface SendReport {
  event: NotificationEvent;
  attempted: number;
  delivered: number;
  failures: { channel: NotificationChannel; recipient: Recipient; error: unknown }[];
}

export class Notifier {
  private transports = new Map<NotificationChannel, Transport>();
  private templates: Record<NotificationEvent, Template>;

  constructor(transports: Transport[], templates?: Partial<Record<NotificationEvent, Template>>) {
    for (const t of transports) this.transports.set(t.channel, t);
    this.templates = { ...defaultTemplates, ...templates };
  }

  /**
   * Fans an event out to every recipient on every requested channel.
   * A transport failure never blocks the other channels/recipients —
   * failures are collected and reported (queue + retry comes in Phase 6).
   */
  async notify(
    event: NotificationEvent,
    recipients: Recipient[],
    channels: NotificationChannel[],
    data: TemplateData = {},
  ): Promise<SendReport> {
    const message = this.templates[event](data);
    const report: SendReport = { event, attempted: 0, delivered: 0, failures: [] };
    for (const channel of channels) {
      const transport = this.transports.get(channel);
      if (!transport) continue; // channel not configured in this environment
      for (const recipient of recipients) {
        // A channel needs an address: phone for SMS, email for email, profile for in-app.
        if (channel === "sms" && !recipient.phone) continue;
        if (channel === "email" && !recipient.email) continue;
        if (channel === "in_app" && !recipient.profileId) continue;
        report.attempted += 1;
        try {
          await transport.send(recipient, message);
          report.delivered += 1;
        } catch (error) {
          report.failures.push({ channel, recipient, error });
        }
      }
    }
    return report;
  }
}

/** Records every send — the dev/test transport for all three channels. */
export class MockTransport implements Transport {
  readonly sent: { recipient: Recipient; message: RenderedMessage }[] = [];
  constructor(
    readonly channel: NotificationChannel,
    private failFor: (recipient: Recipient) => boolean = () => false,
  ) {}
  async send(recipient: Recipient, message: RenderedMessage): Promise<void> {
    if (this.failFor(recipient)) throw new Error(`mock ${this.channel} failure`);
    this.sent.push({ recipient, message });
  }
}
