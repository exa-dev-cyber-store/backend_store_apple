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
router.get('/carts', auth_1.authenticate, controller_1.getCart);
router.post('/carts', auth_1.authenticate, (0, validator_1.validate)(validation_1.addToCartSchema), controller_1.addProductToCart);
router.post('/carts/reduce', auth_1.authenticate, (0, validator_1.validate)(validation_1.reduceCartSchema), controller_1.reduceProductCart);
router.post('/carts/remove', auth_1.authenticate, (0, validator_1.validate)(validation_1.removeCartSchema), controller_1.removeProductFromCart);
exports.default = router;
