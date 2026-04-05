import { useState } from "react";
import { Link } from "wouter";
import {
  useListExceptions, useResolveException,
  getListExceptionsQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Eye, CheckCircle2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Exceptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");
  const [resolveDialogId, setResolveDialogId] = useState<number | null>(null);
  const [remark, setRemark] = useState("");

  const params = {
    resolved: resolvedFilter === "all" ? undefined : resolvedFilter,
  };

  const { data: exceptions, isLoading } = useListExceptions(params);
  const resolveMutation = useResolveException();

  const handleResolve = (id: number) => {
    resolveMutation.mutate(
      { id, data: { remark, resolved: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExceptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "Exception resolved" });
          setResolveDialogId(null);
          setRemark("");
        },
        onError: () => toast({ title: "Failed to resolve", variant: "destructive" }),
      }
    );
  };

  const openResolveDialog = (id: number) => {
    setResolveDialogId(id);
    setRemark("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Exceptions</h2>
        <p className="text-muted-foreground">Invoices requiring attention — failed or warning audits.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="false">Unresolved</SelectItem>
              <SelectItem value="true">Resolved</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Remark</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                      No exceptions found.
                    </TableCell>
                  </TableRow>
                ) : exceptions?.map((inv) => (
                  <TableRow key={inv.id} className={!inv.resolved ? "bg-red-50/50" : ""}>
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
                      {inv.status && <StatusBadge status={inv.status} />}
                    </TableCell>
                    <TableCell className="text-sm max-w-48 truncate text-muted-foreground">{inv.remark || "-"}</TableCell>
                    <TableCell>
                      {inv.resolved
                        ? <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>
                        : <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        {!inv.resolved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => openResolveDialog(inv.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogId !== null} onOpenChange={(open) => !open && setResolveDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Remark (optional)</Label>
            <Textarea
              placeholder="Describe the resolution..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogId(null)}>Cancel</Button>
            <Button
              onClick={() => resolveDialogId && handleResolve(resolveDialogId)}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
