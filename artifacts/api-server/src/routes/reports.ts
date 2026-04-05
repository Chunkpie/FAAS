import { Router } from "express";
import type { IRouter } from "express";
import { db, invoicesTable, invoiceBolsTable, bolsTable, clientsTable, transportersTable, rateCardsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { DownloadReportQueryParams } from "@workspace/api-zod";
import ExcelJS from "exceljs";

const router: IRouter = Router();

router.get("/reports/download", requireAuth, async (req, res): Promise<void> => {
  const qp = DownloadReportQueryParams.safeParse(req.query);
  const { clientId, transporterId, status } = qp.success ? qp.data : {};

  let invoices = await db.select().from(invoicesTable);
  if (clientId) invoices = invoices.filter((i) => i.clientId === clientId);
  if (transporterId) invoices = invoices.filter((i) => i.transporterId === transporterId);
  if (status) invoices = invoices.filter((i) => i.status === status);

  const clients = await db.select().from(clientsTable);
  const transporters = await db.select().from(transportersTable);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const transporterMap = Object.fromEntries(transporters.map((t) => [t.id, t.name]));

  const allMappings = await db.select().from(invoiceBolsTable);
  const allBols = await db.select().from(bolsTable);

  const rows: any[] = [];
  for (const inv of invoices) {
    const bolMappings = allMappings.filter((m) => m.invoiceId === inv.id);
    const invBols = allBols.filter((b) => bolMappings.some((m) => m.bolId === b.id));

    const rcs = await db.select().from(rateCardsTable).where(
      and(eq(rateCardsTable.clientId, inv.clientId), eq(rateCardsTable.transporterId, inv.transporterId))
    );
    const rc = rcs[0] ?? null;
    const clientDivisor = clients.find((c) => c.id === inv.clientId)?.volumetricDivisor ?? 5000;

    if (invBols.length === 0) {
      rows.push({
        invoiceNumber: inv.invoiceNumber,
        bolNumber: "-",
        client: clientMap[inv.clientId] ?? "-",
        transporter: transporterMap[inv.transporterId] ?? "-",
        distance: "-",
        actualWeight: "-",
        volumetricWeight: "-",
        chargeableWeight: "-",
        invoiceAmount: inv.invoiceAmount,
        calculatedAmount: inv.calculatedAmount ?? "-",
        difference: inv.difference ?? "-",
        status: inv.status ?? "-",
        remark: inv.remark ?? "",
      });
    } else {
      for (const bol of invBols) {
        let baseCost: number | null = null;
        let fuelCost: number | null = null;
        let calcCost: number | null = null;

        if (rc) {
          if ((rc.pricingType === "weight" || rc.pricingType === "hybrid") && rc.ratePerKg != null && bol.chargeableWeight != null) {
            baseCost = (baseCost ?? 0) + bol.chargeableWeight * rc.ratePerKg;
          }
          if ((rc.pricingType === "distance" || rc.pricingType === "hybrid") && rc.ratePerKm != null) {
            baseCost = (baseCost ?? 0) + bol.distance * rc.ratePerKm;
          }
          if (rc.fuelPerKm != null) fuelCost = bol.distance * rc.fuelPerKm;
          calcCost = (baseCost ?? 0) + (fuelCost ?? 0);
        }

        rows.push({
          invoiceNumber: inv.invoiceNumber,
          bolNumber: bol.bolNumber,
          client: clientMap[inv.clientId] ?? "-",
          transporter: transporterMap[inv.transporterId] ?? "-",
          distance: bol.distance,
          actualWeight: bol.actualWeight,
          volumetricWeight: bol.volumetricWeight?.toFixed(2) ?? "-",
          chargeableWeight: bol.chargeableWeight?.toFixed(2) ?? "-",
          invoiceAmount: inv.invoiceAmount,
          calculatedAmount: calcCost?.toFixed(2) ?? "-",
          difference: inv.difference?.toFixed(2) ?? "-",
          status: inv.status ?? "-",
          remark: inv.remark ?? "",
        });
      }
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "FAAS";

  const statusFills: Record<string, ExcelJS.Fill> = {
    PASS: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } },
    WARNING: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } },
    FAIL: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE8E6" } },
  };

  const headers = [
    "Invoice No", "BOL No", "Client", "Transporter", "Distance (km)",
    "Actual Weight (kg)", "Volumetric Weight", "Chargeable Weight",
    "Invoice Amount", "Calculated Amount", "Difference", "Status", "Remark"
  ];

  function addDataSheet(ws: ExcelJS.Worksheet, sheetRows: any[]) {
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C3A5E" } };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    for (const row of sheetRows) {
      const dataRow = ws.addRow([
        row.invoiceNumber, row.bolNumber, row.client, row.transporter,
        row.distance, row.actualWeight, row.volumetricWeight, row.chargeableWeight,
        row.invoiceAmount, row.calculatedAmount, row.difference, row.status, row.remark
      ]);
      const fill = statusFills[row.status];
      if (fill) {
        dataRow.eachCell((cell) => { cell.fill = fill; });
      }
    }

    ws.columns = headers.map(() => ({ width: 18 }));
  }

  const ws1 = wb.addWorksheet("Full Audit Report");
  addDataSheet(ws1, rows);

  const ws2 = wb.addWorksheet("Summary");
  const passCount = invoices.filter((i) => i.status === "PASS").length;
  const warningCount = invoices.filter((i) => i.status === "WARNING").length;
  const failCount = invoices.filter((i) => i.status === "FAIL").length;
  const totalDisc = invoices.reduce((sum, i) => sum + Math.abs(i.difference ?? 0), 0);

  ws2.addRow(["Metric", "Value"]);
  ws2.getRow(1).font = { bold: true };
  ws2.addRow(["Total Invoices", invoices.length]);
  ws2.addRow(["PASS", passCount]);
  ws2.addRow(["WARNING", warningCount]);
  ws2.addRow(["FAIL", failCount]);
  ws2.addRow(["Total Discrepancy (₹)", totalDisc.toFixed(2)]);
  ws2.columns = [{ width: 28 }, { width: 16 }];

  const ws3 = wb.addWorksheet("Issues Only");
  const issueRows = rows.filter((r) => r.status === "FAIL" || r.status === "WARNING");
  addDataSheet(ws3, issueRows);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="freight-audit-report.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
});

export default router;
