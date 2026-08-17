import { meldApi } from "@/lib/api";
import { setGlobalFeeRule, setMerchantOverride } from "@/lib/actions";
import { Card, Money, PageHeader, Table, btnLime, inputCls, selectCls, td } from "@/components/ui";

export default async function Fees() {
  const [me, merchants, feeRules] = await Promise.all([meldApi.me(), meldApi.merchantsAll(), meldApi.feeRulesAll()]);
  const isAdmin = me.role === "ops_admin";
  const approvedMerchants = merchants.filter((m) => m.status === "approved");
  const merchantName = (id: string | null) => (id ? (merchants.find((m) => m.id === id)?.businessName ?? id) : "—");
  const rules = [...feeRules].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return (
    <>
      <PageHeader
        title="Fee management"
        sub="Delivery fees resolve: per-merchant override → zone/state rule → fallback. Rules are versioned — new rules supersede, nothing is edited."
      />

      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        Not currently applied to orders. Delivery fees are set manually per order on the{" "}
        <a href="/dispatch" className="underline">
          Dispatch
        </a>{" "}
        page instead — this table is kept for reference and in case automatic resolution is turned back on later.
      </div>

      {!isAdmin ? (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Fee changes require the ops_admin role. You are viewing as {me.role} (read-only).
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="New global fee table">
            <form action={setGlobalFeeRule} className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate">Intrastate flat fee (₦)</label>
              <input name="intrastateNaira" className={inputCls} inputMode="decimal" placeholder="1500" required />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate">
                Interstate fees by destination state (one per line: State=₦)
              </label>
              <textarea
                name="byStateLines"
                rows={5}
                className={`${inputCls} font-mono`}
                placeholder={"Lagos=2500\nAbuja=3000\nKano=3500"}
              />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate">Fallback fee (₦)</label>
              <input name="fallbackNaira" className={inputCls} inputMode="decimal" placeholder="3000" required />
              <button type="submit" className={btnLime}>
                Publish new global rule
              </button>
            </form>
          </Card>

          <Card title="Per-merchant override">
            <form action={setMerchantOverride} className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate">Merchant</label>
              <select name="merchantId" className={selectCls} required>
                {approvedMerchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.businessName}
                  </option>
                ))}
              </select>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate">Negotiated flat fee (₦)</label>
              <input name="flatNaira" className={inputCls} inputMode="decimal" placeholder="1800" required />
              <button type="submit" className={btnLime}>
                Publish override
              </button>
              <p className="text-xs text-slate">
                Overrides win over the global table for every delivery this merchant creates.
              </p>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Rule history (newest first — newest effective rule wins per scope)">
          <Table head={["Effective from", "Scope", "Merchant", "Type", "Intrastate", "By state", "Fallback"]}>
            {rules.map((r) => (
              <tr key={r.id}>
                <td className={td}>{new Date(r.effectiveFrom).toLocaleDateString("en-NG")}</td>
                <td className={`${td} font-semibold`}>{r.scope}</td>
                <td className={td}>{merchantName(r.merchantId)}</td>
                <td className={td}>{r.type}</td>
                <td className={td}>{r.intrastateFeeKobo != null ? <Money kobo={r.intrastateFeeKobo} /> : "—"}</td>
                <td className={`${td} text-xs`}>
                  {r.byState
                    ? Object.entries(r.byState)
                        .map(([s, k]) => `${s} ₦${(k / 100).toLocaleString("en-NG")}`)
                        .join(" · ")
                    : "—"}
                </td>
                <td className={td}>
                  <Money kobo={r.fallbackFeeKobo} />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
