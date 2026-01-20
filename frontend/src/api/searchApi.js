const API_BASE_URL = '/api'; // Cambia con il tuo endpoint reale

const ApiService = {
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