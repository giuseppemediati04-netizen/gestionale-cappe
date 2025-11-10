// API URL
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

let cappaId = null;
let fotoPrima = [];
let fotoDopo = [];
let firmaTecnicoCanvas, firmaClienteCanvas;
let firmaTecnicoCtx, firmaClienteCtx;
let isDrawing = false;

// Inizializza
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    cappaId = urlParams.get('id');
    
    if (!cappaId) {
        showNotification('ID cappa mancante', 'error');
        return;
    }
    
    await loadCappaData();
    initSignaturePads();
    setupRicambiCalculations();
    
    // Imposta data odierna
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dataRichiesta').value = today;
});

// Carica dati cappa
async function loadCappaData() {
    try {
        const response = await fetch(`${API_URL}/cappe/${cappaId}`);
        const result = await response.json();
        const cappa = result.data;
        
        document.getElementById('ana-inventario').textContent = cappa.inventario;
        document.getElementById('ana-matricola').textContent = cappa.matricola || 'N/A';
        document.getElementById('ana-tipologia').textContent = cappa.tipologia;
        document.getElementById('ana-produttore').textContent = cappa.produttore;
        document.getElementById('ana-modello').textContent = cappa.modello;
        document.getElementById('ana-sede').textContent = cappa.sede;
        document.getElementById('ana-reparto').textContent = cappa.reparto;
        document.getElementById('ana-locale').textContent = cappa.locale;
        
        // Genera numero ticket
        const ticket = `CORR-${cappa.inventario}-${Date.now().toString().slice(-6)}`;
        document.getElementById('numero-ticket').textContent = ticket;
        
    } catch (error) {
        showNotification('Errore caricamento dati', 'error');
        console.error(error);
    }
}

// Inizializza canvas firme
function initSignaturePads() {
    firmaTecnicoCanvas = document.getElementById('firmaTecnico');
    firmaClienteCanvas = document.getElementById('firmaCliente');
    firmaTecnicoCtx = firmaTecnicoCanvas.getContext('2d');
    firmaClienteCtx = firmaClienteCanvas.getContext('2d');
    
    setupCanvas(firmaTecnicoCanvas, firmaTecnicoCtx);
    setupCanvas(firmaClienteCanvas, firmaClienteCtx);
}

function setupCanvas(canvas, ctx) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    canvas.addEventListener('mousedown', (e) => startDrawing(e, ctx, canvas));
    canvas.addEventListener('mousemove', (e) => draw(e, ctx, canvas));
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    canvas.addEventListener('touchend', () => isDrawing = false);
}

function startDrawing(e, ctx, canvas) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e, ctx, canvas) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function clearSignature(type) {
    if (type === 'tecnico') {
        firmaTecnicoCtx.clearRect(0, 0, firmaTecnicoCanvas.width, firmaTecnicoCanvas.height);
    } else {
        firmaClienteCtx.clearRect(0, 0, firmaClienteCanvas.width, firmaClienteCanvas.height);
    }
}

