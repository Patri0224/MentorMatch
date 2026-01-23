import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header) {
            return res.status(401).json({ message: "Token mancante" });
        }

        const [type, token] = header.split(" ");
        if (type !== "Bearer" || !token) {
            return res.status(401).json({ message: "Formato token non valido" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;

        next();
    } catch (error) {
        console.error("Errore di autenticazione:", error);
        return res.status(403).json({ message: "Token non valido o scaduto" });
    }   
}