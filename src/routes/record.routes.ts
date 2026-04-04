import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as recordService from "../services/record.service.js";
import { createRecordSchema, updateRecordSchema, recordIdSchema, listRecordsQuerySchema } from "../utils/validations.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import type { ContextUser } from "../types/index.js";

const recordRouter = new Hono<{ Variables: { user: ContextUser } }>();

recordRouter.post("/", authMiddleware(), requireRole("admin"), async (c) => {
  const currentUser = c.get("user");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const validation = createRecordSchema.safeParse(body);
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
    const record = await recordService.createRecord({
      ...validation.data,
      createdBy: currentUser.id,
    });

    return c.json({
      success: true,
      data: record,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new HTTPException(500, { message });
  }
});

recordRouter.get("/", authMiddleware(), requireRole("analyst", "admin"), async (c) => {
  const query = c.req.query();

  const validation = listRecordsQuerySchema.safeParse(query);
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

  const result = await recordService.getRecords(validation.data);

  return c.json({
    success: true,
    data: result.records,
    pagination: result.pagination,
  });
});

recordRouter.get("/:id", authMiddleware(), requireRole("analyst", "admin"), async (c) => {
  const recordId = c.req.param("id");

  const validation = recordIdSchema.safeParse(recordId);
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

  const record = await recordService.getRecordById(recordId);

  if (!record) {
    return c.json({ success: false, error: "Record not found" }, 404);
  }

  return c.json({
    success: true,
    data: record,
  });
});

recordRouter.patch("/:id", authMiddleware(), requireRole("admin"), async (c) => {
  const recordId = c.req.param("id");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const validation = updateRecordSchema.safeParse(body);
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
    const record = await recordService.updateRecord(recordId, validation.data);

    return c.json({
      success: true,
      data: record,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Record not found") {
      return c.json({ success: false, error: message }, 404);
    }
    throw new HTTPException(500, { message });
  }
});

recordRouter.delete("/:id", authMiddleware(), requireRole("admin"), async (c) => {
  const recordId = c.req.param("id");

  const validation = recordIdSchema.safeParse(recordId);
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
    await recordService.deleteRecord(recordId);

    return c.json({
      success: true,
      data: { message: "Record deleted successfully" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Record not found") {
      return c.json({ success: false, error: message }, 404);
    }
    throw new HTTPException(500, { message });
  }
});

export default recordRouter;