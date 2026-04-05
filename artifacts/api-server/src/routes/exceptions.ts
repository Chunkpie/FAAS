import { Router } from "express";
import type { IRouter } from "express";
import { db, invoicesTable, invoiceBolsTable, clientsTable, transportersTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  ResolveExceptionParams, ResolveExceptionBody, ListExceptionsQueryParams
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/exceptions", requireAuth, async (req, res): Promise<void> => {
  const qp = ListExceptionsQueryParams.safeParse(req.query);
  const { clientId, resolved } = qp.success ? qp.data : {};

  let invoices = await db.select().from(invoicesTable).where(
    inArray(invoicesTable.status, ["FAIL", "WARNING"])
  );

  if (clientId) invoices = invoices.filter((i) => i.clientId === clientId);
  if (resolved !== undefined && resolved !== null) {
    const isResolved = resolved === "true" || resolved === true;
    invoices = invoices.filter((i) => i.resolved === isResolved);
  }

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

router.patch("/exceptions/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const params = ResolveExceptionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = ResolveExceptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, any> = { resolved: parsed.data.resolved };
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark;

  const [inv] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId));
  const [transporter] = await db.select().from(transportersTable).where(eq(transportersTable.id, inv.transporterId));
  const bolMappings = await db.select().from(invoiceBolsTable).where(eq(invoiceBolsTable.invoiceId, inv.id));

  res.json({
    ...inv,
    clientName: client?.name ?? null,
    transporterName: transporter?.name ?? null,
    bolCount: bolMappings.length,
  });
});

export default router;
