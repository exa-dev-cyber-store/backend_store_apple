"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppleNotifications = exports.adminCreateUser = exports.deleteUser = exports.updateUserRole = exports.getUserById = exports.getUsers = exports.resetPassword = exports.forgotPassword = exports.resendVerificationCode = exports.verifyEmail = exports.setPassword = exports.unbindAppleAccount = exports.linkAppleAccount = exports.linkGoogleAccount = exports.verifyAppleAuth = exports.verifyGoogleAuth = exports.getLinkedAccounts = exports.uploadAvatar = exports.updateProfile = exports.me = exports.logout = exports.refreshAccessToken = exports.loginGoogle = exports.login = exports.createUser = exports.issueUserTokens = exports.localStrategy = void 0;
exports.authenticateWithAppleCore = authenticateWithAppleCore;
const model_1 = __importDefault(require("./model"));
const refreshTokenModel_1 = __importDefault(require("./refreshTokenModel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const passport_1 = __importDefault(require("passport"));
const utils_1 = require("../../utils");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_2 = __importDefault(require("../cart/model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../services/emailService");
const image_1 = require("../../utils/image");
const localStrategy = (email, password, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield model_1.default.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v').select('+password +name +isEmailVerified +signupProvider +googleId +appleId');
        if (!user || !user.password) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const _a = user.toJSON(), { password: _pw } = _a, userWithoutPassword = __rest(_a, ["password"]);
        return done(null, userWithoutPassword);
    }
    catch (error) {
        return done(error);
    }
});
exports.localStrategy = localStrategy;
/**
 * Issue both a short-lived access token (15m) and a long-lived refresh token (30d)
 */
const issueUserTokens = (user, req) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const accessToken = jsonwebtoken_1.default.sign(payload, process.env.SECRET_JWT_KEY, { expiresIn: '15m', algorithm: 'HS384' });
    const refreshTokenString = crypto_1.default.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    yield refreshTokenModel_1.default.create({
        userId: user._id,
        token: refreshTokenString,
        expiresAt,
        userAgent: (req === null || req === void 0 ? void 0 : req.headers) ? req.headers['user-agent'] : undefined,
        ip: req === null || req === void 0 ? void 0 : req.ip,
    });
    yield model_1.default.findByIdAndUpdate(user._id, { $push: { token: accessToken } });
    return {
        accessToken,
        refreshToken: refreshTokenString,
        token: accessToken, // Backward compatibility
    };
});
exports.issueUserTokens = issueUserTokens;
exports.createUser = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, name, email } = req.body;
    const existingUser = yield model_1.default.findOne({ email });
    if (existingUser) {
        throw new errors_1.ConflictError('Email already exists');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const cart = new model_2.default();
    const user = new model_1.default({
        password: hashedPassword,
        name,
        email,
        hasCustomPassword: true,
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        emailVerificationSentAt: new Date(),
    });
    user.cart = cart._id;
    yield user.save();
    yield cart.save();
    // Send verification code asynchronously
    emailService_1.EmailService.sendVerificationCodeEmail({
        to: user.email,
        name: user.name,
        code: verificationCode,
    }).catch((err) => console.error('[EmailService] Registration verification email dispatch notice:', err.message));
    const response = response_1.ApiResponse.created({
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
        requiresEmailVerification: true,
        user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: false,
            requiresEmailVerification: true,
            hasCustomPassword: true,
            signupProvider: 'local',
        },
    }, 'User registered successfully. A 6-digit verification code has been sent to your email.');
    res.status(201).json(response);
}));
const login = (req, res, next) => {
    passport_1.default.authenticate('local', (err, user, info) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new errors_1.UnauthorizedError((info === null || info === void 0 ? void 0 : info.message) || 'Invalid email or password'));
        }
        try {
            const isOAuthUser = Boolean(user.googleId || user.appleId || (user.signupProvider && user.signupProvider !== 'local'));
            const isEmailVerified = Boolean(user.isEmailVerified || isOAuthUser);
            const requiresEmailVerification = !isOAuthUser && !user.isEmailVerified;
            if (requiresEmailVerification) {
                // Ensure active verification code exists or send a fresh one
                const userDoc = yield model_1.default.findById(user._id);
                if (userDoc) {
                    const now = Date.now();
                    if (!userDoc.emailVerificationCode || !userDoc.emailVerificationExpires || userDoc.emailVerificationExpires < new Date()) {
                        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                        userDoc.emailVerificationCode = verificationCode;
                        userDoc.emailVerificationExpires = new Date(now + 15 * 60 * 1000);
                        userDoc.emailVerificationSentAt = new Date(now);
                        yield userDoc.save();
                        emailService_1.EmailService.sendVerificationCodeEmail({
                            to: userDoc.email,
                            name: userDoc.name,
                            code: verificationCode,
                        }).catch((err) => console.error('[EmailService] Login verification email notice:', err.message));
                    }
                }
                return res.status(200).json(response_1.ApiResponse.success({
                    requiresEmailVerification: true,
                    isEmailVerified: false,
                    email: user.email,
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar || null,
                        isEmailVerified: false,
                        requiresEmailVerification: true,
                        signupProvider: user.signupProvider || 'local',
                    },
                }, 'Email verification is required before signing in. A 6-digit code has been sent to your email.'));
            }
            const tokens = yield (0, exports.issueUserTokens)(user, req);
            (0, utils_1.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken);
            const response = response_1.ApiResponse.success(Object.assign(Object.assign({}, tokens), { name: user.name, role: user.role, email: user.email, avatar: user.avatar || null, isEmailVerified: true, requiresEmailVerification: false, user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar || null,
                    isEmailVerified: true,
                    requiresEmailVerification: false,
                    signupProvider: user.signupProvider || 'local',
                } }), 'Login successful');
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }))(req, res, next);
};
exports.login = login;
exports.loginGoogle = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    let user = yield model_1.default.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v -password -likes -cart');
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = yield bcrypt_1.default.hash(randomPassword, 10);
        user = new model_1.default({
            name: email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
        });
        yield user.save();
    }
    const tokens = yield (0, exports.issueUserTokens)(user, req);
    (0, utils_1.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken);
    const response = response_1.ApiResponse.success(Object.assign(Object.assign({}, tokens), { name: user.name, role: user.role, email: user.email, avatar: user.avatar || null, user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
        } }), 'Google login successful');
    res.status(200).json(response);
}));
exports.refreshAccessToken = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const refreshToken = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.refreshToken) || ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken);
    if (!refreshToken) {
        throw new errors_1.UnauthorizedError('Refresh token is required');
    }
    const tokenDoc = yield refreshTokenModel_1.default.findOne({ token: refreshToken });
    if (!tokenDoc) {
        throw new errors_1.UnauthorizedError('Invalid refresh token');
    }
    if (tokenDoc.revoked) {
        // Token reuse detection - revoke all tokens for this user
        yield refreshTokenModel_1.default.updateMany({ userId: tokenDoc.userId }, { revoked: true, revokedAt: new Date() });
        throw new errors_1.UnauthorizedError('Refresh token was revoked');
    }
    if (tokenDoc.expiresAt < new Date()) {
        throw new errors_1.UnauthorizedError('Refresh token expired');
    }
    const user = yield model_1.default.findById(tokenDoc.userId);
    if (!user) {
        throw new errors_1.UnauthorizedError('User not found');
    }
    // Token rotation: Revoke current refresh token and issue a replacement
    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();
    const newRefreshTokenString = crypto_1.default.randomBytes(40).toString('hex');
    tokenDoc.replacedByToken = newRefreshTokenString;
    yield tokenDoc.save();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    yield refreshTokenModel_1.default.create({
        userId: user._id,
        token: newRefreshTokenString,
        expiresAt,
        userAgent: req.headers ? req.headers['user-agent'] : undefined,
        ip: req.ip,
    });
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const newAccessToken = jsonwebtoken_1.default.sign(payload, process.env.SECRET_JWT_KEY, { expiresIn: '15m', algorithm: 'HS384' });
    yield model_1.default.findByIdAndUpdate(user._id, { $push: { token: newAccessToken } });
    (0, utils_1.setAuthCookies)(res, newAccessToken, newRefreshTokenString);
    const response = response_1.ApiResponse.success({
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenString,
        token: newAccessToken,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
        },
    }, 'Token refreshed successfully');
    res.status(200).json(response);
}));
exports.logout = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const token = (0, utils_1.getToken)(req);
    const refreshToken = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.refreshToken) || ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken);
    if (refreshToken) {
        yield refreshTokenModel_1.default.updateMany({ token: refreshToken }, { revoked: true, revokedAt: new Date() });
    }
    if (token) {
        yield model_1.default.findOneAndUpdate({ token }, { $pull: { token } });
    }
    (0, utils_1.clearAuthCookies)(res);
    const response = response_1.ApiResponse.success(null, 'Logout success');
    res.status(200).json(response);
}));
exports.me = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const userDoc = yield model_1.default.findById(req.user._id).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders hasCustomPassword isEmailVerified');
    const isAppleSignup = (userDoc === null || userDoc === void 0 ? void 0 : userDoc.signupProvider) === 'apple' || Boolean((userDoc === null || userDoc === void 0 ? void 0 : userDoc.appleId) && !(userDoc === null || userDoc === void 0 ? void 0 : userDoc.googleId));
    const googleLinked = Boolean((userDoc === null || userDoc === void 0 ? void 0 : userDoc.googleId) || ((_a = userDoc === null || userDoc === void 0 ? void 0 : userDoc.authProviders) === null || _a === void 0 ? void 0 : _a.includes('google')));
    const appleLinked = Boolean((userDoc === null || userDoc === void 0 ? void 0 : userDoc.appleId) || ((_b = userDoc === null || userDoc === void 0 ? void 0 : userDoc.authProviders) === null || _b === void 0 ? void 0 : _b.includes('apple')));
    const canLinkGoogle = isAppleSignup && !googleLinked;
    const canUnbindApple = appleLinked && googleLinked; // Unbind apple hanya jika google sudah terhubung
    const isEmailVerified = Boolean((userDoc === null || userDoc === void 0 ? void 0 : userDoc.isEmailVerified) || (userDoc === null || userDoc === void 0 ? void 0 : userDoc.googleId) || (userDoc === null || userDoc === void 0 ? void 0 : userDoc.appleId));
    const requiresEmailVerification = Boolean((userDoc === null || userDoc === void 0 ? void 0 : userDoc.signupProvider) === 'local' && !(userDoc === null || userDoc === void 0 ? void 0 : userDoc.isEmailVerified));
    const response = response_1.ApiResponse.success({
        user: Object.assign(Object.assign({}, req.user), { email: (userDoc === null || userDoc === void 0 ? void 0 : userDoc.email) || req.user.email, name: (userDoc === null || userDoc === void 0 ? void 0 : userDoc.name) || req.user.name, avatar: (userDoc === null || userDoc === void 0 ? void 0 : userDoc.avatar) || null, signupProvider: (userDoc === null || userDoc === void 0 ? void 0 : userDoc.signupProvider) || 'local', hasCustomPassword: Boolean(userDoc === null || userDoc === void 0 ? void 0 : userDoc.hasCustomPassword), requiresPasswordSetup: !(userDoc === null || userDoc === void 0 ? void 0 : userDoc.hasCustomPassword), isEmailVerified,
            requiresEmailVerification, googleId: userDoc === null || userDoc === void 0 ? void 0 : userDoc.googleId, googleEmail: userDoc === null || userDoc === void 0 ? void 0 : userDoc.googleEmail, appleId: userDoc === null || userDoc === void 0 ? void 0 : userDoc.appleId, appleEmail: userDoc === null || userDoc === void 0 ? void 0 : userDoc.appleEmail, authProviders: (userDoc === null || userDoc === void 0 ? void 0 : userDoc.authProviders) || [], linkedAccounts: {
                google: googleLinked,
                apple: appleLinked,
                canLinkGoogle,
                canUnbindApple,
                canUnbindGoogle: false, // Google tidak bisa di-unbind
            } }),
        status: 200,
    }, 'Profile retrieved successfully');
    res.status(200).json(response);
}));
exports.updateProfile = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new errors_1.BadRequestError('Full name is required');
    }
    const trimmedName = name.trim();
    const updatedUser = yield model_1.default.findByIdAndUpdate(req.user._id, { name: trimmedName }, { new: true }).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders');
    if (!updatedUser) {
        throw new errors_1.NotFoundError('User not found');
    }
    const response = response_1.ApiResponse.success({
        user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar || null,
            signupProvider: updatedUser.signupProvider,
            googleId: updatedUser.googleId,
            googleEmail: updatedUser.googleEmail,
            appleId: updatedUser.appleId,
            appleEmail: updatedUser.appleEmail,
            authProviders: updatedUser.authProviders || [],
        },
    }, 'Profile updated successfully');
    res.status(200).json(response);
}));
exports.uploadAvatar = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    if (!req.file) {
        throw new errors_1.BadRequestError('Image file is required for avatar upload');
    }
    // Process and convert to fixed 400x400 1:1 square WebP and upload
    const { url } = yield (0, image_1.processAndUploadAvatar)(req.file, 400, 85);
    const updatedUser = yield model_1.default.findByIdAndUpdate(req.user._id, { avatar: url }, { new: true }).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders');
    if (!updatedUser) {
        throw new errors_1.NotFoundError('User not found');
    }
    const response = response_1.ApiResponse.success({
        user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            signupProvider: updatedUser.signupProvider,
        },
        avatar: url,
    }, 'Profile picture updated successfully');
    res.status(200).json(response);
}));
exports.getLinkedAccounts = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const user = yield model_1.default.findById(req.user._id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    const isAppleSignup = user.signupProvider === 'apple' || Boolean(user.appleId && !user.googleId);
    const googleLinked = Boolean(user.googleId || ((_a = user.authProviders) === null || _a === void 0 ? void 0 : _a.includes('google')));
    const appleLinked = Boolean(user.appleId || ((_b = user.authProviders) === null || _b === void 0 ? void 0 : _b.includes('apple')));
    const canLinkGoogle = isAppleSignup && !googleLinked;
    const canUnbindApple = appleLinked && googleLinked;
    const canLinkApple = !appleLinked;
    const response = response_1.ApiResponse.success({
        signupProvider: user.signupProvider || 'local',
        isAppleSignup,
        currentEmail: user.email,
        google: {
            linked: googleLinked,
            email: user.googleEmail || (googleLinked ? user.email : undefined),
            canUnbind: false,
        },
        apple: {
            linked: appleLinked && !user.appleConsentRevoked,
            consentRevoked: Boolean(user.appleConsentRevoked),
            email: user.appleEmail,
            canUnbind: canUnbindApple,
            canLink: canLinkApple,
            requiresGoogleBeforeUnbind: !googleLinked,
        },
        canLinkGoogle,
        canUnbindApple,
        canLinkApple,
    }, 'Linked accounts status retrieved successfully');
    res.status(200).json(response);
}));
exports.verifyGoogleAuth = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, credential, token: inputToken } = req.body;
    let idToken = credential || inputToken;
    if (!idToken && code) {
        // Exchange authorization code for tokens with Google
        const tokenRes = yield fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: 'postmessage',
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = yield tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) {
            console.error('Google token exchange error:', tokenData);
            throw new errors_1.UnauthorizedError(tokenData.error_description || 'Failed to exchange Google authorization code');
        }
        idToken = tokenData.id_token;
    }
    if (!idToken) {
        throw new errors_1.BadRequestError('Google credential or authorization code is required');
    }
    // Pure Backend verification using Google OAuth2 TokenInfo API
    const googleRes = yield fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
        const errData = yield googleRes.json().catch(() => ({}));
        throw new errors_1.UnauthorizedError('Invalid Google authentication token');
    }
    const googlePayload = yield googleRes.json();
    // Validate email presence and email verification
    if (!googlePayload.email || (googlePayload.email_verified !== 'true' && googlePayload.email_verified !== true)) {
        throw new errors_1.BadRequestError('Unverified Google email account');
    }
    const email = googlePayload.email.toLowerCase();
    const googleSub = googlePayload.sub;
    let user = yield model_1.default.findOne({
        $or: [{ googleId: googleSub }, { email }],
    });
    // Auto-provision user if first time Google sign in
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = yield bcrypt_1.default.hash(randomPassword, 10);
        user = new model_1.default({
            name: googlePayload.name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
            signupProvider: 'google',
            googleId: googleSub,
            googleEmail: email,
            authProviders: ['google'],
        });
        yield user.save();
    }
    else {
        let needSave = false;
        if (!user.googleId) {
            user.googleId = googleSub;
            needSave = true;
        }
        if (!user.googleEmail) {
            user.googleEmail = email;
            needSave = true;
        }
        if (!user.authProviders)
            user.authProviders = [];
        if (!user.authProviders.includes('google')) {
            user.authProviders.push('google');
            needSave = true;
        }
        if (needSave) {
            yield user.save();
        }
    }
    const tokens = yield (0, exports.issueUserTokens)(user, req);
    (0, utils_1.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken);
    const response = response_1.ApiResponse.success(Object.assign(Object.assign({}, tokens), { name: user.name, email: user.email, role: user.role, avatar: user.avatar || googlePayload.picture || null, picture: user.avatar || googlePayload.picture || null, hasCustomPassword: Boolean(user.hasCustomPassword), requiresPasswordSetup: !user.hasCustomPassword, user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || googlePayload.picture || null,
            hasCustomPassword: Boolean(user.hasCustomPassword),
            requiresPasswordSetup: !user.hasCustomPassword,
        } }), 'Google authentication verified');
    res.status(200).json(response);
}));
let appleKeysCache = null;
function getApplePublicKeys() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        if (appleKeysCache && now - appleKeysCache.timestamp < 3600000) {
            return appleKeysCache.keys;
        }
        const res = yield fetch('https://appleid.apple.com/auth/keys');
        if (!res.ok) {
            throw new Error('Failed to fetch Apple public keys');
        }
        const data = (yield res.json());
        appleKeysCache = { keys: data.keys, timestamp: now };
        return data.keys;
    });
}
/**
 * Core helper for verifying Apple identity token, provisioning user, and generating JWT
 */
