import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getEnv } from "./utils/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";

const env = getEnv();

const app = new Hono<{ Variables: { user: { id: string; email: string; role: string; isSuperAdmin: boolean } } }>();

app.use("*", errorHandler());

app.use("*", cors({
  origin: env.CORS_ORIGIN,
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 3600,
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

console.log(`Starting server on port ${env.PORT}...`);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
    console.log(`Health check: http://localhost:${info.port}/health`);
    console.log(`API base URL: http://localhost:${info.port}/api`);
  }
);
