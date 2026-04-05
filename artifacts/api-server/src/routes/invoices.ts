import { Router } from "express";
import type { IRouter } from "express";
import { db, invoicesTable, invoiceBolsTable, bolsTable, clientsTable, transportersTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  CreateInvoiceBody, UpdateInvoiceBody, GetInvoiceParams,
  UpdateInvoiceParams, DeleteInvoiceParams, ListInvoicesQueryParams, ReauditInvoiceParams
} from "@workspace/api-zod";
import { auditInvoice, validateBolMappings } from "../lib/audit.js";

const router: IRouter = Router();

async function getInvoiceWithMeta(id: number) {
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!inv) return null;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId));
  const [transporter] = await db.select().from(transportersTable).where(eq(transportersTable.id, inv.transporterId));
  const bolMappings = await db.select().from(invoiceBolsTable).where(eq(invoiceBolsTable.invoiceId, id));
  return {
    ...inv,
    clientName: client?.name ?? null,
    transporterName: transporter?.name ?? null,
    bolCount: bolMappings.length,
  };
}

router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
  const qp = ListInvoicesQueryParams.safeParse(req.query);
  const { clientId, transporterId, status, search } = qp.success ? qp.data : {};

  let invoices = await db.select().from(invoicesTable).orderBy(sql`${invoicesTable.createdAt} DESC`);
  if (clientId) invoices = invoices.filter((i) => i.clientId === clientId);
  if (transporterId) invoices = invoices.filter((i) => i.transporterId === transporterId);
  if (status) invoices = invoices.filter((i) => i.status === status);
  if (search) invoices = invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(search.toLowerCase()));

  const clients = await db.select().from(clientsTable);
  const transporters = await db.select().from(transportersTable);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const transporterMap = Object.fromEntries(transporters.map((t) => [t.id, t.name]));

  const allMappings = await db.select().from(invoiceBolsTable);
  const bolCountMap: Record<number, number> = {};
  for (const m of allMappings) {
    bolCountMap[m.invoiceId] = (bolCountMap[m.invoiceId] ?? 0) + 1;
  }

  res.json(invoices.map((inv) => ({
    ...inv,
    clientName: clientMap[inv.clientId] ?? null,
    transporterName: transporterMap[inv.transporterId] ?? null,
    bolCount: bolCountMap[inv.id] ?? 0,
  })));
});

router.post("/invoices", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { invoiceNumber, clientId, transporterId, invoiceAmount, invoiceDate, bolNumbers } = parsed.data;

  const validationIssues = await validateBolMappings(bolNumbers);
  if (validationIssues.length > 0) {
    res.status(400).json({ error: validationIssues.join("; ") });
    return;
  }

  const [inv] = await db.insert(invoicesTable).values({
    invoiceNumber, clientId, transporterId, invoiceAmount, invoiceDate,
  }).returning();

  const bolRecords = await db.select().from(bolsTable).where(
    inArray(bolsTable.bolNumber, bolNumbers)
  );

  for (const bol of bolRecords) {
    await db.insert(invoiceBolsTable).values({ invoiceId: inv.id, bolId: bol.id });
  }

  const result = await auditInvoice(inv.id, clientId, transporterId, invoiceAmount, bolRecords.map((b) => b.id));
  const [updated] = await db.update(invoicesTable).set({
    calculatedAmount: result.calculatedAmount,
    difference: result.difference,
    status: result.status,
  }).where(eq(invoicesTable.id, inv.id)).returning();

  const meta = await getInvoiceWithMeta(inv.id);
  res.status(201).json(meta);
});

router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const meta = await getInvoiceWithMeta(params.data.id);
  if (!meta) { res.status(404).json({ error: "Invoice not found" }); return; }

  const bolMappings = await db.select().from(invoiceBolsTable).where(eq(invoiceBolsTable.invoiceId, params.data.id));
  const bolIds = bolMappings.map((m) => m.bolId);

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, meta.clientId));
  const divisor = client?.volumetricDivisor ?? 5000;

  const { rateCardsTable } = await import("@workspace/db");
  const rcs = await db.select().from(rateCardsTable).where(
    and(eq(rateCardsTable.clientId, meta.clientId), eq(rateCardsTable.transporterId, meta.transporterId))
  );
  const rc = rcs[0] ?? null;

  let auditedBols: any[] = [];
  if (bolIds.length > 0) {
    const bols = await db.select().from(bolsTable).where(inArray(bolsTable.id, bolIds));
    auditedBols = bols.map((bol) => {
      const issues: string[] = [];
      if (!rc) issues.push("No rate card found");

      let baseCost: number | null = null;
      let fuelCost: number | null = null;
      let calculatedCost: number | null = null;

      if (rc) {
        if ((rc.pricingType === "weight" || rc.pricingType === "hybrid") && rc.ratePerKg != null && bol.chargeableWeight != null) {
          baseCost = (baseCost ?? 0) + bol.chargeableWeight * rc.ratePerKg;
        }
        if ((rc.pricingType === "distance" || rc.pricingType === "hybrid") && rc.ratePerKm != null) {
          baseCost = (baseCost ?? 0) + bol.distance * rc.ratePerKm;
        }
        if (rc.fuelPerKm != null) fuelCost = bol.distance * rc.fuelPerKm;
        calculatedCost = (baseCost ?? 0) + (fuelCost ?? 0);
      }

      return {
        id: bol.id,
        bolNumber: bol.bolNumber,
        origin: bol.origin,
        destination: bol.destination,
        distance: bol.distance,
        actualWeight: bol.actualWeight,
        volumetricWeight: bol.volumetricWeight,
        chargeableWeight: bol.chargeableWeight,
        baseCost,
        fuelCost,
        calculatedCost,
        validationIssues: issues,
      };
    });
  }

  res.json({ ...meta, bols: auditedBols });
});

router.patch("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, any> = {};
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark;
  if (parsed.data.resolved !== undefined) updateData.resolved = parsed.data.resolved;

  const [inv] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  const meta = await getInvoiceWithMeta(params.data.id);
  res.json(meta);
});

router.delete("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(invoiceBolsTable).where(eq(invoiceBolsTable.invoiceId, params.data.id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/invoices/:id/reaudit", requireAuth, async (req, res): Promise<void> => {
  const params = ReauditInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  const bolMappings = await db.select().from(invoiceBolsTable).where(eq(invoiceBolsTable.invoiceId, params.data.id));
  const bolIds = bolMappings.map((m) => m.bolId);

  const result = await auditInvoice(params.data.id, inv.clientId, inv.transporterId, inv.invoiceAmount, bolIds);
  await db.update(invoicesTable).set({
    calculatedAmount: result.calculatedAmount,
    difference: result.difference,
    status: result.status,
  }).where(eq(invoicesTable.id, params.data.id));

  const meta = await getInvoiceWithMeta(params.data.id);
  res.json(meta);
});

export default router;
