import { Request, Response } from 'express';
import Vouchers, { Voucher } from './model';
import { ApiResponse } from '../../types/response';
import { BadRequestError, ConflictError, NotFoundError } from '../../types/errors';
import ErrorHandler from '../../middleware/errorHandler';

/**
 * Public storefront: Get list of active public vouchers
 */
export const getPublicVouchers = ErrorHandler.catchAsync(async (_req: Request, res: Response) => {
  const now = new Date();
  const vouchers = await Vouchers.find({
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

  const response = ApiResponse.success(vouchers, 'Public vouchers retrieved successfully');
  res.status(200).json(response);
});

/**
 * Validate a voucher code against cart subtotal
 * Works for BOTH public vouchers and private (sosmed feed) vouchers
 */
export const validateVoucher = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { code, subtotal } = (req.validated?.body || req.body) as { code: string; subtotal: number };

  if (!code) {
    throw new BadRequestError('Voucher code is required');
  }

  const cleanCode = code.trim().toUpperCase();
  const voucher: Voucher | null = await Vouchers.findOne({ code: cleanCode });

  if (!voucher) {
    throw new NotFoundError(`Voucher code "${cleanCode}" is not found or invalid`);
  }

  if (!voucher.isActive) {
    throw new BadRequestError(`Voucher "${cleanCode}" is currently inactive`);
  }

  const now = new Date();
  if (now > new Date(voucher.validUntil)) {
    throw new BadRequestError(`Voucher "${cleanCode}" has expired`);
  }

  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    throw new BadRequestError(`Voucher "${cleanCode}" usage limit has been reached`);
  }

  if (subtotal < voucher.minPurchase) {
    throw new BadRequestError(
      `Minimum purchase of Rp ${voucher.minPurchase.toLocaleString('id-ID')} required to use this voucher`
    );
  }

  let calculatedDiscount = 0;
  if (voucher.discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount && voucher.maxDiscount > 0 && calculatedDiscount > voucher.maxDiscount) {
      calculatedDiscount = voucher.maxDiscount;
    }
  } else {
    calculatedDiscount = Math.min(voucher.discountValue, subtotal);
  }

  const finalSubtotal = Math.max(0, subtotal - calculatedDiscount);

  const response = ApiResponse.success({
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
});

/**
 * Admin Dashboard: Get all vouchers with filtering and pagination
 */
export const getAllVouchers = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { limit = 20, skip = 0, q = '', visibility = 'all', status = 'all' } = req.query as any;
  let filter: any = {};

  if (q) {
    filter.$or = [
      { code: { $regex: new RegExp(q, 'i') } },
      { title: { $regex: new RegExp(q, 'i') } },
    ];
  }

  if (visibility === 'public') {
    filter.isPublic = true;
  } else if (visibility === 'private') {
    filter.isPublic = false;
  }

  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  const total = await Vouchers.countDocuments(filter);
  const vouchers = await Vouchers.find(filter)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));

  const totalPublic = await Vouchers.countDocuments({ isPublic: true });
  const totalPrivate = await Vouchers.countDocuments({ isPublic: false });

  const response = ApiResponse.success({
    total,
    totalPublic,
    totalPrivate,
    vouchers,
  }, 'Vouchers retrieved successfully');

  res.status(200).json(response);
});

/**
 * Admin Dashboard: Create new voucher
 */
export const createVoucher = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const payload = (req.validated?.body || req.body) as any;
  const code = payload.code.trim().toUpperCase();

  const existing = await Vouchers.findOne({ code });
  if (existing) {
    throw new ConflictError(`Voucher code "${code}" already exists`);
  }

  const voucher = new Vouchers({
    ...payload,
    code,
    validUntil: new Date(payload.validUntil),
  });

  await voucher.save();

  const response = ApiResponse.created(voucher, `Voucher "${code}" created successfully`);
  res.status(201).json(response);
});

/**
 * Admin Dashboard: Update voucher
 */
export const updateVoucher = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = (req.validated?.body || req.body) as any;

  if (payload.validUntil) {
    payload.validUntil = new Date(payload.validUntil);
  }

  const updated = await Vouchers.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!updated) {
    throw new NotFoundError('Voucher not found');
  }

  const response = ApiResponse.success(updated, 'Voucher updated successfully');
  res.status(200).json(response);
});

/**
 * Admin Dashboard: Delete voucher
 */
export const deleteVoucher = ErrorHandler.catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const voucher = await Vouchers.findById(id);
  if (!voucher) {
    throw new NotFoundError('Voucher not found');
  }

  await Vouchers.findByIdAndDelete(id);

  const response = ApiResponse.deleted('Voucher deleted successfully');
  res.status(200).json(response);
});
