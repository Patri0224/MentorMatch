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

        const type = event.type;
        if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
            const session = event.data.object;

            const paymentId = Number(session.metadata.paymentId);
            const bookingId = Number(session.metadata.bookingId);
            
            await db.query("BEGIN");

            await db.query(`
                UPDATE payments
                SET status = 'completed'
                WHERE id = $1
            `, [paymentId]);

            await db.query(`
                UPDATE bookings
                SET status = 'confirmed'
                WHERE id = $1
            `, [bookingId]);

            await db.query("COMMIT");
        }

        if(type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') {
            const s = event.data.object;
            const paymentId = Number(s.metadata.paymentId);
            const bookingId = Number(s.metadata.bookingId);
            const sessionId = Number(s.metadata.sessionId);
            await db.query("BEGIN");

            await db.query(`
                UPDATE payments
                SET status = 'failed'
                WHERE id = $1
            `, [paymentId]);

            await db.query(`
                UPDATE bookings
                SET status = 'cancelled'
                WHERE id = $1
            `, [bookingId]);

            await db.query(`
                UPDATE sessions
                SET available = true
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
};