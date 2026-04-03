import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { JwtPayload } from "../types/index.js";
import { verifyToken } from "../utils/tokens.js";
import type { Role } from "@prisma/client";
import { prisma } from "../utils/db.js";

export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, {
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = verifyToken<JwtPayload>(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status === "inactive") {
        throw new HTTPException(401, {
          message: "User not found or inactive",
        });
      }

      c.set("user", {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
      });

      await next();
    } catch {
      throw new HTTPException(401, {
        message: "Invalid or expired token",
      });
    }
  };
}

export function requireRole(...allowedRoles: Role[]): MiddlewareHandler {
  return (c, next) => {
    const user = c.get("user") as JwtPayload | undefined;

    if (!user) {
      throw new HTTPException(401, {
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, {
        message: "Insufficient permissions",
      });
    }

    return next();
  };
}
