import { db, bolsTable, rateCardsTable, clientsTable, invoiceBolsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export interface AuditedBolResult {
  id: number;
  bolNumber: string;
  origin: string;
  destination: string;
  distance: number;
  actualWeight: number;
  volumetricWeight: number | null;
  chargeableWeight: number | null;
  baseCost: number | null;
  fuelCost: number | null;
  calculatedCost: number | null;
  validationIssues: string[];
}

export type AuditStatus = "PASS" | "WARNING" | "FAIL";

export interface AuditResult {
  calculatedAmount: number;
  difference: number;
  status: AuditStatus;
  auditedBols: AuditedBolResult[];
}

export async function auditInvoice(
  invoiceId: number,
  clientId: number,
  transporterId: number,
  invoiceAmount: number,
  bolIds: number[]
): Promise<AuditResult> {
  const client = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  const divisor = client[0]?.volumetricDivisor ?? 5000;

  const rateCards = await db
    .select()
    .from(rateCardsTable)
    .where(
      and(
        eq(rateCardsTable.clientId, clientId),
        eq(rateCardsTable.transporterId, transporterId)
      )
    );
  const rateCard = rateCards[0] ?? null;

  const bols = await db
    .select()
    .from(bolsTable)
    .where(inArray(bolsTable.id, bolIds));

  let totalCalculated = 0;
  const auditedBols: AuditedBolResult[] = [];

  for (const bol of bols) {
    const issues: string[] = [];

    let volumetricWeight: number | null = null;
    let chargeableWeight: number | null = null;

    if (bol.length && bol.width && bol.height) {
      volumetricWeight = (bol.length * bol.width * bol.height) / divisor;
      chargeableWeight = Math.max(bol.actualWeight, volumetricWeight);
    } else {
      chargeableWeight = bol.actualWeight;
    }

    let baseCost: number | null = null;
    let fuelCost: number | null = null;
    let calculatedCost: number | null = null;

    if (!rateCard) {
      issues.push("No rate card found for client+transporter combination");
    } else {
      const pt = rateCard.pricingType;

      if (pt === "weight" || pt === "hybrid") {
        if (rateCard.ratePerKg != null && chargeableWeight != null) {
          baseCost = (baseCost ?? 0) + chargeableWeight * rateCard.ratePerKg;
        } else {
          issues.push("Missing rate_per_kg for weight-based pricing");
        }
      }

      if (pt === "distance" || pt === "hybrid") {
        if (rateCard.ratePerKm != null) {
          baseCost = (baseCost ?? 0) + bol.distance * rateCard.ratePerKm;
        } else {
          issues.push("Missing rate_per_km for distance-based pricing");
        }
      }

      if (rateCard.fuelPerKm != null) {
        fuelCost = bol.distance * rateCard.fuelPerKm;
      }

      calculatedCost = (baseCost ?? 0) + (fuelCost ?? 0);
    }

    totalCalculated += calculatedCost ?? 0;

    const updated = await db
      .update(bolsTable)
      .set({ volumetricWeight, chargeableWeight })
      .where(eq(bolsTable.id, bol.id))
      .returning();

    auditedBols.push({
      id: bol.id,
      bolNumber: bol.bolNumber,
      origin: bol.origin,
      destination: bol.destination,
      distance: bol.distance,
      actualWeight: bol.actualWeight,
      volumetricWeight,
      chargeableWeight,
      baseCost,
      fuelCost,
      calculatedCost,
      validationIssues: issues,
    });
  }

  const difference = invoiceAmount - totalCalculated;
  const absDiff = Math.abs(difference);
  const pctDiff = totalCalculated > 0 ? (absDiff / totalCalculated) * 100 : 0;

  let status: AuditStatus;
  if (absDiff <= 50) {
    status = "PASS";
  } else if (pctDiff <= 5) {
    status = "WARNING";
  } else {
    status = "FAIL";
  }

  return {
    calculatedAmount: totalCalculated,
    difference,
    status,
    auditedBols,
  };
}

export async function validateBolMappings(bolNumbers: string[], invoiceId?: number): Promise<string[]> {
  const issues: string[] = [];

  for (const bolNumber of bolNumbers) {
    const bol = await db.select().from(bolsTable).where(eq(bolsTable.bolNumber, bolNumber));
    if (bol.length === 0) {
      issues.push(`BOL ${bolNumber} not found in system`);
      continue;
    }

    const existing = await db
      .select()
      .from(invoiceBolsTable)
      .where(eq(invoiceBolsTable.bolId, bol[0].id));

    const conflicting = existing.filter((m) => invoiceId == null || m.invoiceId !== invoiceId);
    if (conflicting.length > 0) {
      issues.push(`BOL ${bolNumber} is already linked to another invoice (duplicate detected)`);
    }
  }

  return issues;
}
