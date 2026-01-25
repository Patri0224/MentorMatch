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
    console.error("listMentors called with raw query:", req.query);
    // 1. Mappatura Numerica della fascia oraria
    const timeMap = {
        "mattina": 1,
        "pomeriggio": 2,
        "sera": 3
    };
    const timeValue = timeMap[time_of_day] || 0; // Se null o altro, diventa 0
    console.error("listMentors called with params:", {
        sector: sector,
        language: language,
        max_hourly_rate: max_hourly_rate,
        min_rating: min_rating,
        session_start: session_start,
        session_end: session_end,
        time_of_day: time_of_day,
        timeValue: timeValue
    });

    try {
        const result = await db.query(
            `SELECT m.id, m.name, m.sector, m.hourly_rate, m.languages, m.review_count, m.rating, u.avatar_url
            FROM search_mentors($1, $2, $3, $4) m 
            JOIN users u ON m.id = u.id
            WHERE (
                -- Se session_start, session_end e timeValue sono nulli/0, prendi tutti
                ($5::TIMESTAMP IS NULL AND $6::TIMESTAMP IS NULL AND $7 = 0)
                OR 
                EXISTS (
                    SELECT 1
                    FROM sessions s
                    WHERE s.mentor_id = m.id
                      AND s.available = TRUE
                      AND ($5::TIMESTAMP IS NULL OR s.start_time >= $5)
                      AND ($6::TIMESTAMP IS NULL OR s.end_time <= $6)
                      AND (
                        $7 = 0 OR -- Mostra tutti
                        ($7 = 1 AND EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 12) OR
                        ($7 = 2 AND EXTRACT(HOUR FROM s.start_time) BETWEEN 13 AND 17) OR
                        ($7 = 3 AND EXTRACT(HOUR FROM s.start_time) BETWEEN 18 AND 23)
                      )
                )
            )
            ORDER BY m.rating DESC;`,
            [
                sector || null,
                language || null, // Rimesso correttamente invece di null fisso
                min_rating ? parseFloat(min_rating) : 0,
                max_hourly_rate ? parseFloat(max_hourly_rate) : 9999,
                session_start || null,
                session_end || null,
                timeValue // Passiamo l'intero 0, 1, 2 o 3
            ]
        );
        console.log("Risultato query:", result.rows);
        res.json(result.rows);

    } catch (error) {
        console.error("Errore API listMentors:", error);
        res.status(500).json({ message: "Errore durante la ricerca: " + error.message });
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