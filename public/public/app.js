// Determina l'URL dell'API in base all'ambiente
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api/cappe'
    : `${window.location.origin}/api/cappe`;

let cappe = [];
let filteredCappe = []; // Cappe attualmente visibili nella tabella
let editingId = null;

// Elementi DOM
const modal = document.getElementById('formModal');
const importModal = document.getElementById('importModal');
const form = document.getElementById('cappaForm');
const tableBody = document.getElementById('cappeTableBody');
const btnAggiungi = document.getElementById('btnAggiungi');
const btnImport = document.getElementById('btnImport');
const btnRefresh = document.getElementById('btnRefresh');
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
document.addEventListener('DOMContentLoaded', () => {
    loadCappe().then(() => {
        applyUrlFilters();
    });
});
btnAggiungi.addEventListener('click', openAddModal);
btnImport.addEventListener('click', openImportModal);
btnRefresh.addEventListener('click', refreshData);
btnAnnulla.addEventListener('click', closeModalHandler);
closeModal.addEventListener('click', closeModalHandler);
closeImport.addEventListener('click', closeImportModalHandler);
document.getElementById('btnCancelImport').addEventListener('click', closeImportModalHandler);
document.getElementById('btnStartImport').addEventListener('click', startImport);
btnExport.addEventListener('click', exportExcel);
document.getElementById('btnExportInterventi').addEventListener('click', exportInterventi);
form.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);

// Applica filtri da URL (quando arrivi dalla dashboard)
function applyUrlFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const sede = urlParams.get('sede');
    const correttiva = urlParams.get('correttiva');
    const manutenzione = urlParams.get('manutenzione');
    
    if (sede) {
        // Filtra per sede
        const filtered = cappe.filter(cappa => 
            cappa.sede.toLowerCase() === sede.toLowerCase()
        );
        renderTable(filtered);
        // NON popolare la search box, lasciala vuota per cercare altro
        showNotification(`📍 Filtro attivo: ${filtered.length} cappe nella sede "${sede}"`, 'success');
    } else if (correttiva) {
        // Filtra per stato correttiva
        const filtered = cappe.filter(cappa => 
            cappa.stato_correttiva === correttiva
        );
        renderTable(filtered);
        // NON popolare la search box
        showNotification(`⚠️ Filtro attivo: ${filtered.length} cappe con stato "${correttiva}"`, 'success');
    } else if (manutenzione) {
        // Filtra per stato manutenzione
        filterByManutenzione(manutenzione);
    }
}

// Filtra per stato manutenzione
function filterByManutenzione(stato) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    
    const filtered = cappe.filter(cappa => {
        if (!cappa.data_prossima_manutenzione) {
            return stato === 'Non programmata';
        }
        
        const dataProx = new Date(cappa.data_prossima_manutenzione);
        dataProx.setHours(0, 0, 0, 0);
        
        if (stato === 'Scaduta') {
            return dataProx < today;
        } else if (stato === 'Prossima') {
            return dataProx >= today && dataProx <= in30Days;
        } else if (stato === 'OK') {
            return dataProx > in30Days;
        }
        
        return false;
    });
    
    renderTable(filtered);
    showNotification(`⚙️ Filtro applicato: ${filtered.length} cappe con manutenzione "${stato}"`, 'success');
}

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
        cappe = Array.isArray(data) ? data : [];
        renderTable(cappe);
        updateStats(cappe);
    } catch (error) {
        showNotification('Errore nel caricamento dei dati', 'error');
        console.error('Errore:', error);
    }
}

