// Determina l'URL dell'API in base all'ambiente
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api/cappe'
    : `${window.location.origin}/api/cappe`;

let cappe = [];
let editingId = null;

// Elementi DOM
const modal = document.getElementById('formModal');
const importModal = document.getElementById('importModal');
const form = document.getElementById('cappaForm');
const tableBody = document.getElementById('cappeTableBody');
const btnAggiungi = document.getElementById('btnAggiungi');
const btnImport = document.getElementById('btnImport');
const btnAnnulla = document.getElementById('btnAnnulla');
const btnExport = document.getElementById('btnExport');
const closeModal = document.querySelector('.close');
const closeImport = document.getElementById('closeImport');
const searchInput = document.getElementById('searchInput');
const formTitle = document.getElementById('formTitle');

// Toggle campo "Altro" per tipologia
function toggleAltroInput(select) {
    const altroInput = document.getElementById('tipologiaAltro');
    if (select.value === 'Altro') {
        altroInput.style.display = 'block';
        altroInput.required = true;
    } else {
        altroInput.style.display = 'none';
        altroInput.required = false;
        altroInput.value = '';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadCappe);
btnAggiungi.addEventListener('click', openAddModal);
btnImport.addEventListener('click', openImportModal);
btnAnnulla.addEventListener('click', closeModalHandler);
closeModal.addEventListener('click', closeModalHandler);
closeImport.addEventListener('click', closeImportModalHandler);
document.getElementById('btnCancelImport').addEventListener('click', closeImportModalHandler);
document.getElementById('btnStartImport').addEventListener('click', startImport);
btnExport.addEventListener('click', exportExcel);
form.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);

// Chiudi modal cliccando fuori
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModalHandler();
    }
    if (e.target === importModal) {
        closeImportModalHandler();
    }
});

// Carica tutte le cappe
async function loadCappe() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        cappe = data.data;
        renderTable(cappe);
        updateStats(cappe);
    } catch (error) {
        showNotification('Errore nel caricamento dei dati', 'error');
        console.error('Errore:', error);
    }
}

// Renderizza tabella
function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="no-data">Nessuna cappa trovata. Clicca su "Aggiungi Cappa" per iniziare.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(cappa => {
        const manutenzioneStatus = getMaintenanceStatus(cappa.data_prossima_manutenzione);
        
        return `
            <tr>
                <td>${cappa.inventario}</td>
                <td>${cappa.tipologia}</td>
                <td><strong>${cappa.matricola}</strong></td>
                <td>${cappa.produttore}</td>
                <td>${cappa.modello}</td>
                <td>${cappa.sede}</td>
                <td>${cappa.reparto}</td>
                <td>${cappa.locale}</td>
                <td>${formatDate(cappa.data_manutenzione)}</td>
                <td class="${manutenzioneStatus.class}">${formatDate(cappa.data_prossima_manutenzione)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editCappa(${cappa.id})">✏️</button>
                        <button class="btn btn-delete" onclick="deleteCappa(${cappa.id}, '${cappa.matricola}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Formatta data
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

// Determina stato manutenzione
function getMaintenanceStatus(dateString) {
    if (!dateString) return { class: '', text: '-' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maintenanceDate = new Date(dateString);
    maintenanceDate.setHours(0, 0, 0, 0);
    
    const diffTime = maintenanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { class: 'status-danger', days: diffDays };
    } else if (diffDays <= 30) {
        return { class: 'status-warning', days: diffDays };
    } else {
        return { class: 'status-ok', days: diffDays };
    }
}

// Aggiorna statistiche
function updateStats(data) {
    const total = data.length;
    document.getElementById('totalCappe').textContent = total;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let scadute = 0;
    let prossime = 0;
    
    data.forEach(cappa => {
        if (cappa.data_prossima_manutenzione) {
            const maintenanceDate = new Date(cappa.data_prossima_manutenzione);
            maintenanceDate.setHours(0, 0, 0, 0);
            
            const diffTime = maintenanceDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                scadute++;
            } else if (diffDays <= 30) {
                prossime++;
            }
        }
    });
    
    document.getElementById('manutenzioniScadute').textContent = scadute;
    document.getElementById('manutenzioniProssime').textContent = prossime;
}

// Apri modal per aggiungere
function openAddModal() {
    editingId = null;
    formTitle.textContent = 'Aggiungi Nuova Cappa';
    form.reset();
    modal.style.display = 'block';
}

// Apri modal per modificare
async function editCappa(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();
        const cappa = result.data;
        
        editingId = id;
        formTitle.textContent = 'Modifica Cappa';
        
        document.getElementById('cappaId').value = cappa.id;
        document.getElementById('inventario').value = cappa.inventario;
        
        // Gestione tipologia personalizzata
        const tipologiaSelect = document.getElementById('tipologia');
        const tipologiaAltro = document.getElementById('tipologiaAltro');
        const standardOptions = ['Cappa biologica', 'Cappa sterile', 'Cappa chimica', 'Cappa aspirante', 'Armadio'];
        
        if (standardOptions.includes(cappa.tipologia)) {
            tipologiaSelect.value = cappa.tipologia;
            tipologiaAltro.style.display = 'none';
        } else {
            tipologiaSelect.value = 'Altro';
            tipologiaAltro.style.display = 'block';
            tipologiaAltro.value = cappa.tipologia;
        }
        
        document.getElementById('matricola').value = cappa.matricola;
        document.getElementById('produttore').value = cappa.produttore;
        document.getElementById('modello').value = cappa.modello;
        document.getElementById('sede').value = cappa.sede;
        document.getElementById('reparto').value = cappa.reparto;
        document.getElementById('locale').value = cappa.locale;
        document.getElementById('dataManutenzione').value = cappa.data_manutenzione || '';
        document.getElementById('dataProssimaManutenzione').value = cappa.data_prossima_manutenzione || '';
        
        modal.style.display = 'block';
    } catch (error) {
        showNotification('Errore nel caricamento della cappa', 'error');
        console.error('Errore:', error);
    }
}

// Chiudi modal
function closeModalHandler() {
    modal.style.display = 'none';
    form.reset();
    document.getElementById('tipologiaAltro').style.display = 'none';
    document.getElementById('tipologiaAltro').value = '';
    editingId = null;
}

// Apri modal importa
function openImportModal() {
    importModal.style.display = 'block';
    document.getElementById('excelFile').value = '';
    document.getElementById('importProgress').style.display = 'none';
    document.querySelector('input[name="importMode"][value="add"]').checked = true;
}

// Chiudi modal importa
function closeImportModalHandler() {
    importModal.style.display = 'none';
    document.getElementById('excelFile').value = '';
    document.getElementById('importProgress').style.display = 'none';
}

// Avvia importazione
async function startImport() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Seleziona un file Excel', 'error');
        return;
    }
    
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    
    // Mostra progress bar
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importProgressBar').style.width = '50%';
    document.getElementById('btnStartImport').disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL.replace('/api/cappe', '')}/api/cappe/import/excel?mode=${mode}`, {
            method: 'POST',
            body: await file.arrayBuffer(),
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });
        
        document.getElementById('importProgressBar').style.width = '100%';
        
        const result = await response.json();
        
        if (response.ok) {
            let message = `Importazione completata!\n`;
            if (result.inserted > 0) message += `✅ Inserite: ${result.inserted}\n`;
            if (result.updated > 0) message += `🔄 Aggiornate: ${result.updated}\n`;
            if (result.skipped > 0) message += `⏭️ Saltate: ${result.skipped}\n`;
            if (result.errors) message += `\n⚠️ Errori: ${result.errors.length}`;
            
            showNotification(message.replace(/\n/g, ' | '), 'success');
            closeImportModalHandler();
            loadCappe();
            
            // Se ci sono errori, mostrali in console
            if (result.errors && result.errors.length > 0) {
                console.error('Errori durante l\'importazione:', result.errors);
            }
        } else {
            showNotification(result.error || 'Errore durante l\'importazione', 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione durante l\'importazione', 'error');
        console.error('Errore:', error);
    } finally {
        document.getElementById('btnStartImport').disabled = false;
        setTimeout(() => {
            document.getElementById('importProgress').style.display = 'none';
            document.getElementById('importProgressBar').style.width = '0%';
        }, 2000);
    }
}

