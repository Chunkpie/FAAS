import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListClients, useListTransporters, useCreateInvoice,
  getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function InvoiceNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [bolInput, setBolInput] = useState("");
  const [bolNumbers, setBolNumbers] = useState<string[]>([]);

  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({ clientId: clientId ? parseInt(clientId) : undefined });
  const createInvoice = useCreateInvoice();

  const addBol = () => {
    const bol = bolInput.trim().toUpperCase();
    if (!bol) return;
    if (bolNumbers.includes(bol)) {
      toast({ title: "BOL already added", variant: "destructive" });
      return;
    }
    setBolNumbers([...bolNumbers, bol]);
    setBolInput("");
  };

  const removeBol = (bol: string) => {
    setBolNumbers(bolNumbers.filter((b) => b !== bol));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !clientId || !transporterId || !invoiceAmount || !invoiceDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (bolNumbers.length === 0) {
      toast({ title: "Add at least one BOL number", variant: "destructive" });
      return;
    }

    createInvoice.mutate({
      data: {
        invoiceNumber,
        clientId: parseInt(clientId),
        transporterId: parseInt(transporterId),
        invoiceAmount: parseFloat(invoiceAmount),
        invoiceDate,
        bolNumbers,
      }
    }, {
      onSuccess: (invoice) => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: `Invoice created. Status: ${invoice.status ?? "audited"}` });
        setLocation(`/invoices/${invoice.id}`);
      },
      onError: (err: any) => {
        toast({ title: err?.data?.error ?? "Failed to create invoice", variant: "destructive" });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
          <p className="text-muted-foreground text-sm">Create invoice and run automated audit.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setTransporterId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Transporter *</Label>
                <Select value={transporterId} onValueChange={setTransporterId} disabled={!clientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceAmount">Invoice Amount (₹) *</Label>
              <Input
                id="invoiceAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">BOL Numbers</CardTitle>
            <CardDescription>Add BOL numbers to be linked to this invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter BOL number..."
                value={bolInput}
                onChange={(e) => setBolInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBol(); } }}
              />
              <Button type="button" variant="outline" onClick={addBol}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
            {bolNumbers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bolNumbers.map((bol) => (
                  <Badge key={bol} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1">
                    {bol}
                    <button type="button" onClick={() => removeBol(bol)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {bolNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground">No BOLs added yet.</p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
          {createInvoice.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running Audit...</>
          ) : (
            "Create Invoice & Run Audit"
          )}
        </Button>
      </form>
    </div>
  );
}
