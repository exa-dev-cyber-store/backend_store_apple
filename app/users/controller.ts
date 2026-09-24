import { Response, Request, NextFunction } from "express";
import Users, { User } from "./model";
import RefreshToken from "./refreshTokenModel";
import bcrypt from 'bcrypt';
import passport from 'passport';
import { getToken, setAuthCookies, clearAuthCookies } from "../../utils";
import jwt from 'jsonwebtoken';
import Carts, { Cart } from "../cart/model";
import { ApiResponse } from "../../types/response";
import { UnauthorizedError, BadRequestError, ConflictError, NotFoundError, TooManyRequestsError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";
import crypto from 'crypto';
import { EmailService } from "../services/emailService";
import { processAndUploadAvatar } from "../../utils/image";


export const localStrategy = async (email: string, password: string, done: any) => {
    try {
        const user: User | null = await Users.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v').select('+password +name');
        if (!user || !user.password) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        const { password: _pw, ...userWithoutPassword }: { password?: string; userWithoutPassword: User } = user.toJSON();
        return done(null, userWithoutPassword);
    } catch (error) {
        return done(error);
    }
};

/**
 * Issue both a short-lived access token (15m) and a long-lived refresh token (30d)
 */
export const issueUserTokens = async (user: User, req?: Request) => {
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const accessToken = jwt.sign(
        payload,
        process.env.SECRET_JWT_KEY as string,
        { expiresIn: '15m', algorithm: 'HS384' }
    );

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await RefreshToken.create({
        userId: user._id,
        token: refreshTokenString,
        expiresAt,
        userAgent: req?.headers ? (req.headers['user-agent'] as string) : undefined,
        ip: req?.ip,
    });

    await Users.findByIdAndUpdate(user._id, { $push: { token: accessToken } });

    return {
        accessToken,
        refreshToken: refreshTokenString,
        token: accessToken, // Backward compatibility
    };
};

export const createUser = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { password, name, email } = req.body;

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
        throw new ConflictError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cart: Cart = new Carts();
    const user: User = new Users({ password: hashedPassword, name, email, hasCustomPassword: true });
    user.cart = cart._id;
    await user.save();
    await cart.save();

    const response = ApiResponse.created(user, 'User registered successfully');
    res.status(201).json(response);
});

export const login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', async (err: any, user: User, info: any) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new UnauthorizedError(info?.message || 'Invalid email or password'));
        }
        try {
            const tokens = await issueUserTokens(user, req);
            setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
            const response = ApiResponse.success(
                {
                    ...tokens,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    avatar: user.avatar || null,
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar || null,
                    },
                },
                'Login successful'
            );
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    })(req, res, next);
};

export const loginGoogle = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    let user: User | null = await Users.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v -password -likes -cart');

    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = new Users({
            name: email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
        });
        await user.save();
    }

    const tokens = await issueUserTokens(user, req);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const response = ApiResponse.success({
        ...tokens,
        name: user.name,
        role: user.role,
        email: user.email,
        avatar: user.avatar || null,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
        },
    }, 'Google login successful');
    res.status(200).json(response);
});

export const refreshAccessToken = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
    }

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
        throw new UnauthorizedError('Invalid refresh token');
    }

    if (tokenDoc.revoked) {
        // Token reuse detection - revoke all tokens for this user
        await RefreshToken.updateMany({ userId: tokenDoc.userId }, { revoked: true, revokedAt: new Date() });
        throw new UnauthorizedError('Refresh token was revoked');
    }

    if (tokenDoc.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token expired');
    }

    const user = await Users.findById(tokenDoc.userId);
    if (!user) {
        throw new UnauthorizedError('User not found');
    }

    // Token rotation: Revoke current refresh token and issue a replacement
    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();

    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    tokenDoc.replacedByToken = newRefreshTokenString;
    await tokenDoc.save();

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await RefreshToken.create({
        userId: user._id,
        token: newRefreshTokenString,
        expiresAt,
        userAgent: req.headers ? (req.headers['user-agent'] as string) : undefined,
        ip: req.ip,
    });

    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const newAccessToken = jwt.sign(
        payload,
        process.env.SECRET_JWT_KEY as string,
        { expiresIn: '15m', algorithm: 'HS384' }
    );

    await Users.findByIdAndUpdate(user._id, { $push: { token: newAccessToken } });

    setAuthCookies(res, newAccessToken, newRefreshTokenString);

    const response = ApiResponse.success(
        {
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
        },
        'Token refreshed successfully'
    );
    res.status(200).json(response);
});

