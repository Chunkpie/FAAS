import { pgTable, serial, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoiceBolsTable = pgTable("invoice_bols", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  bolId: integer("bol_id").notNull(),
});

export const insertInvoiceBolSchema = createInsertSchema(invoiceBolsTable).omit({ id: true });
export type InsertInvoiceBol = z.infer<typeof insertInvoiceBolSchema>;
export type InvoiceBol = typeof invoiceBolsTable.$inferSelect;
