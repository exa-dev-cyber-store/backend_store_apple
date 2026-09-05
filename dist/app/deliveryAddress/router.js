"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const validator_1 = require("../../utils/validator");
const validation_1 = require("./validation");
const router = express_1.default.Router();
router.get('/delivery-addresses', auth_1.authenticate, controller_1.getDeliveryAddresses);
router.get('/delivery-addresses/:id', auth_1.authenticate, (0, validator_1.validate)(validation_1.deliveryAddressIdSchema), controller_1.getDeliveryAddress);
router.post('/delivery-addresses', auth_1.authenticate, (0, validator_1.validate)(validation_1.createDeliveryAddressSchema), controller_1.createDeliveryAddress);
router.put('/delivery-addresses/:id', auth_1.authenticate, (0, validator_1.validate)(validation_1.updateDeliveryAddressSchema), controller_1.updateDeliveryAddress);
router.delete('/delivery-addresses/:id', auth_1.authenticate, (0, validator_1.validate)(validation_1.deliveryAddressIdSchema), controller_1.deleteDeliveryAddress);
exports.default = router;
