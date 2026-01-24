import db from '../db.js';

export async function enqueueEmail({type, recipient, data, scheduleAt = null, priority = 1}) {
    try {
        const result = await db.query(
            `
            INSERT INTO email_queue (type, recipient, data, priority, scheduled_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            `,
            [type, recipient, data, priority, scheduleAt ]
        );
        return result.rows[0].id;
    } catch (error) {
        console.error("Errore durante l'inserimento dell'email nella coda:", error);
        throw new Error("Errore del server durante l'inserimento dell'email nella coda");
    }
}