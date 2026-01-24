import express from 'express';
import { authenticateToken } from '../src/middleware/auth_middleware';
import { requireRole } from '../src/middleware/role_middleware.js';
import {
    createSession,
    listmySessions,
    deleteSession,
    getMentorSessions
} from '../src/controllers/sessions_controller.js';

const router = express.Router();

router.get('/mentor/:mentorId', getMentorSessions);

router.post('/createSession', authenticateToken, requireRole('mentor'), createSession);
router.get('/my-sessions', authenticateToken, listmySessions);
router.delete('/:sessionId', authenticateToken, requireRole('mentor'), deleteSession);

export default router;