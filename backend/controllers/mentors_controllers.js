import db from '../src/db.js';

export const listMentors = async (req, res) => {
    const {
        sector,
        max_hourly_rate,
        min_rating,
        session_start,
        session_end,
        availability,
    } = req.query;

    try {
        const result = await db.query(
            `SELECT mentors.id, mentors.name, mentors.sector, mentors.hourly_rate, mentors.languages, mentors.reviews_count,mentors.rating
            FROM search_mentors($1, $2, $3, $4) mentors
            WHERE EXISTS (
                SELECT 1
                FROM sessions s
                WHERE s.mentor_id = mentors.id
                 AND s.status = 'available'
                 AND s.start_time < $5
                AND s.end_time > $6
            )
        
        ;`,
            [sector, language, min_rating, max_hourly_rate, session_start, session_end]
        );

        res.json({ mentors: result.rows });
    } catch (error) {
        console.error("Errore durante la ricerca dei mentor:", error);
        res.status(500).json({ message: "Errore del server durante la ricerca dei mentor" });
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
            `SELECT id, name, bio, sector, hourly_rate, reviews_count, avatar_url, rating, languages, meeting_url
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