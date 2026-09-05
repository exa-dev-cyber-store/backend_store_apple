import { Router } from "express";
import { getInvoice } from "./controller";
import { validate } from "../../utils/validator";
import { invoiceOrderIdSchema } from "./validation";

const router = Router();

router.get("/invoices/:orderId", validate(invoiceOrderIdSchema), getInvoice);

export default router;