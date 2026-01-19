import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../src/db.js';

export const registerUser = async (req, res) => {
  const { id, email, password, name, role } = req.body;

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Utente già registrato' });

    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, email, hashedPassword, name, role]
    );

    res.status(201).json({ message: 'Utente registrato con successo', 
    user: result.rows[0] 
  });

  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1',
    [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Credenziali non valide' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Password errata' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login effettuato con successo', token });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};
