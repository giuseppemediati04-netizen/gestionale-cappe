// Determina l'URL dell'API in base all'ambiente
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

let charts = {
    sede: null,
    correttiva: null,
    manutenzioni: null
};

// Carica dashboard al caricamento pagina
document.addEventListener('DOMContentLoaded', loadDashboard);

// Carica tutte le cappe e calcola stats + grafici lato client
async function loadDashboard() {
    try {
        console.log('Caricamento dashboard da /api/cappe...');

        const response = await fetch(`${API_URL}/cappe`);
        console.log('Cappe status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Cappe raw:', data);

        // Gestisce sia array diretto che { data: [...] }
        const cappe = Array.isArray(data)
            ? data
            : (Array.isArray(data.data) ? data.data : []);

        console.log('Cappe usate per dashboard:', cappe);

        const stats = computeStats(cappe);
        const chartsData = computeCharts(cappe);

        updateStats(stats);
        updateCharts(chartsData);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';

    } catch (error) {
        console.error('Errore caricamento dashboard:', error);
        showNotification('Errore nel caricamento della dashboard', 'error');
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.textContent = 'Errore nel caricamento dei dati';
    }
}

/* ---------- LOGICA STATS & GRAFICI ---------- */

// Calcola le statistiche per le card
function computeStats(cappe) {
    const totalCappe = cappe.length;

    // Sedi attive (distinte, non vuote)
    const sediSet = new Set(
        cappe
            .map(c => (c.sede || '').trim())
            .filter(s => s !== '')
    );
    const sediAttive = sediSet.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    let manutenzioniScadute = 0;
    let manutenzioniProssime = 0;

    cappe.forEach(cappa => {
        if (!cappa.data_prossima_manutenzione) return;

        const d = new Date(cappa.data_prossima_manutenzione);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            manutenzioniScadute++;
        } else if (diffDays <= 30) {
            manutenzioniProssime++;
        }
    });

    const cappeCorrettiva = cappe.filter(c =>
        c.stato_correttiva === 'In Correttiva' ||
        c.stato_correttiva === 'In Attesa Riparazione'
    ).length;

    return {
        totalCappe,
        sediAttive,
        manutenzioniScadute,
        manutenzioniProssime,
        cappeCorrettiva
    };
}

// Prepara i dataset per i grafici
function computeCharts(cappe) {
    const perSedeMap = {};
    const correttivaMap = {
        'Operativa': 0,
        'In Correttiva': 0,
        'In Attesa Riparazione': 0
    };
    const manutenzioniMap = {
        'OK': 0,
        'Prossima': 0,
        'Scaduta': 0,
        'Non programmata': 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    cappe.forEach(cappa => {
        // --- per Sede ---
        const sede = (cappa.sede || 'Non definita').trim();
        perSedeMap[sede] = (perSedeMap[sede] || 0) + 1;

        // --- Stato Correttiva ---
        const statoCorr = (cappa.stato_correttiva && cappa.stato_correttiva.trim()) || 'Operativa';
        if (correttivaMap[statoCorr] === undefined) {
            correttivaMap[statoCorr] = 0;
        }
        correttivaMap[statoCorr]++;

        // --- Stato Manutenzioni ---
        let statoMan;
        if (!cappa.data_prossima_manutenzione) {
            statoMan = 'Non programmata';
        } else {
            const d = new Date(cappa.data_prossima_manutenzione);
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                statoMan = 'Scaduta';
            } else if (diffDays <= 30) {
                statoMan = 'Prossima';
            } else {
                statoMan = 'OK';
            }
        }
        manutenzioniMap[statoMan] = (manutenzioniMap[statoMan] || 0) + 1;
    });

    const perSede = Object.entries(perSedeMap).map(([sede, count]) => ({ sede, count }));
    const statoCorrettiva = Object.entries(correttivaMap)
        .filter(([, count]) => count > 0)
        .map(([stato_correttiva, count]) => ({ stato_correttiva, count }));
    const statoManutenzioni = Object.entries(manutenzioniMap)
        .filter(([, count]) => count > 0)
        .map(([stato, count]) => ({ stato, count }));

    return { perSede, statoCorrettiva, statoManutenzioni };
}

