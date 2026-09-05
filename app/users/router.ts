import express, { Router } from "express";
import {
    createUser,
    localStrategy,
    login,
    loginGoogle,
    logout,
    me,
    verifyGoogleAuth,
    getUsers,
    getUserById,
    updateUserRole,
    deleteUser
} from "./controller";
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
    userIdParamSchema
} from "./validation";
import { authenticate, authorize } from "../../middleware/auth";

const LocalStrategy = passportLocal.Strategy;
const router: Router = express.Router();

passport.use(new LocalStrategy({ usernameField: "email" }, localStrategy));

// Auth routes
router.post('/register', validate(registerSchema), createUser);
router.post('/login', validate(loginSchema), login);
router.post('/signin', validate(loginGoogleSchema), loginGoogle);
router.post('/google-auth', validate(verifyGoogleAuthSchema), verifyGoogleAuth);
router.post('/logout', logout);
router.get('/me', authenticate, me);

// Admin User Management routes
router.get('/users', authenticate, authorize('admin'), validate(listUsersSchema), getUsers);
router.get('/users/:id', authenticate, authorize('admin'), validate(userIdParamSchema), getUserById);
router.put('/users/:id/role', authenticate, authorize('admin'), validate(updateUserRoleSchema), updateUserRole);
router.delete('/users/:id', authenticate, authorize('admin'), validate(userIdParamSchema), deleteUser);

export default router;