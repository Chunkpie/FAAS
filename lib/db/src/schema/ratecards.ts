import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rateCardsTable = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  transporterId: integer("transporter_id").notNull(),
  pricingType: text("pricing_type").notNull().default("weight"),
  ratePerKg: real("rate_per_kg"),
  ratePerKm: real("rate_per_km"),
  fuelPerKm: real("fuel_per_km"),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRateCardSchema = createInsertSchema(rateCardsTable).omit({ id: true, createdAt: true });
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = typeof rateCardsTable.$inferSelect;
