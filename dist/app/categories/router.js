"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const validator_1 = require("../../utils/validator");
const controller_1 = require("./controller");
const validation_1 = require("./validation");
const router = express_1.default.Router();
router.get('/categories', controller_1.getCategories);
router.get('/categories/:id', (0, validator_1.validate)(validation_1.categoryIdParamSchema), controller_1.getCategory);
router.post('/categories', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.createCategorySchema), controller_1.createCategory);
router.put('/categories/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.updateCategorySchema), controller_1.updateCategory);
router.delete('/categories/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), (0, validator_1.validate)(validation_1.categoryIdParamSchema), controller_1.deleteCategory);
exports.default = router;
