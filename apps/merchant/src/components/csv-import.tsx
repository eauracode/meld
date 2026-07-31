"use client";

import { useActionState } from "react";
import { importOrdersCsv, type CsvImportResult } from "@/lib/actions";
import { btnLime, inputCls } from "@/components/ui";

export function CsvImport({ disabled, header }: { disabled: boolean; header: string }) {
  const [state, formAction, pending] = useActionState<CsvImportResult, FormData>(importOrdersCsv, {
    done: false,
    imported: 0,
    errors: [],
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-mist p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">Template header (exact)</p>
        <code className="mt-1 block overflow-x-auto whitespace-nowrap text-xs text-pine">{header}</code>
        <p className="mt-2 text-xs text-slate">
          One order per row, single SKU per order in v1. payment_type: prepaid | cod. No commas inside fields.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input name="file" type="file" accept=".csv,text/csv" className={inputCls} disabled={disabled} />
        <button type="submit" className={btnLime} disabled={disabled || pending}>
          {pending ? "Validating…" : "Validate & import"}
        </button>
      </form>

      {state.done ? (
        <div className="flex flex-col gap-2">
          <p
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              state.imported > 0 ? "border border-green-300 bg-green-50 text-green-900" : "border border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            {state.imported} order(s) imported{state.errors.length > 0 ? `, ${state.errors.length} row(s) rejected` : ""}.
          </p>
          {state.errors.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {state.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-bold">Line {e.line}:</span> {e.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
