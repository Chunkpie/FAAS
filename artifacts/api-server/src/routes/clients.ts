import { Router } from "express";
import type { IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  CreateClientBody, UpdateClientBody, GetClientParams, UpdateClientParams, DeleteClientParams
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", requireAuth, async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  res.json(clients);
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [client] = await db.insert(clientsTable).values({
    name: parsed.data.name,
    volumetricDivisor: parsed.data.volumetricDivisor ?? 5000,
    fuelRatePerKm: parsed.data.fuelRatePerKm ?? 0,
  }).returning();
  res.status(201).json(client);
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json(client);
});

router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [client] = await db.update(clientsTable).set(parsed.data).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  res.json(client);
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
