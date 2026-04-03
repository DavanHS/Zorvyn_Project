import type { Role, Status } from "@prisma/client";

export type JwtPayload = {
  userId: string;
  email: string;
  role: Role;
  isSuperAdmin: boolean;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: Status;
  isSuperAdmin?: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ContextUser = {
  id: string;
  email: string;
  role: Role;
  isSuperAdmin: boolean;
};
