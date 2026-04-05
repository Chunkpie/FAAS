import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import clientsRouter from "./clients.js";
import transportersRouter from "./transporters.js";
import rateCardsRouter from "./ratecards.js";
import bolsRouter from "./bols.js";
import invoicesRouter from "./invoices.js";
import exceptionsRouter from "./exceptions.js";
import dashboardRouter from "./dashboard.js";
import reportsRouter from "./reports.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(transportersRouter);
router.use(rateCardsRouter);
router.use(bolsRouter);
router.use(invoicesRouter);
router.use(exceptionsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
