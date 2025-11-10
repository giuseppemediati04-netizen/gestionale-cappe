const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./gestionale_cappe.db', (err) => {
    if (err) {
        console.error('Errore connessione database:', err);
    } else {
        console.log('Database connesso');
        initDatabase();
    }
});

// Inizializza il database
function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS cappe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario TEXT NOT NULL,
        tipologia TEXT NOT NULL,
        matricola TEXT UNIQUE,
        produttore TEXT NOT NULL,
        modello TEXT NOT NULL,
        sede TEXT NOT NULL,
        reparto TEXT NOT NULL,
        locale TEXT NOT NULL,
        stato_correttiva TEXT DEFAULT 'Operativa',
        data_manutenzione TEXT,
        data_prossima_manutenzione TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Errore creazione tabella cappe:', err);
        } else {
            console.log('Tabella cappe pronta');
            
            // Migrazione: rendi matricola opzionale
            // SQLite non supporta ALTER COLUMN, quindi dobbiamo ricreare la tabella
            db.get("PRAGMA table_info(cappe)", (err, info) => {
                if (!err) {
                    // Controlla se matricola ha ancora NOT NULL
                    db.all("PRAGMA table_info(cappe)", (err, columns) => {
                        const matricolaCol = columns.find(c => c.name === 'matricola');
                        if (matricolaCol && matricolaCol.notnull === 1) {
                            console.log('Migrazione: rendendo matricola opzionale...');
                            
                            // Crea tabella temporanea
                            db.run(`CREATE TABLE cappe_new (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                inventario TEXT NOT NULL,
                                tipologia TEXT NOT NULL,
                                matricola TEXT UNIQUE,
                                produttore TEXT NOT NULL,
                                modello TEXT NOT NULL,
                                sede TEXT NOT NULL,
                                reparto TEXT NOT NULL,
                                locale TEXT NOT NULL,
                                stato_correttiva TEXT DEFAULT 'Operativa',
                                data_manutenzione TEXT,
                                data_prossima_manutenzione TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )`, (err) => {
                                if (err) {
                                    console.error('Errore creazione tabella temporanea:', err);
                                    return;
                                }
                                
                                // Copia dati
                                db.run(`INSERT INTO cappe_new SELECT * FROM cappe`, (err) => {
                                    if (err) {
                                        console.error('Errore copia dati:', err);
                                        return;
                                    }
                                    
                                    // Elimina vecchia tabella
                                    db.run(`DROP TABLE cappe`, (err) => {
                                        if (err) {
                                            console.error('Errore eliminazione tabella:', err);
                                            return;
                                        }
                                        
                                        // Rinomina nuova tabella
                                        db.run(`ALTER TABLE cappe_new RENAME TO cappe`, (err) => {
                                            if (err) {
                                                console.error('Errore rinomina tabella:', err);
                                            } else {
                                                console.log('✓ Matricola ora è opzionale');
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
            });
            
            // Aggiungi colonna se non esiste (per database esistenti)
            db.run(`ALTER TABLE cappe ADD COLUMN stato_correttiva TEXT DEFAULT 'Operativa'`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Errore aggiunta colonna stato_correttiva:', err);
                }
            });
        }
    });
    
    // Tabella esploso tecnico
    db.run(`CREATE TABLE IF NOT EXISTS esploso (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cappa_id INTEGER NOT NULL,
        dati_motore TEXT,
        dati_filtri TEXT,
        dati_luce_uv TEXT,
        dati_luce_bianca TEXT,
        ore_lavoro_cappa INTEGER DEFAULT 0,
        ore_lavoro_filtri INTEGER DEFAULT 0,
        foto_cappa TEXT,
        foto_motore TEXT,
        foto_filtri TEXT,
        foto_luce_uv TEXT,
        foto_luce_bianca TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cappa_id) REFERENCES cappe(id) ON DELETE CASCADE,
        UNIQUE(cappa_id)
    )`, (err) => {
        if (err) {
            console.error('Errore creazione tabella esploso:', err);
        } else {
            console.log('Tabella esploso pronta');
            // Aggiungi nuove colonne se non esistono
            db.run(`ALTER TABLE esploso ADD COLUMN dati_targa TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Errore aggiunta dati_targa:', err);
                }
            });
            db.run(`ALTER TABLE esploso ADD COLUMN foto_targa TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Errore aggiunta foto_targa:', err);
                }
            });
            db.run(`ALTER TABLE esploso ADD COLUMN altri_dati TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Errore aggiunta altri_dati:', err);
                }
            });
            db.run(`ALTER TABLE esploso ADD COLUMN foto_altri_dati TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Errore aggiunta foto_altri_dati:', err);
                }
            });
        }
    });
    
    // Tabella interventi correttivi
    db.run(`CREATE TABLE IF NOT EXISTS interventi_correttivi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cappa_id INTEGER NOT NULL,
        numero_ticket TEXT UNIQUE,
        
        -- Segnalazione
        data_richiesta TEXT NOT NULL,
        richiedente TEXT,
        contatto_richiedente TEXT,
        problema_riscontrato TEXT,
        priorita TEXT DEFAULT 'Media',
        cappa_ferma INTEGER DEFAULT 0,
        
        -- Diagnosi
        data_sopralluogo TEXT,
        tecnico_diagnostico TEXT,
        causa_guasto TEXT,
        componenti_danneggiati TEXT,
        preventivo REAL,
        
        -- Intervento
        data_inizio TEXT,
        data_fine TEXT,
        tecnici TEXT,
        attivita_svolte TEXT,
        ricambi TEXT,
        ore_lavoro REAL,
        costo_totale REAL,
        foto_prima TEXT,
        foto_dopo TEXT,
        
        -- Verifica e Chiusura
        test_eseguiti TEXT,
        parametri_verificati TEXT,
        esito TEXT,
        garanzia_giorni INTEGER,
        prossima_manutenzione TEXT,
        note_finali TEXT,
        firma_tecnico TEXT,
        firma_cliente TEXT,
        
        stato TEXT DEFAULT 'Aperto',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cappa_id) REFERENCES cappe(id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error('Errore creazione tabella interventi_correttivi:', err);
        } else {
            console.log('Tabella interventi_correttivi pronta');
        }
    });
}

// ============= API ENDPOINTS =============

// GET - Statistiche per dashboard
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {};
    
    // Totale cappe
    db.get('SELECT COUNT(*) as total FROM cappe', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalCappe = row.total;
        
        // Sedi attive
        db.get('SELECT COUNT(DISTINCT sede) as total FROM cappe', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.sediAttive = row.total;
            
            // Manutenzioni scadute
            db.get(`SELECT COUNT(*) as total FROM cappe 
                    WHERE data_prossima_manutenzione IS NOT NULL 
                    AND data_prossima_manutenzione < date('now')`, [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.manutenzioniScadute = row.total;
                
                // Prossime manutenzioni (30 giorni)
                db.get(`SELECT COUNT(*) as total FROM cappe 
                        WHERE data_prossima_manutenzione IS NOT NULL 
                        AND data_prossima_manutenzione >= date('now')
                        AND data_prossima_manutenzione <= date('now', '+30 days')`, [], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.manutenzioniProssime = row.total;
                    
                    // Cappe in correttiva
                    db.get(`SELECT COUNT(*) as total FROM cappe 
                            WHERE stato_correttiva != 'Operativa'`, [], (err, row) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.cappeCorrettiva = row.total;
                        
                        res.json({ data: stats });
                    });
                });
            });
        });
    });
});

// GET - Dati grafici per dashboard
app.get('/api/dashboard/charts', (req, res) => {
    const charts = {};
    
    // Cappe per sede
    db.all(`SELECT sede, COUNT(*) as count FROM cappe GROUP BY sede ORDER BY count DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        charts.perSede = rows;
        
        // Stato correttiva
        db.all(`SELECT stato_correttiva, COUNT(*) as count FROM cappe GROUP BY stato_correttiva`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            charts.statoCorrettiva = rows;
            
            // Stato manutenzioni
            db.all(`SELECT 
                    CASE 
                        WHEN data_prossima_manutenzione IS NULL THEN 'Non programmata'
                        WHEN data_prossima_manutenzione < date('now') THEN 'Scaduta'
                        WHEN data_prossima_manutenzione <= date('now', '+30 days') THEN 'Prossima'
                        ELSE 'OK'
                    END as stato,
                    COUNT(*) as count
                    FROM cappe 
                    GROUP BY stato`, [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                charts.statoManutenzioni = rows;
                
                res.json({ data: charts });
            });
        });
    });
});

// GET - Ottieni tutte le cappe
app.get('/api/cappe', (req, res) => {
    db.all('SELECT * FROM cappe ORDER BY inventario ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ data: rows });
        }
    });
});

