import { z } from "zod";
import type { Role, Status } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  oldPassword: z.string().min(8, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["viewer", "analyst", "admin"], {
    errorMap: () => ({ message: "Role must be viewer, analyst, or admin" }),
  }),
});

export const updateUserSchema = z.object({
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine(data => data.role || data.status, {
  message: "At least one of role or status must be provided",
});

export const transferSuperAdminSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
});

const categoryEnum = z.enum([
  "salaries",
  "rent",
  "software",
  "marketing",
  "travel",
  "utilities",
  "insurance",
  "client_payments",
  "investments",
  "refunds",
  "consulting",
  "subscriptions",
  "other",
]);

export const createRecordSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  type: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "Type must be income or expense" }),
  }),
  category: categoryEnum,
  date: z.string().refine((val) => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, { message: "Date cannot be in the future" }),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number().positive("Amount must be a positive number").optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: categoryEnum.optional(),
  date: z.string().refine((val) => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, { message: "Date cannot be in the future" }).optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export const recordIdSchema = z.string().min(1, "Record ID is required");

export const listRecordsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
  type: z.enum(["income", "expense"]).optional(),
  category: categoryEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
}).refine(data => {
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to);
  }
  return true;
}, { message: "From date must be before To date" });