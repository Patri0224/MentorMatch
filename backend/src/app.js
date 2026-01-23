import express from 'express';
import stripeWebhookRouter from '../routes/stripe_webhook_routes.js';
import cors from 'cors';

import "dotenv/config";

import authRoutes from '../routes/auth_routes.js';
import usersRoutes from '../routes/users_routes.js';
import mentorsRoutes from '../routes/mentors_routes.js';


const app = express();

// Middleware
app.use(cors());
app.use("/api/webhooks/stripe", express.raw({ type: 'application/json' }), stripeWebhookRouter);


app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/mentors', mentorsRoutes);
app.use('/api/sessions', mentorsRoutes);

app.get("/health", (req, res) => res.status(200).send("ok"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});


export default app;
