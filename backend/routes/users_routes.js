import express from "express";
import { authenticateToken } from "../src/middleware/auth_middleware.js";
import { updateProfile, getUserStats, deleteMyaccount } from "../controllers/users_controllers.js";

const router = express.Router();

router.post("/update_profile", authenticateToken, updateProfile);
router.post("/stats", authenticateToken, getUserStats);
router.delete("/delete_account", authenticateToken, deleteMyaccount);

export default router;