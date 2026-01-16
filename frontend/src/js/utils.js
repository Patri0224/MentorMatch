//nome della variabile in locale per salvare i dati utente
//Temporanea per test
const AUTH_KEY = "mentorMatch_user";

const AuthService = {
    // Login
    // Temporanea per test
    login: function (username, password) {

        let ttl = 3600; // 1 ora in secondi

        const { user, cod } = AuthApi.login(username, password); // Chiamata all'API di login

        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        localStorage.setItem('lastLogin', new Date().toISOString());
        localStorage.setItem('ttl', ttl);
        return 1; // Login riuscito
    },

    //Logout
    //Temporanea per test
    logout: function () {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('lastLogin');
        localStorage.removeItem('ttl');
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
        if (!this.getUser()) return false;
        const lastLogin = new Date(localStorage.getItem('lastLogin'));
        const ttl = parseInt(localStorage.getItem('ttl'), 10) * 1000;
        if (new Date() - lastLogin < ttl) {
            const cod = AuthApi.refreshToken(this.getUser().username); // Chiamata all'API per refresh token
            if (cod == 1) {
                localStorage.setItem('lastLogin', new Date().toISOString());
            }
            return true;
        } else {
            this.logout();
            return false;
        }
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

function AuthIfNotAuthenticated() {
    if (!AuthService.isLoggedIn()) {
        window.location.href = 'auth.html';
    }
}
function HomepageIfAuthenticated() {
    if (AuthService.isLoggedIn()) {
        window.location.href = 'index.html';
    }
}