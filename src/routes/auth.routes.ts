import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as authService from "../services/auth.service.js";
import { loginSchema, resetPasswordSchema, refreshTokenSchema } from "../utils/validations.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { authMiddleware } from "../middleware/auth.js";
import type { ContextUser } from "../types/index.js";

const authRouter = new Hono<{ Variables: { user: ContextUser } }>();

authRouter.post("/login", rateLimitMiddleware(), async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    const result = await authService.login(validation.data);

    const { prisma } = await import("../utils/db.js");
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { requiresPasswordReset: true },
    });

    return c.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        requiresPasswordReset: user?.requiresPasswordReset ?? false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Invalid credentials") {
      return c.json({ success: false, error: message }, 401);
    }
    if (message === "Account is deactivated") {
      return c.json({ success: false, error: message }, 403);
    }
    throw new HTTPException(500, { message });
  }
});

authRouter.post("/refresh", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = refreshTokenSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    const result = await authService.refreshAccessToken(validation.data.refreshToken);
    return c.json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 401);
  }
});

authRouter.post("/logout", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = refreshTokenSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      },
      400
    );
  }

  await authService.logout(validation.data.refreshToken);

  return c.json({
    success: true,
    data: { message: "Logged out successfully" },
  });
});

authRouter.post("/reset-password", authMiddleware(), async (c) => {
  const user = c.get("user");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    await authService.resetPassword(
      user.id,
      validation.data.oldPassword,
      validation.data.newPassword
    );

    return c.json({
      success: true,
      data: { message: "Password reset successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "User not found") {
      return c.json({ success: false, error: message }, 404);
    }
    if (message === "Current password is incorrect") {
      return c.json({ success: false, error: message }, 401);
    }
    throw new HTTPException(500, { message });
  }
});

export default authRouter;
