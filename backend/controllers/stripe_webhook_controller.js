import Stripe from "stripe";
import db from "../src/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebHookController = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );   
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
            const session = event.data.object;

            const paymentIntentId = Number(session.metadata.bookingId);
            const bookingId = Number(session.metadata.bookingId);
            const sessionId = Number(session.metadata.sessionId);
            
            await db.query("BEGIN");
            await db.query(`
                UPDATE payments
                SET status = 'completed'
                WHERE id = $1
            `, [paymentIntentId]);

            await db.query(`
                UPDATE sessions
                SET available = 'FALSE'
                WHERE id = $1
            `, [sessionId]);

            await db.query("COMMIT");
        }
        
        return res.json({ received: true });
    } catch (error) {
        try {
            await db.query("ROLLBACK");
        } catch{}
        console.error("Error processing webhook event:", error);
        return res.status(500).send("Internal Server Error");
    }
}