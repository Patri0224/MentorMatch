import db from "../src/db.js";
import bcrypt from 'bcrypt';

export const updateProfile = async (req, res) => {
    // Nota: assicurati che il middleware popoli req.userId
    const userID = req.userId || req.user?.id;

    const allowedFields = [
        "name",
        "bio",
        "email_notifications",
        "password",
        "sector",
        "languages",
        "meeting_url", // Corretto da mentor_meeting_url a meeting_url
        "hourly_rate",
    ];

    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    // Hash della password se presente
    if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Nessun campo valido fornito" });
    }

    // Validazione Hourly Rate
    if (updates.hourly_rate !== undefined) {
        const n = Number(updates.hourly_rate);
        if (Number.isNaN(n) || n < 0) {
            return res.status(400).json({ message: "La tariffa deve essere un numero positivo" });
        }
        updates.hourly_rate = n;
    }

    try {
        const keys = Object.keys(updates);
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
        const values = keys.map((k) => updates[k]);
        values.push(userID);
        console.error("updateProfile called with updates:", updates);
        console.error("Generated SQL:", setClause, "Values:", values);
        // FIX: RETURNING corretto (evitiamo di restituire la password)
        const query = `
            UPDATE users SET ${setClause} 
            WHERE id = $${values.length - 1} 
            RETURNING id, name, email, bio, sector, languages, meeting_url, hourly_rate, avatar_url;
        `;
        console.log("Executing query:", query, "with values:", values);
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Utente non trovato" });
        }

        res.json({ message: "Profilo aggiornato con successo", user: result.rows[0] });
    } catch (error) {
        console.error("Errore updateProfile:", error);
        if (error.code === '23505') return res.status(409).json({ message: "Email già in uso" });
        res.status(500).json({ message: "Errore del server" });
    }
}

export const deleteMyaccount = async (req, res) => {
    const userID = req.userId || req.user?.id;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: "Password richiesta per eliminare l'account" });
    }

    try {
        await db.query("BEGIN");

        const userResult = await db.query("SELECT password FROM users WHERE id = $1", [userID]);
        if (userResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return res.status(404).json({ message: "Utente non trovato" });
        }

        const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].password);
        if (!isPasswordValid) {
            await db.query("ROLLBACK");
            return res.status(401).json({ message: "Password errata" });
        }

        // FIX: Controllo stato coerente con lo schema ('confirmed')
        const areBookings = await db.query(
            `SELECT 1 FROM bookings 
             WHERE (mentee_id = $1 OR mentor_id = $1) 
             AND status = 'confirmed' LIMIT 1`,
            [userID]
        );

        if (areBookings.rows.length > 0) {
            await db.query("ROLLBACK");
            return res.status(400).json({ message: "Hai prenotazioni attive. Annullale prima di eliminare l'account." });
        }

        await db.query("DELETE FROM users WHERE id = $1", [userID]);
        await db.query("COMMIT");

        res.json({ message: "Account eliminato con successo" });
    } catch (error) {
        await db.query("ROLLBACK");
        console.error("Errore deleteMyaccount:", error);
        res.status(500).json({ message: "Errore interno del server" });
    }
}

export const getUserStats = async (req, res) => {
    const userID = req.userId;
    try {
        const result = await db.query(
            `SELECT * FROM get_user_stats($1)`,
            [userID]
        );
        res.json({ stats: result.rows[0] });
    } catch (error) {
        console.error("Errore durante il recupero delle statistiche dell'utente:", error);
        res.status(500).json({ message: "Errore del server durante il recupero delle statistiche" });
    }
}
