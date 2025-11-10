# 🔧 Sistema Interventi - Aggiornamento Stati Cappa

## 📍 Dove vengono salvati gli interventi?

### **Database SQLite:**
- **File:** `/data/database.db` (sul server)
- **Tabella:** `interventi_correttivi`
- **⚠️ IMPORTANTE:** Il database è **temporaneo** su Render
  - Si cancella ad ogni deploy
  - **SOLUZIONE:** Esporta Excel prima di ogni deploy!

---

## ✅ Modifiche Applicate:

### **1. Rimosso pulsante "💾 Salva"**

### **2. Aggiunti 3 nuovi pulsanti:**

| Pulsante | Colore | Azione Intervento | Stato Cappa Risultante |
|----------|--------|-------------------|------------------------|
| ✅ **Chiudi Intervento** | 🟢 Verde | Stato = "Chiuso" | **Operativa** |
| ⏸️ **Sospendi** | 🟡 Giallo | Stato = "Sospeso" | **In Correttiva** |
| 🔧 **In Attesa Riparazione** | 🔴 Rosso | Stato = "In Attesa" | **In Attesa Riparazione** |

---

## 🔄 Come Funziona:

### **Quando clicchi un pulsante:**

1. **Valida il form** (campi obbligatori)
2. **Salva l'intervento** nel database `interventi_correttivi`
3. **Aggiorna lo stato_correttiva** della cappa nella tabella `cappe`
4. **Ricarica la lista cappe** automaticamente
5. **Chiude la finestra** intervento

### **Esempio pratico:**

```
Cappa 001 stato = "Operativa"
   ↓
Apri Correttiva → Compila form → Clicca "⏸️ Sospendi"
   ↓
✅ Intervento salvato con stato "Sospeso"
✅ Cappa 001 stato aggiornato a "In Correttiva"
✅ Lista cappe si aggiorna automaticamente
✅ Card "In Correttiva" mostra +1
```

---

## 📊 Stati Cappa e Colori:

| Stato Cappa | Card | Colore Dashboard |
|-------------|------|------------------|
| **Operativa** | - | 🟢 Verde |
| **In Correttiva** | ⚠️ In Correttiva | 🔵 Azzurro |
| **In Attesa Riparazione** | 🔧 In Attesa | 🔴 Rosso |

---

## 🗄️ Modifiche Database:

### **Nessuna modifica alla struttura!**
- Tabella `interventi_correttivi` rimane uguale
- Tabella `cappe` rimane uguale (aveva già `stato_correttiva`)
- **Solo logica backend aggiornata**

---

## 🚀 Come Aggiornare:

### **1. Sostituisci 3 file:**
```bash
cd gestionale-cappe
cp aggiornamento-stati/public/correttiva-intervento.html public/
cp aggiornamento-stati/public/correttiva-intervento.js public/
cp aggiornamento-stati/server.js .
```

### **2. GitHub Desktop:**

**Summary:**
```
feat: Pulsanti stato intervento + aggiornamento automatico cappa
```

**Description:**
```
- Rimosso pulsante "Salva" generico
- Aggiunti 3 pulsanti: Chiudi/Sospendi/Attesa Riparazione
- Ogni pulsante aggiorna automaticamente stato_correttiva della cappa
- Chiudi Intervento → Cappa torna Operativa
- Sospendi → Cappa In Correttiva
- In Attesa → Cappa In Attesa Riparazione
- Lista cappe si aggiorna automaticamente dopo salvataggio
```

### **3. Commit → Push → Rideploy**

---

## ⚠️ RICORDA: Backup Dati!

**PRIMA del deploy:**
1. **"📊 Esporta Excel"** → Salva file
2. Deploy su Render
3. **"📥 Importa Excel"** → Carica file

**Così non perdi gli interventi e le cappe!** ✅

---

## 💡 Comportamento Pulsanti:

### **✅ Chiudi Intervento (Verde)**
**Quando usare:**
- Problema risolto completamente
- Cappa testata e funzionante
- Cliente soddisfatto

**Risultato:**
- Intervento: Stato = "Chiuso"
- Cappa: Stato = "Operativa"
- Card "In Correttiva": -1
- Dashboard aggiornata

---

### **⏸️ Sospendi (Giallo)**
**Quando usare:**
- In attesa di ricambi
- Necessita sopralluogo aggiuntivo
- Cliente deve decidere se procedere
- Problema non completamente risolto

**Risultato:**
- Intervento: Stato = "Sospeso"
- Cappa: Stato = "In Correttiva"
- Card "In Correttiva": +1
- Dashboard aggiornata

---

### **🔧 In Attesa Riparazione (Rosso)**
**Quando usare:**
- Guasto grave identificato
- Necessita intervento specializzato
- Ordine ricambi speciali
- Cappa non utilizzabile

**Risultato:**
- Intervento: Stato = "In Attesa"
- Cappa: Stato = "In Attesa Riparazione"
- Card "In Attesa Riparazione": +1
- Dashboard aggiornata

---

## 📋 Flow Completo:

```
1. Lista Cappe → Clicca "🔧 Correttiva"
2. Form Intervento si apre
3. Compila sezioni (Segnalazione, Diagnosi, ecc.)
4. Scegli l'azione appropriata:
   
   A) Problema risolto?
      → ✅ Chiudi Intervento
      → Cappa torna Operativa
   
   B) Serve tempo/ricambi?
      → ⏸️ Sospendi
      → Cappa resta In Correttiva
   
   C) Guasto grave?
      → 🔧 In Attesa Riparazione
      → Cappa In Attesa Riparazione

5. Sistema salva tutto automaticamente
6. Finestra si chiude
7. Lista cappe si aggiorna
8. Dashboard aggiornata
```

---

## 🔍 Verifica Funzionamento:

### **Test rapido:**

1. Apri cappa con stato "Operativa"
2. Clicca "🔧 Correttiva"
3. Compila almeno:
   - Data richiesta
   - Problema riscontrato
4. Clicca "⏸️ Sospendi"
5. **Verifica:**
   - ✅ Notifica verde "Intervento sospeso"
   - ✅ Finestra si chiude
   - ✅ Lista cappe aggiornata
   - ✅ Cappa mostra stato "In Correttiva"
   - ✅ Card azzurra incrementata

---

## 📊 Stati Database:

### **Tabella `interventi_correttivi`:**
- `stato` = "Chiuso" | "Sospeso" | "In Attesa"

### **Tabella `cappe`:**
- `stato_correttiva` = "Operativa" | "In Correttiva" | "In Attesa Riparazione"

---

## ✅ Messaggio Commit:

```
feat: Pulsanti stato intervento + aggiornamento automatico cappa

- Rimosso pulsante generico "Salva"
- Aggiunti 3 pulsanti specifici:
  • Chiudi Intervento (verde) → Cappa Operativa
  • Sospendi (giallo) → Cappa In Correttiva
  • In Attesa Riparazione (rosso) → Cappa In Attesa Riparazione
- Ogni pulsante salva intervento + aggiorna stato cappa
- Reload automatico lista cappe dopo salvataggio
- Notifiche specifiche per ogni azione
- Dashboard si aggiorna automaticamente
```

---

**Sistema pronto!** 🎉

Ora gli interventi correttivi sono completamente integrati con lo stato delle cappe!
