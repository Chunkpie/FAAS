import { useState } from "react";
import {
  useListClients, useCreateClient, useDeleteClient,
  getListClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [divisor, setDivisor] = useState("5000");
  const [fuelRate, setFuelRate] = useState("0");

  const { data: clients, isLoading } = useListClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const handleCreate = () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    createClient.mutate({
      data: { name, volumetricDivisor: parseFloat(divisor), fuelRatePerKm: parseFloat(fuelRate) }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client created" });
        setOpen(false); setName(""); setDivisor("5000"); setFuelRate("0");
      },
      onError: (err: any) => toast({ title: err?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number, clientName: string) => {
    if (!confirm(`Delete client "${clientName}"?`)) return;
    deleteClient.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">Manage client accounts and settings.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Client</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Volumetric Divisor</TableHead>
                  <TableHead className="text-right">Fuel Rate (₹/km)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No clients yet.</TableCell>
                  </TableRow>
                ) : clients?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-right text-sm">{c.volumetricDivisor}</TableCell>
                    <TableCell className="text-right text-sm">₹{c.fuelRatePerKm}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id, c.name)}>
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
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input placeholder="Acme Logistics" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Volumetric Divisor</Label>
              <Input type="number" value={divisor} onChange={(e) => setDivisor(e.target.value)} />
              <p className="text-xs text-muted-foreground">Default: 5000 (L×W×H / divisor = volumetric weight)</p>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Rate (₹/km)</Label>
              <Input type="number" step="0.01" value={fuelRate} onChange={(e) => setFuelRate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createClient.isPending}>
              {createClient.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
