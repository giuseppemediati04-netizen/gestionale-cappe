# 🚀 Guida Deploy su Render.com

## STEP 1: Crea account GitHub (se non ce l'hai)
1. Vai su https://github.com
2. Clicca "Sign up"
3. Crea il tuo account gratuito

## STEP 2: Carica il progetto su GitHub

### Opzione A - Usando GitHub Desktop (più semplice):
1. Scarica GitHub Desktop: https://desktop.github.com/
2. Installa e fai login con il tuo account GitHub
3. Clicca "File" → "Add Local Repository"
4. Seleziona la cartella del progetto `gestionale-cappe`
5. Clicca "Create Repository" 
6. Clicca "Publish repository"
7. Togli la spunta da "Keep this code private" (o lasciala se vuoi che sia privato)
8. Clicca "Publish Repository"

### Opzione B - Usando il terminale (per esperti):
```bash
cd C:\Users\39327\Desktop\gestionale Cappe
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/gestionale-cappe.git
git push -u origin main
```

## STEP 3: Deploy su Render.com

1. **Vai su**: https://render.com
2. **Clicca**: "Get Started" o "Sign Up"
3. **Scegli**: "Sign up with GitHub"
4. **Autorizza** Render ad accedere al tuo GitHub
5. Nel dashboard di Render, clicca **"New +"** → **"Web Service"**
6. **Connetti il repository**: cerca "gestionale-cappe" e clicca "Connect"

7. **Configura il servizio**:
   - **Name**: `gestionale-cappe` (o quello che vuoi)
   - **Region**: Europe (Frankfurt) o Europe (West)
   - **Branch**: main
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

8. Clicca **"Create Web Service"**

## STEP 4: Attendi il deploy
- Render compilerà e avvierà il tuo gestionale
- Ci vogliono 3-5 minuti
- Vedrai i log in tempo reale
- Quando vedi "Your service is live 🎉" è pronto!

## STEP 5: Accedi al gestionale
- Render ti darà un URL tipo: `https://gestionale-cappe.onrender.com`
- **IMPORTANTE**: Il primo caricamento può richiedere 30-60 secondi (servizio gratuito)
- Salva questo URL e condividilo con chi deve accedere

## ⚠️ Note importanti:
- **Inattività**: Dopo 15 minuti senza utilizzo, il servizio si addormenta. Il primo accesso dopo sarà lento (30-60 secondi)
- **Database**: I dati sono permanenti anche se il servizio dorme
- **Gratuito**: 750 ore/mese gratis (più che sufficienti)

## 🔄 Come aggiornare il gestionale:
1. Modifica i file localmente
2. In GitHub Desktop: scrivi un messaggio, clicca "Commit" e poi "Push"
3. Render rileverà le modifiche e rifarà automaticamente il deploy

## 🆘 Problemi comuni:

**"Application failed to respond"**
→ Attendi 60 secondi, è normale al primo caricamento

**"Build failed"**
→ Controlla i log su Render, probabilmente manca qualche file

**Non vedo i dati che avevo inserito localmente**
→ Normale, il database su Render è nuovo. Dovrai reinserire i dati.

## 📱 Accesso da più dispositivi:
Una volta online, chiunque abbia l'URL può accedere da:
- Computer
- Smartphone
- Tablet
- Qualsiasi dispositivo connesso a Internet

---

## ✅ Checklist veloce:
- [ ] Account GitHub creato
- [ ] Progetto caricato su GitHub
- [ ] Account Render creato
- [ ] Web Service creato su Render
- [ ] Deploy completato con successo
- [ ] Gestionale accessibile dall'URL fornito

Buon lavoro! 🚀
