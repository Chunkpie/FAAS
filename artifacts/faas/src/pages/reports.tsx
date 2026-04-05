import { useState } from "react";
import { useListClients, useListTransporters } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { getToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState<string>("all");
  const [transporterId, setTransporterId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);

  const { data: clients } = useListClients();
  const { data: transporters } = useListTransporters({});

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (clientId !== "all") params.set("clientId", clientId);
      if (transporterId !== "all") params.set("transporterId", transporterId);
      if (status !== "all") params.set("status", status);

      const token = getToken();
      const url = `/api/reports/download?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast({ title: "Download failed", variant: "destructive" });
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `freight-audit-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Report downloaded successfully" });
    } catch {
      toast({ title: "Failed to download report", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Generate and download Excel audit reports.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle>Full Audit Report</CardTitle>
              <CardDescription>Exports 3 sheets: full audit, summary, and issues only.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Filter by Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Filter by Transporter</Label>
              <Select value={transporterId} onValueChange={setTransporterId}>
                <SelectTrigger><SelectValue placeholder="All Transporters" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transporters</SelectItem>
                  {transporters?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Filter by Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PASS">PASS only</SelectItem>
                <SelectItem value="WARNING">WARNING only</SelectItem>
                <SelectItem value="FAIL">FAIL only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md p-4 bg-muted/30 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Report Contents:</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Sheet 1: Full audit — all invoice/BOL rows with costs and status</li>
              <li>Sheet 2: Summary — totals and counts</li>
              <li>Sheet 3: Issues only — FAIL and WARNING rows</li>
              <li>Conditional formatting: green (PASS), yellow (WARNING), red (FAIL)</li>
            </ul>
          </div>

          <Button className="w-full" onClick={handleDownload} disabled={downloading}>
            {downloading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              : <><Download className="h-4 w-4 mr-2" />Download Excel Report</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
