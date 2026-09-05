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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVoucher = exports.updateVoucher = exports.createVoucher = exports.getAllVouchers = exports.validateVoucher = exports.getPublicVouchers = void 0;
const model_1 = __importDefault(require("./model"));
const response_1 = require("../../types/response");
const errors_1 = require("../../types/errors");
const errorHandler_1 = __importDefault(require("../../middleware/errorHandler"));
/**
 * Public storefront: Get list of active public vouchers
 */
exports.getPublicVouchers = errorHandler_1.default.catchAsync((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const vouchers = yield model_1.default.find({
        isPublic: true,
        isActive: true,
        validUntil: { $gte: now },
        $expr: {
            $or: [
                { $eq: ['$usageLimit', 0] },
                { $lt: ['$usedCount', '$usageLimit'] },
            ],
        },
    }).sort({ discountValue: -1 });
    const response = response_1.ApiResponse.success(vouchers, 'Public vouchers retrieved successfully');
    res.status(200).json(response);
}));
/**
 * Validate a voucher code against cart subtotal
 * Works for BOTH public vouchers and private (sosmed feed) vouchers
 */
exports.validateVoucher = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { code, subtotal } = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    if (!code) {
        throw new errors_1.BadRequestError('Voucher code is required');
    }
    const cleanCode = code.trim().toUpperCase();
    const voucher = yield model_1.default.findOne({ code: cleanCode });
    if (!voucher) {
        throw new errors_1.NotFoundError(`Voucher code "${cleanCode}" is not found or invalid`);
    }
    if (!voucher.isActive) {
        throw new errors_1.BadRequestError(`Voucher "${cleanCode}" is currently inactive`);
    }
    const now = new Date();
    if (now > new Date(voucher.validUntil)) {
        throw new errors_1.BadRequestError(`Voucher "${cleanCode}" has expired`);
    }
    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
        throw new errors_1.BadRequestError(`Voucher "${cleanCode}" usage limit has been reached`);
    }
    if (subtotal < voucher.minPurchase) {
        throw new errors_1.BadRequestError(`Minimum purchase of Rp ${voucher.minPurchase.toLocaleString('id-ID')} required to use this voucher`);
    }
    let calculatedDiscount = 0;
    if (voucher.discountType === 'percentage') {
        calculatedDiscount = Math.round((subtotal * voucher.discountValue) / 100);
        if (voucher.maxDiscount && voucher.maxDiscount > 0 && calculatedDiscount > voucher.maxDiscount) {
            calculatedDiscount = voucher.maxDiscount;
        }
    }
    else {
        calculatedDiscount = Math.min(voucher.discountValue, subtotal);
    }
    const finalSubtotal = Math.max(0, subtotal - calculatedDiscount);
    const response = response_1.ApiResponse.success({
        voucher: {
            _id: voucher._id,
            code: voucher.code,
            title: voucher.title,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            isPublic: voucher.isPublic,
            minPurchase: voucher.minPurchase,
            maxDiscount: voucher.maxDiscount,
        },
        discount: calculatedDiscount,
        subtotal,
        finalSubtotal,
    }, `Voucher "${cleanCode}" applied successfully! You saved Rp ${calculatedDiscount.toLocaleString('id-ID')}`);
    res.status(200).json(response);
}));
/**
 * Admin Dashboard: Get all vouchers with filtering and pagination
 */
exports.getAllVouchers = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit = 20, skip = 0, q = '', visibility = 'all', status = 'all' } = req.query;
    let filter = {};
    if (q) {
        filter.$or = [
            { code: { $regex: new RegExp(q, 'i') } },
            { title: { $regex: new RegExp(q, 'i') } },
        ];
    }
    if (visibility === 'public') {
        filter.isPublic = true;
    }
    else if (visibility === 'private') {
        filter.isPublic = false;
    }
    if (status === 'active') {
        filter.isActive = true;
    }
    else if (status === 'inactive') {
        filter.isActive = false;
    }
    const total = yield model_1.default.countDocuments(filter);
    const vouchers = yield model_1.default.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));
    const totalPublic = yield model_1.default.countDocuments({ isPublic: true });
    const totalPrivate = yield model_1.default.countDocuments({ isPublic: false });
    const response = response_1.ApiResponse.success({
        total,
        totalPublic,
        totalPrivate,
        vouchers,
    }, 'Vouchers retrieved successfully');
    res.status(200).json(response);
}));
/**
 * Admin Dashboard: Create new voucher
 */
exports.createVoucher = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const payload = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    const code = payload.code.trim().toUpperCase();
    const existing = yield model_1.default.findOne({ code });
    if (existing) {
        throw new errors_1.ConflictError(`Voucher code "${code}" already exists`);
    }
    const voucher = new model_1.default(Object.assign(Object.assign({}, payload), { code, validUntil: new Date(payload.validUntil) }));
    yield voucher.save();
    const response = response_1.ApiResponse.created(voucher, `Voucher "${code}" created successfully`);
    res.status(201).json(response);
}));
/**
 * Admin Dashboard: Update voucher
 */
exports.updateVoucher = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const payload = (((_a = req.validated) === null || _a === void 0 ? void 0 : _a.body) || req.body);
    if (payload.validUntil) {
        payload.validUntil = new Date(payload.validUntil);
    }
    const updated = yield model_1.default.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) {
        throw new errors_1.NotFoundError('Voucher not found');
    }
    const response = response_1.ApiResponse.success(updated, 'Voucher updated successfully');
    res.status(200).json(response);
}));
/**
 * Admin Dashboard: Delete voucher
 */
exports.deleteVoucher = errorHandler_1.default.catchAsync((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const voucher = yield model_1.default.findById(id);
    if (!voucher) {
        throw new errors_1.NotFoundError('Voucher not found');
    }
    yield model_1.default.findByIdAndDelete(id);
    const response = response_1.ApiResponse.deleted('Voucher deleted successfully');
    res.status(200).json(response);
}));