/* ---------- FUNZIONI DI RENDER ---------- */

// Aggiorna statistiche (card in alto)
function updateStats(stats) {
    document.getElementById('stat-total').textContent = stats.totalCappe || 0;
    document.getElementById('stat-sedi').textContent = stats.sediAttive || 0;
    document.getElementById('stat-scadute').textContent = stats.manutenzioniScadute || 0;
    document.getElementById('stat-prossime').textContent = stats.manutenzioniProssime || 0;
    document.getElementById('stat-correttiva').textContent = stats.cappeCorrettiva || 0;
}

// Aggiorna grafici
function updateCharts(data) {
    const sedeData = prepareSedeData(data.perSede || []);
    if (charts.sede) charts.sede.destroy();
    charts.sede = createPieChart('chartSede', sedeData);

    const correttivaData = prepareCorrettivaData(data.statoCorrettiva || []);
    if (charts.correttiva) charts.correttiva.destroy();
    charts.correttiva = createPieChart('chartCorrettiva', correttivaData);

    const manutenzioniData = prepareManutenzioniData(data.statoManutenzioni || []);
    if (charts.manutenzioni) charts.manutenzioni.destroy();
    charts.manutenzioni = createPieChart('chartManutenzioni', manutenzioniData);
}

// Prepara dati per grafico Sede
function prepareSedeData(data) {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe',
        '#43e97b', '#fa709a', '#fee140', '#30cfd0',
        '#a8edea', '#fed6e3', '#fbc2eb', '#a6c1ee'
    ];

    const labels = data.map(item => item.sede);
    const values = data.map(item => item.count);

    return {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length)
        }]
    };
}

// Prepara dati per grafico Correttiva
function prepareCorrettivaData(data) {
    const colorMap = {
        'Operativa': '#28a745',
        'In Correttiva': '#ffc107',
        'In Attesa Riparazione': '#dc3545'
    };

    const iconMap = {
        'Operativa': '✅ ',
        'In Correttiva': '⚠️ ',
        'In Attesa Riparazione': '🔧 '
    };

    const validData = data.filter(item =>
        item.stato_correttiva &&
        item.stato_correttiva.trim() !== '' &&
        colorMap[item.stato_correttiva]
    );

    const labels = validData.map(item => iconMap[item.stato_correttiva] + item.stato_correttiva);
    const values = validData.map(item => item.count);
    const colors = validData.map(item => colorMap[item.stato_correttiva]);

    return {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors
        }]
    };
}

// Prepara dati per grafico Manutenzioni
function prepareManutenzioniData(data) {
    const colorMap = {
        'OK': '#28a745',
        'Prossima': '#ffc107',
        'Scaduta': '#dc3545',
        'Non programmata': '#6c757d'
    };

    const iconMap = {
        'OK': '✅ ',
        'Prossima': '⏰ ',
        'Scaduta': '❌ ',
        'Non programmata': '⚪ '
    };

    const labels = data.map(item => iconMap[item.stato] + item.stato);
    const values = data.map(item => item.count);
    const colors = data.map(item => colorMap[item.stato]);

    return {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: colors
        }]
    };
}

// Crea grafico a torta
function createPieChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`Canvas non trovato: #${canvasId}`);
        return null;
    }

    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = data.labels[index];
                    handleChartClick(canvasId, label);
                }
            }
        }
    });
}

// Gestisce click sui grafici (filtra lista cappe)
function handleChartClick(chartId, label) {
    const cleanLabel = label.replace(/[✅⚠️🔧❌⏰⚪]/g, '').trim();

    let filterParam = '';

    switch (chartId) {
        case 'chartSede':
            filterParam = `sede=${encodeURIComponent(cleanLabel)}`;
            break;
        case 'chartCorrettiva':
            filterParam = `correttiva=${encodeURIComponent(cleanLabel)}`;
            break;
        case 'chartManutenzioni':
            filterParam = `manutenzione=${encodeURIComponent(cleanLabel)}`;
            break;
    }

    window.location.href = `cappe.html?${filterParam}`;
}

// Mostra notifica
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
