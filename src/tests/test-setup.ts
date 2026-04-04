import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "../middleware/error-handler.js";
import authRouter from "../routes/auth.routes.js";
import userRouter from "../routes/user.routes.js";
import recordRouter from "../routes/record.routes.js";
import dashboardRouter from "../routes/dashboard.routes.js";

export const app = new Hono<{ Variables: { user: { id: string; email: string; role: string; isSuperAdmin: boolean } } }>();

app.use("*", errorHandler());

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const api = app.basePath("/api");
api.route("/auth", authRouter);
api.route("/users", userRouter);
api.route("/records", recordRouter);
api.route("/dashboard", dashboardRouter);