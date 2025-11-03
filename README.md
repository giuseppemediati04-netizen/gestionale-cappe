# 🏭 Gestionale Cappe

Sistema completo per la gestione dell'inventario delle cappe aspirazione.

## 📋 Caratteristiche

- ✅ Gestione completa inventario cappe (Aggiungi, Modifica, Elimina, Visualizza)
- 🔍 Ricerca avanzata in tempo reale
- 📊 Export dati in formato Excel
- 📅 Monitoraggio scadenze manutenzioni
- 📈 Dashboard con statistiche
- 🎨 Interfaccia moderna e responsive
- ⚡ API RESTful complete

## 🗂️ Campi Gestiti

- **Inventario**: Numero inventario
- **Tipologia**: Tipo di cappa (parete, isola, incasso, ecc.)
- **Matricola**: Identificativo univoco
- **Produttore**: Casa produttrice
- **Modello**: Modello specifico
- **Sede**: Sede di installazione
- **Reparto**: Reparto di appartenenza
- **Locale**: Locale specifico
- **Data Manutenzione**: Ultima manutenzione effettuata
- **Data Prossima Manutenzione**: Prossima manutenzione programmata

## 🚀 Installazione

1. **Installa le dipendenze**
```bash
npm install
```

2. **Avvia il server**
```bash
npm start
```

3. **Apri il browser**
```
http://localhost:3000
```

## 📁 Struttura Progetto

```
gestionale-cappe/
├── server.js                 # Server Express con API
├── package.json             # Dipendenze e configurazione
├── gestionale_cappe.db      # Database SQLite (creato automaticamente)
└── public/
    ├── index.html           # Interfaccia principale
    ├── styles.css           # Stili
    └── app.js               # Logica frontend
```

## 🔌 API Endpoints

### GET /api/cappe
Ottieni tutte le cappe
```json
{
  "data": [...]
}
```

### GET /api/cappe/:id
Ottieni una cappa specifica

### POST /api/cappe
Aggiungi nuova cappa
```json
{
  "inventario": "INV001",
  "tipologia": "Cappa a Parete",
  "matricola": "MAT123456",
  "produttore": "Faber",
  "modello": "X500",
  "sede": "Sede Torino",
  "reparto": "Produzione",
  "locale": "Reparto A",
  "data_manutenzione": "2024-10-15",
  "data_prossima_manutenzione": "2025-04-15"
}
```

### PUT /api/cappe/:id
Aggiorna cappa esistente

### DELETE /api/cappe/:id
Elimina cappa

### GET /api/cappe/export/excel
Download Excel di tutte le cappe

## 🎨 Funzionalità Interface

### Dashboard
- Totale cappe in inventario
- Manutenzioni scadute
- Manutenzioni prossime (entro 30 giorni)

### Gestione Cappe
- Aggiungi nuova cappa tramite form modale
- Modifica cappe esistenti
- Elimina cappe con conferma
- Ricerca in tempo reale su tutti i campi

### Sistema di Alerting
- 🔴 **Rosso**: Manutenzione scaduta
- 🟡 **Giallo**: Manutenzione entro 30 giorni
- 🟢 **Verde**: Manutenzione programmata oltre 30 giorni

### Export
- Download Excel con tutti i dati
- Formato pronto per stampa e archiviazione

## 💾 Database

Il sistema utilizza SQLite per massima semplicità e portabilità.
Il database viene creato automaticamente al primo avvio.

## 🔧 Tecnologie Utilizzate

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Export**: SheetJS (xlsx)
- **Styling**: CSS custom con gradients e animazioni

## 📝 Note di Sviluppo

- Il campo **matricola** è univoco e non può essere duplicato
- Tutti i campi tranne le date sono obbligatori
- Le date sono opzionali ma utili per il monitoraggio
- L'export Excel include tutti i dati presenti nel database

## 🆘 Supporto

Per problemi o domande:
1. Verifica che tutte le dipendenze siano installate
2. Controlla che la porta 3000 sia libera
3. Verifica i log del server nella console

## 📄 Licenza

ISC
