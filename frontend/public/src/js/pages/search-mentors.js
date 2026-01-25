document.addEventListener('DOMContentLoaded', async () => {
    const sectorInput = document.getElementById('sectorFilter');
    const suggestionList = document.getElementById('suggestionList');
    let allSectors = [];

    // --- 1. CARICAMENTO DATI INIZIALE ---
    try {
        const res = await ApiService.getAllSectors();
        
        // Trasformiamo l'array di oggetti [{sector: '...'}] in un array di stringhe ['...']
        const rawData = res.sectors || res;
        allSectors = rawData.map(item => typeof item === 'object' ? item.sector : item);
        
        console.log("Settori caricati e normalizzati:", allSectors); 
    } catch (error) {
        console.error("Errore caricamento settori:", error);
    }

    // --- 2. LOGICA AUTOCOMPLETE ---
    sectorInput.addEventListener('input', () => {
        const query = sectorInput.value.trim().toLowerCase();
        suggestionList.innerHTML = '';

        if (query.length < 2) {
            suggestionList.classList.add('d-none');
            return;
        }

        const filtered = allSectors
            .filter(s => s.toLowerCase().includes(query))
            .sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(query);
                const bStarts = b.toLowerCase().startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            });

        if (filtered.length > 0) {
            renderSuggestions(filtered, query);
            suggestionList.classList.remove('d-none');
        } else {
            suggestionList.classList.add('d-none');
        }
    });

    function renderSuggestions(list, query) {
        list.forEach(sector => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action cursor-pointer py-2';
            const regex = new RegExp(`(${query})`, 'gi');
            li.innerHTML = sector.replace(regex, '<strong>$1</strong>');

            li.addEventListener('click', () => {
                sectorInput.value = sector; // Rimosso toLowerCase() per mantenere formattazione DB
                suggestionList.classList.add('d-none');
                performSearch(); // Ricerca automatica al click
            });
            suggestionList.appendChild(li);
        });
    }

    // --- 3. RICERCA ---
    const searchForm = document.getElementById('searchForm');
    const resultsContainer = document.getElementById('resultsContainer');

    performSearch(); // Ricerca iniziale

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
    });

    async function performSearch() {
        resultsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
            </div>`;

        // Normalizzazione dati per il Controller listMentors
        const filters = {
            sector: sectorInput.value.trim() || null,
            language: document.getElementById('languageFilter')?.value || null, // Aggiunto
            max_hourly_rate: document.getElementById('costFilter').value || null,
            min_rating: document.getElementById('ratingFilter').value || 0,
            session_start: document.getElementById('rangeStart').value || null,
            session_end: document.getElementById('rangeEnd').value || null,
            // Prendiamo solo il primo valore selezionato per time_of_day
            time_of_day: document.querySelector('.time-checkbox:checked')?.value || null 
        };

        try {
            const mentors = await ApiService.searchMentors(filters);
            renderMentorList(mentors);
        } catch (error) {
            resultsContainer.innerHTML = `<div class="col-12 text-center py-5"><p class="text-danger">Errore di connessione.</p></div>`;
        }
    }

    function renderMentorList(mentors) {
        resultsContainer.innerHTML = '';

        if (mentors.length === 0) {
            resultsContainer.innerHTML = '<div class="col-12 text-center py-5"><p>Nessun mentor trovato.</p></div>';
            return;
        }

        mentors.forEach(mentor => {
            const avatar = mentor.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const rating = parseFloat(mentor.rating || 0);
            
            // Stelle dinamiche
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                starsHtml += `<i class="bi bi-star${i <= rating ? '-fill text-warning' : ' text-muted'}"></i>`;
            }

            const card = `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 shadow-sm border-0 mentor-card transition-all">
                        <div class="card-body">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${avatar}" class="rounded-circle border me-3" width="60" height="60">
                                <div>
                                    <h5 class="mb-0 fw-bold">${mentor.name}</h5>
                                    <span class="badge bg-primary-subtle text-primary small">${mentor.sector}</span>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="small">${starsHtml} <span class="text-muted">(${mentor.review_count || 0})</span></div>
                                <div class="fw-bold text-success">${parseFloat(mentor.hourly_rate).toFixed(2)}€/h</div>
                            </div>
                            <a href="mentor-profile.html?id=${mentor.id}" class="btn btn-outline-primary w-100">Vedi Profilo</a>
                        </div>
                    </div>
                </div>`;
            resultsContainer.insertAdjacentHTML('beforeend', card);
        });
    }

    // Chiusura automatica suggerimenti
    document.addEventListener('click', (e) => {
        if (!sectorInput.contains(e.target)) suggestionList.classList.add('d-none');
    });
});