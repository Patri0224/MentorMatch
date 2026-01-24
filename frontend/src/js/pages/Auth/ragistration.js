
document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const alertContainer = document.getElementById('alertContainer');

    // Funzione helper per mostrare l'alert
    const showAlert = (message, type = 'danger') => {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impedisce il refresh e mantiene i dati nei campi

        alertContainer.innerHTML = '';
        const formData = new FormData(registrationForm);
        const data = Object.fromEntries(formData.entries());

        let errorMessages = [];

        // --- VALIDAZIONE ---
        if (data.name.trim().split(' ').length < 2) {
            errorMessages.push("Inserisci Nome e Cognome completi.");
            document.getElementById('nameInput').classList.add('is-invalid');
        }

        if (!isValidEmail(data.email)) {
            errorMessages.push("L'indirizzo email non è valido.");
            document.getElementById('emailInput').classList.add('is-invalid');
        }

        if (data.password.length < 8) {
            errorMessages.push("La password deve essere di almeno 8 caratteri.");
            document.getElementById('passwordInput').classList.add('is-invalid');
        }

        if (data.password !== data.confirm_password) {
            errorMessages.push("Le password inserite non corrispondono.");
            document.getElementById('confirmPasswordInput').classList.add('is-invalid');
        }

        if (data.role === 'mentor' && !data.sector) {
            errorMessages.push("Il settore professionale è obbligatorio per i Mentor.");
            document.getElementById('sectorInput').classList.add('is-invalid');
        }

        // Se ci sono errori, li mostriamo tutti nell'alert
        if (errorMessages.length > 0) {
            const list = `<ul class="mb-0">${errorMessages.map(msg => `<li>${msg}</li>`).join('')}</ul>`;
            showAlert(list);
            return;
        }

        // --- INVIO ---
        const submitBtn = registrationForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Invio in corso...';

        try {
            await ApiService.register({
                ...data,
                hourly_rate: data.role === 'mentor' ? parseFloat(data.hourly_rate) : 0,
                languages: ["italiano"]
            });
            showAlert("Registrazione completata! Reindirizzamento...", "success");
            setTimeout(() => window.location.href = 'login.html', 2000);
        } catch (error) {
            showAlert(error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Registrati";
        }
    });

    // Pulizia visiva mentre l'utente corregge i campi
    registrationForm.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('is-invalid'));
    });
});