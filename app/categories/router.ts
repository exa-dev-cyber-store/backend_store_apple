import express, { Router, RequestHandler } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { createCategory, deleteCategory, getCategories, getCategory, updateCategory } from "./controller";
import { categoryIdParamSchema, createCategorySchema, updateCategorySchema } from "./validation";

const router: Router = express.Router();

router.get('/categories', getCategories);
router.get('/categories/:id', validate(categoryIdParamSchema), getCategory);
router.post('/categories', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(createCategorySchema), createCategory);
router.put('/categories/:id', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(updateCategorySchema), updateCategory);
router.delete('/categories/:id', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(categoryIdParamSchema), deleteCategory);

export default router;
