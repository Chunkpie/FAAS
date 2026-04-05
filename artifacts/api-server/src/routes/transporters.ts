import { Router } from "express";
import type { IRouter } from "express";
import { db, transportersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  CreateTransporterBody, UpdateTransporterBody,
  UpdateTransporterParams, DeleteTransporterParams, ListTransportersQueryParams
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transporters", requireAuth, async (req, res): Promise<void> => {
  const qp = ListTransportersQueryParams.safeParse(req.query);
  const clientId = qp.success ? qp.data.clientId : undefined;

  let query = db.select().from(transportersTable);
  const transporters = clientId
    ? await db.select().from(transportersTable).where(eq(transportersTable.clientId, clientId))
    : await db.select().from(transportersTable).orderBy(transportersTable.name);

  res.json(transporters);
});

router.post("/transporters", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTransporterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [t] = await db.insert(transportersTable).values({
    name: parsed.data.name,
    clientId: parsed.data.clientId ?? null,
  }).returning();
  res.status(201).json(t);
});

router.patch("/transporters/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTransporterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTransporterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [t] = await db.update(transportersTable).set(parsed.data).where(eq(transportersTable.id, params.data.id)).returning();
  if (!t) { res.status(404).json({ error: "Transporter not found" }); return; }
  res.json(t);
});

router.delete("/transporters/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteTransporterParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(transportersTable).where(eq(transportersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