// Gestione ricambi
function aggiungiRicambio() {
    const tbody = document.getElementById('ricambiBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="ricambio-codice"></td>
        <td><input type="text" class="ricambio-desc"></td>
        <td><input type="number" class="ricambio-qta" value="1"></td>
        <td><input type="number" class="ricambio-prezzo" step="0.01" value="0"></td>
        <td><input type="number" class="ricambio-totale" step="0.01" readonly></td>
        <td><button type="button" onclick="rimuoviRicambio(this)">×</button></td>
    `;
    tbody.appendChild(row);
    setupRicambiCalculations();
}

function rimuoviRicambio(btn) {
    const row = btn.parentElement.parentElement;
    row.remove();
    calcolaTotaleRicambi();
}

function setupRicambiCalculations() {
    const inputs = document.querySelectorAll('.ricambio-qta, .ricambio-prezzo');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const row = this.closest('tr');
            const qta = parseFloat(row.querySelector('.ricambio-qta').value) || 0;
            const prezzo = parseFloat(row.querySelector('.ricambio-prezzo').value) || 0;
            const totale = qta * prezzo;
            row.querySelector('.ricambio-totale').value = totale.toFixed(2);
            calcolaTotaleRicambi();
        });
    });
}

function calcolaTotaleRicambi() {
    const totali = Array.from(document.querySelectorAll('.ricambio-totale'));
    const somma = totali.reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    document.getElementById('costoTotale').value = somma.toFixed(2);
}

// Gestione foto
function handlePhotoUpload(event, tipo) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById(`preview-${tipo}`);
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            
            if (tipo === 'prima') {
                fotoPrima.push(base64);
            } else {
                fotoDopo.push(base64);
            }
            
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-preview-item';
            photoDiv.innerHTML = `
                <img src="${base64}" alt="Foto ${tipo}">
                <button class="remove" onclick="rimuoviFoto('${tipo}', ${tipo === 'prima' ? fotoPrima.length - 1 : fotoDopo.length - 1})">×</button>
            `;
            previewContainer.appendChild(photoDiv);
        };
        reader.readAsDataURL(file);
    });
}

function rimuoviFoto(tipo, index) {
    if (tipo === 'prima') {
        fotoPrima.splice(index, 1);
    } else {
        fotoDopo.splice(index, 1);
    }
    
    // Ricarica preview
    const container = document.getElementById(`preview-${tipo}`);
    container.innerHTML = '';
    const array = tipo === 'prima' ? fotoPrima : fotoDopo;
    array.forEach((foto, i) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-preview-item';
        photoDiv.innerHTML = `
            <img src="${foto}" alt="Foto ${tipo}">
            <button class="remove" onclick="rimuoviFoto('${tipo}', ${i})">×</button>
        `;
        container.appendChild(photoDiv);
    });
}

// Prepara dati intervento
function preparaIntervento() {
    // Raccogli ricambi
    const ricambiRows = Array.from(document.querySelectorAll('#ricambiBody tr'));
    const ricambi = ricambiRows.map(row => ({
        codice: row.querySelector('.ricambio-codice').value,
        descrizione: row.querySelector('.ricambio-desc').value,
        quantita: parseFloat(row.querySelector('.ricambio-qta').value) || 0,
        prezzo: parseFloat(row.querySelector('.ricambio-prezzo').value) || 0,
        totale: parseFloat(row.querySelector('.ricambio-totale').value) || 0
    })).filter(r => r.codice || r.descrizione);
    
    // Parametri verificati
    const parametri = {
        velocita: document.getElementById('paramVelocita').value,
        pressione: document.getElementById('paramPressione').value,
        illuminamento: document.getElementById('paramIlluminamento').value
    };
    
    return {
        cappa_id: cappaId,
        numero_ticket: document.getElementById('numero-ticket').textContent,
        
        // Segnalazione
        data_richiesta: document.getElementById('dataRichiesta').value + ' ' + (document.getElementById('oraRichiesta').value || ''),
        richiedente: document.getElementById('richiedente').value,
        contatto_richiedente: document.getElementById('contatto').value,
        problema_riscontrato: document.getElementById('problemaRiscontrato').value,
        priorita: document.getElementById('priorita').value,
        cappa_ferma: document.querySelector('input[name="cappaFerma"]:checked').value,
        
        // Diagnosi
        data_sopralluogo: document.getElementById('dataSopralluogo').value,
        tecnico_diagnostico: document.getElementById('tecnicoDiagnostico').value,
        causa_guasto: document.getElementById('causaGuasto').value,
        componenti_danneggiati: document.getElementById('componentiDanneggiati').value,
        preventivo: parseFloat(document.getElementById('preventivo').value) || 0,
        
        // Intervento
        data_inizio: document.getElementById('dataInizio').value,
        data_fine: document.getElementById('dataFine').value,
        tecnici: document.getElementById('tecnici').value,
        attivita_svolte: document.getElementById('attivitaSvolte').value,
        ricambi: JSON.stringify(ricambi),
        ore_lavoro: parseFloat(document.getElementById('oreLavoro').value) || 0,
        costo_totale: parseFloat(document.getElementById('costoTotale').value) || 0,
        foto_prima: JSON.stringify(fotoPrima),
        foto_dopo: JSON.stringify(fotoDopo),
        
        // Verifica
        test_eseguiti: document.getElementById('testEseguiti').value,
        parametri_verificati: JSON.stringify(parametri),
        esito: document.getElementById('esito').value,
        garanzia_giorni: parseInt(document.getElementById('garanziaGiorni').value) || 0,
        prossima_manutenzione: document.getElementById('prossimaManutenzione').value,
        note_finali: document.getElementById('noteFinali').value,
        firma_tecnico: firmaTecnicoCanvas.toDataURL(),
        firma_cliente: firmaClienteCanvas.toDataURL()
    };
}

// Funzione generica per salvare intervento con stato specifico
async function salvaConStato(statoIntervento, statoCorrettivaCappa, messaggio) {
    const form = document.getElementById('correttivaForm');
    
    if (!form.checkValidity()) {
        showNotification('Compila i campi obbligatori', 'error');
        form.reportValidity();
        return;
    }
    
    const data = preparaIntervento();
    data.stato = statoIntervento;
    data.stato_correttiva_cappa = statoCorrettivaCappa;
    
    try {
        const response = await fetch(`${API_URL}/interventi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification(messaggio, 'success');
            setTimeout(() => {
                window.opener.location.reload(); // Ricarica la pagina principale
                window.close();
            }, 1500);
        } else {
            const error = await response.json();
            showNotification('Errore: ' + error.error, 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione', 'error');
        console.error(error);
    }
}

// Chiudi Intervento - Cappa torna Operativa
async function chiudiIntervento() {
    await salvaConStato('Chiuso', 'Operativa', '✅ Intervento chiuso! Cappa operativa');
}

// Sospendi - Cappa In Correttiva
async function sospendiIntervento() {
    await salvaConStato('Sospeso', 'In Correttiva', '⏸️ Intervento sospeso');
}

// In Attesa Riparazione
async function attesaRiparazione() {
    await salvaConStato('In Attesa', 'In Attesa Riparazione', '🔧 Intervento in attesa riparazione');
}

// Notifiche
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
