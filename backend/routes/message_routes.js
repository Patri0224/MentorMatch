import express from 'express';
import { postMessage, getMessages, markAsRead, getChatHistory } from '../controllers/message_controller.js';
import { authenticateToken } from '../src/middleware/auth_middleware.js';

const router = express.Router();

router.post('/post-message', authenticateToken, postMessage);
router.post('/get-messages', authenticateToken, getMessages);
router.post('/get-chat-history', authenticateToken, getChatHistory);
router.post('/mark-as-read', authenticateToken, markAsRead);


export default router;