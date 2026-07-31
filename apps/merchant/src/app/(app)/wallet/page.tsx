import { meldApi } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, PageHeader, StatCard, Table, td } from "@/components/ui";
import { WithdrawForm } from "@/components/withdraw-form";

export default async function Wallet() {
  const [balance, withdrawals, me] = await Promise.all([meldApi.balance(), meldApi.withdrawals(), meldApi.me()]);

  return (
    <>
      <PageHeader title="Wallet" sub="Your balance is derived from the MELD ledger — every kobo traceable to a delivery." />

      <StatCard
        hero
        label="Available balance"
        value={<Money kobo={balance.available} />}
        sub={
          balance.pendingWithdrawalsKobo > 0
            ? `₦${(balance.pendingWithdrawalsKobo / 100).toLocaleString("en-NG")} reserved for pending withdrawals`
            : undefined
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <Card title="Withdraw">
          <WithdrawForm bankLabel={me.bankName && me.bankAccountNo ? `${me.bankName} ···${me.bankAccountNo.slice(-4)}` : "your bank on file"} />
        </Card>

        <Card title="Withdrawals">
          <Table head={["Requested", "Amount", "Status"]}>
            {withdrawals.length === 0 ? (
              <EmptyRow span={3} text="No withdrawals yet." />
            ) : (
              withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className={td}>{new Date(w.createdAt).toLocaleDateString("en-NG")}</td>
                  <td className={td}>
                    <Money kobo={w.amountKobo} />
                  </td>
                  <td className={td}>
                    <Badge value={w.status} />
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}
