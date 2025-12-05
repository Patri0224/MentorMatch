//nome della variabile in locale per salvare i dati utente
//Temporanea per test
const AUTH_KEY = "mentorMatch_user";

const AuthService = {
    // Login
    // Temporanea per test
    login: function (username) {
        const user = {
            username: username,
            role: 'student', // Possiamo espanderlo in futuro
            loginDate: new Date().toISOString()
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return true;
    },

    //Logout
    //Temporanea per test
    logout: function () {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = 'index.html'; // Rimanda alla home
    },

    // Recupero dati utente 
    //Temporanea per test
    getUser: function () {
        const userStr = localStorage.getItem(AUTH_KEY);
        if (!userStr) return null;
        return JSON.parse(userStr);
    },

    // Controllo utente loggato
    isLoggedIn: function () {
        return this.getUser() !== null;
    }
};

/*GESTIONE UI NAVBAR */
function updateNavbarUI() {
    const user = AuthService.getUser();
    const authButtonContainer = document.getElementById('auth-button-container');

    if (!authButtonContainer) return;

    if (user) {
        authButtonContainer.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-1"></i> ${user.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="dashboard.html">Dashboard</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="AuthService.logout()">Esci</a></li>
                </ul>
            </div>
        `;
    } else {
        authButtonContainer.innerHTML = `
            <a class="btn btn-light text-primary fw-bold" href="auth.html">Accedi / Registrati</a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', updateNavbarUI);