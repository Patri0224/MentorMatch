// Recupero l'ID del mentor dall'URL
const urlParams = new URLSearchParams(window.location.search);
const mentorId = urlParams.get('id');

// Al caricamento del DOM
document.addEventListener('DOMContentLoaded', async () => {
    if (!mentorId) {
        alert("Mentor non trovato.");
        window.location.href = 'search-mentors.html';
        return;
    }

    // 1. Caricamento dati iniziali
    await loadMentorData();
    await loadAvailableSessions();
    await loadReviews();

    // 2. Controllo permessi basato sull'autenticazione
    updateUIForAuth();
});

/**
 * Gestisce la visibilità degli elementi in base allo stato di login
 */
function updateUIForAuth() {
    const isLoggedIn = AuthService.isLoggedIn();

    // Elementi UI
    const btnOpenReview = document.getElementById('btnOpenReview');
    const btnOpenMessage = document.getElementById('btnOpenMessage');
    const authAlertBooking = document.getElementById('authAlertBooking');

    if (isLoggedIn) {
        // Utente loggato: mostra tasto recensione
        if (btnOpenReview) btnOpenReview.classList.remove('d-none');
    } else {
        // Utente NON loggato:
        // Mostra alert sopra le sessioni
        if (authAlertBooking) authAlertBooking.classList.remove('d-none');

        // Trasforma il tasto messaggio in un link al login
        if (btnOpenMessage) {
            btnOpenMessage.removeAttribute('data-bs-toggle');
            btnOpenMessage.removeAttribute('data-bs-target');
            btnOpenMessage.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Accedi per contattare';
            btnMessage.classList.replace('btn-primary', 'btn-outline-secondary');
            btnOpenMessage.addEventListener('click', () => {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            });
        }
    }
}

/**
 * Carica i dettagli del mentor dalla tabella 'users'
 */
async function loadMentorData() {
    try {
        const oggMentor = await ApiService.getMentorById(mentorId);
        const mentor = oggMentor.user;
        document.getElementById('mentorName').innerText = mentor.name;
        document.getElementById('mentorBio').innerText = mentor.bio || "Nessuna biografia disponibile.";
        document.getElementById('mentorSector').innerText = mentor.sector;
        document.getElementById('hourlyRate').innerText = `${parseFloat(mentor.hourly_rate).toFixed(2)}€`;
        document.getElementById('reviewCount').innerText = `(${mentor.review_count} recensioni)`;
        document.getElementById('mentorAvatar').src = mentor.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        // Generazione stelle rating
        const rating = Math.round(mentor.rating || 0);
        document.getElementById('ratingStars').innerHTML =
            '<i class="bi bi-star-fill text-warning"></i>'.repeat(rating) +
            '<i class="bi bi-star text-muted"></i>'.repeat(5 - rating);

        // Lingue (Array PostgreSQL)
        const langContainer = document.getElementById('mentorLanguages');
        langContainer.innerHTML = '';
        const languages = mentor.languages || ['italiano'];
        languages.forEach(lang => {
            langContainer.innerHTML += `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">${lang}</span>`;
        });

    } catch (e) {
        console.error("Errore caricamento mentor:", e);
    }
}

/**
 * Carica le sessioni disponibili dalla tabella 'sessions'
 */
