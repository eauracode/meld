import { afterEach, describe, expect, it, vi } from "vitest";
import { TermiiTransport, normalizePhone } from "./termii-transport";
import { ResendTransport } from "./resend-transport";
import { createTransports } from "./factory";
import { MockTransport } from "./core";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizePhone", () => {
  it("converts a leading 0 to the 234 country code", () => {
    expect(normalizePhone("08011122233")).toBe("2348011122233");
  });
  it("strips formatting from an already-international number", () => {
    expect(normalizePhone("+234 801 112 2233")).toBe("2348011122233");
  });
});

describe("TermiiTransport", () => {
  const transport = new TermiiTransport({ apiKey: "TEST_KEY", senderId: "MELD" });

  it("posts to the send endpoint with the api key and normalized phone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message_id: "123", message: "Successfully Sent" }));
    vi.stubGlobal("fetch", fetchMock);

    await transport.send({ profileId: "p1", phone: "08011122233" }, { title: "Hi", body: "There" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.ng.termii.com/api/sms/send");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ api_key: "TEST_KEY", to: "2348011122233", from: "MELD", sms: "Hi: There" });
  });

  it("throws when the recipient has no phone", async () => {
    await expect(transport.send({ profileId: "p1" }, { title: "Hi", body: "There" })).rejects.toThrow(/phone/);
  });

  it("throws when Termii reports failure (no message_id)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Insufficient balance" }, false)));
    await expect(
      transport.send({ profileId: "p1", phone: "08011122233" }, { title: "Hi", body: "There" }),
    ).rejects.toThrow(/Insufficient balance/);
  });
});

describe("ResendTransport", () => {
  const transport = new ResendTransport({ apiKey: "re_test", fromAddress: "MELD <notify@meld.africa>" });

  it("posts to the emails endpoint with bearer auth and the recipient's email", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email_123" }));
    vi.stubGlobal("fetch", fetchMock);

    await transport.send({ profileId: "p1", email: "amara@example.com" }, { title: "Order paid", body: "₦20,000 confirmed" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ from: "MELD <notify@meld.africa>", to: ["amara@example.com"], subject: "Order paid" });
  });

  it("escapes HTML in the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email_124" }));
    vi.stubGlobal("fetch", fetchMock);
    await transport.send({ profileId: "p1", email: "a@b.com" }, { title: "Hi", body: "<script>alert(1)</script>" });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
  });

  it("throws when the recipient has no email", async () => {
    await expect(transport.send({ profileId: "p1" }, { title: "Hi", body: "There" })).rejects.toThrow(/email/);
  });
});

describe("createTransports", () => {
  it("falls back to mock transports for both channels when unconfigured", () => {
    const transports = createTransports({});
    expect(transports.every((t) => t instanceof MockTransport)).toBe(true);
    expect(transports.map((t) => t.channel).sort()).toEqual(["email", "sms"]);
  });

  it("selects the real transport per channel independently based on its own keys", () => {
    const transports = createTransports({ TERMII_API_KEY: "k", TERMII_SENDER_ID: "MELD" });
    const sms = transports.find((t) => t.channel === "sms")!;
    const email = transports.find((t) => t.channel === "email")!;
    expect(sms).toBeInstanceOf(TermiiTransport);
    expect(email).toBeInstanceOf(MockTransport); // no Resend keys — still falls back
  });
});
