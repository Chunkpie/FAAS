import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useListClients, useListTransporters, useCreateBol,
  getListBolsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BolNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    bolNumber: "", clientId: "", transporterId: "", origin: "", destination: "",
    distance: "", actualWeight: "", length: "", width: "", height: "",
  });

  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({
    clientId: form.clientId ? parseInt(form.clientId) : undefined
  });
  const createBol = useCreateBol();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { bolNumber, clientId, transporterId, origin, destination, distance, actualWeight } = form;
    if (!bolNumber || !clientId || !transporterId || !origin || !destination || !distance || !actualWeight) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }

    createBol.mutate({
      data: {
        bolNumber: bolNumber.toUpperCase(),
        clientId: parseInt(clientId),
        transporterId: parseInt(transporterId),
        origin,
        destination,
        distance: parseFloat(distance),
        actualWeight: parseFloat(actualWeight),
        length: form.length ? parseFloat(form.length) : null,
        width: form.width ? parseFloat(form.width) : null,
        height: form.height ? parseFloat(form.height) : null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBolsQueryKey() });
        toast({ title: "BOL created successfully" });
        setLocation("/bols");
      },
      onError: (err: any) => {
        toast({ title: err?.data?.error ?? "Failed to create BOL", variant: "destructive" });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bols">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New BOL</h2>
          <p className="text-muted-foreground text-sm">Create a new Bill of Lading record.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Shipment Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>BOL Number *</Label>
                <Input placeholder="BOL-001" value={form.bolNumber} onChange={set("bolNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v, transporterId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Transporter *</Label>
              <Select value={form.transporterId} onValueChange={(v) => setForm((f) => ({ ...f, transporterId: v }))} disabled={!form.clientId}>
                <SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger>
                <SelectContent>
                  {transporters?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Origin *</Label>
                <Input placeholder="Mumbai" value={form.origin} onChange={set("origin")} />
              </div>
              <div className="space-y-1.5">
                <Label>Destination *</Label>
                <Input placeholder="Delhi" value={form.destination} onChange={set("destination")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Distance (km) *</Label>
                <Input type="number" placeholder="1400" value={form.distance} onChange={set("distance")} />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Weight (kg) *</Label>
                <Input type="number" placeholder="500" value={form.actualWeight} onChange={set("actualWeight")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensions (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Length (cm)</Label>
              <Input type="number" placeholder="100" value={form.length} onChange={set("length")} />
            </div>
            <div className="space-y-1.5">
              <Label>Width (cm)</Label>
              <Input type="number" placeholder="80" value={form.width} onChange={set("width")} />
            </div>
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              <Input type="number" placeholder="60" value={form.height} onChange={set("height")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createBol.isPending}>
          {createBol.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create BOL"}
        </Button>
      </form>
    </div>
  );
}
