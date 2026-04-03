import { prisma } from "../utils/db.js";
import { verifyPassword, hashPassword } from "../utils/password.js";
import { generateAccessToken } from "../utils/tokens.js";
import { generateRandomToken } from "../utils/crypto.js";
import type { AuthTokens, LoginInput } from "../types/index.js";

export async function login(input: LoginInput): Promise<AuthTokens & { userId: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status === "inactive") {
    throw new Error("Account is deactivated");
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const MAX_RETRIES = 3;
  let refreshToken = "";
  let sessionCreated = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    refreshToken = generateRandomToken();

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });
      sessionCreated = true;
      break;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  if (!sessionCreated) {
    throw new Error("Failed to generate a unique refresh token after multiple attempts");
  }

  return { accessToken, refreshToken, userId: user.id };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const session = await prisma.session.findUnique({
    where: { token: refreshToken },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    throw new Error("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || user.status === "inactive") {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error("Account is deactivated");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  });

  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { token: refreshToken },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code !== "P2025") {
      throw error;
    }
  }
}

export async function resetPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.requiresPasswordReset) {
    const validOldPassword = await verifyPassword(oldPassword, user.passwordHash);
    if (!validOldPassword) {
      throw new Error("Current password is incorrect");
    }
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      requiresPasswordReset: false,
    },
  });
}
