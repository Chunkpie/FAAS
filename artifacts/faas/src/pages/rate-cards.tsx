import { useState } from "react";
import {
  useListRateCards, useCreateRateCard, useDeleteRateCard, useListClients, useListTransporters,
  getListRateCardsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RateCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [form, setForm] = useState({
    clientId: "", transporterId: "", pricingType: "weight",
    ratePerKg: "", ratePerKm: "", fuelPerKm: "",
    effectiveFrom: "", effectiveTo: "",
  });

  const { data: rateCards, isLoading } = useListRateCards({
    clientId: filterClientId !== "all" ? parseInt(filterClientId) : undefined,
  });
  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({
    clientId: form.clientId ? parseInt(form.clientId) : undefined
  });
  const createRateCard = useCreateRateCard();
  const deleteRateCard = useDeleteRateCard();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = () => {
    if (!form.clientId || !form.transporterId) {
      toast({ title: "Client and transporter required", variant: "destructive" }); return;
    }
    createRateCard.mutate({
      data: {
        clientId: parseInt(form.clientId),
        transporterId: parseInt(form.transporterId),
        pricingType: form.pricingType as "weight" | "distance" | "hybrid",
        ratePerKg: form.ratePerKg ? parseFloat(form.ratePerKg) : null,
        ratePerKm: form.ratePerKm ? parseFloat(form.ratePerKm) : null,
        fuelPerKm: form.fuelPerKm ? parseFloat(form.fuelPerKm) : null,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
        toast({ title: "Rate card created" });
        setOpen(false);
        setForm({ clientId: "", transporterId: "", pricingType: "weight", ratePerKg: "", ratePerKm: "", fuelPerKm: "", effectiveFrom: "", effectiveTo: "" });
      },
      onError: (err: any) => toast({ title: err?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this rate card?")) return;
    deleteRateCard.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
        toast({ title: "Rate card deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const getClientName = (id: number) => clients?.find((c) => c.id === id)?.name ?? "-";
  const getTransporterName = (id: number) => {
    const allTransporters = transporters ?? [];
    return allTransporters.find((t) => t.id === id)?.name ?? id.toString();
  };

  const pricingBadgeColor = (type: string) => {
    if (type === "weight") return "bg-blue-100 text-blue-800";
    if (type === "distance") return "bg-purple-100 text-purple-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rate Cards</h2>
          <p className="text-muted-foreground">Define pricing rules per client and transporter.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Rate Card</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
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
                  <TableHead>Client</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Rate/kg</TableHead>
                  <TableHead className="text-right">Rate/km</TableHead>
                  <TableHead className="text-right">Fuel/km</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateCards?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">No rate cards yet.</TableCell>
                  </TableRow>
                ) : rateCards?.map((rc) => (
                  <TableRow key={rc.id}>
                    <TableCell className="font-semibold text-sm">{getClientName(rc.clientId)}</TableCell>
                    <TableCell className="text-sm">{getTransporterName(rc.transporterId)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pricingBadgeColor(rc.pricingType)}`}>
                        {rc.pricingType}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {rc.ratePerKg != null ? `₹${rc.ratePerKg}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {rc.ratePerKm != null ? `₹${rc.ratePerKm}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {rc.fuelPerKm != null ? `₹${rc.fuelPerKm}` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rc.effectiveFrom ? `${rc.effectiveFrom}${rc.effectiveTo ? ` → ${rc.effectiveTo}` : "+"}` : "Always"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Rate Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v, transporterId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Transporter *</Label>
                <Select value={form.transporterId} onValueChange={(v) => setForm((f) => ({ ...f, transporterId: v }))} disabled={!form.clientId}>
                  <SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger>
                  <SelectContent>
                    {transporters?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pricing Type</Label>
              <Select value={form.pricingType} onValueChange={(v) => setForm((f) => ({ ...f, pricingType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight-based</SelectItem>
                  <SelectItem value="distance">Distance-based</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Weight + Distance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(form.pricingType === "weight" || form.pricingType === "hybrid") && (
                <div className="space-y-1.5">
                  <Label>Rate/kg (₹)</Label>
                  <Input type="number" step="0.01" placeholder="2.50" value={form.ratePerKg} onChange={set("ratePerKg")} />
                </div>
              )}
              {(form.pricingType === "distance" || form.pricingType === "hybrid") && (
                <div className="space-y-1.5">
                  <Label>Rate/km (₹)</Label>
                  <Input type="number" step="0.01" placeholder="8.00" value={form.ratePerKm} onChange={set("ratePerKm")} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Fuel/km (₹)</Label>
                <Input type="number" step="0.01" placeholder="1.50" value={form.fuelPerKm} onChange={set("fuelPerKm")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={set("effectiveFrom")} />
              </div>
              <div className="space-y-1.5">
                <Label>Effective To</Label>
                <Input type="date" value={form.effectiveTo} onChange={set("effectiveTo")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRateCard.isPending}>
              {createRateCard.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Rate Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
