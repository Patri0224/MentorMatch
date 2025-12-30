import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res) => {
  const { id, email, username, password, name, role } = req.body;

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salvare l'utente nel database (simulato qui)
    const newUser = await db.user.create({
      data: { id, email, username, password: hashedPassword, name, role }
    });


    res.status(201).json({ message: 'Utente registrato con successo', user: newUser });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

    // Recuperare l'utente dal database (simulato qui)
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Utente non trovato' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password non valida' });
    }
    // Generare un token JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login effettuato con successo ', token, user });
};