# MentorMatch Backend – README

Backend del progetto **MentorMatch**, sviluppato con **Node.js + Express**, containerizzato con **Docker** e deployato in cloud tramite **Render** con pipeline **CI/CD**.

---

## Requisiti

Per eseguire il progetto in locale:

- **Node.js 18+**
- **npm**
- **Docker** (opzionale ma consigliato)
- Account **Render** (per il deploy cloud)

---

## Setup Locale (senza Docker)

### 1️ Clona il repository

```bash
git clone https://github.com/<tuo-username>/mentormatch.git
cd mentormatch/backend
```

### 2️ Installa le dipendenze

```bash
npm install
```

### 3️ Configura le variabili d’ambiente

Crea un file `.env` nella cartella `backend/`:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=your_database_url

STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

> Se Stripe non è configurato, il server non crasha, ma i webhook risponderanno con errore 503.

### 4️ Avvia il server

```bash
npm start
```

Server disponibile su:

http://localhost:3000

Health check:

http://localhost:3000/health

---

## Setup con Docker

### 1️ Build dell’immagine

Dalla root del progetto:

```bash
docker build -t mentor-match ./backend
```

### 2️ Avvio del container

```bash
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=development \
  -e DATABASE_URL=your_database_url \
  -e STRIPE_SECRET_KEY=your_key \
  -e STRIPE_WEBHOOK_SECRET=your_secret \
  mentor-match
```

App disponibile su:  
http://localhost:3000/health

---

## Health Check

Endpoint usato per monitoraggio e readiness:

GET /health

Risposta attesa:

ok

---

## Continuous Integration (GitHub Actions)

La pipeline CI si trova in:

.github/workflows/docker-ci.yml

Ad ogni push o pull request:

1. Build dell’immagine Docker
2. Avvio del container
3. Smoke test sull’endpoint `/health`

Se il server non risponde → la pipeline fallisce.

---

## Deploy Cloud su Render

### 1️ Crea un nuovo servizio

Su Render Dashboard:

- Service Type: Web Service
- Environment: Docker
- Root Directory: backend
- Branch: main

### 2️ Variabili d’ambiente da configurare

Nel pannello Environment di Render:

| Variabile             | Descrizione                               |
| --------------------- | ----------------------------------------- |
| NODE_ENV              | production                                |
| PORT                  | 3000 (Render la gestisce automaticamente) |
| DATABASE_URL          | URL del database                          |
| STRIPE_SECRET_KEY     | Chiave segreta Stripe                     |
| STRIPE_WEBHOOK_SECRET | Segreto webhook Stripe                    |

### 3️ Deploy automatico

Render è collegato a GitHub:

- Ogni push su main → nuovo deploy automatico
- Build → Start → Online senza intervento manuale

---

## Monitoraggio

Render fornisce:

- Log applicativi in tempo reale
- Storico dei deploy
- Stato del servizio
- Controllo tramite endpoint `/health`

---

## Scaling

L’app è pronta per lo scaling cloud:

- Verticale → più CPU/RAM
- Orizzontale → più istanze
- Health check usato per readiness delle istanze

---

## Stack Tecnologico

- Node.js
- Express
- Docker
- GitHub Actions (CI)
- Render (CD & Hosting)
- Stripe (pagamenti)

---

## Stato del progetto

✔ Containerizzato  
✔ CI attiva  
✔ Deploy automatico  
✔ Health monitoring  
✔ Cloud-ready
