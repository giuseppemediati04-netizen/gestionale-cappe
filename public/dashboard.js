// Determina l'URL dell'API
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

// Carica dati dashboard
async function loadDashboard() {
    try {
        // Carica statistiche
        const statsResponse = await fetch(`${API_URL}/dashboard/stats`);
        const statsData = await statsResponse.json();
        
        if (statsResponse.ok) {
            updateStats(statsData.data);
        }
        
        // Carica dati grafici
        const chartsResponse = await fetch(`${API_URL}/dashboard/charts`);
        const chartsData = await chartsResponse.json();
        
        if (chartsResponse.ok) {
            updateCharts(chartsData.data);
        }
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Errore caricamento dashboard:', error);
        showNotification('Errore nel caricamento della dashboard', 'error');
        document.getElementById('loading').textContent = 'Errore nel caricamento dei dati';
    }
}

// Aggiorna statistiche
function updateStats(stats) {
    document.getElementById('stat-total').textContent = stats.totalCappe || 0;
    document.getElementById('stat-sedi').textContent = stats.sediAttive || 0;
    document.getElementById('stat-scadute').textContent = stats.manutenzioniScadute || 0;
    document.getElementById('stat-prossime').textContent = stats.manutenzioniProssime || 0;
    document.getElementById('stat-correttiva').textContent = stats.cappeCorrettiva || 0;
}

// Aggiorna grafici
function updateCharts(data) {
    // Grafico Cappe per Sede
    const sedeData = prepareSedeData(data.perSede);
    if (charts.sede) {
        charts.sede.destroy();
    }
    charts.sede = createPieChart('chartSede', sedeData);
    
    // Grafico Stato Correttiva
    const correttivaData = prepareCorrettivaData(data.statoCorrettiva);
    if (charts.correttiva) {
        charts.correttiva.destroy();
    }
    charts.correttiva = createPieChart('chartCorrettiva', correttivaData);
    
    // Grafico Stato Manutenzioni
    const manutenzioniData = prepareManutenzioniData(data.statoManutenzioni);
    if (charts.manutenzioni) {
        charts.manutenzioni.destroy();
    }
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
    
    const labels = data.map(item => iconMap[item.stato_correttiva] + item.stato_correttiva);
    const values = data.map(item => item.count);
    const colors = data.map(item => colorMap[item.stato_correttiva]);
    
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
    const ctx = document.getElementById(canvasId).getContext('2d');
    
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
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.parsed || 0;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
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

// Gestisce click sui grafici
function handleChartClick(chartId, label) {
    // Rimuovi emoji e spazi extra dal label
    const cleanLabel = label.replace(/[✅⚠️🔧❌⏰⚪]/g, '').trim();
    
    // Costruisci URL con parametro di filtro
    let filterParam = '';
    
    switch(chartId) {
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
    
    // Vai alla pagina cappe con filtro
    window.location.href = `cappe.html?${filterParam}`;
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
