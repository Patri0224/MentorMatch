import express from 'express';
import { registerUser, loginUser, refreshToken} from '../src/controllers/auth_controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);

export default router;