export const logout = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const token = getToken(req);
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
        await RefreshToken.updateMany(
            { token: refreshToken },
            { revoked: true, revokedAt: new Date() }
        );
    }

    if (token) {
        await Users.findOneAndUpdate({ token }, { $pull: { token } });
    }

    clearAuthCookies(res);

    const response = ApiResponse.success(null, 'Logout success');
    res.status(200).json(response);
});

export const me = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const userDoc = await Users.findById(req.user._id).select(
        'name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders hasCustomPassword'
    );

    const isAppleSignup = userDoc?.signupProvider === 'apple' || Boolean(userDoc?.appleId && !userDoc?.googleId);
    const googleLinked = Boolean(userDoc?.googleId || userDoc?.authProviders?.includes('google'));
    const appleLinked = Boolean(userDoc?.appleId || userDoc?.authProviders?.includes('apple'));
    const canLinkGoogle = isAppleSignup && !googleLinked;
    const canUnbindApple = appleLinked && googleLinked; // Unbind apple hanya jika google sudah terhubung

    const response = ApiResponse.success({
        user: {
            ...req.user,
            email: userDoc?.email || req.user.email,
            name: userDoc?.name || req.user.name,
            avatar: userDoc?.avatar || null,
            signupProvider: userDoc?.signupProvider || 'local',
            hasCustomPassword: Boolean(userDoc?.hasCustomPassword),
            requiresPasswordSetup: !userDoc?.hasCustomPassword,
            googleId: userDoc?.googleId,
            googleEmail: userDoc?.googleEmail,
            appleId: userDoc?.appleId,
            appleEmail: userDoc?.appleEmail,
            authProviders: userDoc?.authProviders || [],
            linkedAccounts: {
                google: googleLinked,
                apple: appleLinked,
                canLinkGoogle,
                canUnbindApple,
                canUnbindGoogle: false, // Google tidak bisa di-unbind
            },
        },
        status: 200,
    }, 'Profile retrieved successfully');

    res.status(200).json(response);
});

export const updateProfile = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new BadRequestError('Full name is required');
    }

    const trimmedName = name.trim();
    const updatedUser = await Users.findByIdAndUpdate(
        req.user._id,
        { name: trimmedName },
        { new: true }
    ).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders');

    if (!updatedUser) {
        throw new NotFoundError('User not found');
    }

    const response = ApiResponse.success(
        {
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
        },
        'Profile updated successfully'
    );

    res.status(200).json(response);
});

export const uploadAvatar = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    if (!req.file) {
        throw new BadRequestError('Image file is required for avatar upload');
    }

    // Process and convert to fixed 400x400 1:1 square WebP and upload
    const { url } = await processAndUploadAvatar(req.file, 400, 85);

    const updatedUser = await Users.findByIdAndUpdate(
        req.user._id,
        { avatar: url },
        { new: true }
    ).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders');

    if (!updatedUser) {
        throw new NotFoundError('User not found');
    }

    const response = ApiResponse.success(
        {
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                signupProvider: updatedUser.signupProvider,
            },
            avatar: url,
        },
        'Profile picture updated successfully'
    );

    res.status(200).json(response);
});

export const getLinkedAccounts = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const user = await Users.findById(req.user._id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const isAppleSignup = user.signupProvider === 'apple' || Boolean(user.appleId && !user.googleId);
    const googleLinked = Boolean(user.googleId || user.authProviders?.includes('google'));
    const appleLinked = Boolean(user.appleId || user.authProviders?.includes('apple'));
    const canLinkGoogle = isAppleSignup && !googleLinked;
    const canUnbindApple = appleLinked && googleLinked;
    const canLinkApple = !appleLinked;

    const response = ApiResponse.success(
        {
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
        },
        'Linked accounts status retrieved successfully'
    );

    res.status(200).json(response);
});

