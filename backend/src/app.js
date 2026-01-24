import express from "express";
import cors from "cors";

import bookingsRoutes from "../routes/bookings_routes.js";
import stripeWebhookRoutes from "../routes/stripe_webhook_routes.js";

import authRoutes from "../routes/auth_routes.js";
import usersRoutes from "../routes/users_routes.js";
import mentorsRoutes from "../routes/mentors_routes.js";
import sessionRoutes from "../routes/sessions_routes.js";
import messageRoutes from "../routes/message_routes.js";
import reviewRoutes from "../routes/reviews_routes.js";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;

// ✅ CORS (se hai frontend separato)
app.use(
  cors({
    origin: FRONTEND_URL || true, // in prod metti FRONTEND_URL su Render
    credentials: true,
  })
);

// ✅ Stripe webhook: raw prima del json
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes
);

// ✅ JSON per il resto
app.use(express.json());

// Routes
app.use("/api/bookings", bookingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/mentors", mentorsRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);

// Health + home
app.get("/health", (req, res) => res.status(200).send("ok"));
app.get("/", (req, res) => res.send("MentorMatch backend is running ✅"));

export default app;
