import { Router } from "express";
import type { IRouter } from "express";
import { db, rateCardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  CreateRateCardBody, UpdateRateCardBody,
  UpdateRateCardParams, DeleteRateCardParams, ListRateCardsQueryParams
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rate-cards", requireAuth, async (req, res): Promise<void> => {
  const qp = ListRateCardsQueryParams.safeParse(req.query);
  const { clientId, transporterId } = qp.success ? qp.data : { clientId: undefined, transporterId: undefined };

  let results;
  if (clientId && transporterId) {
    results = await db.select().from(rateCardsTable).where(
      and(eq(rateCardsTable.clientId, clientId), eq(rateCardsTable.transporterId, transporterId))
    );
  } else if (clientId) {
    results = await db.select().from(rateCardsTable).where(eq(rateCardsTable.clientId, clientId));
  } else if (transporterId) {
    results = await db.select().from(rateCardsTable).where(eq(rateCardsTable.transporterId, transporterId));
  } else {
    results = await db.select().from(rateCardsTable);
  }
  res.json(results);
});

router.post("/rate-cards", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rc] = await db.insert(rateCardsTable).values({
    clientId: parsed.data.clientId,
    transporterId: parsed.data.transporterId,
    pricingType: parsed.data.pricingType,
    ratePerKg: parsed.data.ratePerKg ?? null,
    ratePerKm: parsed.data.ratePerKm ?? null,
    fuelPerKm: parsed.data.fuelPerKm ?? null,
    effectiveFrom: parsed.data.effectiveFrom ?? null,
    effectiveTo: parsed.data.effectiveTo ?? null,
  }).returning();
  res.status(201).json(rc);
});

router.patch("/rate-cards/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRateCardParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rc] = await db.update(rateCardsTable).set(parsed.data).where(eq(rateCardsTable.id, params.data.id)).returning();
  if (!rc) { res.status(404).json({ error: "Rate card not found" }); return; }
  res.json(rc);
});

router.delete("/rate-cards/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRateCardParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(rateCardsTable).where(eq(rateCardsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
