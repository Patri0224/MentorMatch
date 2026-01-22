import express from "express";
import { authenticateToken } from "../src/middleware/auth_middleware.js";
import { updateProfile } from "../controllers/users_controllers.js";

const router = express.Router();

router.patch("/update_profile", authenticateToken, updateProfile);

export default router;