export const verifyGoogleAuth = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { code, credential, token: inputToken } = req.body as {
        code?: string;
        credential?: string;
        token?: string;
    };
    let idToken = credential || inputToken;

    if (!idToken && code) {
        // Exchange authorization code for tokens with Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID as string,
                client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
                redirect_uri: 'postmessage',
                grant_type: 'authorization_code',
            }),
        });

        const tokenData: any = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) {
            console.error('Google token exchange error:', tokenData);
            throw new UnauthorizedError(tokenData.error_description || 'Failed to exchange Google authorization code');
        }
        idToken = tokenData.id_token;
    }

    if (!idToken) {
        throw new BadRequestError('Google credential or authorization code is required');
    }

    // Pure Backend verification using Google OAuth2 TokenInfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
        const errData = await googleRes.json().catch(() => ({}));
        throw new UnauthorizedError('Invalid Google authentication token');
    }

    const googlePayload: any = await googleRes.json();

    // Validate email presence and email verification
    if (!googlePayload.email || (googlePayload.email_verified !== 'true' && googlePayload.email_verified !== true)) {
        throw new BadRequestError('Unverified Google email account');
    }

    const email = googlePayload.email.toLowerCase();
    const googleSub = googlePayload.sub;

    let user: User | null = await Users.findOne({
        $or: [{ googleId: googleSub }, { email }],
    });

    // Auto-provision user if first time Google sign in
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = new Users({
            name: googlePayload.name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
            signupProvider: 'google',
            googleId: googleSub,
            googleEmail: email,
            authProviders: ['google'],
        });
        await user.save();
    } else {
        let needSave = false;
        if (!user.googleId) {
            user.googleId = googleSub;
            needSave = true;
        }
        if (!user.googleEmail) {
            user.googleEmail = email;
            needSave = true;
        }
        if (!user.authProviders) user.authProviders = [];
        if (!user.authProviders.includes('google')) {
            user.authProviders.push('google');
            needSave = true;
        }
        if (needSave) {
            await user.save();
        }
    }

    const tokens = await issueUserTokens(user, req);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const response = ApiResponse.success({
        ...tokens,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || googlePayload.picture || null,
        picture: user.avatar || googlePayload.picture || null,
        hasCustomPassword: Boolean(user.hasCustomPassword),
        requiresPasswordSetup: !user.hasCustomPassword,
        user: {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || googlePayload.picture || null,
            hasCustomPassword: Boolean(user.hasCustomPassword),
            requiresPasswordSetup: !user.hasCustomPassword,
        },
    }, 'Google authentication verified');

    res.status(200).json(response);
});

interface AppleJWK {
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n: string;
    e: string;
}

let appleKeysCache: { keys: AppleJWK[]; timestamp: number } | null = null;

async function getApplePublicKeys(): Promise<AppleJWK[]> {
    const now = Date.now();
    if (appleKeysCache && now - appleKeysCache.timestamp < 3600000) {
        return appleKeysCache.keys;
    }
    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) {
        throw new Error('Failed to fetch Apple public keys');
    }
    const data = (await res.json()) as { keys: AppleJWK[] };
    appleKeysCache = { keys: data.keys, timestamp: now };
    return data.keys;
}

/**
 * Core helper for verifying Apple identity token, provisioning user, and generating JWT
 */
