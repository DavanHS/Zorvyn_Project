import jwt, { type SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "../types/index.js";
import { getEnv } from "../utils/env.js";

const signOptions: SignOptions = {
  algorithm: "HS256",
};

export function generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    ...signOptions,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken<T extends JwtPayload>(token: string): T {
  return jwt.verify(token, getEnv().JWT_SECRET) as T;
}
