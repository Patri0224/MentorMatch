const API_BASE_URL = 'https://mentormatch-5pg4.onrender.com/api'; // Cambia con il tuo endpoint reale

const ApiService = {
    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante la registrazione ' + JSON.stringify(errorData, null, 2));
            }

            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },
    async login(username, password) {
        //test api login
        /*
        if (username === "admin" && password === "Password.24") {
            console.log("API Login successful for admin");
            return {
                cod: 1,
                id: 1,
                name: "Admin User",
                role: "mentor",
                token: "dummy-token-admin"
            };
        }*/
        const email = username; // Considera username come email
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il login ' + JSON.stringify(errorData, null, 2));
            }
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);

            throw error;
        }
    },
    async refreshToken(userId, token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, token })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il refresh del token ' + JSON.stringify(errorData, null, 2));
            }
            console.log("API Token refreshed");
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },
    // --- GESTIONE PROFILO (Tabella 'users') ---

    /**
     * Aggiorna i dati dell'utente (bio, settore, tariffa, notifiche, ecc.)
     */
    async updateUser(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/update_profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify({ ...userData })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Errore aggiornamento ' + JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Ottiene le statistiche dell'utente (chiama la funzione SQL get_user_stats)
     */
    async getUserStats() {//total_bookings,completed_sessions,upcoming_sessions,total_spent,avg_rating
        try {
            const response = await fetch(`${API_BASE_URL}/users/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: null
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore nel recupero statistiche ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (getStats):", error);
            return null;
        }
    },

    // --- GESTIONE PRENOTAZIONI (Tabelle 'bookings' + 'sessions') ---
    /**
        * NUOVA PRENOTAZIONE
        * Scrive nella tabella 'bookings'
        */
    async prenoteBooking(bookingData) {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify(bookingData)//sessionId
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Errore prenotazione');
            }
            const result = await response.json();
            window.location.href = result.checkout_url;
        } catch (error) {
            console.error("API Error (booking):", error);
            throw error;
        }
    },
    /**
     * Recupera la lista delle prenotazioni per Mentor o Mentee
     */
    async getUserBookings() {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/user_bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: null
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore nel recupero prenotazioni ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (getBookings):", error);
            throw error;
        }
    },

    /**
     * Annulla una prenotazione (aggiorna 'bookings' e libera 'sessions') senza reso
     */
    async cancelBooking(bookingId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/bookings/cancel_booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify({
                    booking_id: bookingId,
                    reason: reason,
                    cancelled_by: AuthService.getUser().id
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Impossibile annullare la prenotazione ' + JSON.stringify(data, null, 2));
            return data
        } catch (error) {
            console.error("API Error (cancelBooking):", error);
            throw error;
        }
    },

    // --- GESTIONE DISPONIBILITÀ (Tabella 'sessions') ---

    /**
     * Crea un nuovo slot di disponibilità (Solo Mentor)
     */
    //timestamp start_time, end_time,
    async createSession(sessionData) {
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/createSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify(sessionData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore nella creazione dello slot ' + JSON.stringify(data, null, 2));
            return data;//cod 1 session.id
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
            const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Impossibile eliminare lo slot ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (deleteSession):", error);
            throw error;
        }
    },

    // --- MESSAGGISTICA (Tabella 'messages') ---
    /**
         * INVIA MESSAGGIO
         * Scrive nella tabella 'messages'
         */
    async postMessage(messageData) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/post-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify(messageData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore invio messaggio ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (message):", error);
            throw error;
        }
    },
    /**
     * Recupera la conversazione o la lista messaggi dell'utente
     */

    async getMessages() {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/get-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                },
                body: null
            });

            // 1. Controlliamo se la risposta è effettivamente JSON
            const contentType = response.headers.get("content-type");

            if (!response.ok) {
                // Se non è OK, proviamo a leggere l'errore solo se è JSON
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(`Errore ${response.status}: ${JSON.stringify(errorData)}`);
                } else {
                    // Se il server ha mandato HTML (es. 404 di Render), leggiamolo come testo
                    const errorText = await response.text();
                    console.error("Il server ha risposto con HTML invece di JSON. Controlla la rotta!");
                    throw new Error(`Errore severo ${response.status}. Controlla la console Network.`);
                }
            }

            // 2. Se siamo qui, la risposta è 200 OK
            return await response.json();

        } catch (error) {
            console.error("API Error (getMessages):", error.message);
            return []; // Evita di rompere il frontend se i messaggi mancano
        }
    },

    /**
     * Segna un messaggio come letto (aggiorna 'read' e 'read_at')
     */
    async markMessageAsRead(otherUserId) {
        try {
            await fetch(`${API_BASE_URL}/messages/mark-as-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify({ other_user_id: otherUserId })
            });
        } catch (error) {
            console.error("API Error (readMessage):", error);
        }
    },
    /**
     * prende tutti i messaggi tra due utenti
     */
    async getChatHistory(otherUserId) {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/get-chat-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify({ other_user_id: otherUserId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore nel recupero della chat history ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (getChatHistory):", error);
            return [];
        }
    },
    /**
     * RICERCA MENTOR
     * Interroga la funzione SQL search_mentors()
     */
    async searchMentors(filters) {
        try {
            const url = `${API_BASE_URL}/mentors/search`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(filters)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Errore nel caricamento dei mentor ' + JSON.stringify(data, null, 2));
            }

            return data;
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
            const response = await fetch(`${API_BASE_URL}/mentors/get-sector`);
            const data = await response.json();

            if (!response.ok) throw new Error('Errore caricamento settori ' + JSON.stringify(data, null, 2));
            return data; // Restituisce un array di stringhe
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
            const response = await fetch(`${API_BASE_URL}/mentors/get-mentor/${id}`);
            const data = await response.json();
            if (!response.ok) throw new Error('Profilo non trovato ' + JSON.stringify(data, null, 2));
            return data;
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
            const response = await fetch(`${API_BASE_URL}/sessions/mentor/${mentorId}`);
            const data = await response.json();
            if (!response.ok) throw new Error('Errore caricamento sessioni ' + JSON.stringify(data, null, 2));
            return data;
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
            const response = await fetch(`${API_BASE_URL}/mentors/reviews/${mentorId}`);
            const data = await response.json();
            if (!response.ok)
                throw new Error('Errore caricamento recensioni ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (reviews):", error);
            return [];
        }
    },




    /**
     * inutile
     * DETTAGLI PRENOTAZIONE
     * Recupera i dettagli completi di una prenotazione
     * (inclusi dati sessione e utente)
     */
    async getBookingDetails(bookingId) {
        const response = await fetch(`${API_BASE_URL}/bookings/details.php?id=${bookingId}`);
        const data = await response.json();
        if (!response.ok) throw new Error('Dettagli non trovati ' + JSON.stringify(data, null, 2));
        return data;
    },
    /**
    * ELIMINA ACCOUNT (Tabella 'users')
    * Nota: Grazie ai vincoli ON DELETE CASCADE nel tuo DB, 
    * l'eliminazione dell'utente rimuoverà automaticamente sessioni, messaggi e notifiche collegate.
    */
    async deleteAccount(confirmDeletePassword) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/delete_account`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify({ confirmDeletePassword })
            });

            if (!response.ok) {
                const result = await response.json();

                throw new Error(result.message || 'Impossibile eliminare l\'account');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (deleteAccount):", error);
            throw error;
        }
    },
    /**
     * Aggiorna la risposta di una recensione (Tabella 'reviews')
     */
    async updateReviewResponse(reviewId, responseText) {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify({ reviewId, response: responseText })
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore durante l\'invio della risposta della recensione ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (postResponseReview):", error);
            throw error;
        }
    },
    /**
     * Pubblica una nuova recensione per un mentor (Tabella 'reviews')
     */
    async postReview(reviewData) {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews/post_review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify(reviewData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Errore durante l\'invio della recensione ' + JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error("API Error (postReview):", error);
            throw error;
        }
    }
};