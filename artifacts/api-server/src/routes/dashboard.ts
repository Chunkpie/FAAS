import { Router } from "express";
import type { IRouter } from "express";
import { db, invoicesTable, bolsTable, invoiceBolsTable, transportersTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable);
  const totalBols = await db.select({ count: sql<number>`count(*)` }).from(bolsTable);
  const billedIds = await db.select({ bolId: invoiceBolsTable.bolId }).from(invoiceBolsTable);

  const totalInvoices = invoices.length;
  const passCount = invoices.filter((i) => i.status === "PASS").length;
  const warningCount = invoices.filter((i) => i.status === "WARNING").length;
  const failCount = invoices.filter((i) => i.status === "FAIL").length;

  let totalOvercharge = 0;
  let totalUndercharge = 0;
  for (const inv of invoices) {
    if (inv.difference != null) {
      if (inv.difference > 0) totalOvercharge += inv.difference;
      else totalUndercharge += Math.abs(inv.difference);
    }
  }

  const unresolvedExceptions = invoices.filter(
    (i) => (i.status === "FAIL" || i.status === "WARNING") && !i.resolved
  ).length;

  const bolCount = Number(totalBols[0]?.count ?? 0);
  const billedBolIds = new Set(billedIds.map((r) => r.bolId));
  const unbilledBols = bolCount - billedBolIds.size;

  res.json({
    totalInvoices,
    totalBols: bolCount,
    passCount,
    warningCount,
    failCount,
    totalOvercharge,
    totalUndercharge,
    totalDiscrepancy: totalOvercharge + totalUndercharge,
    unresolvedExceptions,
    unbilledBols: Math.max(0, unbilledBols),
  });
});

router.get("/dashboard/monthly-trends", requireAuth, async (_req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable);
  const months: Record<string, { month: string; pass: number; warning: number; fail: number; total: number }> = {};

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    months[key] = { month: label, pass: 0, warning: 0, fail: 0, total: 0 };
  }

  for (const inv of invoices) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) {
      months[key].total++;
      if (inv.status === "PASS") months[key].pass++;
      else if (inv.status === "WARNING") months[key].warning++;
      else if (inv.status === "FAIL") months[key].fail++;
    }
  }

  res.json(Object.values(months));
});

router.get("/dashboard/transporter-stats", requireAuth, async (_req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable);
  const transporters = await db.select().from(transportersTable);

  const statsMap: Record<number, { total: number; failed: number }> = {};
  for (const inv of invoices) {
    if (!statsMap[inv.transporterId]) statsMap[inv.transporterId] = { total: 0, failed: 0 };
    statsMap[inv.transporterId].total++;
    if (inv.status === "FAIL") statsMap[inv.transporterId].failed++;
  }

  const result = Object.entries(statsMap).map(([tid, stats]) => {
    const transporter = transporters.find((t) => t.id === parseInt(tid));
    return {
      transporterId: parseInt(tid),
      transporterName: transporter?.name ?? tid,
      total: stats.total,
      failed: stats.failed,
      errorPercent: stats.total > 0 ? Math.round((stats.failed / stats.total) * 100 * 10) / 10 : 0,
    };
  });

  res.json(result);
});

export default router;
