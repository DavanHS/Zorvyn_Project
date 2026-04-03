import type { MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function errorHandler(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      if (error && typeof error === "object" && "status" in error && "message" in error) {
        const status = ((error as { status: number }).status || 500) as ContentfulStatusCode;
        const message = (error as { message: string }).message || "Internal server error";
        return c.json(
          {
            success: false,
            error: message,
          },
          status
        );
      }

      console.error("Unhandled error:", error);
      return c.json(
        {
          success: false,
          error: "Internal server error",
        },
        500
      );
    }
  };
}
