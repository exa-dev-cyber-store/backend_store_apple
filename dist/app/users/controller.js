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
exports.deleteUser = exports.updateUserRole = exports.getUserById = exports.getUsers = exports.verifyGoogleAuth = exports.me = exports.logout = exports.loginGoogle = exports.login = exports.createUser = exports.localStrategy = void 0;
const model_1 = __importDefault(require("./model"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const utils_1 = require("../../utils");
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_2 = __importDefault(require("../cart/model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
const localStrategy = (email, password, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield model_1.default.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v').select('+password +name');
        if (!user) {
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
exports.createUser = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, name, email } = req.body;
    const existingUser = yield model_1.default.findOne({ email });
    if (existingUser) {
        throw new errors_1.ConflictError('Email already exists');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const cart = new model_2.default();
    const user = new model_1.default({ password: hashedPassword, name, email });
    user.cart = cart._id;
    cart.user = user._id;
    yield user.save();
    yield cart.save();
    const response = response_1.ApiResponse.created(user, 'User registered successfully');
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
            const token = jsonwebtoken_1.default.sign({ _id: user._id, email: user.email, name: user.name, role: user.role }, process.env.SECRET_JWT_KEY, { expiresIn: '30d', algorithm: 'HS384' });
            yield model_1.default.findByIdAndUpdate({ _id: user._id }, { $push: { token: token } });
            const response = response_1.ApiResponse.success({ token, name: user.name, role: user.role, email: user.email }, 'Login successful');
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
    const user = yield model_1.default.findOne({ email }).select('-token -createdAt -updatedAt -address -phone_number -__v -password -likes -cart');
    if (!user) {
        throw new errors_1.UnauthorizedError('User with this email not found');
    }
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const token = jsonwebtoken_1.default.sign(payload, process.env.SECRET_JWT_KEY, { expiresIn: '30d', algorithm: 'HS384' });
    yield model_1.default.findByIdAndUpdate({ _id: user._id }, { $push: { token: token } });
    const response = response_1.ApiResponse.success({ token, name: user.name, role: user.role }, 'Google login successful');
    res.status(200).json(response);
}));
exports.logout = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = (0, utils_1.getToken)(req);
    if (!token) {
        throw new errors_1.UnauthorizedError('No token provided');
    }
    const user = yield model_1.default.findOneAndUpdate({ token }, { $pull: { token } });
    if (!user) {
        throw new errors_1.UnauthorizedError('Session expired or invalid token');
    }
    const response = response_1.ApiResponse.success(null, 'Logout success');
    res.status(200).json(response);
}));
exports.me = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Unauthorized access');
    }
    const response = response_1.ApiResponse.success({ user: req.user, status: 200 }, 'Profile retrieved successfully');
    res.status(200).json(response);
}));
exports.verifyGoogleAuth = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { credential, token: inputToken } = req.body;
    const idToken = credential || inputToken;
    if (!idToken) {
        throw new errors_1.BadRequestError('Google credential token is required');
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
    let user = yield model_1.default.findOne({ email });
    // Auto-provision user if first time Google sign in
    if (!user) {
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hashedPassword = yield bcrypt_1.default.hash(randomPassword, 10);
        user = new model_1.default({
            name: googlePayload.name || email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'user',
        });
        yield user.save();
    }
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };
    const token = jsonwebtoken_1.default.sign(payload, process.env.SECRET_JWT_KEY, { expiresIn: '30d', algorithm: 'HS384' });
    yield model_1.default.findByIdAndUpdate({ _id: user._id }, { $push: { token } });
    const response = response_1.ApiResponse.success({
        token,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: googlePayload.picture,
    }, 'Google authentication verified');
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
