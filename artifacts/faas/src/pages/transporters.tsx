import { useState } from "react";
import {
  useListTransporters, useCreateTransporter, useDeleteTransporter, useListClients,
  getListTransportersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Transporters() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>("none");

  const { data: transporters, isLoading } = useListTransporters({});
  const { data: clients } = useListClients();
  const createTransporter = useCreateTransporter();
  const deleteTransporter = useDeleteTransporter();

  const handleCreate = () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    createTransporter.mutate({
      data: { name, clientId: clientId !== "none" ? parseInt(clientId) : null }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransportersQueryKey({}) });
        toast({ title: "Transporter created" });
        setOpen(false); setName(""); setClientId("none");
      },
      onError: (err: any) => toast({ title: err?.data?.error ?? "Failed", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number, tName: string) => {
    if (!confirm(`Delete "${tName}"?`)) return;
    deleteTransporter.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransportersQueryKey({}) });
        toast({ title: "Transporter deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const getClientName = (cId: number | null) => {
    if (!cId) return "All clients";
    return clients?.find((c) => c.id === cId)?.name ?? "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transporters</h2>
          <p className="text-muted-foreground">Manage freight carrier accounts.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Transporter</Button>
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
                  <TableHead>Client</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transporters?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">No transporters yet.</TableCell>
                  </TableRow>
                ) : transporters?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getClientName(t.clientId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id, t.name)}>
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
          <DialogHeader><DialogTitle>New Transporter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="BlueDart Logistics" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Associated Client (optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific client</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTransporter.isPending}>
              {createTransporter.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Transporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
