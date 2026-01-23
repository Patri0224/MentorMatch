import db from "../src/db.js";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutBooking = async (req, res) => {
    const menteeId = req.user.id;
    const { sessionId, note } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: "Session ID obbligatorio!" });
    }

    try {
        const sRes = awat.db.query(
            `
            SELECT s.id, s.mentor_id, s.start_time, s.end_time, s.available, u.hourly_rate, u.name AS mentor_name
            FROM sessions s
            JOIN users u ON s.mentor_id = u.id
            WHERE s.id = $1
            `,
            [sessionId]
        );
        if (sRes.rows.length === 0) return res.status(404).json({ error: "Sessione non trovata!" });

        const session = sRes.rows[0];
        if (!session.available) return res.status(400).json({ error: "Sessione non disponibile!" });

        const totaledaPagare = Number(session.hourly_rate);

        if(Number.isNaN(totaledaPagare) || totaledaPagare <= 0) {
            return res.status(400).json({ error: "Tariffa oraria non valida!" });
        }

        await db.query(
            `
            INSERT INTO bookings (mentee_id, mentor_id, session_id, note, status)
            VALUES ($1, $2, $3, $4, $5, 'confirmed')
            RETURNING id
            `,
            [menteeId, session.mentor_id, session.id, note || null]
        );

        const bookingId = bRes.rows[0].id;

        const pRes = await db.query(
            `
            INSERT INTO payments (booking_id, amount, currency, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [bookingId, totaledaPagare, 'eur', 'pending']
        );

        const paymentId = pRes.rows[0].id;

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Sessione con ${session.mentor_name}`,
                        },
                        unit_amount: Math.round(totaledaPagare * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/success?session_id=${bookingId}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            metadata: {
                paymentId: String(paymentId),
                bookingId: String(bookingId),
                sessionId: String(session.id),
                mentor_id: String(session.mentor_id),
                mentee_id: String(menteeId),
            }
        });

        await db.query(
            `
            UPDATE payments SET stripe_session_id = $1 WHERE id = $2
            `,
            [checkoutSession.id, paymentId]
        );

        return res.status(201).json({ 
            checkoutUrl: checkoutSession.url,
            booking_id: bookingId,
        });
    } catch (error) {
        try { await db.query('ROLLBACK'); } catch (e) { console.error('Rollback error:', e); }
        console.error("Errore durante la creazione del checkout:", error);
        return res.status(500).json({ error: "Errore interno del server." });
    }
}