// GET - Ottieni una cappa specifica
app.get('/api/cappe/:id', (req, res) => {
    db.get('SELECT * FROM cappe WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ data: row });
        }
    });
});

// POST - Aggiungi nuova cappa
app.post('/api/cappe', (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        stato_correttiva,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    // Validazione campi obbligatori (matricola è opzionale)
    if (!inventario || !tipologia || !produttore || !modello || !sede || !reparto || !locale) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    const sql = `INSERT INTO cappe (
        inventario, tipologia, matricola, produttore, modello, 
        sede, reparto, locale, stato_correttiva, data_manutenzione, data_prossima_manutenzione
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        inventario, tipologia, matricola || null, produttore, modello,
        sede, reparto, locale, stato_correttiva || 'Operativa', data_manutenzione, data_prossima_manutenzione
    ], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                if (err.message.includes('inventario')) {
                    res.status(400).json({ error: 'Numero inventario già esistente' });
                } else if (err.message.includes('matricola')) {
                    res.status(400).json({ error: 'Matricola già esistente' });
                } else {
                    res.status(400).json({ error: 'Valore duplicato' });
                }
            } else {
                res.status(500).json({ error: err.message });
            }
        } else {
            res.status(201).json({
                message: 'Cappa aggiunta con successo',
                id: this.lastID
            });
        }
    });
});

// PUT - Aggiorna cappa esistente
app.put('/api/cappe/:id', (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        stato_correttiva,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    const sql = `UPDATE cappe SET 
        inventario = ?, tipologia = ?, matricola = ?, produttore = ?, 
        modello = ?, sede = ?, reparto = ?, locale = ?, stato_correttiva = ?,
        data_manutenzione = ?, data_prossima_manutenzione = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    db.run(sql, [
        inventario, tipologia, matricola || null, produttore, modello,
        sede, reparto, locale, stato_correttiva || 'Operativa', data_manutenzione, data_prossima_manutenzione,
        req.params.id
    ], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                if (err.message.includes('inventario')) {
                    res.status(400).json({ error: 'Numero inventario già esistente' });
                } else if (err.message.includes('matricola')) {
                    res.status(400).json({ error: 'Matricola già esistente' });
                } else {
                    res.status(400).json({ error: 'Valore duplicato' });
                }
            } else {
                res.status(500).json({ error: err.message });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ message: 'Cappa aggiornata con successo' });
        }
    });
});

