import express, { Router, RequestHandler } from "express";
import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from "./controller";
import multer from "multer";
import os from "os";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { createProductSchema, listProductsSchema, productIdParamSchema, updateProductSchema } from "./validation";

const router: Router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.get('/products', validate(listProductsSchema), getProducts);
router.get('/products/:id', validate(productIdParamSchema), getProduct);

router.post(
  '/products',
  authenticate as RequestHandler,
  authorize('admin') as RequestHandler,
  upload.fields([
    { name: 'image_thumbnail' },
    { name: 'image_details' }
  ]),
  validate(createProductSchema),
  createProduct
);

router.put(
  '/products/:id',
  authenticate as RequestHandler,
  authorize('admin') as RequestHandler,
  upload.fields([
    { name: 'image_thumbnail' },
    { name: 'image_details' }
  ]),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  '/products/:id',
  authenticate as RequestHandler,
  authorize('admin') as RequestHandler,
  validate(productIdParamSchema),
  deleteProduct
);

export default router;