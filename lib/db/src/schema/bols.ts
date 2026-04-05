import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bolsTable = pgTable("bols", {
  id: serial("id").primaryKey(),
  bolNumber: text("bol_number").notNull().unique(),
  clientId: integer("client_id").notNull(),
  transporterId: integer("transporter_id").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distance: real("distance").notNull(),
  actualWeight: real("actual_weight").notNull(),
  length: real("length"),
  width: real("width"),
  height: real("height"),
  volumetricWeight: real("volumetric_weight"),
  chargeableWeight: real("chargeable_weight"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBolSchema = createInsertSchema(bolsTable).omit({ id: true, createdAt: true, volumetricWeight: true, chargeableWeight: true });
export type InsertBol = z.infer<typeof insertBolSchema>;
export type Bol = typeof bolsTable.$inferSelect;
