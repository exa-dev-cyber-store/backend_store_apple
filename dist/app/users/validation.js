"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationSchema = exports.verifyEmailSchema = exports.setPasswordSchema = exports.updateProfileSchema = exports.linkGoogleSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.createUserByAdminSchema = exports.userIdParamSchema = exports.updateUserRoleSchema = exports.listUsersSchema = exports.verifyGoogleAuthSchema = exports.loginGoogleSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
        email: zod_1.z.string().email("Invalid email address"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    }),
};
exports.loginSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address"),
        password: zod_1.z.string().min(1, "Password is required"),
    }),
};
exports.loginGoogleSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address"),
    }),
};
exports.verifyGoogleAuthSchema = {
    body: zod_1.z
        .object({
        code: zod_1.z.string().optional(),
        credential: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
    })
        .refine((data) => !!(data.code || data.credential || data.token), {
        message: "Either code, credential, or token is required",
        path: ["code"],
    }),
};
exports.listUsersSchema = {
    query: zod_1.z.object({
        limit: zod_1.z.coerce.number().optional(),
        skip: zod_1.z.coerce.number().optional(),
        q: zod_1.z.string().optional(),
        role: zod_1.z.enum(["all", "admin", "user"]).optional(),
    }),
};
exports.updateUserRoleSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "User ID is required"),
    }),
    body: zod_1.z.object({
        role: zod_1.z.enum(['admin', 'user'], {
            message: 'Role must be either "admin" or "user"',
        }),
    }),
};
exports.userIdParamSchema = {
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "User ID is required"),
    }),
};
exports.createUserByAdminSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
        email: zod_1.z.string().email("Invalid email address"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        role: zod_1.z.enum(["admin", "user"]).optional(),
    }),
};
exports.forgotPasswordSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().min(1, "Email is required"),
    }),
};
exports.resetPasswordSchema = {
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, "Reset token is required"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    }),
};
exports.linkGoogleSchema = {
    body: zod_1.z
        .object({
        credential: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
    })
        .refine((data) => !!(data.credential || data.token), {
        message: "Either credential or token is required for Google account linking",
        path: ["credential"],
    }),
};
exports.updateProfileSchema = {
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
    }),
};
exports.setPasswordSchema = {
    body: zod_1.z.object({
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: zod_1.z.string().min(6, "Confirm password must be at least 6 characters").optional(),
    }).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
};
exports.verifyEmailSchema = {
    body: zod_1.z.object({
        code: zod_1.z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
        email: zod_1.z.string().email("Invalid email address").optional(),
    }),
};
exports.resendVerificationSchema = {
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email address").optional(),
    }),
};
