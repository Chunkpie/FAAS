import { useGetDashboardSummary, useGetMonthlyTrends, useGetTransporterStats, getGetDashboardSummaryQueryKey, getGetMonthlyTrendsQueryKey, getGetTransporterStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, AlertTriangle, XCircle, CheckCircle2, DollarSign, FileText, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: trends, isLoading: isLoadingTrends } = useGetMonthlyTrends({ query: { queryKey: getGetMonthlyTrendsQueryKey() } });
  const { data: transporterStats, isLoading: isLoadingStats } = useGetTransporterStats({ query: { queryKey: getGetTransporterStatsQueryKey() } });

  if (isLoadingSummary || isLoadingTrends || isLoadingStats) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of auditing operations and financial metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discrepancy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.totalDiscrepancy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overcharge: ${summary?.totalOvercharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pass: {summary?.passCount} | Warn: {summary?.warningCount} | Fail: {summary?.failCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.unresolvedExceptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled BOLs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.unbilledBols}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total BOLs recorded: {summary?.totalBols}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Invoice Status Trends</CardTitle>
            <CardDescription>Monthly breakdown of audit results</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pass" stackId="a" fill="hsl(var(--chart-3))" name="Pass" />
                <Bar dataKey="warning" stackId="a" fill="hsl(var(--chart-2))" name="Warning" />
                <Bar dataKey="fail" stackId="a" fill="hsl(var(--chart-4))" name="Fail" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Transporter Error Rates</CardTitle>
            <CardDescription>Failure percentage by transporter</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transporterStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="transporterName" tick={{fontSize: 12}} />
                <YAxis unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="errorPercent" stroke="hsl(var(--primary))" name="Error Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
