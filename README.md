# 🔧 Sistema Interventi Correttivi - MODELLO 2 COMPLETO

## 📦 Cosa ho creato:

### ✅ **1. Database**
- Nuova tabella `interventi_correttivi` con 31 campi
- Migrazione automatica all'avvio

### ✅ **2. Pulsante Correttiva**
- Nuovo pulsante **🔧 arancione** nella tabella cappe
- Posizione: tra Esploso e Elimina

### ✅ **3. Pagina Intervento Correttivo**
- **Modello 2 - Standard Bilanciato**
- 4 Sezioni complete:
  1. 🔴 Segnalazione
  2. 🔍 Diagnosi
  3. 🔧 Intervento
  4. ✅ Verifica e Chiusura

### ✅ **4. Funzionalità Implementate**
- ✅ Anagrafica cappa (read-only)
- ✅ Numero ticket automatico
- ✅ Gestione ricambi dinamica (aggiungi/rimuovi righe)
- ✅ Calcolo automatico totale ricambi
- ✅ Upload foto PRIMA/DOPO (multiple)
- ✅ Firme digitali (tecnico + cliente) con canvas
- ✅ Parametri verificati (velocità, pressione, illuminamento)
- ✅ Stampa/PDF del rapporto
- ✅ API complete per CRUD interventi

---

## 🎯 Pulsanti Azione Finali:

```
✏️ Modifica | 🔧 Esploso | 🔧 Correttiva ← NUOVO! | 🗑️ Elimina
```

---

## 📋 Struttura Form Correttiva:

### **🔴 SEGNALAZIONE**
- Data/Ora richiesta *
- Richiedente + Contatto
- Problema riscontrato *
- Priorità (Bassa/Media/Alta)
- Cappa ferma? (Sì/No)

### **🔍 DIAGNOSI**
- Data sopralluogo
- Tecnico diagnostico
- Causa guasto
- Componenti danneggiati
- Preventivo (€)

### **🔧 INTERVENTO**
- Data inizio/fine
- Tecnici esecutori
- Attività svolte (dettaglio)
- **Ricambi:** Tabella dinamica con:
  - Codice | Descrizione | Q.tà | Prezzo | Totale
  - Pulsante "+ Aggiungi Ricambio"
  - Calcolo automatico totale
- Ore lavoro
- Costo totale
- **📷 Foto PRIMA** (caricamento multiplo)
- **📷 Foto DOPO** (caricamento multiplo)

### **✅ VERIFICA E CHIUSURA**
- Test eseguiti
- Parametri verificati:
  - Velocità aria (m/s)
  - Pressione (Pa)
  - Illuminamento (lux)
- Esito (Risolto/Parziale/Sospeso/Non risolto)
- Garanzia intervento (giorni)
- Prossima manutenzione
- Note finali
- **✍️ Firma Tecnico** (canvas digitale)
- **✍️ Firma Cliente** (canvas digitale)

---

## 🗄️ Database - Tabella `interventi_correttivi`:

```sql
CREATE TABLE interventi_correttivi (
    id INTEGER PRIMARY KEY,
    cappa_id INTEGER,
    numero_ticket TEXT UNIQUE,
    
    -- Segnalazione (8 campi)
    data_richiesta TEXT,
    richiedente TEXT,
    contatto_richiedente TEXT,
    problema_riscontrato TEXT,
    priorita TEXT,
    cappa_ferma INTEGER,
    
    -- Diagnosi (5 campi)
    data_sopralluogo TEXT,
    tecnico_diagnostico TEXT,
    causa_guasto TEXT,
    componenti_danneggiati TEXT,
    preventivo REAL,
    
    -- Intervento (10 campi)
    data_inizio TEXT,
    data_fine TEXT,
    tecnici TEXT,
    attivita_svolte TEXT,
    ricambi TEXT (JSON),
    ore_lavoro REAL,
    costo_totale REAL,
    foto_prima TEXT (JSON),
    foto_dopo TEXT (JSON),
    
    -- Verifica (8 campi)
    test_eseguiti TEXT,
    parametri_verificati TEXT (JSON),
    esito TEXT,
    garanzia_giorni INTEGER,
    prossima_manutenzione TEXT,
    note_finali TEXT,
    firma_tecnico TEXT (base64),
    firma_cliente TEXT (base64),
    
    stato TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

---

## 🚀 API Endpoints:

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/interventi` | Crea nuovo intervento |
| GET | `/api/interventi` | Lista tutti gli interventi |
| GET | `/api/interventi/cappa/:id` | Storico interventi per cappa |
| GET | `/api/interventi/:id` | Dettaglio intervento |
| PUT | `/api/interventi/:id` | Aggiorna intervento |
| DELETE | `/api/interventi/:id` | Elimina intervento |

