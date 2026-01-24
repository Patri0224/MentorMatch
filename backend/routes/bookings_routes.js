import express from 'express';

import { autenticateToken } from '../src/middleware/auth_middleware.js';
import { cancelBooking, createCheckoutBooking, getUserBookings } from '../controllers/bookings_controller.js';

const router = express.Router();

router.post('/checkout', autenticateToken, createCheckoutBooking);
router.post('/user_bookings', autenticateToken, getUserBookings);
router.post('/cancel_booking', autenticateToken, cancelBooking);
export default router;