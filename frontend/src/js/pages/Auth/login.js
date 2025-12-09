const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');
loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (!username) {
        usernameError.textContent = 'Inserisci il nome utente.';
        usernameError.classList.remove('d-none');
        return;
    }
    if (!password) {
        passwordError.textContent = 'Inserisci la password.';
        passwordError.classList.remove('d-none');
        return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        passwordError.textContent = 'La password deve contenere almeno 8 caratteri, tra cui una maiuscola, un numero e un carattere speciale.';
        passwordError.classList.remove('d-none');
        return;
    }



    const cod = AuthService.login(username, password);
    if (cod == 1) {
        window.location.href = 'index.html';
    } else {
        alert('Credenziali non valide. Riprova.');
    }

});
usernameInput.addEventListener('input', function () {
    usernameError.classList.add('d-none');
});
passwordInput.addEventListener('input', function () {
    passwordError.classList.add('d-none');
});