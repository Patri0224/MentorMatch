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
    const currentHash = window.location.hash;
    if (currentHash) {
        // Cerchiamo il link nel menu laterale che corrisponde all'hash
        const activeTabTriggerEl = document.querySelector(`#dashboardNav a[href="${currentHash}"]`);
        if (activeTabTriggerEl) {
            // Usiamo l'API di Bootstrap per mostrare il tab
            const tab = new bootstrap.Tab(activeTabTriggerEl);
            tab.show();
        }
    }
    document.getElementById('editAvatar').addEventListener('input', (e) => {
        const newUrl = e.target.value.trim();
        const preview = document.getElementById('profileAvatar');

        // Se il campo è vuoto, usa l'avatar di default
        preview.src = newUrl || 'assets/default-avatar.png';
    });
    // 2. Ascolta il cambio di tab per aggiornare l'URL
    const tabEls = document.querySelectorAll('#dashboardNav a[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', (event) => {
            // Aggiorna l'hash nell'URL senza ricaricare la pagina
            window.location.hash = event.target.getAttribute('href');
        });
    });
});

/**
 * Mostra o nasconde parti della dashboard in base al ruolo
 */
function renderRoleSpecificUI(role) {
    if (role === 'mentor') {
        document.getElementById('navSessions').classList.remove('d-none');
        document.getElementById('navReviews').classList.remove('d-none'); // AGGIUNTO
        document.querySelectorAll('.mentor-only').forEach(el => el.classList.remove('d-none'));
    }
}

/**
 * Carica i dati dal DB e popola i campi input
 */
