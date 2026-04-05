import { useState } from "react";
import { Link } from "wouter";
import {
  useListInvoices, useDeleteInvoice, useListClients, useListTransporters,
  getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Eye, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string>("all");
  const [transporterId, setTransporterId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const params = {
    search: search || undefined,
    clientId: clientId !== "all" ? parseInt(clientId) : undefined,
    transporterId: transporterId !== "all" ? parseInt(transporterId) : undefined,
    status: status !== "all" ? status : undefined,
  };

  const { data: invoices, isLoading } = useListInvoices(params);
  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({});
  const deleteMutation = useDeleteInvoice();

  const handleDelete = (id: number, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}?`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Invoice deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage and audit freight invoices.</p>
        </div>
        <Link href="/invoices/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transporterId} onValueChange={setTransporterId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Transporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transporters</SelectItem>
                {transporters?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PASS">PASS</SelectItem>
                <SelectItem value="WARNING">WARNING</SelectItem>
                <SelectItem value="FAIL">FAIL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Invoice Amt</TableHead>
                  <TableHead className="text-right">Calc Amt</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>BOLs</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No invoices found. Create your first invoice.
                    </TableCell>
                  </TableRow>
                ) : invoices?.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-semibold">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{inv.clientName ?? "-"}</TableCell>
                    <TableCell className="text-sm">{inv.transporterName ?? "-"}</TableCell>
                    <TableCell className="text-sm">{inv.invoiceDate}</TableCell>
                    <TableCell className="text-right font-mono text-sm">₹{inv.invoiceAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {inv.calculatedAmount != null ? `₹${inv.calculatedAmount.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${(inv.difference ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                      {inv.difference != null ? `₹${inv.difference.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {inv.status ? <StatusBadge status={inv.status} /> : <Badge variant="outline">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{inv.bolCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
