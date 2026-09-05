import express, { Router, RequestHandler } from "express";
import { addProductToCart, getCart, reduceProductCart, removeProductFromCart } from "./controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { addToCartSchema, reduceCartSchema, removeCartSchema } from "./validation";

const router: Router = express.Router();

router.get('/carts', authenticate as RequestHandler, getCart);
router.post('/carts', authenticate as RequestHandler, validate(addToCartSchema), addProductToCart);
router.post('/carts/reduce', authenticate as RequestHandler, validate(reduceCartSchema), reduceProductCart);
router.post('/carts/remove', authenticate as RequestHandler, validate(removeCartSchema), removeProductFromCart);

export default router;