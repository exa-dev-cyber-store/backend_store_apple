import express, { Router, RequestHandler } from "express";
import { createDeliveryAddress, deleteDeliveryAddress, getDeliveryAddress, getDeliveryAddresses, updateDeliveryAddress } from "./controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { createDeliveryAddressSchema, deliveryAddressIdSchema, updateDeliveryAddressSchema } from "./validation";

const router: Router = express.Router();

router.get('/delivery-addresses', authenticate as RequestHandler, getDeliveryAddresses);
router.get('/delivery-addresses/:id', authenticate as RequestHandler, validate(deliveryAddressIdSchema), getDeliveryAddress);
router.post('/delivery-addresses', authenticate as RequestHandler, validate(createDeliveryAddressSchema), createDeliveryAddress);
router.put('/delivery-addresses/:id', authenticate as RequestHandler, validate(updateDeliveryAddressSchema), updateDeliveryAddress);
router.delete('/delivery-addresses/:id', authenticate as RequestHandler, validate(deliveryAddressIdSchema), deleteDeliveryAddress);

export default router;