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
      code: z.string().optional(),
      credential: z.string().optional(),
      token: z.string().optional(),
    })
    .refine((data) => !!(data.code || data.credential || data.token), {
      message: "Either code, credential, or token is required",
      path: ["code"],
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

export const createUserByAdminSchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["admin", "user"]).optional(),
  }),
};

export const forgotPasswordSchema: ValidateSchema = {
  body: z.object({
    email: z.string().min(1, "Email is required"),
  }),
};

export const resetPasswordSchema: ValidateSchema = {
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
};

export const linkGoogleSchema: ValidateSchema = {
  body: z
    .object({
      credential: z.string().optional(),
      token: z.string().optional(),
    })
    .refine((data) => !!(data.credential || data.token), {
      message: "Either credential or token is required for Google account linking",
      path: ["credential"],
    }),
};

export const updateProfileSchema: ValidateSchema = {
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  }),
};

export const setPasswordSchema: ValidateSchema = {
  body: z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters").optional(),
  }).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
};

