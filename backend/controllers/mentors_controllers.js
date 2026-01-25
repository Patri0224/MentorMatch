import db from '../src/db.js';

export const listMentors = async (req, res) => {
    const {
        sector,
        language,
        max_hourly_rate,
        min_rating,
        session_start,
        session_end,
        time_of_day
    } = req.query;

    try {
        const result = await db.query(
            `SELECT m.id, m.name, m.sector, m.hourly_rate, m.languages, m.review_count, m.rating, u.avatar_url
            FROM search_mentors($1, $2, $3, $4) m 
            JOIN users u ON m.id = u.id
            WHERE (
                -- 1. Se nessun filtro temporale è attivo, mostra tutti i mentor filtrati per settore/prezzo
                ($5::TIMESTAMP IS NULL AND $6::TIMESTAMP IS NULL AND $7 IS NULL)
                OR 
                -- 2. Altrimenti controlla che esista almeno una sessione che soddisfi i criteri
                EXISTS (
                    SELECT 1
                    FROM sessions s
                    WHERE s.mentor_id = m.id
                      AND s.available = TRUE
                      AND ($5::TIMESTAMP IS NULL OR s.start_time >= $5)
                      AND ($6::TIMESTAMP IS NULL OR s.end_time <= $6)
                      AND (
                        $7::TEXT IS NULL OR
                        ($7::TEXT = 'mattina'    AND EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11) OR
                        ($7::TEXT = 'pomeriggio' AND EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17) OR
                        ($7::TEXT = 'sera'       AND EXTRACT(HOUR FROM s.start_time) BETWEEN 18 AND 23)
                      )
                )
            )
            ORDER BY m.rating DESC;`,
            [
                sector || null,
                null,
                min_rating ? parseFloat(min_rating) : 0,
                max_hourly_rate ? parseFloat(max_hourly_rate) : 9999,
                session_start || null,
                session_end || null,
                time_of_day || null
            ]
        );

        res.json(result.rows); // Restituisci l'array puro per il .map() del frontend

    } catch (error) {
        console.error("Errore API listMentors:", error);
        res.status(500).json({ message: "Errore durante la ricerca " + error.message });
    }
}

export const getSectors = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT DISTINCT sector FROM users"
        );

        res.json({ sectors: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero dei settori:", error);
        res.status(500).json({ message: "Errore del server durante il recupero dei settori" });
    }
}

export const getMentorById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT id, name, bio, sector, hourly_rate, review_count, avatar_url, rating, languages, meeting_url, role, email_notifications, email
            FROM users 
            WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Utente non trovato" + id });
        }
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error("Errore durante il recupero del mentor:", error);
        res.status(500).json({ message: "Errore del server durante il recupero del mentor" + id });
    }
}

export const getMentorsReviews = async (req, res) => {
    const { mentorId } = req.params;
    try {
        const result = await db.query(
            `SELECT r.id, r.mentee_id, u.name AS mentee_name, r.rating, r.comment, r.response, r.created_at
            FROM reviews r
            JOIN users u ON r.mentee_id = u.id
            WHERE r.mentor_id = $1
            ORDER BY r.created_at DESC`,
            [mentorId]
        );
        res.json({ reviews: result.rows });
    } catch (error) {
        console.error("Errore durante il recupero delle recensioni del mentor:", error);
        res.status(500).json({ message: "Errore del server durante il recupero delle recensioni del mentor" });
    }
}