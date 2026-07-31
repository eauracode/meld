"use client";

import { useState } from "react";
import type { RiderApplicationInput } from "@/lib/schemas";
import { riderApplicationSchema } from "@/lib/schemas";
import { buttonVariants } from "@/components/ui";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "Abuja",
];

type Step = 1 | 2 | 3;

const initial: RiderApplicationInput = {
  fullName: "",
  phone: "",
  city: "",
  state: "Lagos",
  vehicle: "bike",
  hasLicence: false,
};

const inputCls =
  "w-full rounded-lg border border-slate/30 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate/60 focus:outline-2 focus:outline-pine";
const labelCls = "flex flex-col gap-1.5 text-sm font-semibold text-ink";

/** Multi-step rider application (02_PRD_Marketing /riders). Client-validated with the
 *  same zod schema the API route re-checks — the client check is UX, the server is the gate. */
export function RiderForm() {
  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<RiderApplicationInput>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof RiderApplicationInput, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  function validateStep(current: Step): boolean {
    const result = riderApplicationSchema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors = result.error.flatten().fieldErrors;
    const relevant: (keyof RiderApplicationInput)[] =
      current === 1 ? ["fullName", "phone", "city", "state"] : ["vehicle", "hasLicence"];
    const stepErrors: Partial<Record<keyof RiderApplicationInput, string>> = {};
    for (const key of relevant) {
      const msg = fieldErrors[key]?.[0];
      if (msg) stepErrors[key] = msg;
    }
    setErrors((prev) => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function submit() {
    const result = riderApplicationSchema.safeParse(values);
    if (!result.success) {
      setStep(1);
      validateStep(1);
      return;
    }
    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/rider-applications", {
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
        <p className="font-heading text-xl font-bold text-green-900">Application received</p>
        <p className="mt-2 text-sm text-green-800">
          Ops will review your details and contact you at {values.phone}. Thanks for applying to
          ride with MELD.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate/20 bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-lime" : "bg-mist"}`} />
        ))}
      </div>
      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate">Step {step} of 3</p>

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <label className={labelCls}>
            Full name
            <input
              className={inputCls}
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
              autoComplete="name"
            />
            {errors.fullName ? <span className="text-xs font-semibold text-red-700">{errors.fullName}</span> : null}
          </label>
          <label className={labelCls}>
            Phone number
            <input
              className={inputCls}
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              inputMode="tel"
              autoComplete="tel"
            />
            {errors.phone ? <span className="text-xs font-semibold text-red-700">{errors.phone}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              City
              <input
                className={inputCls}
                value={values.city}
                onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
              />
              {errors.city ? <span className="text-xs font-semibold text-red-700">{errors.city}</span> : null}
            </label>
            <label className={labelCls}>
              State
              <select
                className={inputCls}
                value={values.state}
                onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
              >
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <fieldset className={labelCls}>
            <legend className="mb-1">Vehicle type</legend>
            <div className="flex gap-3">
              {(["bike", "car", "van"] as const).map((v) => (
                <label
                  key={v}
                  className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold capitalize ${
                    values.vehicle === v ? "border-pine bg-mist text-ink" : "border-slate/30 text-slate"
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicle"
                    value={v}
                    checked={values.vehicle === v}
                    onChange={() => setValues((val) => ({ ...val, vehicle: v }))}
                    className="sr-only"
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={values.hasLicence}
              onChange={(e) => setValues((v) => ({ ...v, hasLicence: e.target.checked }))}
              className="h-4 w-4 rounded border-slate/40"
            />
            I have a valid rider&apos;s licence
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate">Review your details</p>
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-mist p-4 text-sm">
            <dt className="text-slate">Name</dt>
            <dd className="text-ink">{values.fullName}</dd>
            <dt className="text-slate">Phone</dt>
            <dd className="text-ink">{values.phone}</dd>
            <dt className="text-slate">Location</dt>
            <dd className="text-ink">
              {values.city}, {values.state}
            </dd>
            <dt className="text-slate">Vehicle</dt>
            <dd className="text-ink capitalize">{values.vehicle}</dd>
            <dt className="text-slate">Licence</dt>
            <dd className="text-ink">{values.hasLicence ? "Yes" : "No"}</dd>
          </dl>
          {serverError ? <p className="text-sm font-semibold text-red-700">{serverError}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 flex justify-between gap-3">
        {step > 1 ? (
          <button type="button" onClick={back} className={buttonVariants.inkOutline}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <button type="button" onClick={next} className={buttonVariants.limeSolid}>
            Continue
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={status === "submitting"} className={buttonVariants.limeSolid}>
            {status === "submitting" ? "Submitting…" : "Submit application"}
          </button>
        )}
      </div>
    </div>
  );
}
