import express from 'express';

import { autenticateToken } from '../middleware/auth_middleware.js';
import { createCheckoutBooking } from '../controllers/bookings_controllers.js';

const router = express.Router();

router.post('/checkout', autenticateToken, createCheckoutBooking);
export default router;