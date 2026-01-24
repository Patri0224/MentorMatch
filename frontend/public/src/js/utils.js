//nome della variabile in locale per salvare i dati utente
//Temporanea per test
const AUTH_KEY = "mentorMatch_user";
var temp = null;
const AuthService = {

    // Login
    // Temporanea per test
    login: async function (username, password) {
        temp = Date.now();
        let ttl = 3600; // 1 ora in secondi

        const { cod, id, name, role, token } = await ApiService.login(username, password); // Chiamata all'API di login

        if (cod != 1) {
            return cod; // Login fallito
        }
        const user = { id, name, role, token };
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        localStorage.setItem('token', token);
        localStorage.setItem('lastLogin', new Date().toISOString());
        localStorage.setItem('ttl', ttl);
        return 1; // Login riuscito
    },

    //Logout
    logout: function () {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('lastLogin');
        localStorage.removeItem('ttl');
        localStorage.removeItem('token');
        window.location.href = 'index.html'; // Rimanda alla home
    },

    // Recupero dati utente
    getUser: function () {
        const userStr = localStorage.getItem(AUTH_KEY);
        const token = localStorage.getItem('token');
        if (!userStr) return null;
        if (token) {
            const userObj = JSON.parse(userStr);
            userObj.token = token;
            return userObj;
        }
        return null;
    },

    // Controllo utente loggato
    isLoggedIn: async function () {
        if (!this.getUser()) return false;
        const lastLogin = new Date(localStorage.getItem('lastLogin'));
        const ttl = parseInt(localStorage.getItem('ttl'), 10) * 1000;
        const tem = new Date() - lastLogin;
        if (tem < ttl && tem >= 30000) { // Meno del TTL ma più di 5 minuti
            const { cod, token } = await ApiService.refreshToken(this.getUser().id, this.getUser().token); // Chiamata all'API per refresh token
            if (cod == 1) {
                localStorage.setItem('lastLogin', new Date().toISOString());
                localStorage.setItem('token', token);
                return true;
            }
            return false;
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
                    <i class="bi bi-person-circle me-1"></i> ${user.name}
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
            <a class="btn auth-btn fw-bold" href="login.html">
                            Accedi / Registrati
                        </a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', updateNavbarUI);

async function AuthIfNotAuthenticated() {
    const t = await AuthService.isLoggedIn();
    if (!t) {
        console.log("false");
        window.location.href = 'login.html';
    }
}
async function HomepageIfAuthenticated() {
    const t = await AuthService.isLoggedIn();
    if (t) {
        console.log("true");
        window.location.href = 'index.html';
    }
}