export async function authenticateWithAppleCore(params: {
    identityToken: string;
    email?: string;
    name?: any;
}) {
    const { identityToken, email: clientEmail, name: clientName } = params;

    const decodedToken = jwt.decode(identityToken, { complete: true });
    if (!decodedToken || typeof decodedToken !== 'object') {
        throw new BadRequestError('Malformed Apple identity token');
    }

    const { header, payload } = decodedToken as { header: { kid: string; alg: string }; payload: any };

    // Attempt cryptographic verification using Apple Public Keys
    try {
        const appleKeys = await getApplePublicKeys();
        const matchingKey = appleKeys.find((k) => k.kid === header.kid);
        if (matchingKey) {
            const publicKey = crypto.createPublicKey({
                key: matchingKey as any,
                format: 'jwk',
            });
            jwt.verify(identityToken, publicKey, {
                algorithms: ['RS256'],
            });
        }
    } catch (err: any) {
        console.warn('Apple token key verification notice:', err.message);
        if (payload?.iss && payload.iss !== 'https://appleid.apple.com') {
            throw new UnauthorizedError('Invalid Apple token issuer');
        }
    }

    const appleUserId = payload?.sub;
    const rawEmail = payload?.email || clientEmail;
    const email = (rawEmail || `${appleUserId}@privaterelay.appleid.com`).toLowerCase();

    let resolvedName = 'Apple User';
    if (typeof clientName === 'string' && clientName.trim()) {
        resolvedName = clientName.trim();
    } else if (typeof clientName === 'object' && clientName) {
        const parts = [clientName.firstName, clientName.lastName].filter(Boolean);
        if (parts.length > 0) resolvedName = parts.join(' ');
    } else if (email && !email.includes('privaterelay.appleid.com')) {
        resolvedName = email.split('@')[0];
    }

    let user: User | null = await Users.findOne({
        $or: [{ appleId: appleUserId }, { email }],
    });

    // Auto-provision user if first time Apple sign in
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = new Users({
            name: resolvedName,
            email,
            password: hashedPassword,
            role: 'user',
            signupProvider: 'apple',
            appleId: appleUserId,
            appleEmail: email,
            authProviders: ['apple'],
        });
        await user.save();
    } else {
        let needSave = false;
        if (!user.appleId) {
            user.appleId = appleUserId;
            needSave = true;
        }
        if (!user.appleEmail) {
            user.appleEmail = email;
            needSave = true;
        }
        if (!user.authProviders) user.authProviders = [];
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
            await user.save();
        }
    }

    const tokens = await issueUserTokens(user);

    return {
        user,
        sessionToken: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        appleUserId,
    };
}

export const verifyAppleAuth = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { identityToken, token: inputToken, id_token: idTokenParam, email: clientEmail, name: clientName } = req.body as {
        identityToken?: string;
        token?: string;
        id_token?: string;
        email?: string;
        name?: any;
    };
    const tokenToVerify = identityToken || inputToken || idTokenParam;

    if (!tokenToVerify) {
        throw new BadRequestError('Apple identityToken is required');
    }

    const { user, sessionToken, accessToken, refreshToken, appleUserId } = await authenticateWithAppleCore({
        identityToken: tokenToVerify,
        email: clientEmail,
        name: clientName,
    });

    setAuthCookies(res, accessToken, refreshToken);

    const response = ApiResponse.success(
        {
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
        },
        'Apple authentication verified successfully'
    );

    res.status(200).json(response);
});

export const linkGoogleAccount = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const { credential, token: inputToken } = req.body as { credential?: string; token?: string };
    const idToken = credential || inputToken;

    if (!idToken) {
        throw new BadRequestError('Google credential token is required');
    }

    const user = await Users.findById(req.user._id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    // RULE: Google linking is ONLY permitted when the user signed up via Apple!
    const isAppleSignup = user.signupProvider === 'apple' || Boolean(user.appleId);
    if (!isAppleSignup) {
        throw new BadRequestError('Linking a Google account is only allowed for accounts registered via Apple.');
    }

    if (user.googleId) {
        throw new BadRequestError('A Google account is already linked to your profile.');
    }

    // Verify token with Google TokenInfo or UserInfo API (supports both id_token and OAuth access_token)
    let googlePayload: any = null;
    const tokenInfoIdRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (tokenInfoIdRes.ok) {
        googlePayload = await tokenInfoIdRes.json();
    } else {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${idToken}` },
        });
        if (userInfoRes.ok) {
            googlePayload = await userInfoRes.json();
        } else {
            const tokenInfoAccessRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${idToken}`);
            if (tokenInfoAccessRes.ok) {
                googlePayload = await tokenInfoAccessRes.json();
            }
        }
    }

    if (!googlePayload || !googlePayload.email) {
        throw new UnauthorizedError('Google authentication token is invalid or expired');
    }

    if (googlePayload.email_verified !== undefined && googlePayload.email_verified !== 'true' && googlePayload.email_verified !== true) {
        throw new BadRequestError('Google email account is not verified');
    }

    const googleEmail = googlePayload.email.toLowerCase();
    const googleSub = googlePayload.sub || googlePayload.user_id;

    // Conflict check
    const conflictingUser = await Users.findOne({
        _id: { $ne: user._id },
        $or: [{ googleId: googleSub }, { email: googleEmail }],
    });
    if (conflictingUser) {
        throw new ConflictError('This Google account is already linked to another user account.');
    }

    // Link Google & OVERWRITE USER EMAIL AS REQUESTED
    const previousEmail = user.email;
    user.googleId = googleSub;
    user.googleEmail = googleEmail;
    user.email = googleEmail; // Update primary email from linked Google account

    if (!user.authProviders) user.authProviders = [];
    if (!user.authProviders.includes('google')) user.authProviders.push('google');
    if (!user.authProviders.includes('apple') && user.appleId) user.authProviders.push('apple');

    if (googlePayload.name && (!user.name || user.name === 'Apple User')) {
        user.name = googlePayload.name;
    }

    await user.save();

    // Issue updated session token containing the newly linked email
    const payloadJwt = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const sessionToken = jwt.sign(payloadJwt, process.env.SECRET_JWT_KEY as string, {
        expiresIn: '30d',
        algorithm: 'HS384',
    });

    await Users.findByIdAndUpdate({ _id: user._id }, { $push: { token: sessionToken } });

    const response = ApiResponse.success(
        {
            token: sessionToken,
            previousEmail,
            email: user.email,
            name: user.name,
            googleEmail,
            appleId: user.appleId,
            canUnbindApple: true,
        },
        `Google account linked successfully. Your account email has been updated to ${user.email}.`
    );

    res.status(200).json(response);
});

