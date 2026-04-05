import { useRoute, Link } from "wouter";
import {
  useGetInvoice, useReauditInvoice, useUpdateInvoice,
  getGetInvoiceQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = parseInt(params?.id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useGetInvoice(id, {
    query: { enabled: !!id, queryKey: getGetInvoiceQueryKey(id) }
  });
  const reaudit = useReauditInvoice();

  const handleReaudit = () => {
    reaudit.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Re-audit complete" });
      },
      onError: () => toast({ title: "Re-audit failed", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-muted-foreground">Invoice not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight font-mono">{invoice.invoiceNumber}</h2>
            {invoice.status && <StatusBadge status={invoice.status} />}
            {invoice.resolved && <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">{invoice.clientName} · {invoice.transporterName} · {invoice.invoiceDate}</p>
        </div>
        <Button variant="outline" onClick={handleReaudit} disabled={reaudit.isPending}>
          {reaudit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Re-audit
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Invoice Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">₹{invoice.invoiceAmount.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Calculated Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">₹{invoice.calculatedAmount?.toLocaleString() ?? "-"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Difference</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${(invoice.difference ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              ₹{invoice.difference?.toFixed(2) ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">BOL Count</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{invoice.bolCount ?? invoice.bols?.length ?? 0}</div></CardContent>
        </Card>
      </div>

      {invoice.remark && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800"><strong>Remark:</strong> {invoice.remark}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audited BOL Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BOL #</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Actual Wt</TableHead>
                <TableHead className="text-right">Vol Wt</TableHead>
                <TableHead className="text-right">Chargeable Wt</TableHead>
                <TableHead className="text-right">Base Cost</TableHead>
                <TableHead className="text-right">Fuel Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.bols?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No BOLs linked</TableCell>
                </TableRow>
              ) : invoice.bols?.map((bol) => (
                <TableRow key={bol.id} className={bol.validationIssues?.length > 0 ? "bg-red-50" : ""}>
                  <TableCell className="font-mono text-sm font-semibold">{bol.bolNumber}</TableCell>
                  <TableCell className="text-sm">{bol.origin} → {bol.destination}</TableCell>
                  <TableCell className="text-right text-sm">{bol.distance} km</TableCell>
                  <TableCell className="text-right text-sm">{bol.actualWeight} kg</TableCell>
                  <TableCell className="text-right text-sm">{bol.volumetricWeight?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{bol.chargeableWeight?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">₹{bol.baseCost?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">₹{bol.fuelCost?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">₹{bol.calculatedCost?.toFixed(2) ?? "-"}</TableCell>
                  <TableCell>
                    {bol.validationIssues?.length > 0 ? (
                      <div className="space-y-1">
                        {bol.validationIssues.map((issue, i) => (
                          <p key={i} className="text-xs text-red-600">{issue}</p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-green-600">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