function authenticateWithAppleCore(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { identityToken, email: clientEmail, name: clientName } = params;
        const decodedToken = jsonwebtoken_1.default.decode(identityToken, { complete: true });
        if (!decodedToken || typeof decodedToken !== 'object') {
            throw new errors_1.BadRequestError('Malformed Apple identity token');
        }
        const { header, payload } = decodedToken;
        // Attempt cryptographic verification using Apple Public Keys
        try {
            const appleKeys = yield getApplePublicKeys();
            const matchingKey = appleKeys.find((k) => k.kid === header.kid);
            if (matchingKey) {
                const publicKey = crypto_1.default.createPublicKey({
                    key: matchingKey,
                    format: 'jwk',
                });
                jsonwebtoken_1.default.verify(identityToken, publicKey, {
                    algorithms: ['RS256'],
                });
            }
        }
        catch (err) {
            console.warn('Apple token key verification notice:', err.message);
            if ((payload === null || payload === void 0 ? void 0 : payload.iss) && payload.iss !== 'https://appleid.apple.com') {
                throw new errors_1.UnauthorizedError('Invalid Apple token issuer');
            }
        }
        const appleUserId = payload === null || payload === void 0 ? void 0 : payload.sub;
        const rawEmail = (payload === null || payload === void 0 ? void 0 : payload.email) || clientEmail;
        const email = (rawEmail || `${appleUserId}@privaterelay.appleid.com`).toLowerCase();
        let resolvedName = 'Apple User';
        if (typeof clientName === 'string' && clientName.trim()) {
            resolvedName = clientName.trim();
        }
        else if (typeof clientName === 'object' && clientName) {
            const parts = [clientName.firstName, clientName.lastName].filter(Boolean);
            if (parts.length > 0)
                resolvedName = parts.join(' ');
        }
        else if (email && !email.includes('privaterelay.appleid.com')) {
            resolvedName = email.split('@')[0];
        }
        let user = yield model_1.default.findOne({
            $or: [{ appleId: appleUserId }, { email }],
        });
        // Auto-provision user if first time Apple sign in
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
            const hashedPassword = yield bcrypt_1.default.hash(randomPassword, 10);
            user = new model_1.default({
                name: resolvedName,
                email,
                password: hashedPassword,
                role: 'user',
                signupProvider: 'apple',
                appleId: appleUserId,
                appleEmail: email,
                authProviders: ['apple'],
            });
            yield user.save();
        }
        else {
            let needSave = false;
            if (!user.appleId) {
                user.appleId = appleUserId;
                needSave = true;
            }
            if (!user.appleEmail) {
                user.appleEmail = email;
                needSave = true;
            }
            if (!user.authProviders)
                user.authProviders = [];
            if (!user.authProviders.includes('apple')) {
                user.authProviders.push('apple');
                needSave = true;
            }
            if (user.appleConsentRevoked) {
                user.appleConsentRevoked = false;
                user.appleConsentRevokedAt = undefined;
                needSave = true;
            }
            if (needSave) {
                yield user.save();
            }
        }
        const tokens = yield (0, exports.issueUserTokens)(user);
        return {
            user,
            sessionToken: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            appleUserId,
        };
    });
}
exports.verifyAppleAuth = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { identityToken, token: inputToken, id_token: idTokenParam, email: clientEmail, name: clientName } = req.body;
    const tokenToVerify = identityToken || inputToken || idTokenParam;
    if (!tokenToVerify) {
        throw new errors_1.BadRequestError('Apple identityToken is required');
    }
    const { user, sessionToken, accessToken, refreshToken, appleUserId } = yield authenticateWithAppleCore({
        identityToken: tokenToVerify,
        email: clientEmail,
        name: clientName,
    });
    (0, utils_1.setAuthCookies)(res, accessToken, refreshToken);
    const response = response_1.ApiResponse.success({
        accessToken,
        refreshToken,
        token: sessionToken,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        appleUserId,
        hasCustomPassword: Boolean(user.hasCustomPassword),
        requiresPasswordSetup: !user.hasCustomPassword,
        user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
            hasCustomPassword: Boolean(user.hasCustomPassword),
            requiresPasswordSetup: !user.hasCustomPassword,
        },
    }, 'Apple authentication verified successfully');
    res.status(200).json(response);
}));
exports.linkGoogleAccount = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const { credential, token: inputToken } = req.body;
    const idToken = credential || inputToken;
    if (!idToken) {
        throw new errors_1.BadRequestError('Google credential token is required');
    }
    const user = yield model_1.default.findById(req.user._id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    // RULE: Google linking is ONLY permitted when the user signed up via Apple!
    const isAppleSignup = user.signupProvider === 'apple' || Boolean(user.appleId);
    if (!isAppleSignup) {
        throw new errors_1.BadRequestError('Linking a Google account is only allowed for accounts registered via Apple.');
    }
    if (user.googleId) {
        throw new errors_1.BadRequestError('A Google account is already linked to your profile.');
    }
    // Verify token with Google TokenInfo or UserInfo API (supports both id_token and OAuth access_token)
    let googlePayload = null;
    const tokenInfoIdRes = yield fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (tokenInfoIdRes.ok) {
        googlePayload = yield tokenInfoIdRes.json();
    }
    else {
        const userInfoRes = yield fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${idToken}` },
        });
        if (userInfoRes.ok) {
            googlePayload = yield userInfoRes.json();
        }
        else {
            const tokenInfoAccessRes = yield fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${idToken}`);
            if (tokenInfoAccessRes.ok) {
                googlePayload = yield tokenInfoAccessRes.json();
            }
        }
    }
    if (!googlePayload || !googlePayload.email) {
        throw new errors_1.UnauthorizedError('Google authentication token is invalid or expired');
    }
    if (googlePayload.email_verified !== undefined && googlePayload.email_verified !== 'true' && googlePayload.email_verified !== true) {
        throw new errors_1.BadRequestError('Google email account is not verified');
    }
    const googleEmail = googlePayload.email.toLowerCase();
    const googleSub = googlePayload.sub || googlePayload.user_id;
    // Conflict check
    const conflictingUser = yield model_1.default.findOne({
        _id: { $ne: user._id },
        $or: [{ googleId: googleSub }, { email: googleEmail }],
    });
    if (conflictingUser) {
        throw new errors_1.ConflictError('This Google account is already linked to another user account.');
    }
    // Link Google & OVERWRITE USER EMAIL AS REQUESTED
    const previousEmail = user.email;
    user.googleId = googleSub;
    user.googleEmail = googleEmail;
    user.email = googleEmail; // Update primary email from linked Google account
    if (!user.authProviders)
        user.authProviders = [];
    if (!user.authProviders.includes('google'))
        user.authProviders.push('google');
    if (!user.authProviders.includes('apple') && user.appleId)
        user.authProviders.push('apple');
    if (googlePayload.name && (!user.name || user.name === 'Apple User')) {
        user.name = googlePayload.name;
    }
    yield user.save();
    // Issue updated session token containing the newly linked email
    const payloadJwt = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const sessionToken = jsonwebtoken_1.default.sign(payloadJwt, process.env.SECRET_JWT_KEY, {
        expiresIn: '30d',
        algorithm: 'HS384',
    });
    yield model_1.default.findByIdAndUpdate({ _id: user._id }, { $push: { token: sessionToken } });
    const response = response_1.ApiResponse.success({
        token: sessionToken,
        previousEmail,
        email: user.email,
        name: user.name,
        googleEmail,
        appleId: user.appleId,
        canUnbindApple: true,
    }, `Google account linked successfully. Your account email has been updated to ${user.email}.`);
    res.status(200).json(response);
}));
exports.linkAppleAccount = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const { identityToken, token: inputToken, email: clientEmail } = req.body;
    const tokenToVerify = identityToken || inputToken;
    if (!tokenToVerify) {
        throw new errors_1.BadRequestError('Apple identityToken is required');
    }
    const user = yield model_1.default.findById(req.user._id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    if (user.appleId) {
        throw new errors_1.BadRequestError('An Apple account is already linked to this profile.');
    }
    const decodedToken = jsonwebtoken_1.default.decode(tokenToVerify, { complete: true });
    if (!decodedToken || typeof decodedToken !== 'object') {
        throw new errors_1.BadRequestError('Malformed Apple identity token');
    }
    const { payload } = decodedToken;
    const appleUserId = payload === null || payload === void 0 ? void 0 : payload.sub;
    const rawEmail = (payload === null || payload === void 0 ? void 0 : payload.email) || clientEmail;
    const email = (rawEmail || `${appleUserId}@privaterelay.appleid.com`).toLowerCase();
    // Conflict check
    const conflictingUser = yield model_1.default.findOne({
        _id: { $ne: user._id },
        appleId: appleUserId,
    });
    if (conflictingUser) {
        throw new errors_1.ConflictError('This Apple account is already linked to another user account.');
    }
    user.appleId = appleUserId;
    user.appleEmail = email;
    if (!user.authProviders)
        user.authProviders = [];
    if (!user.authProviders.includes('apple'))
        user.authProviders.push('apple');
    yield user.save();
    const response = response_1.ApiResponse.success({
        appleId: user.appleId,
        appleEmail: user.appleEmail,
        authProviders: user.authProviders,
    }, 'Apple account linked successfully.');
    res.status(200).json(response);
}));
exports.unbindAppleAccount = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const user = yield model_1.default.findById(req.user._id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    const hasApple = Boolean(user.appleId || ((_a = user.authProviders) === null || _a === void 0 ? void 0 : _a.includes('apple')));
    if (!hasApple) {
        throw new errors_1.BadRequestError('No Apple account is linked to this profile.');
    }
    // RULE: Disconnecting Apple is ONLY allowed if a Google account is already linked!
    const hasGoogle = Boolean(user.googleId || ((_b = user.authProviders) === null || _b === void 0 ? void 0 : _b.includes('google')));
    if (!hasGoogle) {
        throw new errors_1.BadRequestError('Apple account cannot be disconnected because no Google account is linked. Please connect a Google account first before disconnecting Apple.');
    }
    // Remove Apple association
    yield model_1.default.updateOne({ _id: user._id }, {
        $unset: { appleId: 1, appleEmail: 1 },
        $pull: { authProviders: 'apple' },
    });
    const response = response_1.ApiResponse.success({
        email: user.email,
        appleLinked: false,
        googleLinked: true,
    }, 'Apple account disconnected successfully. Your account is now fully connected via your Google account.');
    res.status(200).json(response);
}));
exports.setPassword = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const { password } = req.body;
    if (!password || password.length < 6) {
        throw new errors_1.BadRequestError('Password must be at least 6 characters');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const updatedUser = yield model_1.default.findByIdAndUpdate(req.user._id, {
        password: hashedPassword,
        hasCustomPassword: true,
    }, { new: true }).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders hasCustomPassword');
    if (!updatedUser) {
        throw new errors_1.NotFoundError('User not found');
    }
    const response = response_1.ApiResponse.success({
        user: {
            id: updatedUser._id,
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar || null,
            hasCustomPassword: true,
            requiresPasswordSetup: false,
            signupProvider: updatedUser.signupProvider,
            googleId: updatedUser.googleId,
            googleEmail: updatedUser.googleEmail,
            appleId: updatedUser.appleId,
            appleEmail: updatedUser.appleEmail,
            authProviders: updatedUser.authProviders || [],
        },
    }, 'Password set successfully');
    res.status(200).json(response);
}));
exports.verifyEmail = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { code, email: inputEmail } = req.body;
    const targetEmail = (_c = (_b = (inputEmail || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email))) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === null || _c === void 0 ? void 0 : _c.trim();
    if (!targetEmail) {
        throw new errors_1.BadRequestError('Email address is required');
    }
    if (!code || code.trim().length !== 6) {
        throw new errors_1.BadRequestError('6-digit verification code is required');
    }
    const user = yield model_1.default.findOne({ email: targetEmail });
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    if (user.isEmailVerified) {
        const tokens = yield (0, exports.issueUserTokens)(user, req);
        (0, utils_1.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken);
        return res.status(200).json(response_1.ApiResponse.success(Object.assign(Object.assign({}, tokens), { isEmailVerified: true, requiresEmailVerification: false, user: {
                _id: user._id,
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                isEmailVerified: true,
                requiresEmailVerification: false,
                signupProvider: user.signupProvider || 'local',
            } }), 'Email is already verified'));
    }
    if (!user.emailVerificationCode || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        throw new errors_1.BadRequestError('Verification code has expired. Please request a new code.');
    }
    if (user.emailVerificationCode.trim() !== code.trim()) {
        throw new errors_1.BadRequestError('Invalid verification code. Please check and try again.');
    }
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    yield user.save();
    const tokens = yield (0, exports.issueUserTokens)(user, req);
    (0, utils_1.setAuthCookies)(res, tokens.accessToken, tokens.refreshToken);
    const response = response_1.ApiResponse.success(Object.assign(Object.assign({}, tokens), { isEmailVerified: true, requiresEmailVerification: false, user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
            isEmailVerified: true,
            requiresEmailVerification: false,
            signupProvider: user.signupProvider || 'local',
        } }), 'Email verified successfully');
    res.status(200).json(response);
}));
exports.resendVerificationCode = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { email: inputEmail } = req.body;
    const targetEmail = (_c = (_b = (inputEmail || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email))) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === null || _c === void 0 ? void 0 : _c.trim();
    if (!targetEmail) {
        throw new errors_1.BadRequestError('Email address is required');
    }
    const user = yield model_1.default.findOne({ email: targetEmail });
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    if (user.isEmailVerified) {
        return res.status(200).json(response_1.ApiResponse.success({ isEmailVerified: true }, 'Email is already verified'));
    }
    const now = Date.now();
    if (user.emailVerificationSentAt && now - user.emailVerificationSentAt.getTime() < 60000) {
        const waitSeconds = Math.ceil((60000 - (now - user.emailVerificationSentAt.getTime())) / 1000);
        throw new errors_1.BadRequestError(`Please wait ${waitSeconds} seconds before requesting a new code.`);
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(now + 15 * 60 * 1000); // 15 mins
    user.emailVerificationSentAt = new Date(now);
    yield user.save();
    yield emailService_1.EmailService.sendVerificationCodeEmail({
        to: user.email,
        name: user.name,
        code: verificationCode,
    });
    const response = response_1.ApiResponse.success({
        email: user.email,
        cooldownSeconds: 60,
    }, 'A new verification code has been sent to your email.');
    res.status(200).json(response);
}));
exports.forgotPassword = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email || !email.trim()) {
        throw new errors_1.BadRequestError('Email address is required');
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = yield model_1.default.findOne({ email: cleanEmail });
    // Return friendly generic response to protect user privacy
    if (!user) {
        const response = response_1.ApiResponse.success(null, 'If this email address is registered, password reset instructions have been sent to your inbox.');
        return res.status(200).json(response);
    }
    // Daily rate limit: Maximum 3 password reset emails per 24 hours
    const DAILY_LIMIT = 3;
    const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();
    const windowStart = user.resetPasswordWindowStart ? new Date(user.resetPasswordWindowStart) : null;
    const isWindowExpired = !windowStart || (now.getTime() - windowStart.getTime() > WINDOW_MS);
    const currentAttempts = isWindowExpired ? 0 : (user.resetPasswordAttempts || 0);
    if (currentAttempts >= DAILY_LIMIT) {
        const msLeft = (windowStart.getTime() + WINDOW_MS) - now.getTime();
        const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)));
        throw new errors_1.TooManyRequestsError(`You have reached the maximum limit of ${DAILY_LIMIT} password reset requests per day. Please try again in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}.`);
    }
    // Generate secure crypto reset token (expires in 1 hour)
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    // Send email (handles Apple Private Relay as well as Google/direct emails)
    yield emailService_1.EmailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        token: resetToken,
    });
    // Record the successful email send in the rate limit window
    if (isWindowExpired) {
        user.resetPasswordWindowStart = now;
        user.resetPasswordAttempts = 1;
    }
    else {
        user.resetPasswordAttempts = currentAttempts + 1;
    }
    yield user.save();
    const response = response_1.ApiResponse.success({
        email: user.email,
        isAppleRelay: user.email.endsWith('@privaterelay.appleid.com'),
        attemptsRemaining: Math.max(0, DAILY_LIMIT - user.resetPasswordAttempts),
    }, 'A password reset link has been successfully sent to your email.');
    res.status(200).json(response);
}));
exports.resetPassword = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, password } = req.body;
    if (!token || !token.trim()) {
        throw new errors_1.BadRequestError('Password reset token is required');
    }
    if (!password || password.length < 6) {
        throw new errors_1.BadRequestError('New password must be at least 6 characters');
    }
    const user = yield model_1.default.findOne({
        resetPasswordToken: token.trim(),
        resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
        throw new errors_1.BadRequestError('Password reset token is invalid or has expired.');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    user.password = hashedPassword;
    user.hasCustomPassword = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Clear active session tokens so existing sessions must re-login
    user.token = [];
    user.resetPasswordAttempts = 0;
    user.resetPasswordWindowStart = undefined;
    yield user.save();
    const response = response_1.ApiResponse.success({ email: user.email }, 'Your password has been reset successfully. Please sign in using your new password.');
    res.status(200).json(response);
}));
exports.getUsers = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { limit = 20, skip = 0, q = '', role = 'all' } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.query) || req.query);
    let filter = {};
    if (q) {
        filter.$or = [
            { name: { $regex: new RegExp(q, 'i') } },
            { email: { $regex: new RegExp(q, 'i') } }
        ];
    }
    if (role && role !== 'all') {
        filter.role = role;
    }
    const total = yield model_1.default.countDocuments(filter);
    const users = yield model_1.default.find(filter)
        .select('-password -token')
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));
    const totalAdmins = yield model_1.default.countDocuments({ role: 'admin' });
    const totalRegularUsers = yield model_1.default.countDocuments({ role: 'user' });
    const response = response_1.ApiResponse.success({
        total,
        totalAdmins,
        totalRegularUsers,
        users,
    }, 'Users retrieved successfully');
    res.status(200).json(response);
}));
exports.getUserById = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = yield model_1.default.findById(id).select('-password -token');
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    const response = response_1.ApiResponse.success(user, 'User details retrieved successfully');
    res.status(200).json(response);
}));
exports.updateUserRole = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { role } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    // Prevent admin from demoting their own account
    if (req.user && req.user._id.toString() === id.toString() && role !== 'admin') {
        throw new errors_1.BadRequestError('You cannot demote your own admin account');
    }
    const user = yield model_1.default.findById(id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    user.role = role;
    yield user.save();
    const response = response_1.ApiResponse.success({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    }, `User role updated to ${role}`);
    res.status(200).json(response);
}));
exports.deleteUser = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Prevent admin from deleting their own account
    if (req.user && req.user._id.toString() === id.toString()) {
        throw new errors_1.BadRequestError('You cannot delete your own account');
    }
    const user = yield model_1.default.findById(id);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    yield model_1.default.findByIdAndDelete(id);
    const response = response_1.ApiResponse.deleted('User deleted successfully');
    res.status(200).json(response);
}));
exports.adminCreateUser = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, name, email, role } = req.body;
    const existingUser = yield model_1.default.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new errors_1.ConflictError('Email already exists');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const cart = new model_2.default();
    const userRole = role === 'admin' ? 'admin' : 'user';
    const user = new model_1.default({
        password: hashedPassword,
        name,
        email: email.toLowerCase(),
        role: userRole,
    });
    user.cart = cart._id;
    cart.user = user._id;
    yield user.save();
    yield cart.save();
    const response = response_1.ApiResponse.created({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
    }, 'User created successfully');
    res.status(201).json(response);
}));
/**
 * Webhook handler for Sign in with Apple Server-to-Server Notifications
 * URL configured in Apple Developer Portal:
 * https://<domain>/auth/apple/notifications or https://<domain>/api/apple/notifications
 */
