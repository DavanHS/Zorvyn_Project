import crypto from "crypto";

export function generateRandomToken(byteLength: number = 64): string {
  return crypto.randomBytes(byteLength).toString("hex");
}
