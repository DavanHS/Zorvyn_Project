import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as userService from "../services/user.service.js";
import { createUserSchema, updateUserSchema, transferSuperAdminSchema } from "../utils/validations.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import type { ContextUser } from "../types/index.js";

const userRouter = new Hono<{ Variables: { user: ContextUser } }>();

userRouter.post("/", authMiddleware(), requireRole("admin"), async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const validation = createUserSchema.safeParse(body);
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
    const result = await userService.createUser(validation.data);

    return c.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        requiresPasswordReset: result.requiresPasswordReset,
        createdAt: result.createdAt,
        tempPassword: result.tempPassword,
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Email already in use") {
      return c.json({ success: false, error: message }, 400);
    }
    throw new HTTPException(500, { message });
  }
});

userRouter.get("/", authMiddleware(), requireRole("admin"), async (c) => {
  const users = await userService.getAllUsers();

  return c.json({
    success: true,
    data: users,
  });
});

userRouter.patch("/:id", authMiddleware(), requireRole("admin"), async (c) => {
  const currentUser = c.get("user");
  const userId = c.req.param("id");

  if (currentUser.id === userId && currentUser.isSuperAdmin) {
    return c.json(
      { success: false, error: "Cannot deactivate yourself" },
      400
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const validation = updateUserSchema.safeParse(body);
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
    if (validation.data.status === "inactive") {
      await userService.deactivateUser(userId);
      return c.json({
        success: true,
        data: { message: "User deactivated successfully" },
      });
    }

    const updated = await userService.updateUser(userId, {
      role: validation.data.role,
      status: validation.data.status,
    });

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "User not found") {
      return c.json({ success: false, error: message }, 404);
    }
    if (message === "Cannot deactivate the last active super admin") {
      return c.json({ success: false, error: message }, 400);
    }
    throw new HTTPException(500, { message });
  }
});

userRouter.patch("/:id/transfer-super-admin", authMiddleware(), requireRole("admin"), async (c) => {
  const currentUser = c.get("user");
  const targetUserId = c.req.param("id");

  if (!currentUser.isSuperAdmin) {
    return c.json(
      { success: false, error: "Only super admin can transfer super admin status" },
      403
    );
  }

  const validation = transferSuperAdminSchema.safeParse({ targetUserId });
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
    await userService.transferSuperAdmin(targetUserId);

    return c.json({
      success: true,
      data: { message: "Super admin status transferred successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Target user not found") {
      return c.json({ success: false, error: message }, 404);
    }
    if (message === "Target user must be an admin") {
      return c.json({ success: false, error: message }, 400);
    }
    if (message === "Target user must be active") {
      return c.json({ success: false, error: message }, 400);
    }
    throw new HTTPException(500, { message });
  }
});

export default userRouter;
