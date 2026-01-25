import db from '../src/db.js';
import { enqueueEmail } from '../src/email/email_service.js';

export const post_review = async (req, res) => {
    const body = req.body;
    console.error("post_review body:", body);
    const { mentor_id, rating, comment } = body;
    const userId = req.user.userId;
    try {
        const result = await db.query(
            `
            INSERT INTO reviews (mentor_id, mentee_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [mentor_id, userId, rating, comment]
        );
        res.status(201).json({ message: "Recensione inviata con successo", reviewId: result.rows[0].id });
        const userResult = await db.query(
            `
            SELECT email, name, email_notifications
            FROM users
            WHERE id = $1 AND email_notifications = TRUE
            `,
            [mentor_id]
        );
        if (userResult.rows.length > 0) {
            await enqueueEmail({
                type: 'new_review',
                recipient: userResult.rows[0].email,
                data: { name: req.user.name, mentorId: mentor_id },
                scheduleAt: null,
                priority: 1
            });
        }
    } catch (error) {
        console.error("Errore durante l'invio della recensione:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
};

export const answer_review = async (req, res) => {
    const { reviewId, answer } = req.body;
    const userId = req.user.userId;
    console.error("answer_review body:", req.body);
    try {
        const result = await db.query(
            `
            UPDATE reviews
            SET answer = $1
            WHERE id = $2 AND mentor_id = $3
            RETURNING id    
            `,
            [answer, reviewId, userId]
        );
        console.error("answer_review result:", result);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Recensione non trovata o non autorizzato." });
        }

        res.status(200).json({ message: "Risposta inviata con successo" });
    } catch (error) {
        console.error("Errore durante l'invio della risposta alla recensione:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
};

