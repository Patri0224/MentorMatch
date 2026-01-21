const API_BASE_URL = '/api'; // Cambia con il tuo endpoint reale

const ApiService = {
    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante la registrazione');
            }

            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },
    async login(username, password) {
        //test api login
        console.log("API Login called with:", username, password);
        if (username === "admin" && password === "Password.24") {
            console.log("API Login successful for admin");
            return {
                user: { username: "admin", role: "mentors" },
                cod: 1
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il login');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);

            throw error;
        }
    },
    async refreshToken(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/refresh_token.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il refresh del token');
            }
            const data = await response.json();
            return data.cod;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },







    // --- GESTIONE PROFILO (Tabella 'users') ---

    /**
     * Aggiorna i dati dell'utente (bio, settore, tariffa, notifiche, ecc.)
     */
    async updateUser(userId, userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/update.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Se usi token JWT, aggiungilo qui:
                    // 'Authorization': `Bearer ${AuthService.getToken()}`
                },
                body: JSON.stringify({ id: userId, ...userData })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Errore aggiornamento');
            return result;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Ottiene le statistiche dell'utente (chiama la funzione SQL get_user_stats)
     */
    async getUserStats(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/stats.php?id=${userId}`);
            if (!response.ok) throw new Error('Errore nel recupero statistiche');
            return await response.json();
        } catch (error) {
            console.error("API Error (getStats):", error);
            return null;
        }
    },

    // --- GESTIONE PRENOTAZIONI (Tabelle 'bookings' + 'sessions') ---

    /**
     * Recupera la lista delle prenotazioni per Mentor o Mentee
     */
    async getUserBookings(userId, role) {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/list.php?user_id=${userId}&role=${role}`);
            if (!response.ok) throw new Error('Errore nel recupero prenotazioni');
            return await response.json();
        } catch (error) {
            console.error("API Error (getBookings):", error);
            throw error;
        }
    },

    /**
     * Annulla una prenotazione (aggiorna 'bookings' e libera 'sessions')
     */
    async cancelBooking(bookingId, reason, userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/cancel.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: bookingId,
                    reason: reason,
                    cancelled_by: userId
                })
            });
            if (!response.ok) throw new Error('Impossibile annullare la prenotazione');
            return await response.json();
        } catch (error) {
            console.error("API Error (cancelBooking):", error);
            throw error;
        }
    },

    // --- GESTIONE DISPONIBILITÀ (Tabella 'sessions') ---

    /**
     * Crea un nuovo slot di disponibilità (Solo Mentor)
     */
    async createSession(sessionData) {
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/create.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionData)
            });
            if (!response.ok) throw new Error('Errore nella creazione dello slot');
            return await response.json();
        } catch (error) {
            console.error("API Error (createSession):", error);
            throw error;
        }
    },

    /**
     * Elimina uno slot di disponibilità non ancora prenotato
     */
    async deleteSession(sessionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/delete.php?id=${sessionId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Impossibile eliminare lo slot');
            return await response.json();
        } catch (error) {
            console.error("API Error (deleteSession):", error);
            throw error;
        }
    },

    // --- MESSAGGISTICA (Tabella 'messages') ---

    /**
     * Recupera la conversazione o la lista messaggi dell'utente
     */
    async getMessages(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/list.php?user_id=${userId}`);
            if (!response.ok) throw new Error('Errore nel recupero messaggi');
            return await response.json();
        } catch (error) {
            console.error("API Error (getMessages):", error);
            return [];
        }
    },

    /**
     * Segna un messaggio come letto (aggiorna 'read' e 'read_at')
     */
    async markMessageAsRead(messageId) {
        try {
            await fetch(`${API_BASE_URL}/messages/read.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: messageId })
            });
        } catch (error) {
            console.error("API Error (readMessage):", error);
        }
    },
    /**
     * RICERCA MENTOR
     * Interroga la funzione SQL search_mentors()
     */
    async searchMentors(filters) {
        try {
            const response = await fetch(`${API_BASE_URL}/mentors/search.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            if (!response.ok) throw new Error('Errore nel caricamento dei mentor');
            return await response.json();
        } catch (error) {
            console.error("API Error (search):", error);
            throw error;
        }
    },

    /**
     * AUTOCOMPLETE SETTORI
     * Recupera tutti i settori distinti per l'input suggerito
     */
    async getAllSectors() {
        try {
            const response = await fetch(`${API_BASE_URL}/mentors/sectors.php`);
            if (!response.ok) throw new Error('Errore caricamento settori');
            return await response.json(); // Restituisce un array di stringhe
        } catch (error) {
            console.error("API Error (sectors):", error);
            return []; // Ritorna array vuoto per non rompere il JS
        }
    },

    /**
     * PROFILO PUBBLICO MENTOR
     * Recupera i dati dalla tabella 'users'
     */
    async getMentorById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/mentors/get_profile.php?id=${id}`);
            if (!response.ok) throw new Error('Profilo non trovato');
            return await response.json();
        } catch (error) {
            console.error("API Error (getMentor):", error);
            throw error;
        }
    },

    /**
     * SESSIONI DISPONIBILI
     * Tabella 'sessions' dove available = true
     */
    async getMentorSessions(mentorId) {
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/get_available.php?mentor_id=${mentorId}`);
            if (!response.ok) throw new Error('Errore caricamento sessioni');
            return await response.json();
        } catch (error) {
            console.error("API Error (sessions):", error);
            throw error;
        }
    },

    /**
     * RECENSIONI
     * Tabella 'reviews'
     */
    async getMentorReviews(mentorId) {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews/get_by_mentor.php?mentor_id=${mentorId}`);
            if (!response.ok) throw new Error('Errore caricamento recensioni');
            return await response.json();
        } catch (error) {
            console.error("API Error (reviews):", error);
            return [];
        }
    },

    /**
     * NUOVA PRENOTAZIONE
     * Scrive nella tabella 'bookings'
     */
    async createBooking(bookingData) {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/create.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Errore prenotazione');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (booking):", error);
            throw error;
        }
    },

    /**
     * INVIA MESSAGGIO
     * Scrive nella tabella 'messages'
     */
    async postMessage(messageData) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/send.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });
            if (!response.ok) throw new Error('Errore invio messaggio');
            return await response.json();
        } catch (error) {
            console.error("API Error (message):", error);
            throw error;
        }
    }
};

