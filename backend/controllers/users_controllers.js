import db from "../src/db.js";
import bcrypt from 'bcrypt';

export const updateProfile = async (req, res) => {
    const userID = req.userId;

    const allowedFields = [
        "name",
        "bio",
        "email_notifications",
        "password",
        "sector",
        "languages",
        "mentor_meeting_url",
        "hourly_rate",
        
    ];

    const updates = {};
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            updates[field] = req.body[field];
        }
    }

    updates["password"] = await bcrypt.hash(req.body.password, 10);


    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Nessun campo valido fornito per l'aggiornamento" });
    }


    if (updates.hourly_rate !== undefined && updates.hourly_rate !== null) {
        const n = Number(updates.hourly_rate);
        if (Number.isNaN(n) || n < 0) {
            return res.status(400).json({ message: "L'orario richiesto deve essere un numero positivo" });
        }
        updates.hourly_rate = n;
    }

    try{
        const keys = Object.keys(updates);
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
        const values = keys.map((k) => updates[k] ?? null);
        values.push(userID);

        const query = `
        UPDATE users SET ${setClause} 
        WHERE id = $${values.length} 
        RETURNING SET ${setClause}`;
        
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Utente non trovato" });
        }

        res.json({ message: "Profilo aggiornato con successo", user: result.rows[0] });
    } catch (error) {
        console.error("Errore durante l'aggiornamento del profilo:", error);
        if(error.code === '23505') {
            return res.status(409).json({ message: "Valore già presente" });
        }
            res.status(500).json({ message: "Errore del server" });
    
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

export const deleteMyaccount = async (req, res) => {
    const userID = req.userId;
    const { password } = req.body ?? {};

    if (!password) {
        return res.status(400).json({ message: "La password è richiesta per eliminare l'account" });
    }

    try {
        await db.query("BEGIN");

        const userResult = await db.query(
            `SELECT password FROM users WHERE id = $1`,
            [userID]
        );
        if (userResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return res.status(404).json({ message: "Utente non trovato" });
        }

        const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].password);
        if (!isPasswordValid) {
            await db.query("ROLLBACK");
            return res.status(401).json({ message: "Password errata" });
        }

        const areBookings = await db.query(
            `SELECT 1 FROM bookings WHERE (mentee_id = $1 OR mentor_id = $1) AND status IN ('scheduled', 'in_progress') LIMIT 1`,
            [userID]
        );
        if (areBookings.rows.length > 0) {
            await db.query("ROLLBACK");
            return res.status(400).json({ message: "Non è possibile eliminare l'account con prenotazioni attive" });
        }

        await db.query(
            `DELETE FROM users WHERE id = $1`,
            [userID]
        );
        await db.query("COMMIT");

        res.json({ message: "Account eliminato con successo" });
    } catch (error) {
        await db.query("ROLLBACK");
        console.error("Errore durante l'eliminazione dell'account:", error);
        res.status(500).json({ message: "Errore del server durante l'eliminazione dell'account" });
    }
}