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
                throw new Error(errorData.message || 'Errore durante la registrazione ' + response);
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
                throw new Error(errorData.message || 'Errore durante il login ' + response);
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
                throw new Error(errorData.message || 'Errore durante il refresh del token ' + response);
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
            if (!response.ok) throw new Error(result.message || 'Errore aggiornamento ' + response);
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
            if (!response.ok) throw new Error('Errore nel recupero statistiche ' + response);
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL} / bookings / checkout`, {
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
            const response = await fetch(`${API_BASE_URL} / bookings / user_bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: null
            });
            if (!response.ok) throw new Error('Errore nel recupero prenotazioni ' + response);
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL} / bookings / cancel_booking`, {
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
            if (!response.ok) throw new Error('Impossibile annullare la prenotazione ' + response);
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
    //timestamp start_time, end_time,
    async createSession(sessionData) {
        try {
            const response = await fetch(`${API_BASE_URL} / sessions / createSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify(sessionData)
            });
            if (!response.ok) throw new Error('Errore nella creazione dello slot ' + response);
            return await response.json();//cod 1 session.id
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
            const response = await fetch(`${API_BASE_URL} / sessions / ${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                }
            });
            if (!response.ok) throw new Error('Impossibile eliminare lo slot ' + response);
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL} / messages / post_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + AuthService.getUser().token
                },
                body: JSON.stringify(messageData)
            });
            if (!response.ok) throw new Error('Errore invio messaggio ' + response);
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL} / messages /get_messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + AuthService.getUser().token
                },
                body: null
            });
            if (!response.ok) throw new Error('Errore nel recupero messaggi ' + response);
            return await response.json();
        } catch (error) {
            console.error("API Error (getMessages):", error);
            return [];
        }
    },

    /**
     * Segna un messaggio come letto (aggiorna 'read' e 'read_at')
     */
    async markMessageAsRead(otherUserId) {
        try {
            await fetch(`${API_BASE_URL} / messages / mark-as-read`, {
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
            const response = await fetch(`${API_BASE_URL} / messages / get_chat_history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "authorization": "Bearer " + AuthService.getUser().token
                },
                body: JSON.stringify({ other_user_id: otherUserId })
            });
            if (!response.ok) throw new Error('Errore nel recupero della chat history ' + response);
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL} / mentors / search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            if (!response.ok) throw new Error('Errore nel caricamento dei mentor ' + response);
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
            const response = await fetch(`${API_BASE_URL} / mentors / get-sector`);
            if (!response.ok) throw new Error('Errore caricamento settori ' + response);
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
            const response = await fetch(`${API_BASE_URL} / mentors / get-mentor / ${id}`);
            if (!response.ok) throw new Error('Profilo non trovato ' + response);
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
            const response = await fetch(`${API_BASE_URL} / sessions / mentor/ ${mentorId}`);
            if (!response.ok) throw new Error('Errore caricamento sessioni ' + response);
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
            const response = await fetch(`${API_BASE_URL} / mentors /reviews/${mentorId}`);
            if (!response.ok) throw new Error('Errore caricamento recensioni ' + response);
            return await response.json();
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
        const response = await fetch(`${API_BASE_URL} / bookings / details.php ? id = ${bookingId}`);
        if (!response.ok) throw new Error('Dettagli non trovati ' + response);
        return await response.json();
    },
    /**
    * ELIMINA ACCOUNT (Tabella 'users')
    * Nota: Grazie ai vincoli ON DELETE CASCADE nel tuo DB, 
    * l'eliminazione dell'utente rimuoverà automaticamente sessioni, messaggi e notifiche collegate.
    */
    async deleteAccount(confirmDeletePassword) {
        try {
            const response = await fetch(`${API_BASE_URL} / users / delete_account`, {
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
            if (!response.ok) throw new Error('Errore durante l\'invio della risposta della recensione ' + response);
            return await response.json();
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
            if (!response.ok) throw new Error('Errore durante l\'invio della recensione ' + response);
            return await response.json();
        } catch (error) {
            console.error("API Error (postReview):", error);
            throw error;
        }
    }
};