// Gestisci submit form
async function handleSubmit(e) {
    e.preventDefault();
    
    // Gestione tipologia "Altro"
    let tipologiaValue = document.getElementById('tipologia').value;
    if (tipologiaValue === 'Altro') {
        const altroValue = document.getElementById('tipologiaAltro').value.trim();
        if (!altroValue) {
            showNotification('Specifica la tipologia per "Altro"', 'error');
            return;
        }
        tipologiaValue = altroValue;
    }
    
    const cappaData = {
        inventario: document.getElementById('inventario').value,
        tipologia: tipologiaValue,
        matricola: document.getElementById('matricola').value,
        produttore: document.getElementById('produttore').value,
        modello: document.getElementById('modello').value,
        sede: document.getElementById('sede').value,
        reparto: document.getElementById('reparto').value,
        locale: document.getElementById('locale').value,
        data_manutenzione: document.getElementById('dataManutenzione').value || null,
        data_prossima_manutenzione: document.getElementById('dataProssimaManutenzione').value || null
    };
    
    try {
        let response;
        
        if (editingId) {
            // Modifica
            response = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cappaData)
            });
        } else {
            // Aggiungi
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cappaData)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(
                editingId ? 'Cappa aggiornata con successo!' : 'Cappa aggiunta con successo!',
                'success'
            );
            closeModalHandler();
            loadCappe();
        } else {
            showNotification(result.error || 'Errore durante il salvataggio', 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione al server', 'error');
        console.error('Errore:', error);
    }
}

// Elimina cappa
async function deleteCappa(id, matricola) {
    if (!confirm(`Sei sicuro di voler eliminare la cappa con matricola ${matricola}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Cappa eliminata con successo', 'success');
            loadCappe();
        } else {
            const result = await response.json();
            showNotification(result.error || 'Errore durante l\'eliminazione', 'error');
        }
    } catch (error) {
        showNotification('Errore di connessione al server', 'error');
        console.error('Errore:', error);
    }
}

// Ricerca
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    const filtered = cappe.filter(cappa => {
        return cappa.matricola.toLowerCase().includes(searchTerm) ||
               cappa.modello.toLowerCase().includes(searchTerm) ||
               cappa.produttore.toLowerCase().includes(searchTerm) ||
               cappa.sede.toLowerCase().includes(searchTerm) ||
               cappa.reparto.toLowerCase().includes(searchTerm) ||
               cappa.locale.toLowerCase().includes(searchTerm) ||
               cappa.tipologia.toLowerCase().includes(searchTerm);
    });
    
    renderTable(filtered);
}

// Export Excel
function exportExcel() {
    window.open(`${API_URL}/export/excel`, '_blank');
    showNotification('Download Excel avviato', 'success');
}

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