// DELETE - Elimina cappa
app.delete('/api/cappe/:id', (req, res) => {
    db.run('DELETE FROM cappe WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ message: 'Cappa eliminata con successo' });
        }
    });
});

// GET - Statistiche per Dashboard
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {};
    
    // Totale cappe
    db.get('SELECT COUNT(*) as total FROM cappe', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totale_cappe = row.total;
        
        // Sedi attive
        db.get('SELECT COUNT(DISTINCT sede) as total FROM cappe', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.sedi_attive = row.total;
            
            // Manutenzioni scadute
            db.get(`SELECT COUNT(*) as total FROM cappe 
                    WHERE data_prossima_manutenzione < date('now')`, [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.manutenzioni_scadute = row.total;
                
                // Prossime manutenzioni (30 giorni)
                db.get(`SELECT COUNT(*) as total FROM cappe 
                        WHERE data_prossima_manutenzione BETWEEN date('now') AND date('now', '+30 days')`, [], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.prossime_manutenzioni = row.total;
                    
                    // Cappe in correttiva
                    db.get(`SELECT COUNT(*) as total FROM cappe 
                            WHERE stato_correttiva IN ('In Correttiva', 'In Attesa Riparazione')`, [], (err, row) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.cappe_correttiva = row.total;
                        
                        // Dati grafici - Cappe per Sede
                        db.all(`SELECT sede, COUNT(*) as count FROM cappe GROUP BY sede ORDER BY count DESC`, [], (err, rows) => {
                            if (err) return res.status(500).json({ error: err.message });
                            stats.cappe_per_sede = rows;
                            
                            // Dati grafici - Stato Correttiva
                            db.all(`SELECT stato_correttiva, COUNT(*) as count FROM cappe GROUP BY stato_correttiva`, [], (err, rows) => {
                                if (err) return res.status(500).json({ error: err.message });
                                stats.stato_correttiva = rows;
                                
                                // Stato manutenzioni
                                stats.stato_manutenzioni = [
                                    { stato: 'OK', count: stats.totale_cappe - stats.manutenzioni_scadute - stats.prossime_manutenzioni },
                                    { stato: 'Prossime', count: stats.prossime_manutenzioni },
                                    { stato: 'Scadute', count: stats.manutenzioni_scadute }
                                ];
                                
                                res.json({ data: stats });
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET - Export Excel
app.get('/api/cappe/export/excel', (req, res) => {
    db.all('SELECT * FROM cappe ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Prepara i dati per Excel
            const data = rows.map(row => ({
                'ID': row.id,
                'Inventario': row.inventario,
                'Tipologia': row.tipologia,
                'Matricola': row.matricola,
                'Produttore': row.produttore,
                'Modello': row.modello,
                'Sede': row.sede,
                'Reparto': row.reparto,
                'Locale': row.locale,
                'Data Manutenzione': row.data_manutenzione || '',
                'Data Prossima Manutenzione': row.data_prossima_manutenzione || ''
            }));

            // Crea workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Cappe');

            // Genera buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Invia file
            res.setHeader('Content-Disposition', 'attachment; filename=cappe_inventario.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
    });
});

// GET - Ottieni dati esploso per una cappa
app.get('/api/esploso/:cappaId', (req, res) => {
    db.get('SELECT * FROM esploso WHERE cappa_id = ?', [req.params.cappaId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Dati esploso non trovati' });
        } else {
            res.json({ data: row });
        }
    });
});

// POST - Salva/Aggiorna dati esploso
app.post('/api/esploso', (req, res) => {
    const {
        cappa_id,
        dati_targa,
        dati_motore,
        dati_filtri,
        dati_luce_uv,
        dati_luce_bianca,
        ore_lavoro_cappa,
        ore_lavoro_filtri,
        altri_dati,
        foto_targa,
        foto_cappa,
        foto_motore,
        foto_filtri,
        foto_luce_uv,
        foto_luce_bianca,
        foto_altri_dati
    } = req.body;

    if (!cappa_id) {
        return res.status(400).json({ error: 'ID cappa mancante' });
    }

    // Verifica se esiste già un record per questa cappa
    db.get('SELECT id FROM esploso WHERE cappa_id = ?', [cappa_id], (err, existing) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (existing) {
            // Aggiorna
            const updateSql = `UPDATE esploso SET 
                dati_targa = ?, dati_motore = ?, dati_filtri = ?, dati_luce_uv = ?, dati_luce_bianca = ?,
                ore_lavoro_cappa = ?, ore_lavoro_filtri = ?, altri_dati = ?,
                foto_targa = ?, foto_cappa = ?, foto_motore = ?, foto_filtri = ?, foto_luce_uv = ?, foto_luce_bianca = ?, foto_altri_dati = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE cappa_id = ?`;
            
            db.run(updateSql, [
                dati_targa, dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri, altri_dati,
                foto_targa, foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca, foto_altri_dati,
                cappa_id
            ], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Dati esploso aggiornati con successo' });
                }
            });
        } else {
            // Inserisci nuovo
            const insertSql = `INSERT INTO esploso (
                cappa_id, dati_targa, dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri, altri_dati,
                foto_targa, foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca, foto_altri_dati
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(insertSql, [
                cappa_id, dati_targa, dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri, altri_dati,
                foto_targa, foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca, foto_altri_dati
            ], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.status(201).json({
                        message: 'Dati esploso creati con successo',
                        id: this.lastID
                    });
                }
            });
        }
    });
});

// POST - Import Excel
app.post('/api/cappe/import/excel', express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '10mb' }), (req, res) => {
    try {
        const workbook = XLSX.read(req.body, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const mode = req.query.mode || 'add'; // 'add' o 'replace'
        
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = [];

        const processRow = (index) => {
            if (index >= data.length) {
                return res.json({
                    message: 'Importazione completata',
                    inserted,
                    updated,
                    skipped,
                    errors: errors.length > 0 ? errors : undefined
                });
            }

            const row = data[index];
            
            // Validazione campi obbligatori
            if (!row.Inventario || !row.Tipologia || !row.Matricola || !row.Produttore || 
                !row.Modello || !row.Sede || !row.Reparto || !row.Locale) {
                errors.push(`Riga ${index + 2}: campi obbligatori mancanti`);
                skipped++;
                return processRow(index + 1);
            }

            // Converti date formato italiano (gg/mm/aaaa) in ISO (aaaa-mm-gg)
            const convertDate = (dateStr) => {
                if (!dateStr) return null;
                if (typeof dateStr === 'number') {
                    // Excel date serial number
                    const date = XLSX.SSF.parse_date_code(dateStr);
                    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                }
                if (typeof dateStr === 'string') {
                    // Formato gg/mm/aaaa
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
                return null;
            };

            const dataManutenzione = convertDate(row['Data Manutenzione']);
            const dataProssimaManutenzione = convertDate(row['Data Prossima Manutenzione']);

            // Verifica se la matricola esiste già
            db.get('SELECT id FROM cappe WHERE matricola = ?', [row.Matricola], (err, existing) => {
                if (err) {
                    errors.push(`Riga ${index + 2}: ${err.message}`);
                    skipped++;
                    return processRow(index + 1);
                }

                if (existing) {
                    if (mode === 'replace') {
                        // Aggiorna
                        const updateSql = `UPDATE cappe SET 
                            inventario = ?, tipologia = ?, produttore = ?, modello = ?,
                            sede = ?, reparto = ?, locale = ?, 
                            data_manutenzione = ?, data_prossima_manutenzione = ?,
                            updated_at = CURRENT_TIMESTAMP
                            WHERE matricola = ?`;
                        
                        db.run(updateSql, [
                            row.Inventario, row.Tipologia, row.Produttore, row.Modello,
                            row.Sede, row.Reparto, row.Locale,
                            dataManutenzione, dataProssimaManutenzione,
                            row.Matricola
                        ], (err) => {
                            if (err) {
                                errors.push(`Riga ${index + 2}: ${err.message}`);
                                skipped++;
                            } else {
                                updated++;
                            }
                            processRow(index + 1);
                        });
                    } else {
                        // Salta
                        skipped++;
                        processRow(index + 1);
                    }
                } else {
                    // Inserisci nuova
                    const insertSql = `INSERT INTO cappe (
                        inventario, tipologia, matricola, produttore, modello,
                        sede, reparto, locale, data_manutenzione, data_prossima_manutenzione
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    
                    db.run(insertSql, [
                        row.Inventario, row.Tipologia, row.Matricola, row.Produttore, row.Modello,
                        row.Sede, row.Reparto, row.Locale,
                        dataManutenzione, dataProssimaManutenzione
                    ], (err) => {
                        if (err) {
                            errors.push(`Riga ${index + 2}: ${err.message}`);
                            skipped++;
                        } else {
                            inserted++;
                        }
                        processRow(index + 1);
                    });
                }
            });
        };

        processRow(0);

    } catch (error) {
        res.status(400).json({ error: 'Errore nel parsing del file Excel: ' + error.message });
    }
});

// ============= INTERVENTI CORRETTIVI API =============

// POST - Crea nuovo intervento
app.post('/api/interventi', (req, res) => {
    const {
        cappa_id, numero_ticket, data_richiesta, richiedente, contatto_richiedente,
        problema_riscontrato, priorita, cappa_ferma, data_sopralluogo, tecnico_diagnostico,
        causa_guasto, componenti_danneggiati, preventivo, data_inizio, data_fine,
        tecnici, attivita_svolte, ricambi, ore_lavoro, costo_totale, foto_prima,
        foto_dopo, test_eseguiti, parametri_verificati, esito, garanzia_giorni,
        prossima_manutenzione, note_finali, firma_tecnico, firma_cliente, stato
    } = req.body;

    if (!cappa_id || !data_richiesta || !problema_riscontrato) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    const sql = `INSERT INTO interventi_correttivi (
        cappa_id, numero_ticket, data_richiesta, richiedente, contatto_richiedente,
        problema_riscontrato, priorita, cappa_ferma, data_sopralluogo, tecnico_diagnostico,
        causa_guasto, componenti_danneggiati, preventivo, data_inizio, data_fine,
        tecnici, attivita_svolte, ricambi, ore_lavoro, costo_totale, foto_prima,
        foto_dopo, test_eseguiti, parametri_verificati, esito, garanzia_giorni,
        prossima_manutenzione, note_finali, firma_tecnico, firma_cliente, stato
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        cappa_id, numero_ticket, data_richiesta, richiedente, contatto_richiedente,
        problema_riscontrato, priorita, cappa_ferma, data_sopralluogo, tecnico_diagnostico,
        causa_guasto, componenti_danneggiati, preventivo, data_inizio, data_fine,
        tecnici, attivita_svolte, ricambi, ore_lavoro, costo_totale, foto_prima,
        foto_dopo, test_eseguiti, parametri_verificati, esito, garanzia_giorni,
        prossima_manutenzione, note_finali, firma_tecnico, firma_cliente, stato
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({
                message: 'Intervento creato con successo',
                id: this.lastID
            });
        }
    });
});

// GET - Lista tutti gli interventi
app.get('/api/interventi', (req, res) => {
    const sql = `
        SELECT i.*, c.inventario, c.tipologia, c.sede
        FROM interventi_correttivi i
        LEFT JOIN cappe c ON i.cappa_id = c.id
        ORDER BY i.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ data: rows });
        }
    });
});

