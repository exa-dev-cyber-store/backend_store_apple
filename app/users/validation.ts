import { z } from "zod";
import type { ValidateSchema } from "../../utils/validator";

export const registerSchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
};

export const loginSchema: ValidateSchema = {
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
};

export const loginGoogleSchema: ValidateSchema = {
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
};

export const verifyGoogleAuthSchema: ValidateSchema = {
  body: z
    .object({
      credential: z.string().optional(),
      token: z.string().optional(),
    })
    .refine((data) => !!(data.credential || data.token), {
      message: "Either credential or token is required",
      path: ["credential"],
    }),
};

export const listUsersSchema: ValidateSchema = {
  query: z.object({
    limit: z.coerce.number().optional(),
    skip: z.coerce.number().optional(),
    q: z.string().optional(),
    role: z.enum(["all", "admin", "user"]).optional(),
  }),
};

export const updateUserRoleSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    role: z.enum(['admin', 'user'], {
      message: 'Role must be either "admin" or "user"',
    }),
  }),
};

export const userIdParamSchema: ValidateSchema = {
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
};
