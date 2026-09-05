import express, { Router } from 'express';
import {
  getPublicVouchers,
  validateVoucher,
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from './controller';
import { validate } from '../../utils/validator';
import {
  createVoucherSchema,
  updateVoucherSchema,
  validateVoucherSchema,
  voucherIdParamSchema,
} from './validation';
import { authenticate, authorize } from '../../middleware/auth';

const router: Router = express.Router();

// Public & Customer routes
router.get('/vouchers/public', getPublicVouchers);
router.post('/vouchers/validate', validate(validateVoucherSchema), validateVoucher);

// Admin Management routes
router.get('/vouchers', authenticate, authorize('admin'), getAllVouchers);
router.post('/vouchers', authenticate, authorize('admin'), validate(createVoucherSchema), createVoucher);
router.put('/vouchers/:id', authenticate, authorize('admin'), validate(updateVoucherSchema), updateVoucher);
router.delete('/vouchers/:id', authenticate, authorize('admin'), validate(voucherIdParamSchema), deleteVoucher);

export default router;
