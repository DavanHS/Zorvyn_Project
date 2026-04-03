import { prisma } from "../utils/db.js";
import { hashPassword } from "../utils/password.js";
import { generateRandomToken } from "../utils/crypto.js";
import type { Role, Status } from "@prisma/client";

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
}

export interface UpdateUserInput {
  role?: Role;
  status?: Status;
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isSuperAdmin: true,
      requiresPasswordReset: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(input: CreateUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error("Email already in use");
  }

  const tempPassword = generateRandomToken(12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: await hashPassword(tempPassword),
      requiresPasswordReset: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      requiresPasswordReset: true,
      createdAt: true,
    },
  });

  return { ...user, tempPassword };
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deactivateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isSuperAdmin) {
    const activeAdmins = await prisma.user.count({
      where: {
        role: "admin",
        status: "active",
        isSuperAdmin: true,
      },
    });

    if (activeAdmins <= 1) {
      throw new Error("Cannot deactivate the last active super admin");
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status: "inactive" },
    }),
    prisma.session.deleteMany({
      where: { userId },
    }),
  ]);
}

export async function transferSuperAdmin(targetUserId: string) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("Target user not found");
  }

  if (targetUser.role !== "admin") {
    throw new Error("Target user must be an admin");
  }

  if (targetUser.status !== "active") {
    throw new Error("Target user must be active");
  }

  const currentSuperAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true, role: "admin" },
  });

  if (!currentSuperAdmin) {
    throw new Error("No super admin found");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: currentSuperAdmin.id },
      data: { isSuperAdmin: false },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: { isSuperAdmin: true },
    }),
  ]);
}
