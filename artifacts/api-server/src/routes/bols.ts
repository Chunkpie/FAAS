import { Router } from "express";
import type { IRouter } from "express";
import { db, bolsTable, invoiceBolsTable, clientsTable } from "@workspace/db";
import { eq, and, like, notInArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  CreateBolBody, UpdateBolBody, GetBolParams, UpdateBolParams, DeleteBolParams, ListBolsQueryParams
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/bols/unbilled", requireAuth, async (_req, res): Promise<void> => {
  const billedIds = await db.select({ bolId: invoiceBolsTable.bolId }).from(invoiceBolsTable);
  const billedBolIds = billedIds.map((r) => r.bolId);

  let bols;
  if (billedBolIds.length > 0) {
    bols = await db.select().from(bolsTable).where(notInArray(bolsTable.id, billedBolIds));
  } else {
    bols = await db.select().from(bolsTable);
  }

  const clients = await db.select().from(clientsTable);
  const { transportersTable } = await import("@workspace/db");
  const transporters = await db.select().from(transportersTable);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const transporterMap = Object.fromEntries(transporters.map((t) => [t.id, t.name]));

  res.json(bols.map((b) => ({
    ...b,
    clientName: clientMap[b.clientId] ?? null,
    transporterName: transporterMap[b.transporterId] ?? null,
  })));
});

router.get("/bols", requireAuth, async (req, res): Promise<void> => {
  const qp = ListBolsQueryParams.safeParse(req.query);
  const { clientId, transporterId, search } = qp.success ? qp.data : {};

  let bols = await db.select().from(bolsTable);
  if (clientId) bols = bols.filter((b) => b.clientId === clientId);
  if (transporterId) bols = bols.filter((b) => b.transporterId === transporterId);
  if (search) bols = bols.filter((b) => b.bolNumber.toLowerCase().includes(search.toLowerCase()));

  const clients = await db.select().from(clientsTable);
  const { transportersTable } = await import("@workspace/db");
  const transporters = await db.select().from(transportersTable);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const transporterMap = Object.fromEntries(transporters.map((t) => [t.id, t.name]));

  res.json(bols.map((b) => ({
    ...b,
    clientName: clientMap[b.clientId] ?? null,
    transporterName: transporterMap[b.transporterId] ?? null,
  })));
});

router.post("/bols", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { length, width, height, actualWeight } = parsed.data;
  const client = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
  const divisor = client[0]?.volumetricDivisor ?? 5000;

  let volumetricWeight: number | null = null;
  let chargeableWeight: number | null = actualWeight;
  if (length && width && height) {
    volumetricWeight = (length * width * height) / divisor;
    chargeableWeight = Math.max(actualWeight, volumetricWeight);
  }

  const [bol] = await db.insert(bolsTable).values({
    ...parsed.data,
    length: length ?? null,
    width: width ?? null,
    height: height ?? null,
    volumetricWeight,
    chargeableWeight,
  }).returning();

  const { transportersTable } = await import("@workspace/db");
  const [transporter] = await db.select().from(transportersTable).where(eq(transportersTable.id, bol.transporterId));

  res.status(201).json({
    ...bol,
    clientName: client[0]?.name ?? null,
    transporterName: transporter?.name ?? null,
  });
});

router.get("/bols/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetBolParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [bol] = await db.select().from(bolsTable).where(eq(bolsTable.id, params.data.id));
  if (!bol) { res.status(404).json({ error: "BOL not found" }); return; }

  const client = await db.select().from(clientsTable).where(eq(clientsTable.id, bol.clientId));
  const { transportersTable } = await import("@workspace/db");
  const [transporter] = await db.select().from(transportersTable).where(eq(transportersTable.id, bol.transporterId));

  res.json({
    ...bol,
    clientName: client[0]?.name ?? null,
    transporterName: transporter?.name ?? null,
  });
});

router.patch("/bols/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateBolParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateBolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(bolsTable).where(eq(bolsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "BOL not found" }); return; }

  const actualWeight = parsed.data.actualWeight ?? existing.actualWeight;
  const length = parsed.data.length ?? existing.length;
  const width = parsed.data.width ?? existing.width;
  const height = parsed.data.height ?? existing.height;

  const client = await db.select().from(clientsTable).where(eq(clientsTable.id, existing.clientId));
  const divisor = client[0]?.volumetricDivisor ?? 5000;

  let volumetricWeight: number | null = null;
  let chargeableWeight: number | null = actualWeight;
  if (length && width && height) {
    volumetricWeight = (length * width * height) / divisor;
    chargeableWeight = Math.max(actualWeight, volumetricWeight);
  }

  const [bol] = await db.update(bolsTable).set({ ...parsed.data, volumetricWeight, chargeableWeight }).where(eq(bolsTable.id, params.data.id)).returning();
  res.json({ ...bol, clientName: client[0]?.name ?? null, transporterName: null });
});

router.delete("/bols/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBolParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(bolsTable).where(eq(bolsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
