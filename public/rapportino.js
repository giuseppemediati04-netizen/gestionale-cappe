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
    
    // Imposta data odierna
    const today = new Date().toISOString().split('T')[0];
    const dataFields = document.querySelectorAll('input[type="date"]');
    dataFields.forEach(field => {
        if (!field.value) {
            field.value = today;
        }
    });
});

// Carica dati cappa
async function loadCappaData(id) {
    try {
        const response = await fetch(`${API_URL}/cappe/${id}`);
        const result = await response.json();
        const cappa = result.data;
        
        // Popola campi readonly (precompilati dal database)
        document.getElementById('numeroInventario').value = cappa.inventario || '';
        document.getElementById('matricola').value = cappa.matricola || '';
        document.getElementById('numeroEtichetta').value = cappa.inventario || '';
        
        // Popola campi editabili con dati cappa
        document.getElementById('produttore').value = cappa.produttore || '';
        document.getElementById('modello').value = cappa.modello || '';
        document.getElementById('azienda').value = cappa.sede || '';
        document.getElementById('presidiato').value = cappa.reparto || '';
        document.getElementById('ubicazione').value = cappa.locale || '';
        document.getElementById('classeApparecchiatura').value = cappa.tipologia || '';
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
    }
}
