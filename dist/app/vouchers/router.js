"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const validator_1 = require("../../utils/validator");
const validation_1 = require("./validation");
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
// Public & Customer routes
router.get('/vouchers/public', controller_1.getPublicVouchers);
router.post('/vouchers/validate', (0, validator_1.validate)(validation_1.validateVoucherSchema), controller_1.validateVoucher);
// Admin Management routes
router.get('/vouchers', auth_1.authenticate, (0, auth_1.authorize)('admin'), controller_1.getAllVouchers);
router.post('/vouchers', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.createVoucherSchema), controller_1.createVoucher);
router.put('/vouchers/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.updateVoucherSchema), controller_1.updateVoucher);
router.delete('/vouchers/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.voucherIdParamSchema), controller_1.deleteVoucher);
exports.default = router;
