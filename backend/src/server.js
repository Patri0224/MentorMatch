import "dotenv/config";
import app from "./app.js";

import db from "./db.js";
import { processEmailQueue } from "./email/email_worker.js";
import { generaEmailReminder } from "./email/reminder_service.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

// Verifica DB all'avvio
db.query("SELECT 1")
  .then(() => console.log("Database connection successful"))
  .catch((err) => console.error("Database connection error:", err));

// Worker email (ogni 60s)
setInterval(() => {
  processEmailQueue(10).catch(console.error);
  generaEmailReminder().catch(console.error);
}, 60000);
