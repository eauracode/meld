import { meldApi } from "@/lib/api";
import { CSV_HEADER } from "@/lib/csv";
import { Card, PageHeader } from "@/components/ui";
import { CsvImport } from "@/components/csv-import";

export default async function ImportOrders() {
  const me = await meldApi.me();
  return (
    <>
      <PageHeader
        title="Import orders (CSV)"
        sub="Rows are validated one by one — valid rows import, invalid rows are reported with the reason. Partial imports are fine."
      />
      <Card>
        <CsvImport disabled={me.status !== "approved"} header={CSV_HEADER} />
      </Card>
    </>
  );
}
