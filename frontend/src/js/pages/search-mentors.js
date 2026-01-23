document.addEventListener('DOMContentLoaded', async () => {
    const sectorInput = document.getElementById('sectorFilter');
    const suggestionList = document.getElementById('suggestionList');
    let allSectors = []; // Qui salveremo la lista dal server

    // --- 1. CARICAMENTO DATI INIZIALE ---
    try {
        // Supponendo che la tua API restituisca un array di stringhe: ["marketing", "design", "sviluppo"]
        allSectors = await ApiService.getAllSectors();
    } catch (error) {
        console.error("Impossibile caricare i settori per l'autocompletamento");
    }

    // --- 2. LOGICA DI FILTRAGGIO E ORDINAMENTO ---
    sectorInput.addEventListener('input', () => {
        const query = sectorInput.value.trim().toLowerCase();
        suggestionList.innerHTML = '';

        // Mostra suggerimenti solo dopo 2 caratteri
        if (query.length < 2) {
            suggestionList.classList.add('d-none');
            return;
        }

        // Filtra e Ordina
        const filtered = allSectors
            .filter(s => s.toLowerCase().includes(query))
            .sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const aStarts = aLower.startsWith(query);
                const bStarts = bLower.startsWith(query);

                if (aStarts && !bStarts) return -1; // 'a' va prima
                if (!aStarts && bStarts) return 1;  // 'b' va prima
                return aLower.localeCompare(bLower); // Ordine alfabetico per il resto
            });

        if (filtered.length > 0) {
            renderSuggestions(filtered, query);
            suggestionList.classList.remove('d-none');
        } else {
            suggestionList.classList.add('d-none');
        }
    });

    // --- 3. RENDERING E SELEZIONE ---
    function renderSuggestions(list, query) {
        list.forEach(sector => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action cursor-pointer py-2';
            li.style.cursor = 'pointer';

            // Evidenziamo la parte che combacia (opzionale ma bello)
            const regex = new RegExp(`(${query})`, 'gi');
            li.innerHTML = sector.replace(regex, '<strong>$1</strong>');

            li.addEventListener('click', () => {
                sectorInput.value = sector.toLowerCase();
                suggestionList.classList.add('d-none');
            });
            suggestionList.appendChild(li);
        });
    }

    // Chiudi la lista se clicchi fuori
    document.addEventListener('click', (e) => {
        if (!sectorInput.contains(e.target) && !suggestionList.contains(e.target)) {
            suggestionList.classList.add('d-none');
        }
    });
    const searchForm = document.getElementById('searchForm');
    const resultsContainer = document.getElementById('resultsContainer');

    // 1. Esegui una ricerca iniziale al caricamento (facoltativo, mostra tutti i mentor)
    performSearch();

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        performSearch();
    });

    async function performSearch() {
        // UI: Stato di caricamento
        resultsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Ricerca mentor in corso...</p>
            </div>
        `;

        // 2. Raccolta dati validati e normalizzati
        const filters = {
            sector: sectorInput.value.trim().toLowerCase() || null,
            max_hourly_rate: document.getElementById('costFilter').value || null,
            min_rating: parseFloat(document.getElementById('ratingFilter').value) || 0,
            session_start: document.getElementById('rangeStart').value || null,
            session_end: document.getElementById('rangeEnd').value || null,
            availability: Array.from(document.querySelectorAll('.time-checkbox:checked')).map(cb => cb.value)
        };

        try {
            // 3. Chiamata API (ApiService dovrà interrogare la funzione SQL search_mentors)
            const mentors = await ApiService.searchMentors(filters);

            // 4. Rendering dei risultati
            renderMentorList(mentors);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle text-danger display-4"></i>
                    <p class="mt-2">Si è verificato un errore durante la ricerca. Riprova più tardi.</p>
                </div>
            `;
        }
    }

    function renderMentorList(mentors) {
        resultsContainer.innerHTML = ''; // Pulisce lo spinner

        if (mentors.length === 0) {
            resultsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">Nessun mentor trovato con questi criteri. Prova a modificare i filtri.</p>
                </div>
            `;
            return;
        }

        // 5. Creazione dinamica delle Card
        mentors.forEach(mentor => {
            // Gestione fallback per l'avatar
            const avatar = mentor.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

            // Generazione stelle (HTML)
            const fullStars = Math.floor(mentor.rating || 0);
            const starsHtml = '<i class="bi bi-star-fill text-warning"></i>'.repeat(fullStars) +
                '<i class="bi bi-star text-muted"></i>'.repeat(5 - fullStars);

            const mentorCard = `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 mentor-card">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${avatar}" class="rounded-circle border me-3" width="60" height="60" style="object-fit: cover;">
                                <div>
                                    <h5 class="card-title mb-0 fw-bold">${mentor.name}</h5>
                                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle small">
                                        ${mentor.sector}
                                    </span>
                                </div>
                            </div>
                            
                            <p class="card-text text-secondary small mb-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                ${mentor.bio || 'Nessuna descrizione fornita.'}
                            </p>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="small">
                                    ${starsHtml}
                                    <span class="ms-1 text-muted">(${mentor.review_count})</span>
                                </div>
                                <div class="fw-bold text-success">
                                    ${parseFloat(mentor.hourly_rate).toFixed(2)}€/h
                                </div>
                            </div>
                        </div>
                        <div class="card-footer bg-transparent border-0 p-3 pt-0">
                            <a href="mentor-profile.html?id=${mentor.id}" class="btn btn-primary w-100 fw-bold">
                                Vedi Profilo
                            </a>
                        </div>
                    </div>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', mentorCard);
        });
    }
});