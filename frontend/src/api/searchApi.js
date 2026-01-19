const API_BASE_URL = '/api'; // Cambia con il tuo endpoint reale

const ApiService = {
    async getAllSectors() {
        try {
            const response = await fetch(`${API_BASE_URL}/sectors.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il recupero dei settori');
            }
            return await response.json(); // Supponendo che l'API restituisca un array di stringhe
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
};