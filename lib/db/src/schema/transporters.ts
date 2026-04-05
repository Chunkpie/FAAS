import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transportersTable = pgTable("transporters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransporterSchema = createInsertSchema(transportersTable).omit({ id: true, createdAt: true });
export type InsertTransporter = z.infer<typeof insertTransporterSchema>;
export type Transporter = typeof transportersTable.$inferSelect;
