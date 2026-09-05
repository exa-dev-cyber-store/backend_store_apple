import { Router, RequestHandler } from "express";
import { getDataDashboard } from "./controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { dashboardQuerySchema } from "./validation";

const router = Router();

router.get('/dashboard', authenticate as RequestHandler, authorize('admin') as RequestHandler, validate(dashboardQuerySchema), getDataDashboard);

export default router;