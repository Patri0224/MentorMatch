import express from 'express';
import { postMessages, getMessages, markAsRead, getChatHistory } from '../controllers/message_controllers.js';
import { authenticateToken } from '../middleware/auth_middleware.js';

const router = express.Router();

router.post('/post-message', authenticateToken, postMessages);
router.post('/get-messages', authenticateToken, getMessages);
router.post('/get-chat-history', authenticateToken, getChatHistory);
router.post('/mark-as-read', authenticateToken, markAsRead);


export default router;