export const linkAppleAccount = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const { identityToken, token: inputToken, email: clientEmail } = req.body as {
        identityToken?: string;
        token?: string;
        email?: string;
    };
    const tokenToVerify = identityToken || inputToken;

    if (!tokenToVerify) {
        throw new BadRequestError('Apple identityToken is required');
    }

    const user = await Users.findById(req.user._id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    if (user.appleId) {
        throw new BadRequestError('An Apple account is already linked to this profile.');
    }

    const decodedToken = jwt.decode(tokenToVerify, { complete: true });
    if (!decodedToken || typeof decodedToken !== 'object') {
        throw new BadRequestError('Malformed Apple identity token');
    }

    const { payload } = decodedToken as { payload: any };
    const appleUserId = payload?.sub;
    const rawEmail = payload?.email || clientEmail;
    const email = (rawEmail || `${appleUserId}@privaterelay.appleid.com`).toLowerCase();

    // Conflict check
    const conflictingUser = await Users.findOne({
        _id: { $ne: user._id },
        appleId: appleUserId,
    });
    if (conflictingUser) {
        throw new ConflictError('This Apple account is already linked to another user account.');
    }

    user.appleId = appleUserId;
    user.appleEmail = email;
    if (!user.authProviders) user.authProviders = [];
    if (!user.authProviders.includes('apple')) user.authProviders.push('apple');

    await user.save();

    const response = ApiResponse.success(
        {
            appleId: user.appleId,
            appleEmail: user.appleEmail,
            authProviders: user.authProviders,
        },
        'Apple account linked successfully.'
    );

    res.status(200).json(response);
});

export const unbindAppleAccount = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const user = await Users.findById(req.user._id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const hasApple = Boolean(user.appleId || user.authProviders?.includes('apple'));
    if (!hasApple) {
        throw new BadRequestError('No Apple account is linked to this profile.');
    }

    // RULE: Disconnecting Apple is ONLY allowed if a Google account is already linked!
    const hasGoogle = Boolean(user.googleId || user.authProviders?.includes('google'));
    if (!hasGoogle) {
        throw new BadRequestError(
            'Apple account cannot be disconnected because no Google account is linked. Please connect a Google account first before disconnecting Apple.'
        );
    }

    // Remove Apple association
    await Users.updateOne(
        { _id: user._id },
        {
            $unset: { appleId: 1, appleEmail: 1 },
            $pull: { authProviders: 'apple' },
        }
    );

    const response = ApiResponse.success(
        {
            email: user.email,
            appleLinked: false,
            googleLinked: true,
        },
        'Apple account disconnected successfully. Your account is now fully connected via your Google account.'
    );

    res.status(200).json(response);
});

export const setPassword = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const { password } = req.body as { password?: string };
    if (!password || password.length < 6) {
        throw new BadRequestError('Password must be at least 6 characters');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await Users.findByIdAndUpdate(
        req.user._id,
        {
            password: hashedPassword,
            hasCustomPassword: true,
        },
        { new: true }
    ).select('name email role avatar signupProvider googleId googleEmail appleId appleEmail authProviders hasCustomPassword');

    if (!updatedUser) {
        throw new NotFoundError('User not found');
    }

    const response = ApiResponse.success(
        {
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
        },
        'Password set successfully'
    );

    res.status(200).json(response);
});

