import { useState } from "react";
import { Link } from "wouter";
import {
  useListBols, useDeleteBol, useListClients, useListTransporters,
  getListBolsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Bols() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string>("all");
  const [transporterId, setTransporterId] = useState<string>("all");

  const params = {
    search: search || undefined,
    clientId: clientId !== "all" ? parseInt(clientId) : undefined,
    transporterId: transporterId !== "all" ? parseInt(transporterId) : undefined,
  };

  const { data: bols, isLoading } = useListBols(params);
  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({});
  const deleteMutation = useDeleteBol();

  const handleDelete = (id: number, bolNumber: string) => {
    if (!confirm(`Delete BOL ${bolNumber}?`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBolsQueryKey() });
        toast({ title: "BOL deleted" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bill of Lading</h2>
          <p className="text-muted-foreground">Manage shipment records.</p>
        </div>
        <Link href="/bols/new">
          <Button><Plus className="h-4 w-4 mr-2" />New BOL</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search BOL number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Clients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transporterId} onValueChange={setTransporterId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Transporters" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transporters</SelectItem>
                {transporters?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
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
                  <TableHead>BOL #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Actual Wt</TableHead>
                  <TableHead className="text-right">Vol Wt</TableHead>
                  <TableHead className="text-right">Chargeable</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bols?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No BOLs found.
                    </TableCell>
                  </TableRow>
                ) : bols?.map((bol) => (
                  <TableRow key={bol.id}>
                    <TableCell className="font-mono text-sm font-semibold">{bol.bolNumber}</TableCell>
                    <TableCell className="text-sm">{bol.clientName ?? "-"}</TableCell>
                    <TableCell className="text-sm">{bol.transporterName ?? "-"}</TableCell>
                    <TableCell className="text-sm">{bol.origin} → {bol.destination}</TableCell>
                    <TableCell className="text-right text-sm">{bol.distance} km</TableCell>
                    <TableCell className="text-right text-sm">{bol.actualWeight} kg</TableCell>
                    <TableCell className="text-right text-sm">{bol.volumetricWeight?.toFixed(2) ?? "-"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{bol.chargeableWeight?.toFixed(2) ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(bol.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(bol.id, bol.bolNumber)}
                      >
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
    </div>
  );
}
