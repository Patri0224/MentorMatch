import express from 'express';
import { authenticateToken } from '../src/middleware/auth_middleware.js';
import { processEmailQueue } from '../controllers/email_worker.js';

const router = express.Router();

router.post('/process-email-queue', authenticateToken, async (req, res) => {
    try {
        await processEmailQueue(20); // Processa fino a 20 email per richiesta
        res.status(200).json({ message: 'Coda email processata con successo' });
    } catch (error) {
        console.error('Errore durante il processamento della coda email:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
});

export default router;
        