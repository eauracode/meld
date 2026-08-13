"use client";

import { useActionState } from "react";
import { approveRiderApplication, type ApproveRiderResult } from "@/lib/actions";
import { btnLime } from "@/components/ui";

const initialState: ApproveRiderResult = { error: null, success: null };

export function ApproveRiderForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState<ApproveRiderResult, FormData>(
    approveRiderApplication,
    initialState,
  );

  if (state.success) {
    return (
      <div className="max-w-xs rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
        <p className="font-bold">Rider approved.</p>
        <p className="mt-1">
          Login: <span className="font-mono font-semibold">{state.success.email}</span>
          <br />
          Password: <span className="font-mono font-semibold">{state.success.initialPassword}</span>
        </p>
        <p className="mt-1 text-xs text-green-800">
          They&apos;ll be asked to set a new password on first login.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="applicationId" value={applicationId} />
      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={btnLime} disabled={pending}>
        {pending ? "Approving…" : "Approve & invite"}
      </button>
    </form>
  );
}
