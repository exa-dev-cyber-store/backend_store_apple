"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const multer_1 = __importDefault(require("multer"));
const os_1 = __importDefault(require("os"));
const passport_1 = __importDefault(require("passport"));
const passportLocal = __importStar(require("passport-local"));
const validator_1 = require("../../utils/validator");
const validation_1 = require("./validation");
const auth_1 = require("../../middleware/auth");
const LocalStrategy = passportLocal.Strategy;
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: os_1.default.tmpdir() });
passport_1.default.use(new LocalStrategy({ usernameField: "email" }, controller_1.localStrategy));
// Auth routes
router.post('/register', (0, validator_1.validate)(validation_1.registerSchema), controller_1.createUser);
router.post('/login', (0, validator_1.validate)(validation_1.loginSchema), controller_1.login);
router.post('/signin', (0, validator_1.validate)(validation_1.loginGoogleSchema), controller_1.loginGoogle);
router.post('/google-auth', (0, validator_1.validate)(validation_1.verifyGoogleAuthSchema), controller_1.verifyGoogleAuth);
router.post('/apple-auth', controller_1.verifyAppleAuth);
router.post('/apple/notifications', controller_1.handleAppleNotifications);
router.post('/apple-notifications', controller_1.handleAppleNotifications);
router.post('/refresh', controller_1.refreshAccessToken);
router.post('/refresh-token', controller_1.refreshAccessToken);
router.post('/logout', controller_1.logout);
router.get('/me', auth_1.authenticate, controller_1.me);
router.put('/me', auth_1.authenticate, (0, validator_1.validate)(validation_1.updateProfileSchema), controller_1.updateProfile);
router.put('/profile', auth_1.authenticate, (0, validator_1.validate)(validation_1.updateProfileSchema), controller_1.updateProfile);
router.post('/avatar', auth_1.authenticate, upload.single('avatar'), controller_1.uploadAvatar);
// Set Password & Account Management (OAuth Onboarding / Direct Setting)
router.post('/set-password', auth_1.authenticate, (0, validator_1.validate)(validation_1.setPasswordSchema), controller_1.setPassword);
// Account Linking & Unbinding routes
router.get('/linked-accounts', auth_1.authenticate, controller_1.getLinkedAccounts);
router.post('/link/google', auth_1.authenticate, (0, validator_1.validate)(validation_1.linkGoogleSchema), controller_1.linkGoogleAccount);
router.post('/link/apple', auth_1.authenticate, controller_1.linkAppleAccount);
router.post('/unbind/apple', auth_1.authenticate, controller_1.unbindAppleAccount);
// Forgot & Reset Password routes
router.post('/forgot-password', (0, validator_1.validate)(validation_1.forgotPasswordSchema), controller_1.forgotPassword);
router.post('/reset-password', (0, validator_1.validate)(validation_1.resetPasswordSchema), controller_1.resetPassword);
// Admin User Management routes
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.listUsersSchema), controller_1.getUsers);
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.createUserByAdminSchema), controller_1.adminCreateUser);
router.get('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.userIdParamSchema), controller_1.getUserById);
router.put('/users/:id/role', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.updateUserRoleSchema), controller_1.updateUserRole);
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.userIdParamSchema), controller_1.deleteUser);
exports.default = router;
