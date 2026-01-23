document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');

    if (!bookingId) { window.location.href = 'dashboard.html'; return; }

    try {
        // Recupera dettagli (incrociando prenotazione e costo orario del mentor dal DB)
        const details = await ApiService.getBookingDetails(bookingId);
        
        document.getElementById('sumMentor').innerText = details.mentor_name;
        document.getElementById('sumDate').innerText = new Date(details.start_time).toLocaleString();
        document.getElementById('sumAmount').innerText = `${details.amount}€`;

        document.getElementById('payButton').addEventListener('click', async () => {
            await startStripePayment(bookingId);
        });
    } catch (e) { alert("Errore nel recupero dei dati di pagamento."); }
});

async function startStripePayment(bookingId) {
    const btn = document.getElementById('payButton');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Elaborazione...';

    try {
        // 1. Chiamata all'API per creare la sessione Stripe
        // Il server creerà un record in 'payments' con status 'pending'
        const session = await ApiService.createStripeSession(bookingId);
        
        // 2. Reindirizzamento a Stripe Checkout
        window.location.href = session.stripe_url; 
    } catch (e) {
        alert("Errore nell'avvio del pagamento: " + e.message);
        btn.disabled = false;
        btn.innerText = "Procedi al Pagamento";
    }
}