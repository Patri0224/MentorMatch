import "dotenv/config";
import app from './app.js';
import db from '../src/db.js';
import { processEmailQueue } from '../src/email/email_worker.js';
import { generaEmailReminder } from './email/reminder_service.js';

app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

// Verifica la connessione al database all'avvio del server

db.query('SELECT 1')
  .then(() => console.log('Database connection successful'))
  .catch(err => console.error('Database connection error:', err));

console.log(process.env.DATABASE_URL);

const PORT = process.env.PORT || 3000;
setInterval(() => {
  processEmailQueue(10).catch(console.error);
  generaEmailReminder().catch(console.error);
}, 60000);


