"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const multer_1 = __importDefault(require("multer"));
const os_1 = __importDefault(require("os"));
const auth_1 = require("../../middleware/auth");
const validator_1 = require("../../utils/validator");
const validation_1 = require("./validation");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: os_1.default.tmpdir() });
router.get('/products', (0, validator_1.validate)(validation_1.listProductsSchema), controller_1.getProducts);
router.get('/products/:id', (0, validator_1.validate)(validation_1.productIdParamSchema), controller_1.getProduct);
router.post('/products', auth_1.authenticate, (0, auth_1.authorize)('admin'), upload.fields([
    { name: 'image_thumbnail' },
    { name: 'image_details' }
]), (0, validator_1.validate)(validation_1.createProductSchema), controller_1.createProduct);
router.put('/products/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), upload.fields([
    { name: 'image_thumbnail' },
    { name: 'image_details' }
]), (0, validator_1.validate)(validation_1.updateProductSchema), controller_1.updateProduct);
router.delete('/products/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.productIdParamSchema), controller_1.deleteProduct);
exports.default = router;
