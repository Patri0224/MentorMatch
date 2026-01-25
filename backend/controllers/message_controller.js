import db from '../src/db.js';
import { enqueueEmail } from '../src/email/email_service.js';

export const postMessage = async (req, res) => {
    const senderId = req.user.userId;
    const { recipientId, content } = req.body;

    if (!recipientId || !content?.trim())
        return res.status(400).json({ message: "Dati mancanti per inviare il messaggio" });
    try {
        const result = await db.query(
            `
            INSERT INTO messages (sender_id, recipient_id, content)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [senderId, recipientId, content.trim()]
        );
        res.status(201).json({ message: "Messaggio inviato con successo", messageId: result.rows[0].id });
        const userResult = await db.query(
            `
            SELECT email, name, email_notifications
            FROM users
            WHERE id = $1 AND email_notifications = TRUE
            `,
            [req.user.userId]
        );

        if (userResult.rows.length > 0) {
            await enqueueEmail({
                type: 'new_message',
                recipient: req.user.email,
                data: { name: req.user.name },
                scheduleAt: null,
                priority: 1
            });
        }
    } catch (error) {
        console.error("Errore durante l'invio del messaggio:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
};




export const getMessages = async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await db.query(
            `
     SELECT DISTINCT ON (CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END)
            CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_user_id,
            u.name AS other_user_name,
            m.content,
            m.created_at,
            m.read,
            m.recipient_id
        FROM messages m
        JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END)
        WHERE m.sender_id = $1 OR m.recipient_id = $1
        ORDER BY (CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END), m.created_at DESC;
    `,
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(200).json({ conversations: [] });
        }
        // Ordiniamo i risultati finali per data decrescente (la conversazione più recente in alto)
        const sortedConversations = result.rows.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.status(200).json(sortedConversations);
    } catch (error) {
        console.error("Errore recupero conversazioni:", error);
        res.status(500).json({ message: "Errore nel recupero dei messaggi" });
    }
};

export const getChatHistory = async (req, res) => {
    const userId = req.user.userId;
    const { withUserId } = req.body;
    if (!withUserId)
        return res.status(400).json({ message: "ID utente mancante per recuperare i messaggi" });

    try {
        const result = await db.query(
            `
            SELECT sender_id, recipient_id, content, created_at, read, read_at
            FROM messages
            WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
            ORDER BY created_at ASC
            `,
            [userId, withUserId]
        );
        res.status(200).json({ messages: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero della cronologia chat:", error);
        res.status(500).json({ error: "Errore interno del server." + error.message });
    }
}

export const markAsRead = async (req, res) => {
    const userId = req.user.userId;
    const { fromUserId } = req.body;
    if (!fromUserId)
        return res.status(400).json({ message: "ID utente mancante per aggiornare i messaggi" });
    try {
        const result = await db.query(
            `
            UPDATE messages
            SET read = TRUE, read_at = NOW()
            WHERE sender_id = $1 AND recipient_id = $2 AND read = FALSE
            `,
            [userId, fromUserId]
        );
        res.status(200).json({ message: "Messaggi segnati come letti" });
    } catch (error) {
        console.error("Errore durante l'aggiornamento dei messaggi:", error);
        res.status(500).json({ error: "Errore interno del server." });
    }
};

