import express, { Router, RequestHandler } from "express";
import { getLikes, Likes } from "./controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../utils/validator";
import { toggleLikeSchema } from "./validation";

const router: Router = express.Router();

router.get('/likes', authenticate as RequestHandler, getLikes);
router.post('/likes', authenticate as RequestHandler, validate(toggleLikeSchema), Likes);

export default router;