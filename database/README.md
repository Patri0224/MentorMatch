# MentorMatch Database

MentorMatch è una piattaforma per la gestione di sessioni di mentorship tra mentor e mentee. Il database PostgreSQL gestisce utenti, prenotazioni, pagamenti, notifiche, messaggi e recensioni.

## Requisiti

- PostgreSQL 12 o superiore

### Credenziali di Test

**Mentor:**

- Email: `mario.rossi@mentor.com`
- Password: `Password123`

**Mentee:**

- Email: `francesco.bruno@mentee.com`
- Password: `Password123`

## Struttura Database

### Tabelle Principali

#### users

Gestione utenti (mentor e mentee)

- **Campi chiave:** email, password, name, role, bio, sector, languages
- **Funzionalità:** rating automatico, gestione Stripe, notifiche email

#### sessions

Disponibilità temporali dei mentor

- **Campi chiave:** mentor_id, start_time, end_time, duration, available
- **Constraint:** end_time deve essere maggiore di start_time

#### bookings

Prenotazioni delle sessioni

- **Campi chiave:** session_id, mentor_id, mentee_id, status, note
- **Stati possibili:** confirmed, completed, cancelled

#### reviews

Recensioni dei mentee per i mentor

- **Campi chiave:** mentor_id, mentee_id, rating (1-5), comment
- **Trigger:** aggiorna automaticamente il rating del mentor

#### messages

Sistema di messaggistica interna

- **Campi chiave:** sender_id, recipient_id, content, read

#### notifications

Notifiche per gli utenti

- **Tipi:** new_booking, booking_confirmed, new_message, new_review

#### payments

Gestione pagamenti tramite Stripe

- **Stati:** pending, completed, failed, refunded

### Tabelle di Supporto

- **email_queue**: Coda per invio email asincrono
- **email_templates**: Template email con variabili dinamiche
- **task_queue**: Gestione task asincroni
- **daily_reports**: Report giornalieri automatici
- **system_logs**: Log di sistema con livelli
- **password_reset_tokens**: Token per reset password
- **email_verification_tokens**: Token per verifica email
- **schema_migrations**: Tracciamento migrazioni database

## Funzionalità Automatiche

### Trigger Attivi

1. **update_updated_at**: Aggiorna automaticamente `updated_at` su users, bookings, email_templates
2. **update_mentor_rating**: Ricalcola rating medio del mentor dopo ogni recensione
3. **notify_new_booking**: Crea notifiche per mentor e mentee alla creazione di una prenotazione
4. **notify_new_message**: Notifica il destinatario quando riceve un messaggio

### Funzioni Utility

#### get_user_stats(user_id)

Restituisce statistiche complete per un utente:

- Total bookings
- Completed sessions
- Upcoming sessions
- Total spent
- Average rating

```sql
SELECT * FROM get_user_stats(1);
```

#### search_mentors()

Ricerca mentor con filtri avanzati:

```sql
SELECT * FROM search_mentors(
    search_sector := 'Software',
    search_language := 'inglese',
    min_rating_param := 4.0,
    max_rate_param := 100.00
);
```

## Indici per Performance

Il database include indici ottimizzati per:

- Ricerca mentor per settore e rating
- Query su sessioni disponibili
- Conversazioni tra utenti (messaggi)
- Notifiche non lette
- Pagamenti per booking
- Code email e task in pending

## Dati di Test

Il database viene popolato con:

- **5 Mentor** con diversi settori (Software, Marketing, Data Science, Design, Product)
- **3 Mentee** interessati a varie aree
- **300 Sessioni** disponibili (30 giorni × 2 slot/giorno × 5 mentor)
- **5 Template Email** predefiniti

## Template Email Disponibili

1. `welcome` - Benvenuto nuovi utenti
2. `booking_confirmation` - Conferma prenotazione
3. `booking_reminder` - Promemoria sessione
4. `new_review` - Notifica nuova recensione
5. `new_message` - Notifica nuovo messaggio

## Sicurezza

- Le password sono hash (bcrypt consigliato)
- Token di reset/verifica con scadenza temporale
- Foreign keys con CASCADE per integrità referenziale
- Check constraints su stati e valori
- Indici su colonne sensibili per audit

## Sviluppo

### Aggiungere una Migrazione

```sql
INSERT INTO schema_migrations (version, name)
VALUES ('002', 'add_new_feature');
```

### Verificare Migrazioni Applicate

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

## Supporto

Per problemi o domande sul database, consultare la documentazione PostgreSQL ufficiale o contattare il team di sviluppo.

## Licenza

Proprietario - MentorMatch © 2024