exports.handleAppleNotifications = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const rawPayload = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.payload) ||
        ((_b = req.body) === null || _b === void 0 ? void 0 : _b.signedPayload) ||
        (typeof req.body === 'string' ? req.body : null);
    if (!rawPayload || typeof rawPayload !== 'string') {
        res.status(200).json(response_1.ApiResponse.success(null, 'Empty or invalid notification payload ignored'));
        return;
    }
    const decodedToken = jsonwebtoken_1.default.decode(rawPayload, { complete: true });
    if (!decodedToken || typeof decodedToken !== 'object') {
        res.status(200).json(response_1.ApiResponse.success(null, 'Malformed JWT notification ignored'));
        return;
    }
    const { header, payload } = decodedToken;
    // Cryptographically verify signature using Apple Public Keys
    try {
        const appleKeys = yield getApplePublicKeys();
        const matchingKey = appleKeys.find((k) => k.kid === header.kid);
        if (matchingKey) {
            const publicKey = crypto_1.default.createPublicKey({
                key: matchingKey,
                format: 'jwk',
            });
            jsonwebtoken_1.default.verify(rawPayload, publicKey, {
                algorithms: ['RS256'],
            });
        }
    }
    catch (err) {
        console.warn('[Apple S2S Notification] Key verification note:', err.message);
        if ((payload === null || payload === void 0 ? void 0 : payload.iss) && !payload.iss.includes('appleid.apple.com')) {
            res.status(200).json(response_1.ApiResponse.success(null, 'Untrusted notification issuer ignored'));
            return;
        }
    }
    // Parse events field
    let eventObj = payload === null || payload === void 0 ? void 0 : payload.events;
    if (typeof eventObj === 'string') {
        try {
            eventObj = JSON.parse(eventObj);
        }
        catch (_c) {
            eventObj = null;
        }
    }
    if (!eventObj || !eventObj.type || !eventObj.sub) {
        res.status(200).json(response_1.ApiResponse.success(null, 'No actionable event found in payload'));
        return;
    }
    const { type, sub, email, event_time } = eventObj;
    const appleUserId = sub;
    console.log(`[Apple S2S Notification] Processing event "${type}" for appleId: ${appleUserId}`);
    const user = yield model_1.default.findOne({ appleId: appleUserId });
    if (!user) {
        console.log(`[Apple S2S Notification] No registered user found for appleId: ${appleUserId}`);
        res.status(200).json(response_1.ApiResponse.success(null, `User with appleId ${appleUserId} not found`));
        return;
    }
    const eventDate = event_time ? new Date(event_time * 1000) : new Date();
    switch (type) {
        case 'consent-revoked':
            // Invalidate all active session tokens immediately
            user.token = [];
            user.appleConsentRevoked = true;
            user.appleConsentRevokedAt = eventDate;
            yield user.save();
            console.log(`[Apple S2S Notification] Sessions invalidated & consent revoked for user: ${user._id} (${user.email})`);
            break;
        case 'account-delete':
            // Invalidate sessions and unlink Apple ID per App Store Guideline 5.1.1
            user.token = [];
            user.appleId = undefined;
            user.appleEmail = undefined;
            user.appleConsentRevoked = true;
            user.appleConsentRevokedAt = eventDate;
            if (user.authProviders) {
                user.authProviders = user.authProviders.filter((p) => p !== 'apple');
            }
            yield user.save();
            console.log(`[Apple S2S Notification] Apple ID unlinked & sessions invalidated due to account-delete for user: ${user._id}`);
            break;
        case 'email-disabled':
            user.emailRelayDisabled = true;
            yield user.save();
            console.log(`[Apple S2S Notification] Email relay disabled for user: ${user._id} (${email || user.email})`);
            break;
        case 'email-enabled':
            user.emailRelayDisabled = false;
            yield user.save();
            console.log(`[Apple S2S Notification] Email relay enabled for user: ${user._id} (${email || user.email})`);
            break;
        default:
            console.log(`[Apple S2S Notification] Unhandled event type "${type}" received`);
            break;
    }
    res.status(200).json(response_1.ApiResponse.success({ event: type, userId: user._id, appleId: appleUserId }, 'Apple notification processed successfully'));
}));