---

## 📝 Come Usare:

### **1. Apri Intervento:**
- Dalla lista cappe, clicca **🔧 Correttiva** (arancione)
- Si apre nuova finestra con form

### **2. Compila Sezioni:**
- **Segnalazione:** Inserisci dati richiesta (obbligatori)
- **Diagnosi:** Dopo sopralluogo, inserisci causa
- **Intervento:** Durante/dopo lavoro, completa tutto
- **Verifica:** Test finale e chiusura

### **3. Aggiungi Ricambi:**
- Clicca "+ Aggiungi Ricambio"
- Compila: Codice, Descrizione, Q.tà, Prezzo
- Totale si calcola automaticamente
- Rimuovi con pulsante "×"

### **4. Carica Foto:**
- Clicca area "📷 Clicca per caricare foto"
- Seleziona una o più immagini
- Vedi anteprima immediata
- Rimuovi con "×" su ogni foto

### **5. Firma:**
- Disegna firma con mouse/touch
- Pulsante "Cancella" per ricominciare

### **6. Salva:**
- Clicca "💾 Salva"
- Sistema genera numero ticket automatico
- Dati salvati nel database

### **7. Stampa PDF:**
- Clicca "🖨️ Stampa PDF"
- Salva come PDF per archiviazione

---

## 🔄 Come Aggiornare:

### **1. Sostituisci 7 file:**
```bash
cp sistema-correttive/public/app.js public/
cp sistema-correttive/public/cappe.html public/
cp sistema-correttive/public/styles.css public/
cp sistema-correttive/public/dashboard.js public/
cp sistema-correttive/public/correttiva-intervento.html public/
cp sistema-correttive/public/correttiva-intervento.js public/
cp sistema-correttive/server.js .
```

### **2. Commit:**
```bash
git add public/ server.js
git commit -m "feat: Sistema completo interventi correttivi (Modello 2)"
```

**Description:**
```
- Nuova tabella interventi_correttivi nel database
- Pulsante Correttiva nella lista cappe
- Form completo con 4 sezioni: Segnalazione, Diagnosi, Intervento, Verifica
- Gestione ricambi dinamica con calcolo automatico
- Upload foto prima/dopo (multiple)
- Firme digitali tecnico e cliente
- Stampa/PDF rapporto
- API complete per CRUD interventi
- Fix grafico dashboard (rimosso nero)
- Card In Correttiva colore azzurro
```

### **3. Push:**
```bash
git push origin main
```

### **4. Rideploy su Render**

---

## ⚠️ IMPORTANTE - Backup Dati:

**PRIMA di fare deploy:**
1. Vai su gestionale → "📊 Esporta Excel"
2. Salva il file
3. Deploy
4. Dopo deploy → "📥 Importa Excel"
5. Carica il file salvato

**Per non perdere più dati:** Considera PostgreSQL permanente!

---

## 📊 Prossime Funzionalità (Fase 2):

Le seguenti funzionalità saranno implementate in futuro:

1. **💾 Storico completo** - Lista interventi per ogni cappa
2. **📊 Statistiche correttive** - Dashboard con costi/tempi
3. **📧 Email automatiche** - Notifiche su apertura/chiusura
4. **🔔 Notifiche in-app** - Badge interventi aperti
5. **📅 Calendario interventi** - Pianificazione visuale

---

## 🎨 Colori UI:

- **Pulsante Correttiva:** 🟠 Arancione (#fd7e14)
- **Header Form:** 🟠 Gradiente arancione
- **Sezioni:** 🟣 Gradiente viola/blu
- **Stato:**
  - ✅ Risolto: Verde
  - ⚠️ Parziale: Giallo
  - ⏸️ Sospeso: Grigio
  - ❌ Non risolto: Rosso

---

## ✅ Messaggio Commit:

```
feat: Sistema completo interventi correttivi (Modello 2)

- Nuova tabella database interventi_correttivi (31 campi)
- Pulsante Correttiva arancione nella lista cappe
- Form completo 4 sezioni: Segnalazione, Diagnosi, Intervento, Verifica
- Gestione dinamica ricambi con calcolo automatico totale
- Upload multiplo foto prima/dopo con anteprima
- Firme digitali su canvas (tecnico + cliente)
- Stampa/Salva PDF rapporto completo
- API REST complete per CRUD interventi
- Numero ticket generato automaticamente
- Parametri verificati (velocità, pressione, illuminamento)
- Fix grafico dashboard (rimosso colore nero undefined)
- Card In Correttiva cambiata da arancione ad azzurro
```

---

**Sistema pronto per la produzione!** 🎉

Ora hai un sistema professionale per gestire tutti gli interventi correttivi con tracciabilità completa, documentazione fotografica e firme digitali!
