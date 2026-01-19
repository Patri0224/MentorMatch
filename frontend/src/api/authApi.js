const API_BASE_URL = '/api'; // Cambia con il tuo endpoint reale

const ApiService = {
    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante la registrazione');
            }

            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },
    async login(username, password) {
        //test api login
        console.log("API Login called with:", username, password);
        if (username === "admin" && password === "Password.24") {
            console.log("API Login successful for admin");
            return {
                user: { username: "admin", role: "admin" },
                cod: 1
            };
        }
        return { user: null, cod: 0 };

        try {
            const response = await fetch(`${API_BASE_URL}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il login');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);

            throw error;
        }
    },
    async refreshToken(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/refresh_token.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il refresh del token');
            }
            const data = await response.json();
            return data.cod;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
};

