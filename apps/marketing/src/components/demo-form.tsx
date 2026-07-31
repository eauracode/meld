"use client";

import { useState } from "react";
import type { DemoRequestInput } from "@/lib/schemas";
import { demoRequestSchema } from "@/lib/schemas";
import { buttonVariants } from "@/components/ui";

const initial: DemoRequestInput = { name: "", businessName: "", email: "", phone: "", message: "" };
const inputCls =
  "w-full rounded-lg border border-slate/30 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate/60 focus:outline-2 focus:outline-pine";
const labelCls = "flex flex-col gap-1.5 text-sm font-semibold text-ink";

/** Fallback used when DEMO_BOOKING_URL isn't configured (02_PRD_Marketing FR-4). */
export function DemoForm() {
  const [values, setValues] = useState<DemoRequestInput>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof DemoRequestInput, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = demoRequestSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      });
      return;
    }
    setErrors({});
    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body.error ?? "Something went wrong — please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setServerError("Network error — please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-300 bg-green-50 p-8 text-center">
        <p className="font-heading text-xl font-bold text-green-900">Request received</p>
        <p className="mt-2 text-sm text-green-800">Someone from MELD will reach out to {values.email} to schedule your demo.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate/20 bg-white p-6 sm:p-8" noValidate>
      <label className={labelCls}>
        Your name
        <input className={inputCls} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} autoComplete="name" />
        {errors.name ? <span className="text-xs font-semibold text-red-700">{errors.name}</span> : null}
      </label>
      <label className={labelCls}>
        Business name
        <input
          className={inputCls}
          value={values.businessName}
          onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
        />
      </label>
      <label className={labelCls}>
        Email
        <input
          type="email"
          className={inputCls}
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          autoComplete="email"
        />
        {errors.email ? <span className="text-xs font-semibold text-red-700">{errors.email}</span> : null}
      </label>
      <label className={labelCls}>
        Phone (optional)
        <input className={inputCls} value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} inputMode="tel" />
      </label>
      <label className={labelCls}>
        What would you like to cover? (optional)
        <textarea
          className={inputCls}
          rows={3}
          value={values.message}
          onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
        />
      </label>
      {serverError ? <p className="text-sm font-semibold text-red-700">{serverError}</p> : null}
      <button type="submit" disabled={status === "submitting"} className={buttonVariants.limeSolid}>
        {status === "submitting" ? "Sending…" : "Request a demo"}
      </button>
    </form>
  );
}
