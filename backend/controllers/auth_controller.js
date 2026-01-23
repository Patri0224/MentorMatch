import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../src/db.js';
import { enqueueEmail } from '../src/email/email_service.js';

export const registerUser = async (req, res) => {
  const { name, email, password, role, sector, bio, hourly_rate } = req.body;

  try {

    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Utente già registrato' });

    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const lastIdResult = await db.query('SELECT MAX(id) AS max_id FROM users');
    const result = await db.query(
      'INSERT INTO users (id, email, password, name, role, sector, bio, hourly_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [lastIdResult.rows[0].max_id + 1, email, hashedPassword, name, role, sector ?? null, bio ?? null, hourly_rate ?? null]
    );


    await enqueueEmail({
      type: 'welcome',
      recipient: result.rows[0].email,
      data: { name: result.rows[0].name }
    });
    res.status(201).json({
      message: 'Utente registrato con successo',
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

    res.status(200).json({
      message: 'Login effettuato con successo',
      cod: 1,
      id: user.id,
      name: user.name,
      role: user.role,
      token
    });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server', cod: 2 });
  }
};

export const refreshToken = (req, res) => {
  const { userId, token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userId !== userId) {
      return res.status(401).json({ message: 'Token non valido' });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token: newToken, cod: 1 });
  } catch (error) {
    console.error('Errore durante il refresh del token:', error);
    res.status(500).json({ message: 'Errore del server', cod: 2 });
  }
};
