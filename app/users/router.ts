import express, { Router } from "express";
import {
    createUser,
    localStrategy,
    login,
    loginGoogle,
    refreshAccessToken,
    logout,
    me,
    updateProfile,
    uploadAvatar,
    verifyGoogleAuth,
    verifyAppleAuth,
    getLinkedAccounts,
    linkGoogleAccount,
    linkAppleAccount,
    unbindAppleAccount,
    forgotPassword,
    resetPassword,
    setPassword,
    verifyEmail,
    resendVerificationCode,
    getUsers,
    getUserById,
    updateUserRole,
    deleteUser,
    adminCreateUser,
    handleAppleNotifications,
} from "./controller";
import multer from "multer";
import os from "os";
import passport from 'passport';
import * as passportLocal from 'passport-local';
import { validate } from "../../utils/validator";
import {
    loginSchema,
    registerSchema,
    loginGoogleSchema,
    verifyGoogleAuthSchema,
    listUsersSchema,
    updateUserRoleSchema,
    userIdParamSchema,
    createUserByAdminSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    setPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    linkGoogleSchema,
    updateProfileSchema
} from "./validation";
import { authenticate, authorize } from "../../middleware/auth";

const LocalStrategy = passportLocal.Strategy;
const router: Router = express.Router();
const upload = multer({ dest: os.tmpdir() });

passport.use(new LocalStrategy({ usernameField: "email" }, localStrategy));

// Auth routes
router.post('/register', validate(registerSchema), createUser);
router.post('/login', validate(loginSchema), login);
router.post('/signin', validate(loginGoogleSchema), loginGoogle);
router.post('/google-auth', validate(verifyGoogleAuthSchema), verifyGoogleAuth);
router.post('/apple-auth', verifyAppleAuth);
router.post('/apple/notifications', handleAppleNotifications);
router.post('/apple-notifications', handleAppleNotifications);
router.post('/refresh', refreshAccessToken);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/me', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);

// Email Verification & Onboarding routes
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), resendVerificationCode);

// Set Password & Account Management (OAuth Onboarding / Direct Setting)
router.post('/set-password', authenticate, validate(setPasswordSchema), setPassword);

// Account Linking & Unbinding routes
router.get('/linked-accounts', authenticate, getLinkedAccounts);
router.post('/link/google', authenticate, validate(linkGoogleSchema), linkGoogleAccount);
router.post('/link/apple', authenticate, linkAppleAccount);
router.post('/unbind/apple', authenticate, unbindAppleAccount);

// Forgot & Reset Password routes
router.get('/forgot-password', (req, res) => {
    const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    res.redirect(`${clientUrl}/forgot-password`);
});
router.get('/reset-password', (req, res) => {
    const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    const token = req.query.token as string | undefined;
    const redirectUrl = token ? `${clientUrl}/reset-password?token=${encodeURIComponent(token)}` : `${clientUrl}/forgot-password`;
    res.redirect(redirectUrl);
});
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);


// Admin User Management routes
router.get('/users', authenticate, authorize('admin'), validate(listUsersSchema), getUsers);
router.post('/users', authenticate, authorize('admin'), validate(createUserByAdminSchema), adminCreateUser);
router.get('/users/:id', authenticate, authorize('admin'), validate(userIdParamSchema), getUserById);
router.put('/users/:id/role', authenticate, authorize('admin'), validate(updateUserRoleSchema), updateUserRole);
router.delete('/users/:id', authenticate, authorize('admin'), validate(userIdParamSchema), deleteUser);

export default router;