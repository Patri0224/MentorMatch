import express from 'express';

import { authenticateToken } from '../src/middleware/auth_middleware.js';
import { cancelBooking, createCheckoutBooking, getUserBookings } from '../controllers/bookings_controller.js';

const router = express.Router();

router.post('/checkout', authenticateToken, createCheckoutBooking);
router.post('/user_bookings', authenticateToken, getUserBookings);
router.post('/cancel_booking', authenticateToken, cancelBooking);
export default router;