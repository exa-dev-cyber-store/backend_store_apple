import { Router, RequestHandler } from "express";
import { autoGenerateOrder, chargeCoreApi, createOrder, getAllOrders, getOrder, getOrders, getPaymentStatus, handleMidtransNotification, updateOrder } from "./controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { chargeOrderSchema, createOrderSchema, listOrdersQuerySchema, orderIdParamSchema, updateOrderStatusSchema } from "./validation";

const router = Router();

router.get('/all-orders', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(listOrdersQuerySchema), getAllOrders);
router.get('/orders', authenticate as RequestHandler, validate(listOrdersQuerySchema), getOrders);
router.get('/orders/:id/status', validate(orderIdParamSchema), getPaymentStatus);
router.get('/orders/:id', validate(orderIdParamSchema), getOrder);
router.post('/orders', authenticate as RequestHandler, validate(createOrderSchema), createOrder);
router.post('/orders/charge', authenticate as RequestHandler, validate(chargeOrderSchema), chargeCoreApi);
router.post('/orders/notification', handleMidtransNotification);
router.post('/orders/auto-generate', authenticate as RequestHandler, authorize('admin') as RequestHandler, autoGenerateOrder);
router.put('/orders/:id', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(updateOrderStatusSchema), updateOrder);

export default router;