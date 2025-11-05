// Determina l'URL dell'API in base all'ambiente
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

let cappaId = null;
let uploadedPhotos = {
    fotoCappa: [],
    fotoMotore: [],
    fotoFiltri: [],
    fotoLuceUV: [],
    fotoLuceBianca: []
};

// Carica dati quando la pagina è pronta
document.addEventListener('DOMContentLoaded', () => {
    // Ottieni ID dalla URL
    const urlParams = new URLSearchParams(window.location.search);
    cappaId = urlParams.get('id');
    
    if (!cappaId) {
        showNotification('ID cappa non valido', 'error');
        return;
    }
    
    loadCappaData();
    setupPhotoHandlers();
});

// Carica dati cappa e esploso
async function loadCappaData() {
    try {
        // Carica anagrafica
        const cappaResponse = await fetch(`${API_URL}/cappe/${cappaId}`);
        if (!cappaResponse.ok) throw new Error('Cappa non trovata');
        
        const cappaData = await cappaResponse.json();
        const cappa = cappaData.data;
        
        // Popola anagrafica
        document.getElementById('ana-inventario').textContent = cappa.inventario;
        document.getElementById('ana-tipologia').textContent = cappa.tipologia;
        document.getElementById('ana-matricola').textContent = cappa.matricola;
        document.getElementById('ana-produttore').textContent = cappa.produttore;
        document.getElementById('ana-modello').textContent = cappa.modello;
        document.getElementById('ana-sede').textContent = cappa.sede;
        document.getElementById('ana-reparto').textContent = cappa.reparto;
        document.getElementById('ana-locale').textContent = cappa.locale;
        
        // Carica dati esploso se esistono
        try {
            const esplosoResponse = await fetch(`${API_URL}/esploso/${cappaId}`);
            if (esplosoResponse.ok) {
                const esplosoData = await esplosoResponse.json();
                const esploso = esplosoData.data;
                
                document.getElementById('datiMotore').value = esploso.dati_motore || '';
                document.getElementById('datiFiltri').value = esploso.dati_filtri || '';
                document.getElementById('datiLuceUV').value = esploso.dati_luce_uv || '';
                document.getElementById('datiLuceBianca').value = esploso.dati_luce_bianca || '';
                document.getElementById('oreLavoroCappa').value = esploso.ore_lavoro_cappa || 0;
                document.getElementById('oreLavoroFiltri').value = esploso.ore_lavoro_filtri || 0;
                
                // Carica foto esistenti (se implementato)
                // TODO: implementare caricamento foto salvate
            }
        } catch (e) {
            // Nessun dato esploso esistente, va bene
        }
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        showNotification('Errore nel caricamento dei dati', 'error');
        console.error(error);
    }
}

// Setup gestori upload foto
function setupPhotoHandlers() {
    const photoInputs = ['fotoCappa', 'fotoMotore', 'fotoFiltri', 'fotoLuceUV', 'fotoLuceBianca'];
    
    photoInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(`preview-${inputId}`);
        
        input.addEventListener('change', (e) => {
            handlePhotoUpload(e, inputId, preview);
        });
    });
}

// Gestisci upload foto
function handlePhotoUpload(event, inputId, previewContainer) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewContainer.appendChild(img);
                
                // Salva in array per invio
                uploadedPhotos[inputId].push({
                    name: file.name,
                    data: e.target.result
                });
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// Submit form
document.getElementById('esplosoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const esplosoData = {
        cappa_id: cappaId,
        dati_motore: document.getElementById('datiMotore').value,
        dati_filtri: document.getElementById('datiFiltri').value,
        dati_luce_uv: document.getElementById('datiLuceUV').value,
        dati_luce_bianca: document.getElementById('datiLuceBianca').value,
        ore_lavoro_cappa: parseInt(document.getElementById('oreLavoroCappa').value) || 0,
        ore_lavoro_filtri: parseInt(document.getElementById('oreLavoroFiltri').value) || 0,
        foto_cappa: JSON.stringify(uploadedPhotos.fotoCappa),
        foto_motore: JSON.stringify(uploadedPhotos.fotoMotore),
        foto_filtri: JSON.stringify(uploadedPhotos.fotoFiltri),
        foto_luce_uv: JSON.stringify(uploadedPhotos.fotoLuceUV),
        foto_luce_bianca: JSON.stringify(uploadedPhotos.fotoLuceBianca)
    };
    
    try {
        const response = await fetch(`${API_URL}/esploso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(esplosoData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Dati salvati con successo!', 'success');
        } else {
            showNotification(result.error || 'Errore durante il salvataggio', 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione', 'error');
        console.error(error);
    }
});

// Mostra notifica
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
