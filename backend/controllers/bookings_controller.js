import db from "../src/db.js";

import Stripe from "stripe";
import { enqueueEmail } from "../src/email/email_service.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const test = true
export const createCheckoutBooking = async (req, res) => {
    const menteeId = req.user.userId;
    const { sessionId, note } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: "Session ID obbligatorio!" });
    }

    try {
        await db.query('BEGIN');

        const sRes = await db.query(
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

        //Blocco la sessione
        await db.query(
            `
            UPDATE sessions SET available = false WHERE id = $1
            `,
            [session.id]
        );


        const bRes = await db.query(
            `
    INSERT INTO bookings (mentee_id, mentor_id, session_id, note, status, meeting_url)
    SELECT 
        $1,              -- mentee_id
        $2,              -- mentor_id
        $3,              -- session_id
        $4,              -- note
        'confirmed',     -- status
        u.meeting_url    -- Prendiamo l'url dalla tabella users
    FROM users u
    WHERE u.id = $2      -- Filtriamo per l'ID del mentor
    RETURNING id;
    `,
            [menteeId, session.mentor_id, session.id, note || null]
        );


        const bookingId = bRes.rows[0].id;

        const totaledaPagare = Number(session.hourly_rate);
        if (Number.isNaN(totaledaPagare) || totaledaPagare < 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: "Tariffa oraria non valida!" });
        }

        const pRes = await db.query(
            `
            INSERT INTO payments (booking_id, amount, currency, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [bookingId, totaledaPagare, 'eur', 'pending']
        );



        const free = totaledaPagare === 0 || totaledaPagare === 0.0 || totaledaPagare === 0.00 || test === true;
        if (free) {
            const paymentIntentId = pRes.rows[0].id;
            // Prenotazione gratuita, imposto pagamento come completato
            await db.query("BEGIN");
            await db.query(
                `
        UPDATE payments
        SET status = 'completed'
        WHERE id = $1
      `,
                [paymentIntentId]
            );

            await db.query(
                `
        UPDATE sessions
        SET available = 'FALSE'
        WHERE id = $1
      `,
                [sessionId]
            );

            await db.query("COMMIT");


        } else {

            const paymentId = pRes.rows[0].id;

            const checkoutSession = await stripe.checkout.sessions.create({
                mode: 'payment',
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
                    sessionId: String(session.id)
                }
            });

            //Checkout session creato, aggiorno il payment con l'id della sessione
            await db.query(
                `
                    UPDATE payments SET stripe_session_id = $1 WHERE id = $2
                    `,
                [checkoutSession.id, paymentId]
            );
            await db.query('COMMIT');
        }


        //Mail di notifica avvenuta prenotazione
        const userResult = await db.query(
            `
            SELECT email, name, email_notifications
            FROM users
            WHERE id = $1 AND email_notifications = TRUE
            `,
            [req.user.userId]
        );

        if (userResult.rows.length > 0) {
            const ts = new Date(session.start_time);
            const date = ts.toLocaleDateString("it-IT");
            const time = ts.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit"
            });
            await enqueueEmail({
                type: 'booking_confirmation',
                recipient: req.user.email,
                data: { name: req.user.name, mentorName: session.mentor_name, date: date, time: time },
                scheduleAt: null,
                priority: 1
            });
        }
        if (free) {
            return res.status(201).json({
                booking_id: bookingId,
            });
        } else {
            return res.status(201).json({
                checkoutUrl: checkoutSession.url,
                booking_id: bookingId,
            });
        }
    } catch (error) {
        try { await db.query('ROLLBACK'); }
        catch (e) { console.error('Rollback error:', e); }
        console.error("Errore durante la creazione del checkout:", error);
        return res.status(500).json({ error: "Errore interno del server." });
    }
};

export const getUserBookings = async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await db.query(
            `
            SELECT 
                b.id,
                b.status,
                b.note,
                b.meeting_url,
                s.start_time,
                m.name AS mentor_name,
                me.name AS mentee_name,
                p.status AS payment_status
            FROM bookings b
            JOIN sessions s ON b.session_id = s.id
            JOIN users m ON b.mentor_id = m.id
            JOIN users me ON b.mentee_id = me.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.mentee_id = $1 OR b.mentor_id = $1
            ORDER BY s.start_time DESC
            `,
            [userId]
        );
        console.log(result.rows, userId);
        if (result.rows.length === 0) {
            return res.status(200).json({ bookings: [] });
        }
        return res.status(200).json({ booking: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero dei dettagli della prenotazione:", error);
        res.status(500).json({ error: "Errore del server durante il recupero dei dettagli della prenotazione." });
    }
};

export const cancelBooking = async (req, res) => {
    const userId = req.user.userId;
    const { booking_id, reason } = req.body;
    const bookingId = Number(booking_id);
    await db.query("BEGIN");
    console.log("Cancelamento booking:", bookingId, "da utente:", userId);
    const bookingCheck = await db.query(
        `
        SELECT mentee_id, mentor_id, session_id, status
        FROM bookings
        WHERE id = $1
        `,
        [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: "Prenotazione non trovata!" });
    }

    const booking = bookingCheck.rows[0];
    if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: "Non autorizzato a cancellare questa prenotazione!" });
    }

    if (booking.status === 'cancelled') {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: "La prenotazione è già stata cancellata!" });
    }

    if (booking.status === 'completed') {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: "Impossibile cancellare una prenotazione completata!" });
    }

    console.log("Procedo con la cancellazione della booking:", bookingId);
    // 1) prendo booking + payment
    const infoRes = await db.query(
        `
    SELECT b.id, b.status, b.mentor_id, b.mentee_id, b.session_id,
           p.id AS payment_id, p.status AS payment_status, p.amount, p.stripe_session_id
    FROM bookings b
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE b.id = $1
    `,
        [bookingId]
    );

    if (infoRes.rows.length === 0) { await db.query("ROLLBACK"); return res.status(404).json({ error: "Booking non trovata" }); }

    const row = infoRes.rows[0];
    if (row.mentor_id !== userId && row.mentee_id !== userId) {
        await db.query("ROLLBACK"); return res.status(403).json({ error: "Non autorizzato" });
    }
    console.log("Info booking per cancellazione:", row);
    // 2) se pagamento completato => refund
    if (row.payment_status === "completed" && row.stripe_session_id && test === false) {
        console.log("Procedo con il rimborso per la booking:", bookingId);
        // Recupero checkout session per ottenere payment_intent
        const checkout = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
        const paymentIntentId = checkout.payment_intent;

        // Creo refund (totale). Stripe supporta refund via payment_intent. :contentReference[oaicite:2]{index=2}
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: "requested_by_customer", // o "duplicate"/"fraudulent"
            // amount: Math.round(Number(row.amount) * 100) // se vuoi parziale
            metadata: { booking_id: String(bookingId) },
        });

        // aggiorno DB
        await db.query(
            `
      UPDATE payments
      SET status = 'refunded',
          refunded_at = NOW(),
          refund_reason = $1,
          stripe_payment_intent_id = $2,
          transaction_id = COALESCE(transaction_id, $3)
      WHERE id = $4
      `,
            [reason ?? null, paymentIntentId, refund.id, row.payment_id]
        );
    }
    console.log("Procedo con l'aggiornamento dello stato della booking:", bookingId);
    // 3) cancello booking + rilascio session
    await db.query(
        `
    UPDATE bookings
    SET status='cancelled',
        cancellation_reason=$1,
        cancelled_by=$2,
        cancelled_at=NOW()
    WHERE id=$3
    `,
        [reason ?? null, userId, bookingId]
    );

    await db.query(`UPDATE sessions SET available = TRUE WHERE id = $1`, [row.session_id]);
    console.log("Cancellazione booking completata:", bookingId);
    await db.query("COMMIT");
    return res.json({ message: "Booking cancellata (e rimborsata se pagata)" });
};



