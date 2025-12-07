# MentorMatch Database

Database PostgreSQL completo per piattaforma di mentorship professionale.

## Panoramica

MentorMatch è un database progettato per gestire una piattaforma di mentorship che connette professionisti esperti (mentor) con persone in cerca di orientamento (mentee).

## Struttura Database

### Tabelle Principali

#### **Users** - Gestione utenti

- Profili completi (mentor/mentee/admin)
- Autenticazione e autorizzazione
- Dati professionali e preferenze
- Integrazioni (Stripe, Google Calendar, Zoom)
- Sistema di notifiche configurabile

#### **Mentor Profiles** - Profili mentor estesi

- Descrizioni dettagliate e stile di insegnamento
- Skills, certificazioni e achievement
- Statistiche performance (completion rate, response rate)
- Video introduttivi

#### **Sessions** - Gestione disponibilità

- Slot temporali con timezone
- Sessioni ricorrenti (RRULE format)
- Piattaforme meeting (Zoom, Google Meet, Teams)
- Pricing personalizzato

#### **Bookings** - Prenotazioni

- Workflow completo (pending → confirmed → completed/cancelled)
- Tracking partecipazione
- Gestione cancellazioni e follow-up
- Sistema reminder automatico

#### **Reviews** - Recensioni e rating

- Rating multi-dimensionale (overall, communication, expertise, helpfulness)
- Commenti verificati
- Risposte del mentor
- Sistema helpful votes

#### **Messages** - Messaggistica

- Conversazioni thread-based
- Attachments support
- Stati (read, starred, archived)
- Reply tracking

#### **Payments** - Gestione pagamenti

- Integrazione Stripe completa
- Commissioni piattaforma
- Refund e dispute management
- Payout tracking

### Tabelle Supporto

- **Categories & Skills** - Tassonomia competenze
- **Notifications** - Sistema notifiche multi-canale
- **Favorites** - Wishlist mentor
- **Packages** - Pacchetti sessioni multiple
- **Certificates & Education** - CV digitale
- **Work Experience** - Storia lavorativa
- **Coupons** - Sistema promozionale
- **Referrals** - Programma referral
- **Blog Posts** - Content management
- **Support Tickets** - Customer support
- **Audit Logs** - Tracciamento attività
- **User Metrics** - Analytics

## Features

### Funzionalità Core

**Autenticazione Multi-Ruolo**

- Mentor, Mentee, Admin
- Email verification
- KYC verification

**Sistema di Ricerca Avanzato**

- Full-text search (PostgreSQL tsvector)
- Filtri: settore, lingua, rating, prezzo, disponibilità
- Funzione stored: `search_mentors()`

**Gestione Sessioni**

- Slot temporali con timezone
- Ricorrenze automatiche
- Disponibilità templates
- Blocchi indisponibilità

**Payment Processing**

- Integrazione Stripe
- Fee splitting automatico
- Refund workflow
- Payout automation

**Sistema Notifiche**

- Multi-canale (email, SMS, push)
- Priorità configurabile
- Scadenza automatica
- Template-based

**Analytics & Metrics**

- Dashboard mentor/mentee
- Statistiche performance
- Metriche giornaliere
- Funzione stored: `get_user_dashboard_stats()`

### Automazioni (Triggers)

- **update_updated_at** - Timestamp automatico
- **update_mentor_rating** - Calcolo rating aggregato
- **notify_booking** - Notifiche prenotazioni
- **notify_message** - Alert nuovi messaggi
- **update_search_vector** - Indicizzazione full-text
- **update_session_count** - Contatore sessioni completate
- **update_package_remaining** - Gestione pacchetti

### Viste Ottimizzate

- **v_mentors_complete** - Mentor con statistiche aggregate
- **v_bookings_detailed** - Prenotazioni con join completi

## ER Diagram

Vedere `er-diagram.png` per la visualizzazione completa delle relazioni.

### Relazioni Chiave

```
users (1) ─→ (N) mentor_profiles
users (1) ─→ (N) sessions
users (1) ─→ (N) bookings (mentee)
users (1) ─→ (N) bookings (mentor)
sessions (1) ─→ (N) bookings
bookings (1) ─→ (1) payments
bookings (1) ─→ (N) reviews
users (M) ─→ (N) skills (user_skills)
```

## Setup

### Prerequisiti

- PostgreSQL 14+
- Estensioni richieste:
  - `uuid-ossp` - UUID generation
  - `pgcrypto` - Encryption
  - `pg_stat_statements` - Query stats
  - `pg_trgm` - Full-text search

### Struttura File

```
├── README.md             # Questo file
├── schema.sql            # Schema completo
├── seed.sql              # Dati test
└── er-diagram.png        # Diagramma ER
```

## Dati Test

### Credenziali Default

**Admin:**

- Email: `admin@mentormatch.com`
- Password: `password123`

**Mentor:**

- Email: `mario.rossi@mentor.com`
- Password: `password123`

**Mentee:**

- Email: `francesco.bruno@test.com`
- Password: `password123`

### Dati Precaricati

- 5 Mentor con profili completi
- 3 Mentee
- 6 Categorie principali
- 18 Skills
- 450+ Sessioni disponibili (30 giorni)
- FAQ e Coupon promozionali

## Performance

### Indici Ottimizzati

- 30+ indici B-tree strategici
- GIN index per full-text search
- Indici parziali per query comuni
- Covering indexes per join frequenti

### Query Ottimizzate

```sql
-- Ricerca mentor con disponibilità
SELECT * FROM search_mentors(
  p_search_text := 'javascript',
  p_sector := 'Sviluppo Software',
  p_min_rating := 4.0,
  p_has_availability := TRUE
);

-- Dashboard statistics
SELECT get_user_dashboard_stats(2);
```

## Sicurezza

- Password hashing (bcrypt recommended in application layer)
- UUID per esposizione pubblica
- Soft delete (deleted_at)
- Audit logging completo
- Rate limiting via application
- Input validation via CHECK constraints

## Convenzioni

### Naming

- **Tabelle**: plurale snake_case (`users`, `mentor_profiles`)
- **Colonne**: snake_case (`created_at`, `hourly_rate`)
- **Indici**: `idx_table_column`
- **Funzioni**: snake_case con prefisso (`update_mentor_rating`)
- **Trigger**: `table_action` (`users_updated`)

### Status Values

- **Bookings**: pending → confirmed → completed/cancelled/no_show
- **Payments**: pending → processing → completed/failed/refunded
- **Tickets**: open → in_progress → resolved → closed

### Monitoraggio

```sql
-- Query più lente
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Indici inutilizzati
SELECT * FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Dimensioni tabelle
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Supporto

Per domande o problemi, contattare il team di sviluppo.

---

**Versione Database:** 1.0.0  
**PostgreSQL Minimo:** 14.0  
**Ultimo Aggiornamento:** Dicembre 2024