async function loadUserProfile(userId) {
    try {
        const data = await ApiService.getMentorById(userId); // Riutilizziamo la stessa funzione
        document.getElementById('editName').value = data.user.name;
        document.getElementById('editEmail').value = data.user.email;
        document.getElementById('editBio').value = data.user.bio || '';
        document.getElementById('editNotif').checked = data.user.email_notifications;
        document.getElementById('editAvatar').value = data.user.avatar_url || '';
        document.getElementById('profileAvatar').src = data.user.avatar_url || 'assets/default-avatar.png';
        if (data.user.role === 'mentor') {
            document.getElementById('editLanguage').value = (data.user.languages && data.user.languages.length > 0) ? data.user.languages.join(', ') : '';
            document.getElementById('editSector').value = data.user.sector || '';
            document.getElementById('editRate').value = data.user.hourly_rate;
            document.getElementById('editMeetingUrl').value = data.user.meeting_url || '';
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

    // Otteniamo i dati attuali dell'utente per il confronto
    const currentUser = AuthService.getUser();
    const payload = {};
    let hasChanges = false;

    // Funzione helper per aggiungere al payload solo se il valore è cambiato
    const addIfChanged = (key, newValue, oldValue) => {
        // Gestione specifica per null/undefined per evitare falsi positivi
        const normalizedNew = newValue === "" ? null : newValue;
        const normalizedOld = oldValue === "" ? null : oldValue;

        if (normalizedNew !== normalizedOld) {
            payload[key] = newValue;
            hasChanges = true;
        }
    };

    // --- 1. CONFRONTO CAMPI COMUNI ---
    addIfChanged('name', data.name.trim(), currentUser.name);
    addIfChanged('bio', data.bio.trim(), currentUser.bio);
    addIfChanged('avatar_url', data.avatar_url.trim(), currentUser.avatar_url);
    const notifChecked = document.getElementById('editNotif').checked;
    addIfChanged('email_notifications', notifChecked, currentUser.email_notifications);

    // --- 2. GESTIONE PASSWORD (Solo se scritta e valida) ---
    if (data.password && data.password.length >= 8 && data.password === data.confirmPassword) {
        payload.password = data.password;
        hasChanges = true;
    } else if (data.password && data.password.length > 0) {
        alert("La nuova password deve essere di almeno 8 caratteri.");
        return;
    }

    // --- 3. GESTIONE CAMPI MENTOR ---
    if (currentUser.role === 'mentor') {
        // Settore
        const newSector = data.sector.trim().toLowerCase();
        addIfChanged('sector', newSector, currentUser.sector);

        // Lingue (Confronto tra array)
        const newLangs = data.language.split(',')
            .map(lang => lang.trim().toLowerCase())
            .filter(lang => lang.length > 0);

        // Confrontiamo gli array trasformandoli in stringhe JSON
        if (JSON.stringify(newLangs.sort()) !== JSON.stringify([...(currentUser.languages || [])].sort())) {
            payload.languages = newLangs;
            hasChanges = true;
        }

        // Meeting URL
        addIfChanged('meeting_url', data.meeting_url, currentUser.meeting_url);

        // Tariffa Oraria
        const newRate = parseFloat(data.hourly_rate);
        if (!isNaN(newRate) && newRate >= 0) {
            addIfChanged('hourly_rate', newRate, parseFloat(currentUser.hourly_rate));
        }
    }

    // --- 4. INVIO ALL'API ---
    if (!hasChanges) {
        alert("Nessuna modifica rilevata.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';

    try {
        // Inviamo il payload "snello" (solo i campi cambiati + userId)
        const result = await ApiService.updateUser(payload);
        debugger;
        // Se il server risponde con il nuovo oggetto utente aggiornato
        if (result.user) {
            debugger;
            // Aggiorniamo il localStorage con i dati uniti (vecchi + nuovi)
            const updatedUser = { ...currentUser, ...result.user };
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
        }

        alert("Profilo aggiornato con successo!");
        document.getElementById('editPassword').value = '';

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
    if (!tableBody) return;

    try {
        // Passiamo userId e role all'API per filtrare correttamente lato server
        const oggBookings = await ApiService.getUserBookings();
        const bookings = oggBookings.booking || [];

        if (bookings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nessuna prenotazione trovata.</td></tr>';
            return;
        }

        tableBody.innerHTML = bookings.map(b => {
            // 1. Gestione Stato Pagamento 
            // (Nota: se nel DB non hai 'payment_status', lo stato 'confirmed' implica che la lezione è valida)
            const isPaid = b.payment_status === 'completed';
            const isMentor = role === 'mentor';
            const isConfirmed = b.status === 'confirmed';

            // 2. Logica dei bottoni azione
            let actionButtons = '';

            if (isConfirmed) {
                // Se la lezione è confermata e abbiamo un meeting_url (presente nella tua tabella)
                if (b.meeting_url && (isPaid)) {
                    actionButtons = `
                        <a href="${b.meeting_url}" target="_blank" class="btn btn-sm btn-success fw-bold">
                            <i class="bi bi-camera-video-fill me-1"></i> Entra
                        </a>`;
                } else if (!isMentor && !isPaid) {
                    // Se Mentee deve ancora pagare (assumendo che la conferma dipenda dal pagamento)
                    actionButtons = `
                        <a href="checkout.html?booking_id=${b.id}" class="btn btn-sm btn-warning fw-bold">
                            <i class="bi bi-credit-card-fill me-1"></i> Paga Ora
                        </a>`;
                }
            }

            // 3. Logica Annullamento
            // Verifichiamo se la data della sessione (start_time) è nel futuro
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
                        <div class="small text-muted text-truncate" style="max-width: 150px;" title="${b.note || ''}">
                            ${b.note || 'Nessuna nota'}
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="badge ${getStatusBadge(b.status)}">${b.status.toUpperCase()}</span>
                            ${!isPaid ? '<span class="badge bg-warning-subtle text-warning border border-warning-subtle small">DA SALDARE</span>' : ''}
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
        console.error("Errore caricamento bookings:", e);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Errore nel caricamento delle prenotazioni.</td></tr>';
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
        await ApiService.cancelBooking(bookingId, reason);
        location.reload();
    } catch (e) {
        alert("Errore: " + e.message);
    }
}
let activeChatUserId = null;

/**
 * Carica gli slot di disponibilità creati dal mentor
 */
async function loadMentorSessions(mentorId) {
    const list = document.getElementById('mentorSessionsList');
    try {
        const oggSessions = await ApiService.getMentorSessions(mentorId);
        const sessions = oggSessions.sessions || [];
        list.innerHTML = sessions.map(s => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${new Date(s.start_time).toLocaleDateString()}</span> 
                    dalle ${new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    alle ${new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteSession(${s.id})" >
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<p class="text-danger">Errore caricamento sessioni.</p>'; }
}

/**
 * Aggiunge un nuovo slot (Tabella 'sessions')
 */
async function handleAddSession(e) {
    e.preventDefault();
    const start = document.getElementById('sessionStart').value;
    const end = document.getElementById('sessionEnd').value;

    if (new Date(start) >= new Date(end)) {
        alert("L'orario di fine deve essere successivo a quello di inizio.");
        return;
    }

    try {
        await ApiService.createSession({
            mentor_id: AuthService.getUser().id,
            start_time: start,
            end_time: end,
            duration: Math.round((new Date(end) - new Date(start)) / 60000)
        });
        alert("Slot aggiunto!");
        loadMentorSessions(AuthService.getUser().id);
    } catch (e) { alert("Errore: " + e.message); }
}
/*
* Elimina uno slot di disponibilità
*/
async function handleDeleteSession(sessionId) {
    const confirmDelete = confirm("Sei sicuro di voler eliminare questo slot? Tutte le prenotazioni associate verranno annullate.");
    if (!confirmDelete) return;
    try {
        await ApiService.deleteSession(sessionId);
        loadMentorSessions(AuthService.getUser().id);
    } catch (e) { alert("Errore: " + e.message); }
}

/**
 * Carica la lista degli utenti con cui c'è una conversazione attiva
 */
async function loadConversations() {
    const list = document.getElementById('conversationList');
    try {
        const conversations = await ApiService.getMessages();
        list.innerHTML = '';

        if (conversations.length === 0) {
            list.innerHTML = '<div class="p-3 text-center small text-muted">Nessun messaggio ancora.</div>';
            return;
        }

        conversations.forEach(conv => {
            const isUnread = !conv.read && conv.recipient_id === AuthService.getUser().id;
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
    } catch (e) { list.innerHTML = `<div class="p-3 text-danger">Errore caricamento messaggi.${e.message}</div>`; }
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
 * Carica la cronologia dei messaggi tra l'utente loggato e quello attivo
 */
async function refreshMessages() {
    if (!activeChatUserId) return;
    const container = document.getElementById('chatMessages');
    const myId = AuthService.getUser().id;

    try {
        // Recuperiamo i messaggi tramite API
        const oggMessages = await ApiService.getChatHistory(activeChatUserId);
        const messages = oggMessages.messages || [];
        container.innerHTML = messages.map(m => {
            const isMe = m.sender_id === myId;

            // Icona di lettura: doppia spunta blu se letto, grigia se solo inviato
            // Appare solo per i messaggi che hai inviato tu
            const readStatusIcon = (isMe && m.read)
                ? '<i class="bi bi-check2-all text-info ms-1"></i>'
                : (isMe ? '<i class="bi bi-check2 ms-1"></i>' : '');

            return `
                <div class="d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-2">
                    <div class="p-2 rounded-3 shadow-sm border" 
                         style="max-width: 75%; ${isMe ? 'background-color: #0d6efd; color: white;' : 'background-color: var(--bs-secondary-bg);'}">
                        
                        <div class="small">${m.content}</div>
                        
                        <div class="text-end mt-1" style="font-size: 0.65rem; opacity: 0.8;">
                            ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            ${readStatusIcon}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll automatico verso il basso per vedere l'ultimo messaggio
        container.scrollTop = container.scrollHeight;

    } catch (e) {
        console.error("Errore nel refresh della chat:", e);
        container.innerHTML = '<div class="text-center p-3 text-danger">Impossibile caricare i messaggi.</div>';
    }
}
/**
 * Gestisce l'eliminazione definitiva dell'account
 */
async function handleDeleteAccount() {
    // Prima conferma
    const firstCheck = confirm("ATTENZIONE: Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.");
    if (!firstCheck) return;

    // Seconda conferma (Protezione extra)
    const securityCheck = prompt("Per confermare l'eliminazione definitiva, immetti la tua password nel campo sottostante:");



    try {
        // Chiamata API alla tabella 'users'
        const response = await ApiService.deleteAccount(securityCheck);

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
            recipientId: activeChatUserId,
            content: content
        });
        input.value = '';
        await refreshMessages();
        await loadConversations(); // Aggiorna l'anteprima nella lista a sinistra
    } catch (e) { alert("Impossibile inviare il messaggio."); }
});
let calendar = null;

// Ascolta l'apertura del tab Calendario
document.querySelector('a[href="#calendarTab"]').addEventListener('shown.bs.tab', function () {
    if (!calendar) {
        initCalendar();
    } else {
        calendar.render(); // Re-render per aggiustare le dimensioni
    }
});

async function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const user = AuthService.getUser();

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // Vista settimanale con orari
        locale: 'it',
        slotMinTime: '08:00:00', // Orario inizio visibile
        slotMaxTime: '22:00:00', // Orario fine visibile
        allDaySlot: false,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
        },
        // ... dentro initCalendar ...
        events: async function (info, successCallback, failureCallback) {
            try {
                const events = [];
                const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

                // Caricamento Bookings
                const o9bookings = await ApiService.getUserBookings(user.id, user.role);
                const bookings = o9bookings.booking || [];
                bookings.forEach(b => {
                    events.push({
                        title: user.role === 'mentor' ? `Con: ${b.mentee_name}` : `Mentor: ${b.mentor_name}`,
                        start: b.start_time,
                        end: b.end_time,
                        // Usiamo tinte leggermente diverse se siamo in Dark Mode per leggibilità
                        backgroundColor: isDark ? '#1a73e8' : '#0d6efd',
                        borderColor: isDark ? '#1a73e8' : '#0d6efd',
                        textColor: '#ffffff',
                        extendedProps: { type: 'booking' }
                    });
                });

                // Caricamento Sessioni (Slot Liberi)
                if (user.role === 'mentor') {
                    const osessions = await ApiService.getMentorSessions(user.id);
                    const sessions = osessions.sessions || [];
                    sessions.forEach(s => {
                        events.push({
                            title: 'Slot Disponibile',
                            start: s.start_time,
                            end: s.end_time,
                            backgroundColor: isDark ? '#1e7e34' : '#198754',
                            borderColor: isDark ? '#1e7e34' : '#198754',
                            textColor: '#ffffff',
                            extendedProps: { type: 'session' }
                        });
                    });
                }
                successCallback(events);
            } catch (error) { failureCallback(error); }
        },
        eventClick: function (info) {
            // Reindirizza alle pagine di modifica che hai già
            const type = info.event.extendedProps.type;
            if (type === 'booking') {
                document.querySelector('a[href="#bookings"]').click();
            } else {
                document.querySelector('a[href="#sessions"]').click();
            }
        }
    });

    calendar.render();
}
/**
 * Carica e visualizza i feedback nel container
 */
async function loadMentorReviews(mentorId) {
    const container = document.getElementById('mentorReviewsContainer');
    try {
        const oreviews = await ApiService.getMentorReviews(mentorId);
        const reviews = oreviews.reviews || [];
        container.innerHTML = '';
        if (reviews.length === 0) {
            container.innerHTML = '<p class="text-muted">Non hai ancora ricevuto recensioni.</p>';
            return;
        }

        container.innerHTML = reviews.map(rev => `
            <div class="card mb-3 border-0 bg-body-tertiary shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0">${rev.mentee_name}</h6>
                        <div class="text-warning">
                            ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
                        </div>
                    </div>
                    <p class="mb-2 small">"${rev.comment}"</p>
                    <small class="text-muted d-block mb-3">${new Date(rev.created_at).toLocaleDateString()}</small>

                    <div id="response-section-${rev.id}">
                        ${rev.response ? `
                            <div class="p-3 bg-primary bg-opacity-10 border-start border-primary border-4 rounded-end">
                                <small class="fw-bold d-block text-primary mb-1">La tua risposta:</small>
                                <p class="mb-0 small">${rev.response}</p>
                            </div>
                        ` : `
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control" placeholder="Scrivi una risposta..." id="input-res-${rev.id}">
                                <button class="btn btn-outline-primary" onclick="submitReviewResponse(${rev.id})">Rispondi</button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}
document.querySelector('a[href="#reviews"]').addEventListener('shown.bs.tab', () => {
    loadMentorReviews(AuthService.getUser().id);
});
/**
 * Invia la risposta del mentor al server
 */
async function submitReviewResponse(reviewId) {
    const input = document.getElementById(`input-res-${reviewId}`);
    const responseText = input.value.trim();

    if (!responseText) return;

    try {
        const result = await ApiService.updateReviewResponse(reviewId, responseText);
        if (result.cod === 1) {
            alert("Risposta salvata!");
            loadMentorReviews(AuthService.getUserId()); // Refresh
        }
    } catch (e) { alert("Errore nel salvataggio."); }
}