export const forgotPassword = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    if (!email || !email.trim()) {
        throw new BadRequestError('Email address is required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await Users.findOne({ email: cleanEmail });

    // Return friendly generic response to protect user privacy
    if (!user) {
        const response = ApiResponse.success(
            null,
            'If this email address is registered, password reset instructions have been sent to your inbox.'
        );
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
        const msLeft = (windowStart!.getTime() + WINDOW_MS) - now.getTime();
        const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)));
        throw new TooManyRequestsError(
            `You have reached the maximum limit of ${DAILY_LIMIT} password reset requests per day. Please try again in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}.`
        );
    }

    // Generate secure crypto reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    const clientUrl = process.env.CLIENT_URL || process.env.WEB_URL || process.env.FRONTEND_URL || 'https://apple-store.eka-dev.cloud';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    // Send email (handles Apple Private Relay as well as Google/direct emails)
    await EmailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        token: resetToken,
    });

    // Record the successful email send in the rate limit window
    if (isWindowExpired) {
        user.resetPasswordWindowStart = now;
        user.resetPasswordAttempts = 1;
    } else {
        user.resetPasswordAttempts = currentAttempts + 1;
    }
    await user.save();

    const response = ApiResponse.success(
        {
            email: user.email,
            isAppleRelay: user.email.endsWith('@privaterelay.appleid.com'),
            attemptsRemaining: Math.max(0, DAILY_LIMIT - user.resetPasswordAttempts),
        },
        'A password reset link has been successfully sent to your email.'
    );

    res.status(200).json(response);
});

export const resetPassword = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !token.trim()) {
        throw new BadRequestError('Password reset token is required');
    }

    if (!password || password.length < 6) {
        throw new BadRequestError('New password must be at least 6 characters');
    }

    const user = await Users.findOne({
        resetPasswordToken: token.trim(),
        resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
        throw new BadRequestError('Password reset token is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.hasCustomPassword = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Clear active session tokens so existing sessions must re-login
    user.token = [];
    user.resetPasswordAttempts = 0;
    user.resetPasswordWindowStart = undefined;
    await user.save();

    const response = ApiResponse.success(
        { email: user.email },
        'Your password has been reset successfully. Please sign in using your new password.'
    );

    res.status(200).json(response);
});


export const getUsers = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { limit = 20, skip = 0, q = '', role = 'all' } = (req.validated?.query || req.query) as any;
    let filter: any = {};

    if (q) {
        filter.$or = [
            { name: { $regex: new RegExp(q, 'i') } },
            { email: { $regex: new RegExp(q, 'i') } }
        ];
    }

    if (role && role !== 'all') {
        filter.role = role;
    }

    const total = await Users.countDocuments(filter);
    const users = await Users.find(filter)
        .select('-password -token')
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));

    const totalAdmins = await Users.countDocuments({ role: 'admin' });
    const totalRegularUsers = await Users.countDocuments({ role: 'user' });

    const response = ApiResponse.success({
        total,
        totalAdmins,
        totalRegularUsers,
        users,
    }, 'Users retrieved successfully');
    res.status(200).json(response);
});

export const getUserById = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await Users.findById(id).select('-password -token');
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const response = ApiResponse.success(user, 'User details retrieved successfully');
    res.status(200).json(response);
});

export const updateUserRole = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = (req.validated?.body || req.body) as { role: string };

    // Prevent admin from demoting their own account
    if (req.user && req.user._id.toString() === id.toString() && role !== 'admin') {
        throw new BadRequestError('You cannot demote your own admin account');
    }

    const user = await Users.findById(id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    user.role = role;
    await user.save();

    const response = ApiResponse.success({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    }, `User role updated to ${role}`);
    res.status(200).json(response);
});

export const deleteUser = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Prevent admin from deleting their own account
    if (req.user && req.user._id.toString() === id.toString()) {
        throw new BadRequestError('You cannot delete your own account');
    }

    const user = await Users.findById(id);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    await Users.findByIdAndDelete(id);

    const response = ApiResponse.deleted('User deleted successfully');
    res.status(200).json(response);
});

