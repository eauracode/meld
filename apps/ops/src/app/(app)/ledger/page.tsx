import { meldApi } from "@/lib/api";
import { manualAdjustment } from "@/lib/actions";
import { Card, Money, PageHeader, Table, btnLime, inputCls, selectCls, td } from "@/components/ui";

export default async function Ledger() {
  const [me, accounts, transactions, totals] = await Promise.all([
    meldApi.me(),
    meldApi.ledgerAccounts(),
    meldApi.ledgerTransactions(),
    meldApi.ledgerTotals(),
  ]);
  const isAdmin = me.role === "ops_admin";
  const balanced = totals.debitKobo === totals.creditKobo;
  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return id;
    const typeLabel: Record<string, string> = {
      merchant_payable: "Merchant payable",
      rider_wallet: "Rider wallet",
      meld_revenue: "MELD revenue",
      cash_in_transit: "Cash in transit",
      partner_float: "Partner float",
      suspense: "Suspense",
    };
    return `${typeLabel[a.type] ?? a.type} — ${a.ownerName}`;
  };

  return (
    <>
      <PageHeader
        title="Ledger"
        sub="Double-entry, append-only. Balances are derived from entries — corrections are new postings, never edits."
      />

      <div
        className={`mb-6 rounded-xl border p-4 text-sm font-semibold ${
          balanced ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"
        }`}
      >
        {balanced ? "✓ Ledger integrity: total debits equal total credits" : "⚠ LEDGER OUT OF BALANCE — investigate immediately"}{" "}
        (<Money kobo={totals.debitKobo} /> Dr / <Money kobo={totals.creditKobo} /> Cr)
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <Card title="Accounts & balances">
            <Table head={["Account", "Balance"]}>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{accountLabel(a.id)}</td>
                  <td className={`${td} font-semibold`}>
                    <Money kobo={a.balanceKobo} />
                  </td>
                </tr>
              ))}
            </Table>
          </Card>

          {isAdmin ? (
            <div className="mt-6">
              <Card title="Manual adjustment (admin, audited)">
                <form action={manualAdjustment} className="flex flex-col gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate">Debit account</label>
                  <select name="debitAccountId" className={selectCls} required>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {accountLabel(a.id)}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate">Credit account</label>
                  <select name="creditAccountId" className={selectCls} required>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {accountLabel(a.id)}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate">Amount (₦)</label>
                  <input name="amountNaira" className={inputCls} inputMode="decimal" required />
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate">Reason (required)</label>
                  <input name="reason" className={inputCls} placeholder="Why is this adjustment needed?" required />
                  <button type="submit" className={btnLime}>
                    Post balanced adjustment
                  </button>
                  <p className="text-xs text-slate">Use sparingly. Unbalanced postings are rejected by the ledger core.</p>
                </form>
              </Card>
            </div>
          ) : null}
        </div>

        <div className="xl:col-span-2">
          <Card title={`Transactions (${transactions.length}, newest first)`}>
            <div className="flex flex-col gap-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{tx.memo ?? tx.sourceType}</p>
                    <p className="text-xs text-slate">
                      {tx.id} · source: {tx.sourceType}
                      {tx.sourceId ? ` (${tx.sourceId})` : ""}
                    </p>
                  </div>
                  <table className="mt-2 w-full text-sm">
                    <tbody className="divide-y divide-slate/10">
                      {tx.entries.map((e) => (
                        <tr key={e.id}>
                          <td className="py-1.5 pr-4 text-ink">{accountLabel(e.accountId)}</td>
                          <td className="py-1.5 pr-4 text-right tabular-nums text-ink">
                            {e.debitKobo ? (
                              <>
                                Dr <Money kobo={e.debitKobo} />
                              </>
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-pine">
                            {e.creditKobo ? (
                              <>
                                Cr <Money kobo={e.creditKobo} />
                              </>
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
