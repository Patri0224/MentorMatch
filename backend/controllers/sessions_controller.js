import db from '../src/db.js';

export const createSession = async (req, res) => {
    const mentorId = req.user.userId;
    const { start_time, end_time } = req.body;

    const start = new Date(start_time);
    const end = new Date(end_time);

    const duration = (end - start) / (1000 * 60); // durata in minuti


    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ message: "Orario di inizio o fine non valido" });
    }

    if (end <= start) {
        return res.status(400).json({ message: "L'orario di fine deve essere successivo all'orario di inizio" });
    }

    const timeduration = duration !== undefined ? Number(duration) : 60;
    if (Number.isNaN(timeduration) || timeduration <= 0) {
        return res.status(400).json({ message: "Durata non valida" });
    }

    try {
        const check = await db.query(
            `
            SELECT 1
            FROM sessions
            WHERE mentor_id = $1
                AND available = TRUE
                AND end_time < $2 
                AND start_time > $3
            LIMIT 1;
            `,
            [mentorId, end, start]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ message: "Conflitto con una sessione esistente" });
        }

        const result = await db.query(
            `
            INSERT INTO sessions (mentor_id, start_time, end_time, duration, available)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
            `,
            [mentorId, start, end, timeduration, true]);
        res.status(201).json({ message: "Sessione creata!", session: result.rows[0], cod: 1 });
    } catch (error) {
        console.error("Errore durante la creazione della sessione:", error);
        res.status(500).json({ message: "Errore del server durante la creazione della sessione" });
    }
};

export const listmySessions = async (req, res) => {
    const mentorId = req.user.id;

    try {
        const result = await db.query(
            `
            SELECT id, mentor_id, start_time, end_time, duration, available
            FROM sessions
            WHERE mentor_id = $1
            ORDER BY start_time ASC;
            `,
            [mentorId]);

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero delle sessioni:", error);
        res.status(500).json({ message: "Errore del server durante il recupero delle sessioni" });
    }
};

export const getMentorSessions = async (req, res) => {
    const mentorId = Number(req.params.mentorId);

    try {
        const result = await db.query(
            `
            SELECT id, mentor_id, start_time, end_time, duration
            FROM sessions
            WHERE mentor_id = $1 AND available = TRUE
            AND start_time > NOW()
            ORDER BY start_time ASC;
            `,
            [mentorId]);

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero delle sessioni disponibili:", error);
        res.status(500).json({ message: "Errore del server durante il recupero delle sessioni disponibili" });
    }
};

export const deleteSession = async (req, res) => {
    const mentorId = req.user.id;
    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
        return res.status(400).json({ message: "ID sessione non valido" });
    }
    try {
        const bookedcheck = await db.query(
            `
            SELECT 1
            FROM bookings
            WHERE session_id = $1 AND status <> 'cancelled'
            LIMIT 1;
            `,
            [sessionId]
        );

        if (bookedcheck.rows.length > 0) {
            return res.status(400).json({ message: "Impossibile eliminare una sessione prenotata" });
        }

        const result = await db.query(
            `
            DELETE FROM sessions
            WHERE id = $1 AND mentor_id = $2
            RETURNING *;
            `,
            [sessionId, mentorId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Sessione non trovata o non autorizzato" });
        }
        res.json({ message: "Sessione eliminata con successo" });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: "Errore del server durante l'eliminazione della sessione" });
    }
};
