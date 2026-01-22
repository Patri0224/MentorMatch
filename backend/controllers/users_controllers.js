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