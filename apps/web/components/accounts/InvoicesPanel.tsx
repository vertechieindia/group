"use client";

import { ReceiptText } from "lucide-react";
import { Badge, Card } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useInvoices } from "@/features/lifecycle/hooks";

export function InvoicesPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: invoices, isLoading } = useInvoices(entityId);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Client Invoices</h1>
        <p className="text-sm text-muted-foreground">Approved timesheet hours become invoice-ready records for accounts managers.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 font-semibold"><ReceiptText className="size-5 text-primary" />Invoice queue</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((invoice) => (
              <tr className="border-t border-border" key={invoice.id}>
                <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3">{invoice.periodStart && invoice.periodEnd ? `${invoice.periodStart} to ${invoice.periodEnd}` : "Not set"}</td>
                <td className="px-4 py-3">{invoice.totalHours.toFixed(2)}</td>
                <td className="px-4 py-3">${invoice.totalAmount.toFixed(2)}</td>
                <td className="px-4 py-3"><Badge>{invoice.status}</Badge></td>
              </tr>
            ))}
            {!isLoading && !invoices?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No invoices have been generated yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