// Aggiorna statistiche con i dati filtrati
function updateFilteredStats(data) {
    // Totale cappe visibili
    const totalCappe = data.length;
    
    // Calcola manutenzioni scadute
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scadute = data.filter(cappa => {
        if (!cappa.data_prossima_manutenzione) return false;
        const dataProx = new Date(cappa.data_prossima_manutenzione);
        dataProx.setHours(0, 0, 0, 0);
        return dataProx < today;
    }).length;
    
    // Calcola manutenzioni prossime (30 giorni)
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const prossime = data.filter(cappa => {
        if (!cappa.data_prossima_manutenzione) return false;
        const dataProx = new Date(cappa.data_prossima_manutenzione);
        dataProx.setHours(0, 0, 0, 0);
        return dataProx >= today && dataProx <= in30Days;
    }).length;
    
    // Calcola cappe in correttiva
    const inCorrettiva = data.filter(cappa => 
        cappa.stato_correttiva === 'In Correttiva'
    ).length;
    
    // Calcola cappe in attesa riparazione
    const inAttesa = data.filter(cappa => 
        cappa.stato_correttiva === 'In Attesa Riparazione'
    ).length;
    
    // Aggiorna le card
    const totalCard = document.getElementById('totalCappe');
    const scaduteCard = document.getElementById('manutenzioniScadute');
    const prossimeCard = document.getElementById('manutenzioniProssime');
    const correttivaCard = document.getElementById('cappeInCorrettiva');
    const attesaCard = document.getElementById('cappeInAttesa');
    
    if (totalCard) totalCard.textContent = totalCappe;
    if (scaduteCard) scaduteCard.textContent = scadute;
    if (prossimeCard) prossimeCard.textContent = prossime;
    if (correttivaCard) correttivaCard.textContent = inCorrettiva;
    if (attesaCard) attesaCard.textContent = inAttesa;
}

