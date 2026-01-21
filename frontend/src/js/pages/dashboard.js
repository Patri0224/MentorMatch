document.addEventListener('DOMContentLoaded', async () => {
    // 1. Controllo protezione pagina
    if (!AuthService.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const user = AuthService.getUser(); // Assumiamo contenga id, name, role, email
    renderRoleSpecificUI(user.role);
    await loadUserProfile(user.id);
    await loadBookings(user.id, user.role);

    // Gestore salvataggio profilo
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.querySelector('a[href="#messages"]').addEventListener('shown.bs.tab', loadConversations);
    // Gestore aggiunta sessione (se mentor)
    if (user.role === 'mentor') {
        document.getElementById('sessionForm').addEventListener('submit', handleAddSession);
        loadMentorSessions(user.id);
    }
});

/**
 * Mostra o nasconde parti della dashboard in base al ruolo
 */
function renderRoleSpecificUI(role) {
    if (role === 'mentor') {
        document.getElementById('navSessions').classList.remove('d-none');
        document.querySelectorAll('.mentor-only').forEach(el => el.classList.remove('d-none'));
    }
}

/**
 * Carica i dati dal DB e popola i campi input
 */
async function loadUserProfile(userId) {
    try {
        const data = await ApiService.getMentorById(userId); // Riutilizziamo la stessa funzione
        document.getElementById('editName').value = data.name;
        document.getElementById('editEmail').value = data.email;
        document.getElementById('editBio').value = data.bio || '';
        document.getElementById('editNotif').checked = data.email_notifications;

        if (data.role === 'mentor') {
            document.getElementById('editLanguage').value = (data.languages && data.languages.length > 0) ? data.languages.join(', ') : '';
            document.getElementById('editSector').value = data.sector || '';
            document.getElementById('editRate').value = data.hourly_rate;
            document.getElementById('meetingLink').value = data.mentor_meeting_url || '';
        }
    } catch (e) { console.error("Errore caricamento profilo", e); }
}


/**
 * Gestisce il salvataggio dei dati del profilo
 */
async function handleProfileUpdate(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // 1. Preparazione e Validazione Dati
    const payload = {
        name: data.name.trim(),
        bio: data.bio.trim(),
        email_notifications: document.getElementById('editNotif').checked
    };

    // Gestione Password (solo se inserita)
    if (data.password && data.password.length > 0) {
        if (data.password.length < 8) {
            alert("La nuova password deve essere di almeno 8 caratteri.");
            return;
        }
        payload.password = data.password;
    }

    // Gestione campi Mentor
    if (AuthService.getUser().role === 'mentor') {
        // Normalizzazione settore: tutto minuscolo come richiesto
        payload.sector = data.sector.trim().toLowerCase();
        payload.languages = data.language.split(',').map(lang => lang.trim().toLowerCase()).filter(lang => lang.length > 0);
        payload.mentor_meeting_url = data.meetingLink.trim();
        // Controllo tariffa
        const rate = parseFloat(data.hourly_rate);
        if (isNaN(rate) || rate < 0) {
            alert("Inserisci una tariffa oraria valida.");
            return;
        }
        payload.hourly_rate = rate;
    }

    // 2. Invio all'API
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';

    try {
        await ApiService.updateUser(AuthService.getUserId(), payload);

        // Feedback positivo
        alert("Profilo aggiornato con successo!");

        // Puliamo il campo password per sicurezza dopo il cambio
        document.getElementById('editPassword').value = '';

        // Opzionale: aggiorna i dati locali se necessario
        // AuthService.updateLocalUserData(payload);

    } catch (error) {
        alert("Errore durante l'aggiornamento: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Salva Modifiche";
    }
}

/**
 * Carica le prenotazioni dalle tabelle 'bookings' e 'sessions'
 */
/**
 * Carica le prenotazioni e genera i pulsanti azione dinamici
 */
/**
 * Versione aggiornata di loadBookings con gestione Pagamenti per Mentee
 */
async function loadBookings(userId, role) {
    const tableBody = document.getElementById('bookingsTableBody');
    try {
        // Recuperiamo le prenotazioni con informazioni sul pagamento incluse
        const bookings = await ApiService.getUserBookings(userId, role);

        tableBody.innerHTML = bookings.map(b => {
            const isPaid = b.payment_status === 'completed';
            const isMentor = role === 'mentor';
            const isConfirmed = b.status === 'confirmed';

            // Logica dei bottoni azione
            let actionButtons = '';

            if (isConfirmed) {
                if (isPaid) {
                    // Se pagato: Pulsante per entrare nella lezione
                    actionButtons = `
                        <a href="meeting.html?booking_id=${b.id}" class="btn btn-sm btn-success fw-bold">
                            <i class="bi bi-camera-video-fill me-1"></i> Entra
                        </a>`;
                } else if (!isMentor) {
                    // Se Mentee e NON pagato: Pulsante Paga Ora
                    actionButtons = `
                        <a href="checkout.html?booking_id=${b.id}" class="btn btn-sm btn-warning fw-bold">
                            <i class="bi bi-credit-card-fill me-1"></i> Paga Ora
                        </a>`;
                } else {
                    // Se Mentor e NON pagato: In attesa del Mentee
                    actionButtons = `<span class="badge bg-light text-muted border">In attesa di saldo</span>`;
                }
            }

            // Aggiungiamo sempre il tasto annulla se la lezione è nel futuro
            const isFuture = new Date(b.start_time) > new Date();
            const cancelButton = (isFuture && isConfirmed)
                ? `<button class="btn btn-sm btn-outline-danger" onclick="handleCancelBooking(${b.id})">Annulla</button>`
                : '';

            return `
                <tr>
                    <td>
                        <div class="fw-bold">${new Date(b.start_time).toLocaleDateString()}</div>
                        <div class="small text-muted">${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                        <strong>${isMentor ? b.mentee_name : b.mentor_name}</strong>
                        <div class="small text-muted">${b.sector || ''}</div>
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="badge ${getStatusBadge(b.status)}">${b.status}</span>
                            <span class="badge ${isPaid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} small">
                                ${isPaid ? 'PAGATO' : 'DA SALDARE'}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            ${actionButtons}
                            ${cancelButton}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="4">Errore nel caricamento.</td></tr>';
    }
}

/**
 * Helper per le classi CSS dei badge
 */
function getStatusBadge(status) {
    switch (status) {
        case 'confirmed': return 'bg-success-subtle text-success border border-success-subtle';
        case 'cancelled': return 'bg-danger-subtle text-danger border border-danger-subtle';
        case 'completed': return 'bg-primary-subtle text-primary border border-primary-subtle';
        default: return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    }
}

/**
 * Gestore cancellazione con conferma
 */
async function handleCancelBooking(bookingId) {
    const reason = prompt("Indica il motivo della cancellazione:");
    if (reason === null) return; // Utente ha cliccato annulla

    try {
        await ApiService.cancelBooking(bookingId, reason, AuthService.getUserId());
        alert("Prenotazione annullata.");
        location.reload();
    } catch (e) {
        alert("Errore: " + e.message);
    }
}
let activeChatUserId = null;



/**
 * Carica la lista degli utenti con cui c'è una conversazione attiva
 */
async function loadConversations() {
    const list = document.getElementById('conversationList');
    try {
        const conversations = await ApiService.getMessages(AuthService.getUserId());
        list.innerHTML = '';

        if (conversations.length === 0) {
            list.innerHTML = '<div class="p-3 text-center small text-muted">Nessun messaggio ancora.</div>';
            return;
        }

        conversations.forEach(conv => {
            const isUnread = !conv.read && conv.recipient_id === AuthService.getUserId();
            list.innerHTML += `
                <button onclick="openChat(${conv.other_user_id}, '${conv.other_user_name}')" 
                        class="list-group-item list-group-item-action border-0 py-3 ${activeChatUserId === conv.other_user_id ? 'active' : ''}">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1 fw-bold">${conv.other_user_name}</h6>
                        <small class="${isUnread ? 'text-primary' : 'text-muted'}">${new Date(conv.created_at).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-0 small text-truncate ${isUnread ? 'fw-bold text-dark' : 'text-muted'}">
                        ${conv.content}
                    </p>
                </button>
            `;
        });
    } catch (e) { list.innerHTML = '<div class="p-3 text-danger">Errore caricamento messaggi.</div>'; }
}

/**
 * Apre la chat specifica con un utente
 */
async function openChat(otherUserId, otherUserName) {
    activeChatUserId = otherUserId;

    // Aggiorna UI
    document.getElementById('chatHeader').innerHTML = `<h6 class="mb-0 fw-bold">${otherUserName}</h6>`;
    document.getElementById('chatForm').classList.remove('d-none');

    await refreshMessages();

    // Segna come letti
    await ApiService.markMessageAsRead(otherUserId);
}

/**
 * Carica i messaggi della conversazione attiva
 */
async function refreshMessages() {
    if (!activeChatUserId) return;
    const container = document.getElementById('chatMessages');

    try {
        const messages = await ApiService.getChatHistory(AuthService.getUserId(), activeChatUserId);
        container.innerHTML = messages.map(m => {
            const isMe = m.sender_id === AuthService.getUserId();
            return `
                <div class="d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'}">
                    <div class="p-2 rounded-3 shadow-sm" style="max-width: 75%; ${isMe ? 'background-color: #0d6efd; color: white;' : 'background-color: white;'}">
                        <div class="small">${m.content}</div>
                        <div class="text-end" style="font-size: 0.7rem; opacity: 0.8;">
                            ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) { console.error(e); }
}
/**
 * Gestisce l'eliminazione definitiva dell'account
 */
async function handleDeleteAccount() {
    // Prima conferma
    const firstCheck = confirm("ATTENZIONE: Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.");
    if (!firstCheck) return;

    // Seconda conferma (Protezione extra)
    const securityCheck = prompt("Per confermare l'eliminazione definitiva, scrivi 'ELIMINA' nel campo sottostante:");

    if (securityCheck !== 'ELIMINA') {
        alert("Operazione annullata: la parola di conferma non è corretta.");
        return;
    }

    try {
        const userId = AuthService.getUserId();

        // Chiamata API alla tabella 'users'
        await ApiService.deleteAccount(userId);

        alert("Il tuo account è stato eliminato con successo. Ci dispiace vederti andare via!");

        // Pulizia sessione e redirect alla Home
        AuthService.logout();
        window.location.href = 'index.html';

    } catch (error) {
        alert("Errore durante l'eliminazione dell'account: " + error.message);
    }
}
/**
 * Gestisce l'invio di un nuovo messaggio
 */
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content || !activeChatUserId) return;

    try {
        await ApiService.postMessage({
            sender_id: AuthService.getUserId(),
            recipient_id: activeChatUserId,
            content: content
        });
        input.value = '';
        await refreshMessages();
        await loadConversations(); // Aggiorna l'anteprima nella lista a sinistra
    } catch (e) { alert("Impossibile inviare il messaggio."); }
});