async function loadAvailableSessions() {
    const list = document.getElementById('sessionsList');
    if (!list) return;

    try {
        // mentorId deve essere disponibile nello scope globale della pagina (es. dai query params)
        const response = await ApiService.getMentorSessions(mentorId);

        const sessions = response.sessions || [];

        // Filtriamo solo quelle effettivamente disponibili (available: true)
        const availableSlots = sessions.filter(s => s.available === true);

        if (availableSlots.length === 0) {
            list.innerHTML = `
                <div class="text-center p-4 border rounded bg-light">
                    <i class="bi bi-calendar-x text-muted fs-2"></i>
                    <p class="text-muted small mt-2 mb-0">Nessuno slot disponibile al momento.<br>Torna a trovarci presto!</p>
                </div>`;
            return;
        }

        // Generiamo l'HTML in un colpo solo
        list.innerHTML = availableSlots.map(session => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);

            // Formattazione stile "Google Calendar"
            const dateStr = start.toLocaleDateString('it-IT', {
                weekday: 'short',
                day: '2-digit',
                month: 'short'
            });
            const startTimeStr = start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 border-start-0 border-end-0">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <i class="bi bi-clock-fill text-primary me-2"></i>
                            <span class="fw-bold text-capitalize">${dateStr}</span>
                        </div>
                        <div class="text-dark small">
                            ${startTimeStr} — ${endTimeStr} 
                            <span class="text-muted ms-2">(${session.duration} min)</span>
                        </div>
                    </div>
                    <button onclick="bookSession(${session.id})" class="btn btn-primary btn-sm px-3 fw-bold shadow-sm">
                        Prenota
                    </button>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Errore loadAvailableSessions:", e);
        list.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center small" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Errore nel caricamento delle sessioni. Riprova più tardi.
            </div>`;
    }
}

/**
 * Carica le recensioni dalla tabella 'reviews'
 */
async function loadReviews() {
    const reviewsList = document.getElementById('reviewsList');
    try {
        const oggReviews = await ApiService.getMentorReviews(mentorId);
        const reviews = oggReviews.reviews || [];
        reviewsList.innerHTML = '';

        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-muted">Ancora nessuna recensione per questo mentor.</p>';
            return;
        }

        reviews.forEach(rev => {
            const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
            reviewsList.innerHTML += `
                <div class="mb-4 pb-3 border-bottom">
                    <div class="d-flex justify-content-between">
                        <span class="text-warning fw-bold">${stars}</span>
                        <small class="text-muted">${new Date(rev.created_at).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1 mt-2">"${rev.comment}"</p>
                    ${rev.response ? `<div class="ms-4 p-2 bg-light border-start border-primary small"><strong>Risposta del mentor:</strong> ${rev.response}</div>` : ''}
                </div>
            `;
        });
    } catch (e) {
        console.error("Errore recensioni:", e);
    }
}

/**
 * Azione: Prenota una sessione (Tabella 'bookings')
 */
async function bookSession(sessionId) {
    if (!AuthService.isLoggedIn()) {
        alert("Devi accedere per prenotare una lezione.");
        window.location.href = 'login.html';
        return;
    }

    if (!confirm("Confermi la prenotazione per questa sessione?")) return;

    try {
        await ApiService.createBooking({
            session_id: sessionId,
            mentor_id: mentorId,
            mentee_id: AuthService.getUserId(),
            note: "Prenotazione effettuata dal profilo pubblico"
        });
        alert("Prenotazione completata! Controlla la tua Dashboard.");
        location.reload();
    } catch (e) {
        alert("Errore durante la prenotazione: " + e.message);
    }
}

/**
 * Azione: Invia Messaggio Diretto (Tabella 'messages')
 */
async function sendMessage() {
    const content = document.getElementById('messageContent').value.trim();
    if (!content) return;

    try {
        await ApiService.postMessage({
            sender_id: AuthService.getUserId(),
            recipient_id: mentorId,
            content: content
        });
        alert("Messaggio inviato correttamente!");

        // Chiudi il modale
        const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        modal.hide();
        document.getElementById('messageContent').value = '';
    } catch (e) {
        alert("Impossibile inviare il messaggio.");
    }
}

/**
 * Azione: Pubblica Recensione (Tabella 'reviews')
 */
async function submitReview() {
    const rating = document.getElementById('newRating').value;
    const comment = document.getElementById('newComment').value.trim();

    if (!comment) {
        alert("Inserisci un commento per la recensione.");
        return;
    }

    try {
        const reviewData = {
            mentorId: mentorId,
            rating: parseInt(rating),
            comment: comment
        };
        await ApiService.postReview(reviewData);
        alert("Recensione pubblicata! Grazie per il tuo feedback.");
        location.reload();
    } catch (e) {
        alert("Errore nella pubblicazione della recensione.");
    }
}