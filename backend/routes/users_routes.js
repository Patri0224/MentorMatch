import express from "express";
import { authenticateToken } from "../src/middleware/auth_middleware.js";
import { updateMentorProfile } from "../controllers/users_controllers.js";

const router = express.Router();

router.patch("/mentor/profile", authenticateToken, updateMentorProfile);

export default router;