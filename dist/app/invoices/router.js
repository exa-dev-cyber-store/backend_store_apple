"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const validator_1 = require("../../utils/validator");
const validation_1 = require("./validation");
const router = (0, express_1.Router)();
router.get("/invoices/:orderId", (0, validator_1.validate)(validation_1.invoiceOrderIdSchema), controller_1.getInvoice);
exports.default = router;
