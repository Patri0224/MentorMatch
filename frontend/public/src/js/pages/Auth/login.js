const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');
const generalError = document.getElementById('generalError');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Reset errori precedenti
    generalError.classList.add('d-none');
    usernameError.classList.add('d-none');
    passwordError.classList.add('d-none');

    const username = usernameInput.value;
    const password = passwordInput.value;

    // Validazione base
    if (!username) {
        usernameError.textContent = 'Inserisci l\'e-mail.';
        usernameError.classList.remove('d-none');
        return;
    }
    if (password.length < 8) {
        passwordError.textContent = 'La password deve contenere almeno 8 caratteri.';
        passwordError.classList.remove('d-none');
        return;
    }

    // UI: Disabilita bottone
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Accesso...';

    try {
        const cod = await AuthService.login(username, password);

        if (cod == 1) {
            window.location.href = 'index.html';
        } else {
            // Caso teorico se l'API risponde OK ma con cod != 1
            generalError.textContent = 'Credenziali non valide.';
            generalError.classList.remove('d-none');
        }
    } catch (error) {
        // CATTURA L'ERRORE DELL'API (401, 404, ecc.)
        console.error("Login Error:", error);
        generalError.textContent = 'E-mail o password errate.';
        generalError.classList.remove('d-none');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerText = 'Accedi';
    }
});
usernameInput.addEventListener('input', function () {
    usernameError.classList.add('d-none');
});
passwordInput.addEventListener('input', function () {
    passwordError.classList.add('d-none');
});