export const adminCreateUser = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { password, name, email, role } = req.body;

    const existingUser = await Users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new ConflictError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cart: Cart = new Carts();
    const userRole = role === 'admin' ? 'admin' : 'user';
    const user: User = new Users({
        password: hashedPassword,
        name,
        email: email.toLowerCase(),
        role: userRole,
    });
    user.cart = cart._id;
    cart.user = user._id;

    await user.save();
    await cart.save();

    const response = ApiResponse.created(
        {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        },
        'User created successfully'
    );
    res.status(201).json(response);
});

/**
 * Webhook handler for Sign in with Apple Server-to-Server Notifications
 * URL configured in Apple Developer Portal:
 * https://<domain>/auth/apple/notifications or https://<domain>/api/apple/notifications
 */
export const handleAppleNotifications = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const rawPayload =
        req.body?.payload ||
        req.body?.signedPayload ||
        (typeof req.body === 'string' ? req.body : null);

    if (!rawPayload || typeof rawPayload !== 'string') {
        res.status(200).json(ApiResponse.success(null, 'Empty or invalid notification payload ignored'));
        return;
    }

    const decodedToken = jwt.decode(rawPayload, { complete: true });
    if (!decodedToken || typeof decodedToken !== 'object') {
        res.status(200).json(ApiResponse.success(null, 'Malformed JWT notification ignored'));
        return;
    }

    const { header, payload } = decodedToken as { header: { kid: string; alg: string }; payload: any };

    // Cryptographically verify signature using Apple Public Keys
    try {
        const appleKeys = await getApplePublicKeys();
        const matchingKey = appleKeys.find((k) => k.kid === header.kid);
        if (matchingKey) {
            const publicKey = crypto.createPublicKey({
                key: matchingKey as any,
                format: 'jwk',
            });
            jwt.verify(rawPayload, publicKey, {
                algorithms: ['RS256'],
            });
        }
    } catch (err: any) {
        console.warn('[Apple S2S Notification] Key verification note:', err.message);
        if (payload?.iss && !payload.iss.includes('appleid.apple.com')) {
            res.status(200).json(ApiResponse.success(null, 'Untrusted notification issuer ignored'));
            return;
        }
    }

    // Parse events field
    let eventObj: any = payload?.events;
    if (typeof eventObj === 'string') {
        try {
            eventObj = JSON.parse(eventObj);
        } catch {
            eventObj = null;
        }
    }

    if (!eventObj || !eventObj.type || !eventObj.sub) {
        res.status(200).json(ApiResponse.success(null, 'No actionable event found in payload'));
        return;
    }

    const { type, sub, email, event_time } = eventObj;
    const appleUserId = sub;

    console.log(`[Apple S2S Notification] Processing event "${type}" for appleId: ${appleUserId}`);

    const user = await Users.findOne({ appleId: appleUserId });

    if (!user) {
        console.log(`[Apple S2S Notification] No registered user found for appleId: ${appleUserId}`);
        res.status(200).json(ApiResponse.success(null, `User with appleId ${appleUserId} not found`));
        return;
    }

    const eventDate = event_time ? new Date(event_time * 1000) : new Date();

    switch (type) {
        case 'consent-revoked':
            // Invalidate all active session tokens immediately
            user.token = [];
            user.appleConsentRevoked = true;
            user.appleConsentRevokedAt = eventDate;
            await user.save();
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
            await user.save();
            console.log(`[Apple S2S Notification] Apple ID unlinked & sessions invalidated due to account-delete for user: ${user._id}`);
            break;

        case 'email-disabled':
            user.emailRelayDisabled = true;
            await user.save();
            console.log(`[Apple S2S Notification] Email relay disabled for user: ${user._id} (${email || user.email})`);
            break;

        case 'email-enabled':
            user.emailRelayDisabled = false;
            await user.save();
            console.log(`[Apple S2S Notification] Email relay enabled for user: ${user._id} (${email || user.email})`);
            break;

        default:
            console.log(`[Apple S2S Notification] Unhandled event type "${type}" received`);
            break;
    }

    res.status(200).json(
        ApiResponse.success(
            { event: type, userId: user._id, appleId: appleUserId },
            'Apple notification processed successfully'
        )
    );
});