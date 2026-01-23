import express from "express"
import { stripeWebHookController} from "../controllers/stripe_webhook_controller.js"

const router = express.Router();
router.post("/", stripeWebHookController);

export default router;