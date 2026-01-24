import express from 'express';
import cors from 'cors';

import bookingsRoutes from '../routes/bookings_routes.js';
import stripeWebhookRoutes from '../routes/stripe_webhook_routes.js';

import authRoutes from '../routes/auth_routes.js';
import usersRoutes from '../routes/users_routes.js';
import mentorsRoutes from '../routes/mentors_routes.js';
import sessionRoutes from '../routes/sessions_routes.js';
import messageRoutes from '../routes/message_routes.js';
import reviewRoutes from '../routes/reviews_routes.js';



const app = express();


// Middleware
app.use(cors());
app.use("/api/webhooks/stripe", express.raw({ type: 'application/json' }), stripeWebhookRoutes);


app.use(express.json());
app.use('/api/bookings', bookingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/mentors', mentorsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

const FRONTEND_URL = process.env.FRONTEND_URL;

app.get("/health", (req, res) => res.status(200).send("ok"));
app.get("/", (req, res) => res.send("MentorMatch backend is running ✅"));






export default app;