// GET - Storico interventi per cappa
app.get('/api/interventi/cappa/:cappaId', (req, res) => {
    const sql = `
        SELECT * FROM interventi_correttivi
        WHERE cappa_id = ?
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [req.params.cappaId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ data: rows });
        }
    });
});

// GET - Dettaglio intervento
app.get('/api/interventi/:id', (req, res) => {
    const sql = `
        SELECT i.*, c.*
        FROM interventi_correttivi i
        LEFT JOIN cappe c ON i.cappa_id = c.id
        WHERE i.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Intervento non trovato' });
        } else {
            res.json({ data: row });
        }
    });
});

// PUT - Aggiorna intervento
app.put('/api/interventi/:id', (req, res) => {
    const { stato, esito, note_finali } = req.body;
    
    const sql = `UPDATE interventi_correttivi SET 
        stato = ?, esito = ?, note_finali = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    db.run(sql, [stato, esito, note_finali, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Intervento non trovato' });
        } else {
            res.json({ message: 'Intervento aggiornato' });
        }
    });
});

// DELETE - Elimina intervento
app.delete('/api/interventi/:id', (req, res) => {
    db.run('DELETE FROM interventi_correttivi WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Intervento non trovato' });
        } else {
            res.json({ message: 'Intervento eliminato' });
        }
    });
});

// Avvia server
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});
