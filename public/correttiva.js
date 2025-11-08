// Determina l'URL dell'API in base all'ambiente
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Carica dati quando la pagina è pronta
document.addEventListener('DOMContentLoaded', async () => {
    // Ottieni ID dalla URL
    const urlParams = new URLSearchParams(window.location.search);
    const cappaId = urlParams.get('id');
    
    if (cappaId) {
        await loadCappaData(cappaId);
    }
    
    // Imposta data odierna sui campi data vuoti
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataEmissione').value = today;
});

// Carica dati cappa
async function loadCappaData(id) {
    try {
        const response = await fetch(`${API_URL}/cappe/${id}`);
        const result = await response.json();
        const cappa = result.data;
        
        // Popola anagrafica cappa (campi readonly)
        document.getElementById('inventario').value = cappa.inventario || '';
        document.getElementById('tipologia').value = cappa.tipologia || '';
        document.getElementById('matricola').value = cappa.matricola || '';
        document.getElementById('produttore').value = cappa.produttore || '';
        document.getElementById('modello').value = cappa.modello || '';
        document.getElementById('sede').value = cappa.sede || '';
        document.getElementById('reparto').value = cappa.reparto || '';
        document.getElementById('locale').value = cappa.locale || '';
        
        // Precompila prossima manutenzione
        if (cappa.data_prossima_manutenzione) {
            document.getElementById('prossimaManutenzione').value = cappa.data_prossima_manutenzione;
        }
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
    }
}
