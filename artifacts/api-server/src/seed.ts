import bcrypt from "bcryptjs";
import {
  db, usersTable, clientsTable, transportersTable, rateCardsTable,
  bolsTable, invoicesTable, invoiceBolsTable
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const auditorHash = await bcrypt.hash("auditor123", 10);

  const [admin] = await db.insert(usersTable).values([
    { username: "admin", passwordHash: adminHash, role: "admin" },
    { username: "auditor", passwordHash: auditorHash, role: "auditor" },
  ]).onConflictDoNothing().returning();

  console.log("Users seeded");

  const [c1] = await db.insert(clientsTable).values([
    { name: "Acme Logistics", volumetricDivisor: 5000, fuelRatePerKm: 0 },
    { name: "BlueStar Industries", volumetricDivisor: 4000, fuelRatePerKm: 0 },
  ]).onConflictDoNothing().returning();

  const clients = await db.select().from(clientsTable);
  const acme = clients.find((c) => c.name === "Acme Logistics");
  const bluestar = clients.find((c) => c.name === "BlueStar Industries");

  console.log("Clients seeded");

  const [t1] = await db.insert(transportersTable).values([
    { name: "BlueDart Express", clientId: null },
    { name: "Delhivery Freight", clientId: null },
    { name: "DTDC Cargo", clientId: null },
  ]).onConflictDoNothing().returning();

  const transporters = await db.select().from(transportersTable);
  const bluedart = transporters.find((t) => t.name === "BlueDart Express");
  const delhivery = transporters.find((t) => t.name === "Delhivery Freight");

  console.log("Transporters seeded");

  if (acme && bluedart) {
    await db.insert(rateCardsTable).values([
      {
        clientId: acme.id, transporterId: bluedart.id,
        pricingType: "hybrid", ratePerKg: 2.5, ratePerKm: 8.0, fuelPerKm: 1.5,
        effectiveFrom: "2024-01-01", effectiveTo: null,
      },
    ]).onConflictDoNothing();
  }

  if (bluestar && delhivery) {
    await db.insert(rateCardsTable).values([
      {
        clientId: bluestar.id, transporterId: delhivery.id,
        pricingType: "weight", ratePerKg: 3.0, ratePerKm: null, fuelPerKm: 1.2,
        effectiveFrom: "2024-01-01", effectiveTo: null,
      },
    ]).onConflictDoNothing();
  }

  console.log("Rate cards seeded");

  if (acme && bluedart) {
    const [bol1, bol2] = await db.insert(bolsTable).values([
      {
        bolNumber: "BOL-2024-001",
        clientId: acme.id, transporterId: bluedart.id,
        origin: "Mumbai", destination: "Delhi",
        distance: 1400, actualWeight: 500,
        length: 100, width: 80, height: 60,
        volumetricWeight: (100 * 80 * 60) / 5000,
        chargeableWeight: Math.max(500, (100 * 80 * 60) / 5000),
      },
      {
        bolNumber: "BOL-2024-002",
        clientId: acme.id, transporterId: bluedart.id,
        origin: "Delhi", destination: "Chennai",
        distance: 2200, actualWeight: 300,
        length: null, width: null, height: null,
        volumetricWeight: null, chargeableWeight: 300,
      },
    ]).onConflictDoNothing().returning();

    const bols = await db.select().from(bolsTable).where(
      (await import("drizzle-orm")).inArray(bolsTable.bolNumber, ["BOL-2024-001", "BOL-2024-002"])
    );

    if (bols.length === 2) {
      const chargeableWeight1 = bols[0].chargeableWeight ?? 0;
      const chargeableWeight2 = bols[1].chargeableWeight ?? 0;
      const dist1 = bols[0].distance;
      const dist2 = bols[1].distance;

      const calc1 = chargeableWeight1 * 2.5 + dist1 * 8.0 + dist1 * 1.5;
      const calc2 = chargeableWeight2 * 2.5 + dist2 * 8.0 + dist2 * 1.5;
      const total = calc1 + calc2;
      const invoiceAmount = total + 150;
      const diff = invoiceAmount - total;
      const status = diff <= 50 ? "PASS" : diff / total * 100 <= 5 ? "WARNING" : "FAIL";

      const [inv] = await db.insert(invoicesTable).values({
        invoiceNumber: "INV-2024-001",
        clientId: acme.id, transporterId: bluedart.id,
        invoiceAmount,
        calculatedAmount: total,
        difference: diff,
        status,
        invoiceDate: "2024-03-15",
      }).onConflictDoNothing().returning();

      if (inv) {
        await db.insert(invoiceBolsTable).values([
          { invoiceId: inv.id, bolId: bols[0].id },
          { invoiceId: inv.id, bolId: bols[1].id },
        ]).onConflictDoNothing();
      }
    }
  }

  console.log("BOLs and invoices seeded");
  console.log("\nSeed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:   admin / admin123");
  console.log("  Auditor: auditor / auditor123");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
