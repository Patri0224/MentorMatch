import db from '../src/db.js';
import { enqueueEmail } from '../email/email_service.js'

export async function generaEmailReminder() {
    try {
        const result = await db.query(
            `
            SELECT b.id, b.mentee_id, b.mentor_id, s.start_time, u.name AS mentee_name, u.email AS mentee_email
            FROM bookings b
            JOIN sessions s ON b.session_id = s.id
            JOIN users u ON b.mentee_id = u.id
            WHERE s.start_time BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
            AND b.status = 'confirmed'
            `
        );

        for (const booking of result.rows) {
            await enqueueEmail({
                type: 'booking_reminder',
                recipient: booking.mentee_email,
                data: {
                    name: booking.mentee_name,
                    startTime: booking.start_time
                }
            });
        }
    } catch (error) {
        console.error("Errore durante la generazione dei reminder:", error);
    }
};