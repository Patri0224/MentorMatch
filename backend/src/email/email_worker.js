import db from '../src/db.js';
import nodemailer from 'nodemailer';
import { renderTemplateByName } from './template_services.js';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
//
export async function processEmailQueue(batchSize = 10) {
    // Preleva le email in stato 'pending' ordinate per priorità e data di creazione
    const qRes = await db.query(
        `
        SELECT id, type, recipient, data
        FROM email_queue
        WHERE status = 'pending' 
        AND (schedule_at IS NULL OR schedule_at <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        `,
        [batchSize]
    );

    let processedCount = 0;

    for (const emailRecord of qRes.rows) {
        const { id, type, recipient, data } = emailRecord;

        try {
            await db.query(
                `
                UPDATE email_queue
                SET status = 'processing', updated_at = NOW()
                WHERE id = $1
                `,
                [id]
            );

            const { subject, body } = await renderTemplateByName(type, data);

            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: recipient,
                subject,
                html: body
            });

            await db.query(
                `
                UPDATE email_queue
                SET status = 'sent', sent_at = NOW()
                WHERE id = $1
                `,
                [id]
            );

            processedCount++;
        } catch (error) {
            console.error(`Errore durante l'invio dell'email ID ${id}:`, error);
            await db.query(
                `
                UPDATE email_queue
                SET status = 'failed', updated_at = NOW()
                error_message = $2
                WHERE id = $1
                `,
                [id, String(error.message || error)]
            );
        }
    }

    return { processedCount, found: qRes.rows.length };
}