// Renderizza tabella
function renderTable(data) {
    // Salva le cappe filtrate per l'export
    filteredCappe = data;
    
    // Aggiorna statistiche filtrate
    updateFilteredStats(data);
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" class="no-data">Nessuna cappa trovata. Clicca su "Aggiungi Cappa" per iniziare.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(cappa => {
        const manutenzioneStatus = getMaintenanceStatus(cappa.data_prossima_manutenzione);
        
        // Icona per stato correttiva
        let statoIcon = '✅';
        if (cappa.stato_correttiva === 'In Correttiva') statoIcon = '⚠️';
        if (cappa.stato_correttiva === 'In Attesa Riparazione') statoIcon = '🔧';
        
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
                <td title="${cappa.stato_correttiva || 'Operativa'}">${statoIcon}</td>
                <td>${formatDate(cappa.data_manutenzione)}</td>
                <td class="${manutenzioneStatus.class}">${formatDate(cappa.data_prossima_manutenzione)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editCappa(${cappa.id})" title="Modifica">✏️</button>
                        <button class="btn btn-exploded" onclick="openEsploso(${cappa.id})" title="Esploso">🔧</button>
                        <button class="btn btn-correttiva" onclick="openCorrettiva(${cappa.id})" title="Correttiva">🔧</button>
                        <button class="btn btn-delete" onclick="deleteCappa(${cappa.id}, '${cappa.matricola}')" title="Elimina">🗑️</button>
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
        const cappa = await response.json();
        
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
        document.getElementById('statoCorrettiva').value = cappa.stato_correttiva || 'Operativa';
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
        stato_correttiva: document.getElementById('statoCorrettiva').value,
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
    
    // Se c'è un filtro URL attivo (sede, correttiva, manutenzione), cerca dentro filteredCappe
    // Altrimenti cerca in tutte le cappe
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlFilter = urlParams.get('sede') || urlParams.get('correttiva') || urlParams.get('manutenzione');
    
    const dataSource = (hasUrlFilter && filteredCappe.length > 0) ? filteredCappe : cappe;
    
    if (!searchTerm) {
        // Se la ricerca è vuota, mostra il filtro URL o tutte le cappe
        if (hasUrlFilter && filteredCappe.length > 0) {
            renderTable(filteredCappe);
        } else {
            renderTable(cappe);
        }
        return;
    }
    
    const filtered = dataSource.filter(cappa => {
        return cappa.inventario.toLowerCase().includes(searchTerm) ||
               cappa.matricola.toLowerCase().includes(searchTerm) ||
               cappa.modello.toLowerCase().includes(searchTerm) ||
               cappa.produttore.toLowerCase().includes(searchTerm) ||
               cappa.sede.toLowerCase().includes(searchTerm) ||
               cappa.reparto.toLowerCase().includes(searchTerm) ||
               cappa.locale.toLowerCase().includes(searchTerm) ||
               cappa.tipologia.toLowerCase().includes(searchTerm);
    });
    
    renderTable(filtered);
}

// Aggiorna dati
// Aggiorna dati mantenendo i filtri
function refreshData() {
    showNotification('Aggiornamento dati...', 'success');
    
    // Salva il valore corrente della ricerca
    const currentSearch = searchInput.value;
    
    // Salva i parametri URL (filtri dalla dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const hasSedeFiltro = urlParams.get('sede');
    const hasCorrettivaFiltro = urlParams.get('correttiva');
    const hasManutenzione = urlParams.get('manutenzione');
    
    // Ricarica i dati
    loadCappe().then(() => {
        // Riapplica i filtri
        if (hasSedeFiltro || hasCorrettivaFiltro || hasManutenzione) {
            // Riapplica filtri da URL
            applyUrlFilters();
        } else if (currentSearch) {
            // Riapplica ricerca manuale
            searchInput.value = currentSearch;
            handleSearch({ target: { value: currentSearch } });
        }
        
        showNotification('Dati aggiornati! Filtro mantenuto.', 'success');
    });
}

// Apri pagina esploso
function openEsploso(id) {
    window.open(`esploso.html?id=${id}`, '_blank', 'width=1200,height=800');
}

// Apri pagina correttiva
function openCorrettiva(id) {
    window.open(`correttiva-intervento.html?id=${id}`, '_blank', 'width=1400,height=900');
}

// Export Excel
// Export Excel (solo cappe filtrate)
async function exportExcel() {
    try {
        // Usa le cappe filtrate o tutte se non c'è filtro
        const dataToExport = filteredCappe.length > 0 ? filteredCappe : cappe;
        
        if (dataToExport.length === 0) {
            showNotification('Nessuna cappa da esportare', 'warning');
            return;
        }
        
        // Prepara i dati per Excel
        const excelData = dataToExport.map(cappa => ({
            'Inventario': cappa.inventario,
            'Tipologia': cappa.tipologia,
            'Matricola': cappa.matricola,
            'Produttore': cappa.produttore,
            'Modello': cappa.modello,
            'Sede': cappa.sede,
            'Reparto': cappa.reparto,
            'Locale': cappa.locale,
            'Stato Correttiva': cappa.stato_correttiva || 'Operativa',
            'Data Manutenzione': cappa.data_manutenzione || '',
            'Data Prossima Manutenzione': cappa.data_prossima_manutenzione || ''
        }));
        
        // Crea il workbook usando XLSX dalla CDN
        const XLSX = window.XLSX;
        if (!XLSX) {
            // Carica XLSX se non è già caricato
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => exportExcelWithXLSX(excelData);
            document.head.appendChild(script);
        } else {
            exportExcelWithXLSX(excelData);
        }
        
    } catch (error) {
        console.error('Errore export:', error);
        showNotification('Errore durante l\'export', 'error');
    }
}

function exportExcelWithXLSX(data) {
    const XLSX = window.XLSX;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cappe');
    
    // Nome file con data e numero di cappe
    const date = new Date().toISOString().split('T')[0];
    const fileName = `cappe_export_${data.length}_${date}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showNotification(`Export completato: ${data.length} cappe esportate`, 'success');
}

// Export Interventi
async function exportInterventi() {
    try {
        showNotification('Preparazione export interventi...', 'info');
        
        const response = await fetch(`${API_URL}/interventi/export`);
        const blob = await response.blob();
        
        // Crea link per download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `interventi_completi_${date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export interventi completato!', 'success');
    } catch (error) {
        console.error('Errore export interventi:', error);
        showNotification('Errore durante l\'export interventi', 'error');
    }
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