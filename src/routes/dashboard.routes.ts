import { Hono } from "hono";
import * as dashboardService from "../services/dashboard.service.js";
import { authMiddleware } from "../middleware/auth.js";
import type { ContextUser } from "../types/index.js";

const dashboardRouter = new Hono<{ Variables: { user: ContextUser } }>();

dashboardRouter.get("/summary", authMiddleware(), async (c) => {
  const summary = await dashboardService.getDashboardSummary();

  return c.json({
    success: true,
    data: summary,
  });
});

export default dashboardRouter;