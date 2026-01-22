import db from '../src/db.js';

export const listMentors = async (req, res) => {
    const {
        sector,
        language,
        min_rate,
        max_rate,
        start_time,
        end_time
    } = req.query;

    try {
        const result = await db.query(
            `SELECT mentors.id, mentors.name, mentors.bio, mentors.sector, mentors.hourly_rate, mentors.languages
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
            [sector, language, min_rate, max_rate, start_time, end_time]
        );

        res.json({ mentors: result.rows });
    } catch (error) {
        console.error("Errore durante la ricerca dei mentor:", error);
        res.status(500).json({ message: "Errore del server durante la ricerca dei mentor" });
    }
};