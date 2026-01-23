import express from 'express';
import { authenticateToken } from '../src/middleware/auth_middleware';
import { answer_review, post_review } from '../controllers/reviews_controller.js';

const router = express.Router();

router.post('/post_review', authenticateToken, post_review);
router.post('/response', authenticateToken, answer_review);

export default router;