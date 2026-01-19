import "dotenv/config";
import app from './app.js';
import db from '../src/db.js';

db.query('SELECT 1')
  .then(() => console.log('Database connection successful'))
  .catch(err => console.error('Database connection error:', err));

console.log(process.env.DATABASE_URL);

const PORT = process.env.PORT || 3000;


