import { Response, Request, NextFunction } from "express";
import Users, { User } from "./model";
import bcrypt from 'bcrypt';
import { getToken } from "../../utils";
import passport from 'passport';
import jwt from 'jsonwebtoken';
import Carts, { Cart } from "../cart/model";
import { ApiResponse } from "../../types/response";
import { UnauthorizedError, BadRequestError, ConflictError, NotFoundError } from "../../types/errors";
import ErrorHandler from "../../middleware/errorHandler";

export const localStrategy = async (email: string, password: string, done: any) => {
    try {
        const user: User | null = await Users.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v').select('+password +name');
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const { password: _pw, ...userWithoutPassword }: { password?: string; userWithoutPassword: User } = user.toJSON();
        return done(null, userWithoutPassword);
    } catch (error) {
        return done(error);
    }
};

export const createUser = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { password, name, email } = req.body;

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
        throw new ConflictError('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cart: Cart = new Carts();
    const user: User = new Users({ password: hashedPassword, name, email });
    user.cart = cart._id;
    cart.user = user._id;

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
            const token = jwt.sign(
                { _id: user._id, email: user.email, name: user.name, role: user.role },
                process.env.SECRET_JWT_KEY as string,
                { expiresIn: '30d', algorithm: 'HS384' }
            );

            await Users.findByIdAndUpdate({ _id: user._id }, { $push: { token: token } });
            const response = ApiResponse.success(
                { token, name: user.name, role: user.role, email: user.email },
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

    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const token = jwt.sign(payload, process.env.SECRET_JWT_KEY as string, { expiresIn: '30d', algorithm: 'HS384' });
    await Users.findByIdAndUpdate({ _id: user._id }, { $push: { token: token } });

    const response = ApiResponse.success({ token, name: user.name, role: user.role }, 'Google login successful');
    res.status(200).json(response);
});

export const logout = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const token = getToken(req);
    if (!token) {
        throw new UnauthorizedError('No token provided');
    }

    const user: User | null = await Users.findOneAndUpdate({ token }, { $pull: { token } });
    if (!user) {
        throw new UnauthorizedError('Session expired or invalid token');
    }

    const response = ApiResponse.success(null, 'Logout success');
    res.status(200).json(response);
});

export const me = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized access');
    }

    const response = ApiResponse.success({ user: req.user, status: 200 }, 'Profile retrieved successfully');
    res.status(200).json(response);
});

export const verifyGoogleAuth = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
    const { credential, token: inputToken } = req.body as { credential?: string; token?: string };
    const idToken = credential || inputToken;

    if (!idToken) {
        throw new BadRequestError('Google credential token is required');
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
    let user: User | null = await Users.findOne({ email });

    // Auto-provision user if first time Google sign in
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = new Users({
            name: googlePayload.name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
        });
        await user.save();
    }

    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const token = jwt.sign(payload, process.env.SECRET_JWT_KEY as string, { expiresIn: '30d', algorithm: 'HS384' });

    await Users.findByIdAndUpdate({ _id: user._id }, { $push: { token } });

    const response = ApiResponse.success({
        token,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: googlePayload.picture,
    }, 'Google authentication verified');

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